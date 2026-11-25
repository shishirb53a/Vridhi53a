#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const repoRoot = path.join(root, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// ============================================================================
// 1. AUTHENTICATION & SESSION MANAGEMENT (NO LOCALSTORAGE TOKEN PERSISTENCE)
// ============================================================================
(function testBootInitPurgesLegacyTokens() {
  const bootCode = read('modules/app-shell/boot-init.js');
  const ls = new Map([
    ['vr-rm', '1'],
    ['vr-sb-remember', JSON.stringify({ at: 'eyJ.fake.at', rt: 'refresh-secret', uid: 'u1' })],
  ]);
  const ss = new Map();
  const classes = new Set();
  const attrs = {};
  const ctx = {
    document: {
      documentElement: {
        setAttribute(k, v) { attrs[k] = v; },
        classList: { add(c) { classes.add(c); } },
      },
    },
    localStorage: {
      getItem: (k) => (ls.has(k) ? ls.get(k) : null),
      setItem: (k, v) => ls.set(k, String(v)),
      removeItem: (k) => ls.delete(k),
    },
    sessionStorage: {
      getItem: (k) => (ss.has(k) ? ss.get(k) : null),
      setItem: (k, v) => ss.set(k, String(v)),
      removeItem: (k) => ss.delete(k),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(bootCode, ctx);

  assert.strictEqual(attrs['data-skin'], 'enterprise', 'boot-init keeps enterprise skin');
  assert.strictEqual(ls.has('vr-sb-remember'), false, 'boot-init scrubs legacy vr-sb-remember from localStorage');
  assert.strictEqual(ls.has('vr-rm'), false, 'boot-init scrubs legacy vr-rm from localStorage');
  assert.strictEqual(ss.has('vr-sb'), false, 'boot-init never restores refresh tokens from localStorage into sessionStorage');
  assert.strictEqual(ss.get('fs-auth'), undefined, 'boot-init does not auto-authenticate from localStorage');
  assert.strictEqual(classes.has('lk'), true, 'boot-init keeps unauthenticated page locked');
})();

async function testAuthModuleSecurity() {
  const authCode = read('modules/auth/auth.js');
  assert.ok(!authCode.includes("localStorage.setItem('vr-sb-remember'"), 'auth.js never writes tokens to localStorage');
  assert.ok(!authCode.includes("localStorage.getItem('vr-sb-remember'"), 'auth.js never reads tokens from localStorage');
  assert.ok(!authCode.includes('insertAdjacentHTML'), 'auth.js avoids insertAdjacentHTML');

  const ls = new Map([
    ['vr-rm', '1'],
    ['vr-sb-remember', JSON.stringify({ at: 'old-at', rt: 'old-rt', uid: 'u1' })],
  ]);
  const ss = new Map();
  let fetchCalledForBackup = false;
  const ctx = {
    window: null,
    VR_CFG: {
      supabaseUrl: 'https://project.example.supabase.co',
      anonKey: 'anon-key-long-enough-for-validation-123456',
      databaseBackupUrl: 'http://insecure.attacker.example',
    },
    VR_BUILD_NO: 151,
    VR_BUILD_DATE: '2026-11-02',
    document: {
      documentElement: { classList: { add() {}, toggle() {} } },
      addEventListener() {},
      dispatchEvent() {},
      querySelector() { return null; },
      getElementById() { return null; },
    },
    location: { reload() {} },
    localStorage: {
      getItem: (k) => (ls.has(k) ? ls.get(k) : null),
      setItem: (k, v) => ls.set(k, String(v)),
      removeItem: (k) => ls.delete(k),
    },
    sessionStorage: {
      getItem: (k) => (ss.has(k) ? ss.get(k) : null),
      setItem: (k, v) => ss.set(k, String(v)),
      removeItem: (k) => ss.delete(k),
    },
    fetch: async (url) => {
      if (String(url).includes('insecure.attacker.example')) fetchCalledForBackup = true;
      if (String(url).includes('/auth/v1/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'secret-access-token',
            refresh_token: 'secret-refresh-token',
            expires_in: 3600,
            user: { id: 'user-123', email: 'advisor@example.com' },
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    },
    CustomEvent: class { constructor(name) { this.name = name; } },
    Date,
    Promise,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(authCode, ctx);

  assert.strictEqual(ls.has('vr-sb-remember'), false, 'auth.js scrubs legacy localStorage tokens on load');
  await ctx.VRSB.signIn('advisor@example.com', 'super-secret-password');
  assert.strictEqual(ls.has('vr-sb-remember'), false, 'signIn never persists tokens to localStorage');
  assert.strictEqual(ls.has('vr-rm'), false, 'signIn never sets vr-rm persistence flag in localStorage');
  assert.ok(ss.get('vr-sb') && ss.get('vr-sb').includes('secret-refresh-token'), 'signIn keeps tab-scoped session in sessionStorage');

  let httpsErr = null;
  try {
    await ctx.VRSB.databaseBackups.list();
  } catch (err) {
    httpsErr = err;
  }
  assert.ok(httpsErr && /HTTPS/i.test(httpsErr.message), 'databaseBackupCall rejects non-HTTPS remote URLs');
  assert.strictEqual(fetchCalledForBackup, false, 'Bearer token is never sent over plaintext HTTP to remote backup service');
}

(function testRegistryHardening() {
  const regCode = read('modules/user-management/registry.js');
  assert.ok(!regCode.includes('PasswordCredential'), 'registry.js never stores or silently retrieves plaintext passwords via PasswordCredential');
  assert.ok(!regCode.includes("localStorage.setItem('vr-sb-remember'"), 'registry.js never persists session tokens to localStorage');
  assert.ok(!regCode.includes("localStorage.setItem('vr-rm'"), 'registry.js never sets vr-rm in localStorage');
  assert.ok(regCode.includes('if(window.VR_PROD)return;var m=/^#invite=(.*)$/'), 'registry.js disables #invite hash injection in production mode');
})();

// ============================================================================
// 2. CONTENT SECURITY POLICY (CSP) & ZERO INLINE SCRIPTS IN INDEX.HTML
// ============================================================================
(function testCspAndZeroInlineScripts() {
  const html = read('index.html');
  const scriptTags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const inlineScripts = scriptTags.filter((m) => !/\bsrc\s*=/.test(m[1]));
  assert.strictEqual(inlineScripts.length, 0, 'index.html has zero inline <script> blocks for strict script-src self CSP');

  const headers = read('_headers');
  assert.ok(/Strict-Transport-Security:\s*max-age=63072000;\s*includeSubDomains;\s*preload/i.test(headers),
    '_headers enables HSTS with preload');
  assert.ok(/Content-Security-Policy:/i.test(headers), '_headers defines Content-Security-Policy');
  const cspLine = headers.split('\n').find((l) => /Content-Security-Policy:/i.test(l)) || '';
  assert.ok(cspLine.includes("default-src 'self'"), '_headers CSP restricts default-src to self');
  assert.ok(cspLine.includes("script-src 'self'"), '_headers CSP enforces strict script-src self');
  assert.ok(!/script-src[^;]*unsafe-inline/i.test(cspLine), '_headers CSP does not allow unsafe-inline in script-src');
  assert.ok(!/script-src[^;]*unsafe-eval/i.test(cspLine), '_headers CSP does not allow unsafe-eval in script-src');
  assert.ok(cspLine.includes("object-src 'none'"), '_headers CSP sets object-src none');
  assert.ok(cspLine.includes("frame-ancestors 'none'"), '_headers CSP sets frame-ancestors none');
  assert.ok(cspLine.includes('upgrade-insecure-requests'), '_headers CSP upgrades insecure requests');

  const rootServer = fs.readFileSync(path.join(repoRoot, 'server.mjs'), 'utf8');
  assert.ok(rootServer.includes("'Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'"),
    'server.mjs enables HSTS');
  assert.ok(rootServer.includes('"script-src \'self\'"'), 'server.mjs enforces strict script-src self CSP');
  assert.ok(!rootServer.includes("X-Frame-Options', 'DENY'"), 'server.mjs preserves AI Studio preview iframe framing');
  assert.ok(rootServer.includes("protoHeader === 'http'") && rootServer.includes('res.redirect(301, `https://'),
    'server.mjs redirects non-localhost HTTP proxy traffic to HTTPS');
  assert.ok(rootServer.includes("'/_headers'") && rootServer.includes("'/DEPLOY.md'"),
    'server.mjs blocks direct access to internal config and docs');

  const reportMaxCode = read('modules/report-maximize/report-maximize.js');
  assert.ok(!reportMaxCode.includes('<script>'), 'report-maximize.js print export emits zero inline <script> tags');
  assert.ok(reportMaxCode.includes('function fitPrintIframeDoc(doc)'), 'report-maximize.js fits print tables from parent JS');
})();

// ============================================================================
// 3. XSS REMEDIATION POC VERIFICATION
// ============================================================================
(function testXssRemediations() {
  const payload = '<img src=x onerror=alert(1)>';
  const attrPayload = '" onmouseover="alert(1)';

  // 3a. Family Management XSS PoC
  const famCode = read('modules/family-management/family-management.js');
  const famCtx = { window: {} };
  vm.createContext(famCtx);
  vm.runInContext(famCode, famCtx);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const famHtml = famCtx.window.VRFamily.rows({
    state: {
      members: [
        { id: 1, name: payload, role: 'Child', age: payload, cls: payload, college: payload },
        { id: 2, name: 'Safe', role: attrPayload, age: 40, cls: 1, college: 4 },
      ],
    },
    ui: { fq: '', frl: 'All', fk: 'role', fd: 1 },
    roles: ['Self', 'Child', attrPayload],
    escape: esc,
    escapeName: esc,
    stage: () => payload,
  });
  assert.ok(!famHtml.includes('<img src=x onerror=alert(1)>'), 'family-management neutralizes raw HTML injection across all fields');
  assert.ok(!famHtml.includes('onmouseover="alert(1)'), 'family-management neutralizes attribute/CSS injection in role');
  assert.ok(famHtml.includes('&lt;img src=x onerror=alert(1)&gt;'), 'family-management preserves escaped text safely');

  // 3b. Categories hex colour validation PoC
  const catCode = read('modules/categories/categories.js');
  const catState = {
    cats: [{ n: 'Custom', c: 'red;background:url(javascript:alert(1))' }],
    hide: [],
    assets: [],
  };
  const CC = { Equity: '#2563eb', Other: '#6b7280' };
  const catCtx = {
    window: null,
    document: { addEventListener() {} },
    S: catState,
    CC,
    CATS: ['Equity', 'Other'],
    CATS0: ['Equity', 'Other'],
    cleanCats: (c) => c,
    cleanHide: (h) => h,
    applyCats() {},
  };
  catCtx.window = catCtx;
  vm.createContext(catCtx);
  vm.runInContext(catCode, catCtx);
  assert.strictEqual(CC.Custom, '#7c3aed', 'categories.js rejects non-hex CSS injection payloads and falls back to safe hex');

  // 3c. ui-pagination.js escaping PoC
  const pagCode = read('modules/ui-pagination/ui-pagination.js');
  assert.ok(pagCode.includes('function escHtml('), 'ui-pagination.js implements full HTML escaper');
  assert.ok(!pagCode.includes("t.replace(/&/g,'&amp;')"), 'ui-pagination.js no longer relies on ampersand-only partial escaping');

  // 3d. app.js text() dialog escaping
  const appCode = read('modules/app-core/app.js');
  assert.ok(appCode.includes('<h2>${esc(title)}</h2>') && appCode.includes('aria-label="${esc(title)}"'),
    'app.js text() dialog escapes title in both heading and aria-label');

  // 3e. appearance-pro.js hex validation
  const apCode = read('modules/theme/appearance-pro.js');
  assert.ok(apCode.includes('function safeHex(') && apCode.includes("var valid = safeHex(hex, '');"),
    'appearance-pro.js validates hex colors before rendering or saving S.cc');

  // 3f. policy-ui.js escaping
  const polCode = read('modules/policy/policy-ui.js');
  assert.ok(polCode.includes('var safeCls = function') && polCode.includes("var safeMode = mode === 'rename' ? 'rename' : 'add'"),
    'policy-ui.js sanitizes CSS classes and mode attributes');

  // 3g. backups.js download filename sanitization
  const bkpUiCode = read('modules/database-backups/backups.js');
  assert.ok(bkpUiCode.includes("replace(/[^a-zA-Z0-9._-]/g,'_')"), 'backups.js sanitizes download filenames');
})();

// ============================================================================
// 4. API AUTH, AUTHORIZATION, FAIL-CLOSED CORS & BACKUP SERVICE HARDENING
// ============================================================================
async function testApiAndBackupServiceSecurity() {
  const manageUsers = read('supabase/functions/manage-users/index.ts');
  const aiAgent = read('supabase/functions/vriddhi-agent/index.ts');

  for (const [name, src] of [['manage-users', manageUsers], ['vriddhi-agent', aiAgent]]) {
    assert.ok(!src.includes('|| "*"'), `${name} does not fall back to wildcard CORS (*)`);
    assert.ok(src.includes('item !== "*"'), `${name} strips wildcard from allowed origins`);
    assert.ok(src.includes('"Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload"'),
      `${name} includes HSTS security header`);
    assert.ok(src.includes('"Content-Security-Policy": "default-src \'none\'; frame-ancestors \'none\'"'),
      `${name} includes strict API CSP header`);
    assert.ok(src.includes('"X-Content-Type-Options": "nosniff"'), `${name} includes nosniff header`);
    assert.ok(src.includes('if (cors.forbidden) return reject(403, "Origin not allowed.");'),
      `${name} rejects unapproved browser origins fail-closed`);
  }
  assert.ok(manageUsers.includes('MAX_BODY_BYTES = 32_768'), 'manage-users enforces payload size limit');
  assert.ok(!manageUsers.includes('error instanceof Error ? error.message : "User administration failed."'),
    'manage-users does not leak raw internal exception messages to clients');

  // Behavioral tests against backup-service/server.mjs
  process.env.DATABASE_URL = 'postgresql://backup:secret@localhost:5432/app?sslmode=require';
  process.env.SUPABASE_URL = 'https://project.example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  const testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vr-sec-backup-'));
  process.env.BACKUP_DIR = path.join(testDir, 'history');
  const { handleRequest } = await import('../backup-service/server.mjs');

  let authCalls = 0;
  global.fetch = async (url) => {
    if (String(url).endsWith('/auth/v1/user')) {
      authCalls++;
      return Response.json({ id: 'admin-user-1' });
    }
    return Response.json(true);
  };

  // Fail-closed CORS when ALLOWED_ORIGINS is unset or wildcard
  process.env.ALLOWED_ORIGINS = '';
  const noAllowlistRes = await handleRequest(new Request('https://backup.example/api/backups', {
    headers: { origin: 'https://evil.example', authorization: 'Bearer tok123' },
  }));
  assert.strictEqual(noAllowlistRes.status, 403, 'Backup service denies browser origins when ALLOWED_ORIGINS is empty');
  assert.strictEqual(noAllowlistRes.headers.get('access-control-allow-origin'), null, 'Backup service never emits wildcard ACAO');

  process.env.ALLOWED_ORIGINS = '*';
  const wildcardRes = await handleRequest(new Request('https://backup.example/api/backups', {
    headers: { origin: 'https://evil.example', authorization: 'Bearer tok123' },
  }));
  assert.strictEqual(wildcardRes.status, 403, 'Backup service ignores wildcard * in ALLOWED_ORIGINS');

  // HTTPS enforcement behind reverse proxy
  process.env.ALLOWED_ORIGINS = 'https://app.example';
  const httpProxyRes = await handleRequest(new Request('https://backup.example/api/backups', {
    headers: {
      origin: 'https://app.example',
      authorization: 'Bearer tok123',
      'x-forwarded-proto': 'http',
    },
  }));
  assert.strictEqual(httpProxyRes.status, 403, 'Backup service rejects plaintext HTTP requests behind reverse proxy');
  assert.ok(httpProxyRes.headers.get('strict-transport-security')?.includes('max-age=63072000'),
    'Backup service returns HSTS header');
  assert.strictEqual(httpProxyRes.headers.get('x-content-type-options'), 'nosniff',
    'Backup service returns X-Content-Type-Options: nosniff');
  assert.strictEqual(httpProxyRes.headers.get('cache-control'), 'no-store',
    'Backup service returns Cache-Control: no-store');

  // Path traversal attempt on download ID
  const traversalRes = await handleRequest(new Request('https://backup.example/api/backups/..%2F..%2Fetc%2Fpasswd/download', {
    headers: { origin: 'https://app.example', authorization: 'Bearer tok123' },
  }));
  assert.strictEqual(traversalRes.status, 404, 'Backup service rejects path traversal backup IDs');

  // Upload verifies identity only once (no redundant unverified second /auth/v1/user call)
  const srcDir = path.join(testDir, 'src');
  await fs.promises.mkdir(srcDir);
  await fs.promises.writeFile(path.join(srcDir, 'database.dump'), 'dump');
  await fs.promises.writeFile(path.join(srcDir, 'globals.sql'), '-- globals');
  await fs.promises.writeFile(path.join(srcDir, 'metadata.json'), JSON.stringify({ format: 'vr-postgresql-backup-v1' }));
  const archivePath = path.join(testDir, 'test.tar.gz');
  execFileSync('tar', ['-czf', archivePath, '-C', srcDir, 'database.dump', 'globals.sql', 'metadata.json']);
  const bundle = fs.readFileSync(archivePath);

  authCalls = 0;
  const uploadRes = await handleRequest(new Request('https://backup.example/api/backups/upload?filename=bad%22%3Bname.tar.gz', {
    method: 'PUT',
    headers: { origin: 'https://app.example', authorization: 'Bearer tok123', 'content-type': 'application/gzip' },
    body: bundle,
  }));
  assert.strictEqual(uploadRes.status, 201, 'Authorized upload succeeds');
  assert.strictEqual(authCalls, 1, 'Upload calls /auth/v1/user exactly once (no redundant unverified fetch)');
  const uploaded = (await uploadRes.json()).backup;

  const dlRes = await handleRequest(new Request(`https://backup.example/api/backups/${uploaded.id}/download`, {
    headers: { origin: 'https://app.example', authorization: 'Bearer tok123' },
  }));
  assert.strictEqual(dlRes.status, 200, 'Download succeeds for valid uploaded backup');
  const cd = dlRes.headers.get('content-disposition') || '';
  assert.ok(/^attachment; filename="[a-zA-Z0-9._-]+"$/.test(cd),
    `Content-Disposition filename is strictly sanitized (got: ${cd})`);

  await fs.promises.rm(testDir, { recursive: true, force: true });
}

(async function main() {
  await testAuthModuleSecurity();
  await testApiAndBackupServiceSecurity();
  console.log('  ok   all security remediation checks and exploit PoCs passed');
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
