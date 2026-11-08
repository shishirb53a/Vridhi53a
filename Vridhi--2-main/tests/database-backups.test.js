#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const schema = fs.readFileSync(path.join(root, 'supabase', 'schema.sql'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'modules', 'auth', 'auth.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'modules', 'database-backups', 'backups.js'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'modules', 'settings', 'settings.js'), 'utf8');
const serverText = fs.readFileSync(path.join(root, 'backup-service', 'server.mjs'), 'utf8');

assert.ok(schema.includes("('manage_database_backups', 'Create, restore and download full PostgreSQL backups')"),
  'Database backups have a dedicated permission');
assert.ok(schema.includes("('admin', 'assign_roles'), ('admin', 'manage_roles'), ('admin', 'manage_database_backups')"),
  'The built-in Admin role can manage database backups');
assert.ok(schema.includes("select 'super_admin', permission_key from public.app_permissions"),
  'Super Admin receives newly registered permissions on schema migration');
assert.ok(auth.includes("'/api/backups'" ) &&
  auth.includes("'/api/backups/'+encodeURIComponent(id)+'/restore'"),
  'The browser client calls the native backup service');
assert.ok(ui.includes("includes('manage_database_backups')") && ui.includes("data-dbb=\"restore\""),
  'The Settings panel is permission-gated and exposes restore actions');
assert.ok(settings.includes('window.VRDatabaseBackups.render()'), 'The backup panel is connected to Settings');
for (const utility of ['pg_dump', 'pg_dumpall', 'pg_restore', 'psql']) {
  assert.ok(serverText.includes(`'${utility}'`), `The service uses native ${utility}`);
}
assert.ok(serverText.includes("required_permission: 'manage_database_backups'") &&
  serverText.includes("'--globals-only'") && serverText.includes("'--clean'"),
  'The service verifies administrator permission, exports globals and restores existing objects');

(async function(){
  process.env.DATABASE_URL = 'postgresql://backup:secret@localhost:5432/app?sslmode=require';
  process.env.SUPABASE_URL = 'https://project.example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.ALLOWED_ORIGINS = 'https://app.example';
  const testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vr-db-backup-test-'));
  process.env.BACKUP_DIR = path.join(testDir, 'history');
  const { handleRequest } = await import('../backup-service/server.mjs');
  let fetchCalls = 0, allowBackups = false;
  global.fetch = async function(url){
    fetchCalls++;
    if (String(url).endsWith('/auth/v1/user')) return Response.json({ id: 'user-id' });
    return Response.json(allowBackups);
  };
  const denied = await handleRequest(new Request('http://backup/api/backups', {
    headers: { origin: 'https://app.example', authorization: 'Bearer user-token' },
  }));
  assert.strictEqual(denied.status, 403, 'A signed-in user without backup permission is denied');
  assert.strictEqual(fetchCalls, 2, 'The service checks identity and permission before serving a route');
  const anonymous = await handleRequest(new Request('http://backup/api/backups', {
    headers: { origin: 'https://app.example' },
  }));
  assert.strictEqual(anonymous.status, 401, 'Anonymous requests are denied');
  const badOrigin = await handleRequest(new Request('http://backup/api/backups', {
    headers: { origin: 'https://attacker.example', authorization: 'Bearer user-token' },
  }));
  assert.strictEqual(badOrigin.status, 403, 'Unapproved browser origins are denied');
  const source = path.join(testDir, 'source');
  await fs.promises.mkdir(source);
  await fs.promises.writeFile(path.join(source, 'database.dump'), 'test archive');
  await fs.promises.writeFile(path.join(source, 'globals.sql'), '-- test roles');
  await fs.promises.writeFile(path.join(source, 'metadata.json'), JSON.stringify({ format: 'vr-postgresql-backup-v1' }));
  const bundlePath = path.join(testDir, 'existing.tar.gz');
  execFileSync('tar', ['-czf', bundlePath, '-C', source, 'database.dump', 'globals.sql', 'metadata.json']);
  const bundle = fs.readFileSync(bundlePath);
  allowBackups = true;
  const upload = await handleRequest(new Request('http://backup/api/backups/upload?filename=existing.tar.gz', {
    method: 'PUT', headers: { origin: 'https://app.example', authorization: 'Bearer user-token', 'content-type': 'application/gzip' }, body: bundle,
  }));
  assert.strictEqual(upload.status, 201, 'A complete backup bundle can be uploaded into history');
  const uploaded = (await upload.json()).backup;
  const history = await handleRequest(new Request('http://backup/api/backups', {
    headers: { origin: 'https://app.example', authorization: 'Bearer user-token' },
  }));
  assert.strictEqual((await history.json()).backups[0].id, uploaded.id, 'Uploaded bundles appear in backup history');
  const download = await handleRequest(new Request(`http://backup/api/backups/${uploaded.id}/download`, {
    headers: { origin: 'https://app.example', authorization: 'Bearer user-token' },
  }));
  assert.strictEqual(download.status, 200, 'A stored bundle can be downloaded');
  assert.strictEqual(Buffer.from(await download.arrayBuffer()).length, bundle.length, 'Download returns the stored archive');
  const tools = path.join(testDir, 'tools');
  await fs.promises.mkdir(tools);
  const toolLog = path.join(testDir, 'restore-tools.log');
  const pgRestoreStub = path.join(tools, 'pg_restore');
  const psqlStub = path.join(tools, 'psql');
  await fs.promises.writeFile(pgRestoreStub, '#!/bin/sh\nprintf \'%s\\n\' "$*" >> "$RESTORE_TEST_LOG"\nexit 0\n');
  await fs.promises.writeFile(psqlStub, '#!/bin/sh\nprintf \'psql: ERROR: role "existing" already exists\\n\' >&2\nexit 0\n');
  await fs.promises.chmod(pgRestoreStub, 0o700);
  await fs.promises.chmod(psqlStub, 0o700);
  process.env.PATH = tools + path.delimiter + process.env.PATH;
  process.env.RESTORE_TEST_LOG = toolLog;
  const restore = await handleRequest(new Request(`http://backup/api/backups/${uploaded.id}/restore`, {
    method: 'POST', headers: { origin: 'https://app.example', authorization: 'Bearer user-token' },
  }));
  assert.strictEqual(restore.status, 200, 'A backup can be restored when its roles already exist');
  const restoreCommands = await fs.promises.readFile(toolLog, 'utf8');
  assert.ok(restoreCommands.includes('--list') && restoreCommands.includes('--clean'), 'Restore validates and applies the PostgreSQL archive');
  await fs.promises.rm(testDir, { recursive: true, force: true });
  console.log('Database backup permissions, native utilities, and request authorization are wired');
})().catch(function(error){console.error(error);process.exitCode=1});