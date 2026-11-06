#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules', 'report-columns', 'report-columns.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appCore = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const renderer = appCore.indexOf('function render(){');
const moduleScript = html.indexOf('<script src="modules/report-columns/report-columns.js?v=127"></script>');
const appCoreTag = html.indexOf('<script src="modules/app-core/app.js?v=165"></script>');
const bodyEnd = html.indexOf('</body>');
assert.ok(renderer >= 0 && appCoreTag >= 0 && moduleScript > appCoreTag && bodyEnd > moduleScript, 'Report-column module loads after the main renderer');
assert.ok(html.includes('<style>@import url("modules/report-columns/report-columns.css?v=126");</style>'), 'Report-column styles load at their original cascade position');

const listeners = {};
const stored = new Map([
  ['fwt4-cols', JSON.stringify({ year: { add: false, a: true, pay: false } })],
  ['fwt4-cols-ord', JSON.stringify({ year: ['add', 'v'], sav: ['Debt', 'Equity'] })]
]);
const window = { render() {} };
const context = {
  window,
  document: {
    addEventListener(name, callback) { listeners[name] = callback; },
    getElementById() { return null; },
    querySelector() { return null; }
  },
  localStorage: {
    getItem(key) { return stored.get(key) || null; },
    setItem(key, value) { stored.set(key, value); }
  },
  S: { assets: [] },
  CATS: [],
  VRPolicy: { hasPayouts() { return true; } },
  UI: { rv: 'year' },
  render() {}
};
vm.createContext(context);
vm.runInContext(source, context);

assert.strictEqual(window.RCOLS.vis('year', 'year'), true, 'Fixed columns remain visible');
assert.strictEqual(window.RCOLS.vis('year', 'add'), false, 'Saved visibility choices are applied');
assert.strictEqual(window.RCOLS.vis('year', 'a'), true, 'Saved optional-column visibility is applied');
assert.strictEqual(window.RCOLS.annualMonthlyIncome(120, 12, false), 10,
  'Hidden policy payouts are excluded from annual monthly income');
listeners.change({ target: { dataset: { rcs: 'year:pay' }, checked: true } });
assert.strictEqual(window.RCOLS.annualMonthlyIncome(120, 12, false), 11,
  'Selected policy payouts are included in annual monthly income');
assert.strictEqual(window.RCOLS.annualMonthlyIncome(120, 12, true), 1,
  'Policy payouts remain monthly income after all holdings mature');
assert.deepStrictEqual(Array.from(window.RCOLS.catOrder(['Equity', 'Debt'])), ['Debt', 'Equity'], 'Saved category ordering is applied');
assert.strictEqual(typeof window.rcolsUI, 'function', 'Settings UI API remains available');
assert.strictEqual(typeof window.__colsAct, 'function', 'Report actions API remains available');
assert.ok(listeners.change && listeners.click, 'Report controls keep their change and click handlers');
console.log('  ok   report-column module preserves visibility, ordering, and app interfaces');
