const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('modules/reports/annual-helpers.js');
const css = read('modules/reports/annual-helpers.css');
const html = read('index.html');

function test(name, fn) { fn(); console.log(`  ok   ${name}`); }

/* run the module with a minimal page stub so its pure helpers can be checked */
const sandbox = { window: {}, document: { readyState: 'loading', addEventListener() {} }, localStorage: { getItem() { return null; }, setItem() {} }, MutationObserver: function () {}, setTimeout, clearTimeout };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'annual-helpers.js' });
const H = sandbox.VRAnnualHelpers;

test('annual table helpers are loaded after the Columns feature and styled last', () => {
  assert.ok(html.indexOf('modules/reports/annual-helpers.js?v=') > html.indexOf('modules/report-columns/report-columns.js?v='), 'script runs after report-columns');
  assert.ok(html.indexOf('modules/reports/annual-helpers.css?v=') > html.indexOf('modules/reports/retirement-row.css?v='), 'stylesheet comes after the report styles');
});

test('column keys map to plain groups and hints', () => {
  assert.strictEqual(H.groupOf('v3'), 'h');
  assert.strictEqual(H.groupOf('int'), 'i');
  assert.strictEqual(H.groupOf('mi'), 'i');
  assert.strictEqual(H.groupOf('tot'), 'b');
  assert.strictEqual(H.groupOf('year'), 'y');
  assert.ok(H.hintOf('mi').length > 0 && H.hintOf('v0').includes('lakh') && H.hintOf('year') === '');
});

test('Every 5 years keeps Today, 5th years, the retirement row and the selected row', () => {
  assert.strictEqual(H.keepRow(2027, false, false, false, 5), false);
  assert.strictEqual(H.keepRow(2030, false, false, false, 5), true);
  assert.strictEqual(H.keepRow(2026, true, false, false, 5), true);
  assert.strictEqual(H.keepRow(2034, false, true, false, 5), true);
  assert.strictEqual(H.keepRow(2028, false, false, true, 5), true);
  assert.strictEqual(H.keepRow(2027, false, false, false, 1), true);
});

test('existing filters and report columns are left alone', () => {
  assert.ok(!/rsDrops|#rq|#rsf|#rsd|data-rk\s*=|removeChild|appendChild\(\s*cs/.test(source.replace(/data-rk\]/g, '')), 'helpers never rebuild the filters, search, sort or column reordering');
  assert.ok(/display:none/.test(css) && !/\bdelete\b/.test(source), 'quick views only hide cells');
});

console.log('Annual Portfolio Projection helper tests passed');
