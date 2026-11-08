import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const MAX_UPLOAD_BYTES = Number(process.env.MAX_BACKUP_BYTES || 10 * 1024 * 1024 * 1024);
const MAX_EXTRACTED_BYTES = Number(process.env.MAX_EXTRACTED_BYTES || 50 * 1024 * 1024 * 1024);
const OPERATION_TIMEOUT_MS = Number(process.env.OPERATION_TIMEOUT_MS || 30 * 60 * 1000);
let operationInProgress = false;

function config() {
  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const backupDir = path.resolve(process.env.BACKUP_DIR || '/data/backups');
  if (!databaseUrl || !/^https:\/\//.test(supabaseUrl) || !anonKey) {
    throw new Error('DATABASE_URL, SUPABASE_URL and SUPABASE_ANON_KEY are required.');
  }
  const database = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) throw new Error('DATABASE_URL must use PostgreSQL.');
  const pgEnv = {
    ...process.env,
    PGHOST: database.hostname,
    PGPORT: database.port || '5432',
    PGUSER: decodeURIComponent(database.username),
    PGPASSWORD: decodeURIComponent(database.password),
    PGDATABASE: decodeURIComponent(database.pathname.slice(1)),
    PGCONNECT_TIMEOUT: '15',
    PGSSLMODE: database.searchParams.get('sslmode') || 'require',
  };
  return { supabaseUrl, anonKey, backupDir, pgEnv };
}

