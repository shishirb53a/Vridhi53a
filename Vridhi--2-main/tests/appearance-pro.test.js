#!/usr/bin/env node
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html'), settings = read('modules/settings/settings.js'), pro = read('modules/theme/professional-themes.js'),
  ap = read('modules/theme/appearance-pro.js'), css = read('modules/theme/appearance-pro.css'),
  minimal = read('modules/theme/minimal.css'), prefs = read('modules/dashboard-preferences/dashboard-preferences.js');

/* theme presets, legacy keys still resolve */
let storedTheme = 'mono';
const attributes = {};
const sandbox = { window: { matchMedia: () => ({ matches: false, addEventListener() {} }) }, localStorage: { getItem: () => storedTheme, setItem(key, value) { storedTheme = value; } } };
sandbox.document = { documentElement: { getAttribute: name => attributes[name] || null, setAttribute(name, value) { attributes[name] = value; }, removeAttribute(name) { delete attributes[name]; }, style: { setProperty() {}, removeProperty() {} } }, body: null, addEventListener() {}, querySelectorAll: () => [] };
sandbox.window.document = sandbox.document; sandbox.window.localStorage = sandbox.localStorage; sandbox.matchMedia = sandbox.window.matchMedia; sandbox.MutationObserver = function () { this.observe = () => {}; };
vm.createContext(sandbox); vm.runInContext(pro, sandbox);
assert.deepStrictEqual(Array.from(sandbox.window.vrPro.T.map(t => t[0])), ['ledger', 'bank', 'graphite', 'minimal'], 'Four professional themes');
assert.strictEqual(sandbox.window.vrPro.get(), 'graphite', 'A saved legacy "mono" theme maps to Graphite');
sandbox.window.vrPro.set('minimal');
assert.strictEqual(attributes['data-minimal-theme'], 'true', 'Minimal theme enables its presentation mode');
sandbox.window.vrPro.set('ledger');
assert.strictEqual(attributes['data-minimal-theme'], undefined, 'Other themes disable Minimal presentation mode');
const theme = { window: { matchMedia: () => ({ matches: false, addEventListener() {} }) }, document: { documentElement: { dataset: {}, style: { setProperty() {} }, removeAttribute() {} }, addEventListener() {} } };
theme.window.document = theme.document; vm.createContext(theme); vm.runInContext(read('modules/theme/theme.js'), theme);
assert.deepStrictEqual(Array.from(theme.window.THEMES.map(t => t.c)), ['#0b2545', '#14392b', '#3b4252'], 'Brand colours for the three themes');
theme.window.VRTheme.configure({ getState: () => ({ cc: '#065f46' }) });
assert.strictEqual(theme.window.brandOf(), '#14392b', 'A legacy emerald accent maps to Private bank');

/* one Appearance screen, no floating Look menu */
assert.ok(!html.includes('id="lk-sw"') && !html.includes('skin-selector.js'), 'The floating Look menu is gone');
assert.ok(html.includes('data-skin","enterprise"'), 'One layout skin is always applied');
assert.ok(html.includes('modules/theme/minimal.css?v=1') && /k: 'minimal', n: 'Minimal'/.test(ap),
  'Minimal theme is available from Appearance and its styles load after the app stylesheets');
assert.ok(minimal.includes('background-image:none!important') && minimal.includes('box-shadow:none!important') &&
  minimal.includes(':focus-visible{outline:2px solid var(--ac)!important'),
  'Minimal theme removes decoration without removing visible keyboard focus');
assert.ok(html.indexOf('appearance-pro.js') > html.indexOf('dashboard-preferences.js') && html.indexOf('appearance-pro.js') > html.indexOf('professional-themes.js'),
  'appearance-pro.js loads after the modules whose controls it wraps');
assert.ok(settings.includes('window.apUI?window.apUI()'), 'Settings uses the simplified Appearance screen');
assert.ok(!/Display mode/.test(settings.split('const look=')[1].split('`;')[0]), 'Display mode is a segmented control, not a dropdown');
assert.ok(/ap-adv/.test(ap) && /Advanced: font, corners/.test(ap), 'Detailed options sit under an Advanced fold');
assert.ok(!/uth:\[/.test(prefs) && !/utd:\[/.test(prefs), 'Duplicate colour-theme and table-density dropdowns are removed');
assert.ok(/id = 'ap-mode'/.test(ap), 'Header light/dark toggle');
assert.ok(/\.sx-hero[^{]*\{background:var\(--card\)!important/.test(css), 'Planner cards are white, not tinted grey');
console.log('Appearance: four themes, one screen, header toggle, flat planner cards');
