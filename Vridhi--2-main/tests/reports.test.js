#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appCore = fs.readFileSync(path.join(root, 'modules/app-core/app.js'), 'utf8');
const files = [
  ['modules/reports/monthly-projection.js', 'monthly-projection.js'],
  ['modules/reports/report-selection.js', 'report-selection.js'],
  ['modules/reports/roi-summary.js', 'roi-summary.js'],
  ['modules/reports/interest-income.js', 'interest-income.js']
];
const positions = files.map(([file, tag]) => {
  const versions = { 'monthly-projection.js': '140', 'report-selection.js': '139', 'roi-summary.js': '148', 'interest-income.js': '138' };
  const marker = `<script src="modules/reports/${tag}?v=${versions[tag]}"></script>`;
  const index = html.indexOf(marker);
  assert.ok(index >= 0, `${tag} is loaded synchronously from index.html`);
  assert.strictEqual(html.indexOf(marker, index + 1), -1, `${tag} is included only once`);
  return index;
});
assert.ok(positions[0] < positions[1] && positions[1] < positions[2], 'Report scripts preserve their original initialization order');
assert.ok(!html.includes('window.monthData=function()'), 'Monthly projection code is no longer inline');
assert.ok(!html.includes('window.repSel=function()'), 'Report selection code is no longer inline');
assert.ok(!html.includes('window.intData=function()'), 'Interest statement code is no longer inline');
assert.ok(html.includes('modules/reports/report-redesign.css?v=149'), 'Report picker styles are loaded');
assert.ok(appCore.includes("['frf','fsf','rsf','cf','sf','rv'].includes(id)"),
  'Read-only users can still switch between reports');

const assets = [
  { id: 1, name: 'PPF', cat: 'Retirement', type: 'fund', value: 1000, ret: 0.06, add: 120, madd: 10, amon: 4, cmp: 'ppf', icr: true, yrs: 4 },
  { id: 2, name: 'Bank', cat: 'Cash', type: 'fund', value: 500, ret: 0.04, add: 0, madd: 0, amon: 4, cmp: 'annual', icr: false, yrs: 4 }
];
const state = {
  start: 2026,
  ret: 41,
  members: [{ name: 'Self', role: 'Self' }],
  assets,
  grat: { rem: 0 }
};
const listeners = {};
const policy = {
  monthPayout() { return 0; },
  hasPayouts() { return false; }
};
const context = {
  S: state,
  UI: { tab: 'Reports', rv: 'month', rsel: null, rcl: null, rq: '', rk: 'a', rd: 1, sel: null },
  CATS: ['Retirement', 'Cash'],
  COL: [],
  VRPolicy: policy,
  RCOLS: {
    showPolicyPayouts: false,
    annualMonthlyIncome(interest, payout, allMatured) {
      const policyIncome = this.showPolicyPayouts && payout > 0 ? payout : 0;
      if (interest == null && !policyIncome || allMatured && !policyIncome) return null;
      return ((allMatured ? 0 : (interest || 0)) + policyIncome) / 12;
    }
  },
  rf(value) { return String(value); },
  document: {
    addEventListener(name, callback) { (listeners[name] ||= []).push(callback); },
    querySelectorAll() { return []; }
  },
  calc() {
    return {
      ri: 1,
      rows: [
        { a: 1, year: 2026, v: [1000, 500], tot: 1500, age: [40], st: [''] },
        { a: 2, year: 2027, v: [1300, 520], tot: 1820, age: [41], st: [''] }
      ]
    };
  },
  fyInfo(asset) {
    return {
      e: { a0: 2, mo: 4 },
      first: true,
      act: true,
      ms: Array(12).fill(true),
      n: 12,
      w: 78,
      yp: asset.add > 0,
      rem: 12,
      days: 365
    };
  },
  mcm(balance, asset) { return Array(12).fill(balance + asset.madd * 12 + asset.add); },
  matOf() { return null; },
  FYM(month) { return month >= 4 ? month - 4 : month + 8; },
  render() {},
  esc(value) { return String(value); },
  escn(value) { return String(value); },
  f(value) { return '₹ ' + String(value); },
  lk(value) { return String(value); },
  hin(value) { return String(value); },
  rowRoi() { return 0; },
  rowRoiTxt() { return '0%'; },
  rowRoiPct() { return 0; },
  fyl(value) { return String(value); },
  sh(value) { return String(value); },
  matDone() { return false; },
  polTiVal(interest, payout) { return (interest || 0) + payout; },
  polTiTxt() { return '0'; },
  allMat() { return false; },
  depShow() { return 0; },
  repMin() { return ''; },
  repNone() { return '<div>None</div>'; }
};
context.window = context;
vm.createContext(context);
for (const [file] of files) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
const window = context;

const reportOptions = ['year', 'month', 'int', 'sav', 'ent', 'hold'];
assert.ok(Array.isArray(window.RV_VIEWS) && reportOptions.every(value => window.RV_VIEWS.some(v => v[0] === value)),
  'The Reports menu retains each existing report and Holdings');