function response(status, body, headers = {}) {
  return new Response(body == null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

function corsHeaders(request) {
  const origins = String(process.env.ALLOWED_ORIGINS || '*').split(',').map((item) => item.trim()).filter(Boolean);
  const origin = request.headers.get('origin') || '';
  const allowed = origins.includes('*') ? '*' : origins.includes(origin) ? origin : 'null';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Expose-Headers': 'Content-Disposition',
    'Vary': 'Origin',
  };
}

async function authorize(request, cfg) {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') || '');
  if (!match) return response(401, { error: 'Sign in is required.' });
  const headers = { apikey: cfg.anonKey, Authorization: `Bearer ${match[1]}` };
  const userResponse = await fetch(`${cfg.supabaseUrl}/auth/v1/user`, { headers });
  if (!userResponse.ok) return response(401, { error: 'Your sign-in is no longer valid. Sign in again.' });
  const permissionResponse = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/has_app_permission`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ required_permission: 'manage_database_backups' }),
  });
  if (!permissionResponse.ok) return response(503, { error: 'Could not verify database-backup permission. Run the latest database schema.' });
  if (await permissionResponse.json() !== true) return response(403, { error: 'You do not have permission to manage database backups.' });
  return null;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env,
      stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let errorOutput = '';
    child.stdout?.on('data', (chunk) => { output = (output + chunk.toString()).slice(-8192); });
    child.stderr?.on('data', (chunk) => { errorOutput = (errorOutput + chunk.toString()).slice(-8192); });
    const timer = setTimeout(() => child.kill('SIGTERM'), OPERATION_TIMEOUT_MS);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(options.returnStderr ? { output: output.trim(), stderr: errorOutput.trim() } : output.trim());
      else reject(new Error(`${command} failed${errorOutput ? `: ${errorOutput.trim()}` : ''}`));
    });
  });
}

async function withOperation(fn) {
  if (operationInProgress) return { status: 409, body: { error: 'Another backup or restore operation is already running.' } };
  operationInProgress = true;
  try { return await fn(); } finally { operationInProgress = false; }
}

async function listBackups(backupDir) {
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  const names = await readdir(backupDir);
  const entries = await Promise.all(names.filter((name) => /^[0-9a-f-]{36}\.json$/.test(name)).map(async (name) => {
    try {
      const metadata = JSON.parse(await readFile(path.join(backupDir, name), 'utf8'));
      const archive = path.join(backupDir, `${metadata.id}.tar.gz`);
      const info = await stat(archive);
      return { id: metadata.id, filename: metadata.filename, createdAt: metadata.createdAt, createdBy: metadata.createdBy,
        source: metadata.source, size: info.size };
    } catch { return null; }
  }));
  return entries.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function readMetadata(backupDir, id) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  try {
    const metadata = JSON.parse(await readFile(path.join(backupDir, `${id}.json`), 'utf8'));
    await access(path.join(backupDir, `${id}.tar.gz`));
    return metadata;
  } catch { return null; }
}

async function createBackup(cfg, user) {
  await mkdir(cfg.backupDir, { recursive: true, mode: 0o700 });
  const id = randomUUID();
  const workDir = await mkdtemp(path.join(tmpdir(), 'vr-db-backup-'));
  const archiveTemp = path.join(cfg.backupDir, `.${id}.tar.gz.tmp`);
  try {
    await run('pg_dump', ['--no-password', '--format=custom', '--file', path.join(workDir, 'database.dump'), '--dbname', cfg.pgEnv.PGDATABASE], { env: cfg.pgEnv });
    await run('pg_dumpall', ['--no-password', '--globals-only', '--file', path.join(workDir, 'globals.sql')], { env: cfg.pgEnv });
    const metadata = { id, format: 'vr-postgresql-backup-v1', createdAt: new Date().toISOString(), createdBy: user.id, source: 'created', filename: `database-backup-${id}.tar.gz` };
    await writeFile(path.join(workDir, 'metadata.json'), JSON.stringify(metadata, null, 2), { mode: 0o600 });
    await run('tar', ['-czf', archiveTemp, '-C', workDir, 'database.dump', 'globals.sql', 'metadata.json'], { env: cfg.pgEnv });
    await rename(archiveTemp, path.join(cfg.backupDir, `${id}.tar.gz`));
    await writeFile(path.join(cfg.backupDir, `${id}.json`), JSON.stringify(metadata), { mode: 0o600, flag: 'wx' });
    return { status: 201, body: { backup: { ...metadata, size: (await stat(path.join(cfg.backupDir, `${id}.tar.gz`))).size } } };
  } finally {
    await rm(workDir, { recursive: true, force: true });
    await rm(archiveTemp, { force: true });
  }
}

async function saveUpload(request, cfg, user, filename) {
  if (!filename || filename.length > 180 || /[\\/\0]/.test(filename) || !/\.(tar\.gz|tgz)$/i.test(filename)) {
    return { status: 400, body: { error: 'Upload a PostgreSQL backup bundle (.tar.gz or .tgz) created by this service.' } };
  }
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_UPLOAD_BYTES) return { status: 413, body: { error: 'The backup file exceeds the configured upload limit.' } };
  const id = randomUUID();
  const workDir = await mkdtemp(path.join(tmpdir(), 'vr-db-upload-'));
  const uploaded = path.join(workDir, 'upload.tar.gz');
  try {
    if (!request.body) return { status: 400, body: { error: 'The uploaded file is empty.' } };
    let bytes = 0;
    const limiter = new Transform({ transform(chunk, encoding, callback) {
      bytes += chunk.length;
      if (bytes > MAX_UPLOAD_BYTES) callback(new Error('The backup file exceeds the configured upload limit.'));
      else callback(null, chunk);
    } });
    await pipeline(Readable.fromWeb(request.body), limiter, createWriteStream(uploaded, { mode: 0o600, flags: 'wx' }));
    const members = (await run('tar', ['-tzf', uploaded])).split('\n').filter(Boolean);
    const expected = ['database.dump', 'globals.sql', 'metadata.json'];
    if (members.length !== expected.length || expected.some((name) => members.filter((item) => item === name).length !== 1)) {
      return { status: 400, body: { error: 'The archive is not a valid complete database backup bundle.' } };
    }
    const listing = (await run('tar', ['-tvzf', uploaded])).split('\n');
    const fileSizes = listing.map((line) => {
      const fields = line.trim().split(/\s+/);
      return { regular: line[0] === '-', size: Number(fields[2]), name: fields.slice(5).join(' ') };
    });
    if (fileSizes.length !== expected.length || fileSizes.some((entry) => !entry.regular ||
      !expected.includes(entry.name) || !Number.isFinite(entry.size) || entry.size < 0) ||
      fileSizes.reduce((sum, entry) => sum + entry.size, 0) > MAX_EXTRACTED_BYTES) {
      return { status: 400, body: { error: 'The archive contains an invalid entry type.' } };
    }
    const bundleMetadataPath = path.join(workDir, 'metadata.json');
    await extractMember(uploaded, 'metadata.json', bundleMetadataPath);
    const originalMetadata = JSON.parse(await readFile(bundleMetadataPath, 'utf8'));
    if (originalMetadata.format !== 'vr-postgresql-backup-v1') return { status: 400, body: { error: 'The backup bundle version is not supported.' } };
    await mkdir(cfg.backupDir, { recursive: true, mode: 0o700 });
    const metadata = { id, format: 'vr-postgresql-backup-v1', createdAt: new Date().toISOString(), createdBy: user.id,
      source: 'uploaded', filename: path.basename(filename) };
    await rename(uploaded, path.join(cfg.backupDir, `${id}.tar.gz`));
    await writeFile(path.join(cfg.backupDir, `${id}.json`), JSON.stringify(metadata), { mode: 0o600, flag: 'wx' });
    return { status: 201, body: { backup: { ...metadata, size: bytes } } };
  } catch (error) {
    if (String(error?.message || '').includes('upload limit')) return { status: 413, body: { error: 'The backup file exceeds the configured upload limit.' } };
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function extractMember(archive, member, outputPath) {
  const child = spawn('tar', ['-xOzf', archive, member], { stdio: ['ignore', 'pipe', 'pipe'] });
  let errorOutput = '';
  child.stderr.on('data', (chunk) => { errorOutput = (errorOutput + chunk.toString()).slice(-8192); });
  const output = createWriteStream(outputPath, { mode: 0o600, flags: 'wx' });
  try {
    await Promise.all([pipeline(child.stdout, output), new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`Could not read backup archive: ${errorOutput.trim()}`)));
    })]);
  } catch (error) {
    child.kill('SIGTERM');
    await rm(outputPath, { force: true });
    throw error;
  }
}

async function restoreBackup(cfg, id) {
  const metadata = await readMetadata(cfg.backupDir, id);
  if (!metadata) return { status: 404, body: { error: 'Backup not found.' } };
  const workDir = await mkdtemp(path.join(tmpdir(), 'vr-db-restore-'));
  const archive = path.join(cfg.backupDir, `${id}.tar.gz`);
  try {
    const dumpPath = path.join(workDir, 'database.dump');
    const globalsPath = path.join(workDir, 'globals.sql');
    await extractMember(archive, 'database.dump', dumpPath);
    await extractMember(archive, 'globals.sql', globalsPath);
    await run('pg_restore', ['--list', dumpPath], { env: cfg.pgEnv });
    const globalsResult = await run('psql', ['--no-password', '--set', 'ON_ERROR_STOP=0', '--file', globalsPath, '--dbname', cfg.pgEnv.PGDATABASE], { env: cfg.pgEnv, returnStderr: true });
    const globalErrors = globalsResult.stderr.split('\n').filter((line) => /ERROR:/.test(line));
    const unexpectedErrors = globalErrors.filter((line) => !/ERROR:\s+role .+ already exists/i.test(line));
    if (unexpectedErrors.length) throw new Error(`psql failed: ${unexpectedErrors.join('\n')}`);
    await run('pg_restore', ['--no-password', '--clean', '--if-exists', '--exit-on-error', '--single-transaction', '--dbname', cfg.pgEnv.PGDATABASE, dumpPath], { env: cfg.pgEnv });
    return { status: 200, body: { ok: true, restoredBackupId: id } };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export async function handleRequest(request) {
  const headers = corsHeaders(request);
  if (headers['Access-Control-Allow-Origin'] === 'null') return response(403, { error: 'This site is not allowed to use the backup service.' }, headers);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  let cfg;
  try { cfg = config(); } catch (error) { console.error(error.message); return response(503, { error: 'The backup service is not configured.' }, headers); }
  const denied = await authorize(request, cfg);
  if (denied) return new Response(denied.body, { status: denied.status, headers: { ...Object.fromEntries(denied.headers), ...headers } });
  const url = new URL(request.url);
  const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts[0] !== 'api' || parts[1] !== 'backups') return response(404, { error: 'Not found.' }, headers);
  try {
    if (request.method === 'GET' && parts.length === 2) {
      return response(200, { backups: await listBackups(cfg.backupDir) }, headers);
    }
    if (request.method === 'POST' && parts.length === 2) {
      const user = await (await fetch(`${cfg.supabaseUrl}/auth/v1/user`, { headers: { apikey: cfg.anonKey, Authorization: request.headers.get('authorization') } })).json();
      const result = await withOperation(() => createBackup(cfg, user));
      return response(result.status, result.body, headers);
    }
    if (request.method === 'PUT' && parts.length === 3 && parts[2] === 'upload') {
      const userResponse = await fetch(`${cfg.supabaseUrl}/auth/v1/user`, { headers: { apikey: cfg.anonKey, Authorization: request.headers.get('authorization') } });
      const user = await userResponse.json();
      const filename = url.searchParams.get('filename') || '';
      const result = await withOperation(() => saveUpload(request, cfg, user, filename));
      return response(result.status, result.body, headers);
    }
    if (parts.length === 4 && parts[3] === 'download' && request.method === 'GET') {
      const metadata = await readMetadata(cfg.backupDir, parts[2]);
      if (!metadata) return response(404, { error: 'Backup not found.' }, headers);
      const file = createReadStream(path.join(cfg.backupDir, `${metadata.id}.tar.gz`));
      return new Response(Readable.toWeb(file), { status: 200, headers: { ...headers, 'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${metadata.filename.replace(/["\\\r\n]/g, '_')}"` } });
    }
    if (request.method === 'POST' && parts.length === 4 && parts[3] === 'restore') {
      const result = await withOperation(() => restoreBackup(cfg, parts[2]));
      return response(result.status, result.body, headers);
    }
    return response(404, { error: 'Not found.' }, headers);
  } catch (error) {
    console.error('Database backup operation failed:', error);
    const message = /pg_dumpall failed/.test(error?.message || '')
      ? 'PostgreSQL could not export global roles. The database connection must have privileges to read and create roles; managed database providers may not allow this.'
      : /psql failed|pg_restore failed/.test(error?.message || '')
        ? 'PostgreSQL could not complete the restore. Check target database privileges and service logs; a failed restore may have changed database objects.'
        : 'The database backup operation failed. Check backup-service logs.';
    return response(500, { error: message }, headers);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const server = createServer(async (incoming, outgoing) => {
    try {
      const init = { method: incoming.method, headers: incoming.headers };
      if (!['GET', 'HEAD'].includes(incoming.method)) Object.assign(init, { body: incoming, duplex: 'half' });
      const request = new Request(`http://${incoming.headers.host || 'localhost'}${incoming.url}`, init);
      const result = await handleRequest(request);
      outgoing.writeHead(result.status, Object.fromEntries(result.headers));
      if (result.body) await pipeline(Readable.fromWeb(result.body), outgoing);
      else outgoing.end();
    } catch (error) {
      console.error('Request failed:', error);
      if (!outgoing.headersSent) outgoing.writeHead(500, { 'Content-Type': 'application/json' });
      outgoing.end(JSON.stringify({ error: 'The backup service could not process the request.' }));
    }
  });
  server.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log('Database backup service listening.'));
}