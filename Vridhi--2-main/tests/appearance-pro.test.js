#!/usr/bin/env node
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html'), settings = read('modules/settings/settings.js'), pro = read('modules/theme/professional-themes.js'),
  ap = read('modules/theme/appearance-pro.js'), css = read('modules/theme/appearance-pro.css'),
  prefs = read('modules/dashboard-preferences/dashboard-preferences.js');

function lum(hex) {
  const c = hex.replace('#', '');
  const rgb = [0, 2, 4].map(i => {
    const v = parseInt(c.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function cr(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* 1. Six premium enterprise themes replace all legacy themes; legacy keys migrate seamlessly */
let storedTheme = 'forest';
const attributes = {};
const styles = {};
const sandbox = {
  window: { matchMedia: () => ({ matches: false, addEventListener() {} }) },
  localStorage: { getItem: () => storedTheme, setItem(key, value) { storedTheme = value; } }
};
sandbox.document = {
  documentElement: {
    getAttribute: name => attributes[name] || null,
    setAttribute(name, value) { attributes[name] = value; },
    removeAttribute(name) { delete attributes[name]; },
    style: {
      setProperty(k, v) { styles[k] = v; },
      removeProperty(k) { delete styles[k]; }
    }
  },
  body: null,
  addEventListener() {},
  querySelectorAll: () => []
};
sandbox.window.document = sandbox.document;
sandbox.window.localStorage = sandbox.localStorage;
sandbox.matchMedia = sandbox.window.matchMedia;
sandbox.MutationObserver = function () { this.observe = () => {}; };
vm.createContext(sandbox);
vm.runInContext(pro, sandbox);

const expectedKeys = ['obsidian', 'emerald', 'zurich', 'meridian', 'platinum', 'bordeaux'];
assert.deepStrictEqual(Array.from(sandbox.window.vrPro.T.map(t => t[0])), expectedKeys, 'Six enterprise themes are registered');
for (const oldKey of ['forest', 'bank', 'graphite', 'minimal']) {
  assert.ok(!expectedKeys.includes(oldKey), `Legacy theme "${oldKey}" has been removed`);
}

/* Legacy localStorage migration */
assert.strictEqual(sandbox.window.vrPro.get(), 'emerald', 'Legacy "forest" migrates to Institutional Emerald');
storedTheme = 'bank';
assert.strictEqual(sandbox.window.vrPro.get(), 'zurich', 'Legacy "bank" migrates to Swiss Limestone');
storedTheme = 'graphite';
assert.strictEqual(sandbox.window.vrPro.get(), 'platinum', 'Legacy "graphite" migrates to Platinum Carbon');
storedTheme = 'minimal';
assert.strictEqual(sandbox.window.vrPro.get(), 'platinum', 'Legacy "minimal" migrates to Platinum Carbon');
storedTheme = 'default';
assert.strictEqual(sandbox.window.vrPro.get(), 'obsidian', 'Legacy "default" migrates to Sovereign Slate');
storedTheme = 'unknown-value';
assert.strictEqual(sandbox.window.vrPro.get(), 'obsidian', 'Unknown saved theme safely defaults to Sovereign Slate');

/* Selecting any theme sets data-pro-theme, clears data-minimal-theme, and applies calibrated tokens */
for (const entry of sandbox.window.vrPro.T) {
  const [key, name, desc, light, dark] = entry;
  sandbox.window.vrPro.set(key);
  assert.strictEqual(attributes['data-pro-theme'], key, `${name} sets data-pro-theme`);
  assert.strictEqual(attributes['data-minimal-theme'], undefined, `${name} never activates legacy minimal mode`);
  assert.strictEqual(styles['--bg'], light.bg, `${name} applies light canvas`);
  assert.strictEqual(styles['--card'], light.card, `${name} applies light card surface`);

  /* WCAG AA/AAA text legibility check in Light & Dark modes */
  assert.ok(cr(light.tx, light.card) >= 7.0, `${name} light primary text achieves WCAG AAA`);
  assert.ok(cr(light.mu, light.card) >= 4.5, `${name} light muted text achieves WCAG AA`);
  assert.ok(cr(dark.tx, dark.card) >= 7.0, `${name} dark primary text achieves WCAG AAA`);
  assert.ok(cr(dark.mu, dark.card) >= 4.5, `${name} dark muted text achieves WCAG AA`);
}

/* 2. Theme colour module (theme.js) preserves all APIs & WCAG contrast */
const theme = {
  window: { matchMedia: () => ({ matches: false, addEventListener() {} }) },
  document: { documentElement: { dataset: {}, style: { setProperty() {} }, removeAttribute() {} }, addEventListener() {} }
};
theme.window.document = theme.document;
vm.createContext(theme);
vm.runInContext(read('modules/theme/theme.js'), theme);
assert.deepStrictEqual(
  Array.from(theme.window.THEMES.map(t => t.k)),
  expectedKeys,
  'theme.js registers all 6 enterprise brand accents'
);
theme.window.VRTheme.configure({ getState: () => ({ cc: null }) });
assert.strictEqual(theme.window.brandOf(), '#0f2a4a', 'Default brand accent is Sovereign Slate (#0f2a4a)');
theme.window.VRTheme.configure({ getState: () => ({ cc: '#1d4ed8' }) });
assert.strictEqual(theme.window.brandOf(), '#1d4ed8', 'Custom accent hex is preserved directly');

/* 3. Appearance UI, removal of minimal.css, and full preservation of Settings controls */
assert.ok(!html.includes('modules/theme/minimal.css'), 'Legacy minimal.css link is removed from index.html');
assert.ok(!fs.existsSync(path.join(root, 'modules', 'theme', 'minimal.css')), 'Legacy minimal.css file is deleted');
assert.ok(!html.includes('id="lk-sw"') && !html.includes('skin-selector.js'), 'The floating Look menu stays removed');
assert.ok(html.includes('data-skin","enterprise"'), 'Enterprise layout skin is always applied');
assert.ok(html.indexOf('appearance-pro.js') > html.indexOf('dashboard-preferences.js') && html.indexOf('appearance-pro.js') > html.indexOf('professional-themes.js'),
  'appearance-pro.js loads after the modules whose controls it wraps');
assert.ok(settings.includes('window.apUI?window.apUI()'), 'Settings uses the Appearance screen');
assert.ok(/ap-adv/.test(ap) && /Advanced: font, corners, table colour/.test(ap), 'Detailed options sit under an Advanced fold');
assert.ok(!/uth:\[/.test(prefs) && !/utd:\[/.test(prefs), 'Duplicate colour-theme and table-density dropdowns remain removed');
assert.ok(/uwt:\['Text weight'/.test(prefs) && /uwt:'normal'/.test(prefs), 'Advanced Appearance retains persisted text-weight dropdown');
assert.ok(/id = 'ap-mode'/.test(ap), 'Header light/dark toggle is preserved');
assert.ok(/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/.test(css), 'Theme picker renders a balanced 3x2 enterprise grid');

console.log('Enterprise themes: 6 calibrated Light/Dark themes, WCAG AAA/AA verified, legacy migration & all Appearance controls preserved');
