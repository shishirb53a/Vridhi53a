#!/usr/bin/env node
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html'), settings = read('modules/settings/settings.js'), pro = read('modules/theme/professional-themes.js'),
  ap = read('modules/theme/appearance-pro.js'), css = read('modules/theme/appearance-pro.css'), prefs = read('modules/dashboard-preferences/dashboard-preferences.js');

/* three themes, legacy keys still resolve */
const sandbox = { window: { matchMedia: () => ({ matches: false, addEventListener() {} }) }, localStorage: { getItem: () => 'mono', setItem() {} } };
sandbox.document = { documentElement: { getAttribute: () => null, style: { setProperty() {}, removeProperty() {} } }, body: null, addEventListener() {}, querySelectorAll: () => [] };
sandbox.window.document = sandbox.document; sandbox.window.localStorage = sandbox.localStorage; sandbox.matchMedia = sandbox.window.matchMedia; sandbox.MutationObserver = function () { this.observe = () => {}; };
vm.createContext(sandbox); vm.runInContext(pro, sandbox);
assert.deepStrictEqual(Array.from(sandbox.window.vrPro.T.map(t => t[0])), ['ledger', 'bank', 'graphite'], 'Three professional themes');
assert.strictEqual(sandbox.window.vrPro.get(), 'graphite', 'A saved legacy "mono" theme maps to Graphite');
const theme = { window: { matchMedia: () => ({ matches: false, addEventListener() {} }) }, document: { documentElement: { dataset: {}, style: { setProperty() {} }, removeAttribute() {} }, addEventListener() {} } };
theme.window.document = theme.document; vm.createContext(theme); vm.runInContext(read('modules/theme/theme.js'), theme);
assert.deepStrictEqual(Array.from(theme.window.THEMES.map(t => t.c)), ['#0b2545', '#14392b', '#3b4252'], 'Brand colours for the three themes');
theme.window.VRTheme.configure({ getState: () => ({ cc: '#065f46' }) });
assert.strictEqual(theme.window.brandOf(), '#14392b', 'A legacy emerald accent maps to Private bank');

/* one Appearance screen, no floating Look menu */
assert.ok(!html.includes('id="lk-sw"') && !html.includes('skin-selector.js'), 'The floating Look menu is gone');
assert.ok(html.includes('data-skin","enterprise"'), 'One layout skin is always applied');
assert.ok(html.indexOf('appearance-pro.js') > html.indexOf('dashboard-preferences.js') && html.indexOf('appearance-pro.js') > html.indexOf('professional-themes.js'),
  'appearance-pro.js loads after the modules whose controls it wraps');
assert.ok(settings.includes('window.apUI?window.apUI()'), 'Settings uses the simplified Appearance screen');
assert.ok(!/Display mode/.test(settings.split('const look=')[1].split('`;')[0]), 'Display mode is a segmented control, not a dropdown');
assert.ok(/ap-adv/.test(ap) && /Advanced: font, corners/.test(ap), 'Detailed options sit under an Advanced fold');
assert.ok(!/uth:\[/.test(prefs) && !/utd:\[/.test(prefs), 'Duplicate colour-theme and table-density dropdowns are removed');
assert.ok(/id = 'ap-mode'/.test(ap), 'Header light/dark toggle');
assert.ok(/\.sx-hero[^{]*\{background:var\(--card\)!important/.test(css), 'Planner cards are white, not tinted grey');
console.log('Appearance: three themes, one screen, header toggle, flat planner cards');
