#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules', 'report-filters', 'report-filters.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appCore = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const reportShell = appCore.indexOf('function repRows()');
const moduleScript = html.indexOf('<script src="modules/report-filters/report-filters.js?v=134"></script>');
const reportColumns = html.indexOf('<script src="modules/report-columns/report-columns.js?v=127"></script>');
const appCoreTag = html.indexOf('<script src="modules/app-core/app.js?v=165"></script>');
assert.ok(reportShell >= 0 && appCoreTag >= 0 && moduleScript > appCoreTag && reportColumns > moduleScript, 'Report filters load after the report shell and before report-columns module');
assert.ok(!html.includes('Reports: multi-select dropdowns for asset class and holding'), 'Report filter logic is no longer duplicated inline');
assert.ok(html.includes('<style>@import url("modules/report-filters/report-filters.css?v=134");</style>'), 'Filter styles remain at their original cascade position');

const assets = [
  { id: 'fund-1', cat: 'Equity', name: 'Growth Fund', ret: 0.1, add: 1200 },
  { id: 'fund-2', cat: 'Equity', name: 'Index Fund', ret: 0.08, add: 0 },
  { id: 'ppf-1', cat: 'Retirement', name: 'PPF', ret: 0.07, add: 5000 }
];
const listeners = {};
const rendered = [];
const UI = { tab: 'Reports', rsel: null, rcl: null, msd: null };
const document = {
  addEventListener(name, callback) { listeners[name] = callback; },
  querySelectorAll() { return []; }
};
const window = { render() { rendered.push('render'); } };
const context = {
  window,
  document,
  S: { assets },
  CATS: ['Equity', 'Retirement'],
  CC: { Equity: '#0f766e', Retirement: '#1d4ed8' },
  UI,
  repSel() { return { all: UI.rsel == null, idx: UI.rsel || assets.map((asset, index) => index) }; },
  esc: value => String(value),
  escn: value => String(value),
  render() { rendered.push('render'); }
};
vm.createContext(context);
vm.runInContext(source, context);

assert.strictEqual(typeof window.rsDrops, 'function', 'Existing report filter markup API remains exposed');
let markup = window.rsDrops();
assert.ok(markup.includes('Asset class') && markup.includes('Growth Fund') && markup.includes('PPF'), 'Dropdowns list asset classes and holdings');
assert.ok(markup.includes('data-msda="cols:all"'), 'Columns dropdown actions remain connected to report columns');

listeners.change({ target: { dataset: { rcls: 'Equity' }, checked: false } });
assert.deepStrictEqual(Array.from(context.UI.rsel), [ 'ppf-1' ], 'Unchecking a class removes every holding in that class');
assert.deepStrictEqual(Array.from(context.UI.rcl), [ 'Retirement' ], 'Asset-class selection is synchronized with selected holdings');
assert.strictEqual(rendered.length, 1, 'Changing an asset-class filter rerenders the report');

markup = window.rsDrops();
assert.ok(markup.includes('<b>Retirement</b>'), 'Dropdown summary reflects the selected asset class');
listeners.change({ target: { dataset: { rh: 'fund-1' }, checked: true } });
assert.deepStrictEqual(Array.from(context.UI.rsel), [ 'fund-1', 'ppf-1' ], 'Checking a holding adds it without dropping current selections');
assert.deepStrictEqual(Array.from(context.UI.rcl), [ 'Equity', 'Retirement' ], 'Holding selections synchronize category filter state');

console.log('  ok   report filter module preserves dropdowns, selection state, and render behavior');
