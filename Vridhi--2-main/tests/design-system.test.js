'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'modules', 'theme', 'design-system.css'), 'utf8');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  PASS:', name);
}

console.log('Running Vriddhi Design System verification tests...');

test('index.html loads Plus Jakarta Sans and IBM Plex Mono Google Fonts', () => {
  assert.ok(html.includes('family=Plus+Jakarta+Sans'), 'Plus Jakarta Sans font link missing');
  assert.ok(html.includes('family=IBM+Plex+Mono'), 'IBM Plex Mono font link missing');
});

test('index.html loads design-system.css in the exact cascade slot (after reports-menu.css, before report-maximize.css & minimal.css)', () => {
  const idxBase = html.indexOf('modules/app-shell/base.css');
  const idxAp = html.indexOf('modules/theme/appearance-pro.css');
  const idxRepMenu = html.indexOf('modules/app-shell/reports-menu.css');
  const idxDs = html.indexOf('modules/theme/design-system.css?v=1');
  const idxMax = html.indexOf('modules/report-maximize/report-maximize.css');
  const idxMin = html.indexOf('modules/theme/minimal.css');

  assert.ok(idxDs > -1, 'design-system.css link missing in index.html');
  assert.ok(idxDs > idxBase, 'design-system.css must load after base.css');
  assert.ok(idxDs > idxAp, 'design-system.css must load after appearance-pro.css');
  assert.ok(idxDs > idxRepMenu, 'design-system.css must load after reports-menu.css');
  assert.ok(idxDs < idxMax, 'design-system.css must load before report-maximize.css');
  assert.ok(idxDs < idxMin, 'design-system.css must load before minimal.css');
});

test('design-system.css defines centralized tokens for typography, spacing, radii, shadows, motion, and dark mode', () => {
  const requiredTokens = [
    '--ds-font-sans',
    '--ds-font-mono',
    '--ds-r-card',
    '--ds-r-box',
    '--ds-r-ctl',
    '--ds-sh-card',
    '--ds-sh-pop',
    '--ds-sh-dlg',
    '--ds-ease',
    '--ds-dur',
    '--ds-border',
    '--ds-accent',
    '--ds-tbl-hd-bg',
    '--ds-tbl-stripe'
  ];
  for (const tok of requiredTokens) {
    assert.ok(css.includes(tok), `Missing centralized token ${tok}`);
  }
  assert.ok(css.includes('html[data-theme="dark"]'), 'Dark mode calibration missing');
  assert.ok(css.includes('@media (prefers-color-scheme: dark)'), 'System dark mode media query missing');
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced motion accessibility guard missing');
});

test('design-system.css honors all Settings -> Appearance preferences across app & reports', () => {
  const prefs = [
    'data-minimal-theme="true"',
    'data-utcol="custom"',
    'data-ufn="inter"',
    'data-ufn="serif"',
    'data-ufn="humanist"',
    'data-ufn="mono"',
    'data-utx="charcoal"',
    'data-utx="forest"',
    'data-uwt="medium"',
    'data-uwt="semibold"',
    'data-uwt="bold"',
    'data-ush="sharp"',
    'data-ush="pill"',
    'data-ubt="soft"',
    'data-ubt="outline"',
    'data-uin="filled"',
    'data-uin="underline"',
    'data-utd="compact"',
    'data-utd="relaxed"',
    'data-uhd="tint"',
    'data-uhd="line"',
    'data-utz="on"',
    'data-utl="off"',
    'data-utc="on"',
    'data-utc="off"',
    'data-uic="off"'
  ];
  for (const attr of prefs) {
    assert.ok(css.includes(attr), `Missing Appearance preference hook: ${attr}`);
  }
});

test('design-system.css enforces financial-statement tabular numerals and covers all module tables', () => {
  assert.ok(css.includes('font-variant-numeric: tabular-nums'), 'tabular-nums missing');
  const tables = [
    'table.rt',
    'table.ht',
    'table.vp-t',
    'table.st-t',
    'table.hz-t',
    'table.sx-t',
    'table.ut',
    'table.ent-t',
    'table.vod-table'
  ];
  for (const tbl of tables) {
    assert.ok(css.includes(tbl), `Missing unified table styling for ${tbl}`);
  }
});

test('design-system.css removes thick left-border clichés and decorative dashboard blobs/dots', () => {
  assert.ok(css.includes('border-left: 0 !important'), 'Thick left border removal on headings missing');
  assert.ok(css.includes('#dsh .dz-kpi::after'), 'Dashboard KPI blurry blob cleanup missing');
  assert.ok(css.includes('#dsh .dz-live i'), 'Decorative dashboard live dot cleanup missing');
});

test('design-system.css covers all core views and responsive breakpoints', () => {
  const selectors = [
    'header.hd',
    'nav#nav',
    '#dsh .dz-hero',
    '.rph',
    '.rsel',
    '.rpk-c',
    '.hp-head',
    '#vp-pg',
    '.sx',
    '.ap',
    'dialog',
    '#toast',
    '#lg .lc',
    '.rp2-nav',
    '@media (max-width: 900px)',
    '@media (max-width: 720px)',
    '@media (max-width: 560px)'
  ];
  for (const sel of selectors) {
    assert.ok(css.includes(sel), `Missing styling coverage for ${sel}`);
  }
});

test('design-system.css has balanced braces', () => {
  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  assert.strictEqual(opens, closes, `Unbalanced braces in design-system.css: ${opens} vs ${closes}`);
});

console.log(`All ${passed} design-system tests passed.`);
