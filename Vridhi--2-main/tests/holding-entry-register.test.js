#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules', 'holding-entry-register', 'entry-register.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appCore = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const moduleScript = html.indexOf('<script src="modules/holding-entry-register/entry-register.js?v=134"></script>');
const profileModule = html.indexOf('<script src="modules/goal-planner-clients/goal-planner-clients.js?v=143"></script>');
const reportShell = appCore.indexOf('if(UI.rv===\'ent\'&&window.repEnt)');
const appCoreTag = html.indexOf('<script src="modules/app-core/app.js?v=165"></script>');
const bodyEnd = html.indexOf('</body>');
assert.ok(profileModule >= 0 && moduleScript > profileModule, 'Register module loads after the holding data provider');
assert.ok(reportShell >= 0 && appCoreTag >= 0 && moduleScript > appCoreTag, 'Register module loads after the report shell');
assert.ok(bodyEnd > moduleScript, 'Register module loads before the document ends');
assert.ok(!html.includes('<script id="vr-ent">'), 'Register logic is no longer duplicated inline');
assert.ok(html.includes('<style>@import url("modules/holding-entry-register/entry-register.css?v=132");</style>'), 'Register styles are loaded at their original cascade position');

const listeners = {};
const clients = [
  { id: 'one', name: 'Current Client', active: true, items: [
    { name: 'Equity Fund', cat: 'Equity', val: 250000, ca: '2026-04-04T00:00:00Z', ma: '2026-04-06T00:00:00Z' },
    { name: 'Old PPF', cat: 'Retirement', val: 150000, ca: '', ma: '' }
  ] },
  { id: 'two', name: 'Second Client', active: false, items: [
    { name: 'Bond', cat: 'Fixed income', val: 100000, ca: '2025-03-01T00:00:00Z', ma: '2025-03-03T00:00:00Z' }
  ] }
];
const window = { gppHoldingList: () => clients };
const context = {
  window,
  Date: class extends Date { static now() { return Date.parse('2026-06-01T00:00:00Z'); } },
  document: {
    addEventListener(name, callback) { listeners[name] = callback; },
    getElementById() { return null; }
  },
  navigator: {},
  rvTog: () => '<div class="report-tabs"></div>',
  render() {},
  esc: value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
  f: value => '₹ ' + String(value),
  rf: value => String(value),
  fdd: value => value ? value.slice(0, 10) : '',
  ymdLoc: value => value ? value.slice(0, 10) : ''
};
vm.createContext(context);
vm.runInContext(source, context);

let result = window.repEntData();
assert.strictEqual(result.L.length, 3, 'Report sees all holdings across client portfolios');
assert.strictEqual(result.d.all.length, 3, 'Report includes all holdings');
assert.deepStrictEqual(Array.from(result.L.map(row => row.name)), ['Equity Fund', 'Bond', 'Old PPF'], 'Date sorting puts newest holdings first and unset dates last');
assert.strictEqual(result.L[2].t, null, 'Missing entry dates are represented as unset');

const markup = window.repEnt();
assert.ok(markup.includes('Holdings Entry Register') && markup.includes('Not set'), 'Report renders heading and missing-date information');
assert.ok(markup.includes('Equity Fund') && markup.includes('Second Client'), 'Report renders holdings across clients');
assert.ok(!markup.includes('₹'), 'Entry-register report amounts omit currency symbols');

listeners.change({ target: { id: 'entr', value: 'unset' } });
result = window.repEntData();
assert.strictEqual(result.L.length, 1, 'Unset-date filter returns only holdings without an entry date');
assert.strictEqual(result.L[0].name, 'Old PPF', 'Unset-date filter preserves the matching holding');

listeners.change({ target: { id: 'entr', value: 'all' } });
listeners.change({ target: { id: 'entc', value: 'two' } });
result = window.repEntData();
assert.strictEqual(result.L.length, 1, 'Client filter applies alongside the date filter');
assert.strictEqual(result.L[0].name, 'Bond', 'Client filter returns that client holdings');

console.log('  ok   Holdings Entry Register module preserves data, rendering, and filtering');