assert.strictEqual(window.rvTog, undefined, 'The old tab row is replaced by the bottom-bar Reports menu');
let renderCount = 0;
context.render = () => { renderCount++; };
listeners.click.forEach(callback => callback({
  target: { closest(selector) { return selector === '[data-rv]' ? { dataset: { rv: 'sav' } } : null; } }
}));
assert.strictEqual(window.UI.rv, 'sav', 'Selecting a tab changes the report view');
assert.strictEqual(renderCount, 1, 'Changing report view rerenders the report content');
assert.strictEqual(window.UI.rq, '', 'Switching reports clears the previous report search');
assert.strictEqual(window.UI.rd, 1, 'Switching reports resets sort direction');
listeners.click.forEach(callback => callback({
  target: { closest(selector) { return selector === '[data-rv]' ? { dataset: { rv: 'invalid' } } : null; } }
}));
assert.strictEqual(window.UI.rv, 'sav', 'Invalid tab values do not change the report');
assert.strictEqual(renderCount, 1, 'Invalid tab values do not trigger a render');
listeners.click.forEach(callback => callback({
  target: { closest(selector) { return selector === '[data-rv]' ? { dataset: { rv: 'hold' } } : null; } }
}));
assert.strictEqual(window.UI.tab, 'Holdings', 'The visible Holdings tab opens the Holdings view');
assert.strictEqual(renderCount, 2, 'The Holdings tab rerenders the selected view');
window.UI.rv = 'month';
const monthly = window.monthData();
assert.strictEqual(monthly.rows.length, 12, 'Monthly projection emits one row per month');
assert.strictEqual(monthly.rows[0].label, 'Apr 2026', 'Monthly projection starts at the financial-year boundary');
assert.strictEqual(monthly.rows[0].add, 130, 'First month includes its scheduled yearly and monthly contributions');
assert.strictEqual(monthly.rows[11].label, 'Mar 2027', 'Financial-year month labels end in March');
assert.strictEqual(monthly.rows[11].tot, 1820, 'Final month uses the annual forecast closing balance');
assert.strictEqual(typeof window.repMRows, 'function', 'Monthly report renderer interface is preserved');
assert.strictEqual(typeof window.monthCSV, 'function', 'Monthly CSV interface is preserved');
assert.ok(window.repMRows().includes('Apr 2026'), 'Monthly report renders the calculated rows');
assert.ok(!/<td\b[^>]*>[^<]*₹/.test(window.repMRows()), 'Monthly report row amounts omit currency symbols');
assert.ok(window.monthCSV().includes('"S.No","Month","Year"'), 'Monthly CSV retains its column headers');

window.UI.rsel = ['1'];
assert.deepStrictEqual(Array.from(window.repSel().idx), [0], 'Report selection resolves selected holding IDs');
window.UI.rsel = [];
assert.strictEqual(window.repSel().none, true, 'An empty holding selection remains explicit');
window.UI.rsel = null;
assert.strictEqual(typeof window.repMin, 'function', 'Shared annual/minimal report renderer interface is preserved');
const annualRows = [
  { a: 1, year: 2026, v: [1000, 500], tot: 1500, age: [40], st: [''], pay: 0 },
  { a: 2, year: 2027, v: [1300, 520], tot: 1820, age: [41], st: [''], pay: 1200 }
];
const minOptions = { label: 'As on', noun: 'years', yr: true, lab: row => '1 Apr ' + row.year, hl: () => false };
window.RCOLS.showPolicyPayouts = true;
let annualMin = window.repMin(annualRows, minOptions);
assert.ok(annualMin.includes('<b>106.66666666666667</b>'),
  'Selected annual reports include policy payouts in their monthly income');
assert.ok(!/<td\b[^>]*>[^<]*₹/.test(annualMin), 'Selected annual report row amounts omit currency symbols');
window.RCOLS.showPolicyPayouts = false;
annualMin = window.repMin(annualRows, minOptions);
assert.ok(annualMin.includes('<b>6.666666666666667</b>'),
  'Annual monthly income excludes payouts when the payout column is hidden');

const interest = window.intData();
assert.strictEqual(interest.rows[0].fy, 'FY 2026-27', 'Interest report uses the same financial-year range');
assert.strictEqual(interest.rows[0].ad[0], 240, 'Interest report additions include yearly and monthly contributions');
assert.strictEqual(interest.rows[0].it[0], 60, 'Interest report subtracts additions from closing balance');
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(window.intCalc(interest.rows[0], [0]))),
  { open: 1000, close: 1300, add: 240, intr: 60, mi: 5, yl: 0.06 },
  'Interest report metrics preserve opening, closing, additions, and yield calculations'
);
assert.strictEqual(typeof window.repIRows, 'function', 'Interest report renderer interface is preserved');
assert.strictEqual(typeof window.intCSV, 'function', 'Interest report CSV interface is preserved');
assert.ok(window.repIRows().includes('Interest<br>earned'), 'Interest report renders the statement columns');
assert.ok(!/<td\b[^>]*>[^<]*₹/.test(window.repIRows()), 'Interest report row amounts omit currency symbols');
assert.ok(window.intCSV().includes('"Interest earned"'), 'Interest statement CSV retains its column headers');

console.log('  ok   report modules preserve monthly projection, selection, and interest calculations');
