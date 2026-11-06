#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules', 'annual-savings', 'annual-savings.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appCore = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const renderer = appCore.indexOf('function repRows()');
const moduleScript = html.indexOf('<script src="modules/annual-savings/annual-savings.js?v=129"></script>');
const appCoreTag = html.indexOf('<script src="modules/app-core/app.js?v=165"></script>');
const bodyEnd = html.indexOf('</body>');
assert.ok(renderer >= 0 && appCoreTag >= 0 && moduleScript > appCoreTag && bodyEnd > moduleScript, 'Annual Savings module loads after the report renderer');
assert.ok(!html.includes('<script id="vr-sav">'), 'Annual Savings logic is no longer duplicated inline');

const assets = [
  { type: 'fund', cat: 'Equity', add: 100, madd: 10, fi: { act: true, yp: true, n: 12 } },
  { type: 'fund', cat: 'Debt', add: 500, madd: 25, fi: { act: true, yp: false, n: 8 } },
  { type: 'gratuity', cat: 'Gratuity', add: 999, madd: 99, fi: { act: true, yp: true, n: 12 } },
  { type: 'fund', cat: 'Paused', add: 100, madd: 10, fi: { act: false, yp: true, n: 12 } }
];
const listeners = {};
const ordered = ['Equity', 'Debt'];
const window = {
  RCOLS: { catOrder: categories => categories.slice().reverse() },
  repNone: () => '<div>Please select at least one investment.</div>'
};
const context = {
  window,
  RCOLS: window.RCOLS,
  S: {
    start: 2026,
    assets,
    members: [{ name: 'Self' }]
  },
  CATS: ['Debt', 'Equity'],
  UI: { rk: 'a', rq: '', rd: 1 },
  document: { addEventListener(name, callback) { listeners[name] = callback; } },
  repSel: () => ({ idx: [0, 1, 2, 3], none: false }),
  calc: () => ({
    ri: 1,
    rows: [
      { age: [30], add: 0 },
      { age: [31], add: 0 },
      { age: [32], add: 0 }
    ]
  }),
  fyInfo: asset => asset.fi,
  f: value => '₹ ' + String(value),
  rf: value => String(value),
  esc: value => String(value),
  escn: value => String(value),
  rvTog: () => '',
  rsDrops: () => ''
};
vm.createContext(context);
vm.runInContext(source, context);

const data = window.repSavData();
assert.deepStrictEqual(Array.from(data.cats), ordered, 'Categories follow the saved custom ordering');
assert.strictEqual(data.rows[0].fy, 'FY 2026-27', 'Annual rows use April-to-March financial years');
assert.strictEqual(data.rows[0].age, '31', 'Age is displayed at the end of the financial year');
assert.strictEqual(data.rows[0].by.Equity, 220, 'Yearly and monthly contributions are combined');
assert.strictEqual(data.rows[0].by.Debt, 200, 'Monthly-only contributions are counted for active months');
assert.strictEqual(data.rows[0].tot, 420, 'Year total sums contributions across categories');
assert.strictEqual(data.rows[0].ret, true, 'Retirement year is marked');
assert.strictEqual(data.rows[0].by.Gratuity, undefined, 'Gratuity and paused holdings are excluded');
const markup = window.repSavRows();
assert.ok(markup.includes('Annual savings schedule') && markup.includes('Retired'), 'Report table includes its title and retirement marker');
assert.ok(markup.includes('<td>220</td>') && !markup.includes('₹'), 'Annual savings amounts omit currency symbols');
assert.ok(listeners.click, 'CSV export click handler is registered');
assert.strictEqual(typeof window.repSav, 'function', 'Report renderer interface remains available');
console.log('  ok   Annual Savings Schedule module preserves report calculations and interfaces');
