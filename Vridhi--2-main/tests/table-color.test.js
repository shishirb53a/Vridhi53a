#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const prefsSource = read('modules/dashboard-preferences/dashboard-preferences.js');
const apSource = read('modules/theme/appearance-pro.js');
const apCss = read('modules/theme/appearance-pro.css');
const indexHtml = read('index.html');

function lum(hex) {
  const c = hex.replace('#', '');
  const rgb = [0, 2, 4].map(i => {
    let v = parseInt(c.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrastRatio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function createSandbox(initialStorage, darkMode) {
  const storage = Object.assign({}, initialStorage || {});
  const listeners = { click: [], input: [], change: [], toggle: [] };
  const styles = {};
  const dataset = {};
  const attrs = {};
  if (darkMode) attrs['data-theme'] = 'dark';
  const toasts = [];
  const mediaCbs = [];
  const observerCbs = [];

  const rootEl = {
    dataset,
    style: {
      setProperty(k, v) { styles[k] = v; },
      removeProperty(k) { delete styles[k]; }
    },
    getAttribute(k) {
      if (k === 'data-theme') return attrs[k] || null;
      return attrs[k] || null;
    },
    setAttribute(k, v) { attrs[k] = v; },
    removeAttribute(k) { delete attrs[k]; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k); }
  };

  const sandbox = {
    UI: { tab: 'Settings' },
    PALS: [],
    S: { theme: darkMode ? 'dark' : 'light', cc: '#14392b', palette: 'yellow' },
    save() {},
    theme() {},
    render() {},
    toast(msg) { toasts.push(msg); },
    dupd() {},
    tr(s) { return s; },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null; },
      setItem(k, v) { storage[k] = String(v); }
    },
    matchMedia() {
      return {
        matches: Boolean(darkMode),
        addEventListener(ev, cb) { if (ev === 'change') mediaCbs.push(cb); }
      };
    },
    MutationObserver: function (cb) {
      observerCbs.push(cb);
      this.observe = () => {};
    },
    document: {
      documentElement: rootEl,
      head: { appendChild() {} },
      body: { dataset: {} },
      createElement() { return { style: {}, setAttribute() {}, className: '' }; },
      getElementById() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener(ev, cb) {
        if (!listeners[ev]) listeners[ev] = [];
        listeners[ev].push(cb);
      }
    }
  };
  sandbox.window = sandbox;
  sandbox.window.document = sandbox.document;
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.matchMedia = sandbox.matchMedia;
  vm.createContext(sandbox);
  vm.runInContext(prefsSource, sandbox, { filename: 'dashboard-preferences.js' });
  vm.runInContext(apSource, sandbox, { filename: 'appearance-pro.js' });

  return {
    sandbox,
    storage,
    styles,
    dataset,
    attrs,
    listeners,
    toasts,
    triggerObserver() { observerCbs.forEach(cb => cb()); },
    triggerMedia() { mediaCbs.forEach(cb => cb()); }
  };
}

// 1. Default state: no custom table colour, UI renders cleanly under Advanced
const env = createSandbox({}, false);
assert.strictEqual(env.sandbox.vrTableColor.get(), '', 'Default table colour is unset');
assert.strictEqual(env.dataset.utcol, undefined, 'data-utcol attribute is absent by default');
assert.strictEqual(env.styles['--tbl-hd-bg'], undefined, 'Custom table CSS variables are not set by default');

const advHtml = env.sandbox.lookUI();
assert.ok(advHtml.includes('Table Colour'), 'Advanced settings render a Table Colour label');
assert.ok(advHtml.includes('type="color" id="u_utcol"'), 'Table Colour provides a native colour picker');
assert.ok(advHtml.includes('data-utcol-reset="1"'), 'Table Colour provides an independent reset button');
assert.ok(advHtml.includes('class="uip-tc-prev"') && advHtml.includes('<table class="uip-tc-tbl">'), 'Table Colour includes a live preview table');

const fullApHtml = env.sandbox.apUI();
assert.ok(fullApHtml.includes('Advanced: font, corners, table colour, table lines, stripes, icons'),
  'Advanced Appearance summary mentions table colour');

// 2. Selecting a custom colour updates CSS variables immediately and persists to localStorage
env.sandbox.vrUISet('ufn', 'serif');
env.sandbox.vrUISet('utz', 'on');
env.sandbox.vrUISet('utl', 'off');
env.sandbox.vrUISet('utc', 'off');
env.sandbox.vrTableColor.set('#1E3A5F');
assert.strictEqual(env.sandbox.vrTableColor.get(), '#1e3a5f', 'Table colour normalizes hex to lowercase');
assert.strictEqual(env.dataset.utcol, 'custom', 'Setting a colour enables data-utcol="custom"');
assert.strictEqual(env.styles['--tbl-raw'], '#1e3a5f', 'Raw table colour token is written');
assert.ok(env.styles['--tbl-hd-bg'] && env.styles['--tbl-hd-tx'] && env.styles['--tbl-bg'],
  'Header and body table CSS variables are applied');
const saved = JSON.parse(env.storage['vr-ui']);
assert.strictEqual(saved.utcol, '#1e3a5f', 'Selected table colour is saved in localStorage');

// 3. Persistence across sessions (fresh sandbox restores saved colour)
const reloaded = createSandbox(env.storage, false);
assert.strictEqual(reloaded.sandbox.vrTableColor.get(), '#1e3a5f', 'Table colour persists across page reloads');
assert.strictEqual(reloaded.dataset.utcol, 'custom', 'Reloaded session re-enables data-utcol="custom"');
assert.strictEqual(reloaded.styles['--tbl-raw'], '#1e3a5f', 'Reloaded session restores CSS variables');

// 4. Light Mode & Dark Mode contrast accessibility across extreme colours (WCAG AA >= 4.5:1)
const testColors = ['#14392b', '#1e3a5f', '#2563eb', '#facc15', '#ffffff', '#000000', '#808080', '#fb7185', '#e0f2fe', '#7c3aed', '#0f766e', '#92400e'];
for (const hex of testColors) {
  const lightPal = env.sandbox.vrTableColor.compute(hex, false);
  const darkPal = env.sandbox.vrTableColor.compute(hex, true);
  const lightCr = contrastRatio(lightPal['--tbl-hd-bg'], lightPal['--tbl-hd-tx']);
  const darkCr = contrastRatio(darkPal['--tbl-hd-bg'], darkPal['--tbl-hd-tx']);
  const lightMuCr = contrastRatio(lightPal['--tbl-hd-bg'], lightPal['--tbl-hd-mu']);
  const darkMuCr = contrastRatio(darkPal['--tbl-hd-bg'], darkPal['--tbl-hd-mu']);
  const lightTintCr = contrastRatio(lightPal['--tbl-hd-tint-bg'], lightPal['--tbl-hd-tint-tx']);
  const darkTintCr = contrastRatio(darkPal['--tbl-hd-tint-bg'], darkPal['--tbl-hd-tint-tx']);
  assert.ok(lightCr >= 4.5, `Light mode header contrast for ${hex} is ${lightCr.toFixed(2)} >= 4.5`);
  assert.ok(darkCr >= 4.5, `Dark mode header contrast for ${hex} is ${darkCr.toFixed(2)} >= 4.5`);
  assert.ok(lightMuCr >= 4.5, `Light mode muted header contrast for ${hex} is ${lightMuCr.toFixed(2)} >= 4.5`);
  assert.ok(darkMuCr >= 4.5, `Dark mode muted header contrast for ${hex} is ${darkMuCr.toFixed(2)} >= 4.5`);
  assert.ok(lightTintCr >= 4.5, `Light mode tinted header contrast for ${hex} is ${lightTintCr.toFixed(2)} >= 4.5`);
  assert.ok(darkTintCr >= 4.5, `Dark mode tinted header contrast for ${hex} is ${darkTintCr.toFixed(2)} >= 4.5`);
}

// Bright light-mode colours soften appropriately in Dark Mode
const brightLight = env.sandbox.vrTableColor.compute('#facc15', false);
const brightDark = env.sandbox.vrTableColor.compute('#facc15', true);
assert.ok(lum(brightDark['--tbl-hd-bg']) < lum(brightLight['--tbl-hd-bg']),
  'Bright colours darken cleanly in Dark Mode');

// Switching theme attribute triggers recalculation
env.sandbox.vrTableColor.set('#facc15');
const lightBgBefore = env.styles['--tbl-hd-bg'];
env.attrs['data-theme'] = 'dark';
env.triggerObserver();
assert.notStrictEqual(env.styles['--tbl-hd-bg'], lightBgBefore, 'Switching to Dark Mode recalculates table colour tokens');

// 5. Independent reset restores original table styling without changing other Advanced preferences
env.sandbox.vrTableColor.reset();
assert.strictEqual(env.sandbox.vrTableColor.get(), '', 'Reset clears table colour');
assert.strictEqual(env.dataset.utcol, undefined, 'Reset removes data-utcol attribute');
assert.strictEqual(env.styles['--tbl-hd-bg'], undefined, 'Reset clears custom table CSS properties');
const afterReset = JSON.parse(env.storage['vr-ui']);
assert.strictEqual(afterReset.utcol, '', 'Reset persists default table colour');
assert.strictEqual(afterReset.ufn, 'serif', 'Reset preserves Font preference');
assert.strictEqual(afterReset.utz, 'on', 'Reset preserves Striped rows preference');
assert.strictEqual(afterReset.utl, 'off', 'Reset preserves Row lines preference');
assert.strictEqual(afterReset.utc, 'off', 'Reset preserves Column lines preference');

// 6. Global vrUIReset also clears Table Colour
env.sandbox.vrTableColor.set('#0f766e');
env.sandbox.vrUIReset();
assert.strictEqual(env.sandbox.vrTableColor.get(), '', 'Global vrUIReset resets Table Colour');
assert.strictEqual(env.dataset.utcol, undefined, 'Global vrUIReset removes data-utcol');

// 7. Invalid hex values are safely rejected
const corrupted = createSandbox({ 'vr-ui': JSON.stringify({ utcol: 'javascript:alert(1)' }) }, false);
assert.strictEqual(corrupted.sandbox.vrTableColor.get(), '', 'Invalid stored utcol is ignored safely');
assert.strictEqual(corrupted.dataset.utcol, undefined, 'Invalid utcol does not activate custom styling');

// 8. CSS & HTML integration assertions
assert.ok(apCss.includes('html[data-utcol="custom"]:not([data-minimal-theme="true"])'),
  'Global table colour CSS respects Minimal theme');
assert.ok(apCss.includes('[data-uhd="tint"]') && apCss.includes('[data-uhd="line"]'),
  'Table colour CSS integrates with Table header styles (Tinted & Underlined)');
assert.ok(apCss.includes('[data-utz="on"]') && apCss.includes('[data-utl="off"]') &&
  apCss.includes('[data-utc="on"]') && apCss.includes('[data-utc="off"]'),
  'Table colour CSS preserves Striped rows, Row lines, and Column lines settings');
assert.ok(indexHtml.includes('dashboard-preferences.js?v=145') &&
  indexHtml.includes('appearance-pro.css?v=6') &&
  indexHtml.includes('appearance-pro.js?v=6'),
  'index.html loads updated asset versions');

console.log('Table Colour: picker, live preview, Light/Dark WCAG contrast, persistence, independent reset verified');
