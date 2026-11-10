#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules', 'value-on-date', 'value-on-date.js'), 'utf8');
const monthly = fs.readFileSync(path.join(root, 'modules', 'reports', 'monthly-projection.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'modules', 'portfolio-calculations', 'engine.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const columns = fs.readFileSync(path.join(root, 'modules', 'report-columns', 'report-columns.js'), 'utf8');
const coreStart = app.indexOf('//CALC-START');
const coreEnd = app.indexOf('//CALC-END', coreStart);
const moduleTag = '<script src="modules/value-on-date/value-on-date.js?v=2"></script>';
const styleTag = '<style>@import url("modules/value-on-date/value-on-date.css?v=1");</style>';
const appTag = '<script src="modules/app-core/app.js?v=171"></script>';
const columnTag = '<script src="modules/report-columns/report-columns.js?v=128"></script>';
const profileTag = '<script src="modules/goal-planner-clients/goal-planner-clients.js?v=144"></script>';
assert.ok(html.includes(moduleTag) && html.indexOf(moduleTag) > html.indexOf(appTag),
  'Value on Date loads after the report shell');
assert.ok(html.includes(styleTag) && html.indexOf(styleTag) < html.indexOf(moduleTag),
  'Value on Date styles load before the module');
assert.ok(html.indexOf(moduleTag) > html.indexOf(columnTag) && html.indexOf(moduleTag) > html.indexOf(profileTag),
  'The report loads after report columns and client plans');
assert.ok(monthly.includes('window.monthData=function(state)') && monthly.includes('calYear:cy,calMonth:cm+1'),
  'Monthly projection exposes its engine rows for a selected plan and calendar month');
assert.ok(app.includes("UI.rv==='vdate'&&window.repValueOnDate") && columns.includes("vdate:{fixed:['name','val']"),
  'The report is registered in Goal Planner and existing report-column preferences');
assert.ok(source.includes('window.rsDrops()') && source.includes('<div id="rr">'),
  'Value on Date uses the shared report filters and report-columns host');

const listeners = {};
const plan = {
  id: 'alice',
  name: 'Alice',
  active: true,
  state: {
    start: 2026,
    end: 2027,
    ret: 60,
    grat: { rem: 0 },
    members: [{ age: 40 }],
    assets: [
      { id: 1, name: 'Added later', cat: 'Equity', ca: '2026-05-02T00:00:00Z', ret: 0 },
      { id: 2, name: 'No entry date', cat: 'Cash', ca: '', ret: 0 },
      { id: 3, name: 'Snapshot holding', cat: 'Debt', ca: '2026-04-01T00:00:00Z', ret: 0 }
    ]
  }
};
const rows = [
  { calYear: 2026, calMonth: 4, label: 'Apr 2026', v: [10, 20, 30], ad: [0, 0, 0] },
  { calYear: 2026, calMonth: 5, label: 'May 2026', v: [11, 22, 33], ad: [0, 0, 0] },
  { calYear: 2026, calMonth: 6, label: 'Jun 2026', v: [12, 24, 36], ad: [0, 0, 0] }
];
const now = new Date();
rows.push({
  calYear: now.getFullYear(),
  calMonth: now.getMonth() + 1,
  label: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][now.getMonth()]} ${now.getFullYear()}`,
  v: [44],
  ad: [0]
});
const policy = { hasPayouts: () => false, receivedByDate: () => 0 };
const window = {
  gppClientList() {},
  gppSync() {},
  monthData() { return { rows, D: {} }; },
  VRPolicy: policy
};
const S = { polGp: true };
const context = {
  window,
  S,
  VRPolicy: policy,
  document: { addEventListener(name, callback) { listeners[name] = callback; } },
  sessionStorage: { getItem() { return '2026-04-01'; }, setItem() {} },
  ymdLoc: value => String(value || '').slice(0, 10),
  fdd: value => String(value || '').slice(0, 10),
  rf: value => '₹ ' + String(value),
  setTimeout() {},
  Date,
  Math,
  JSON,
  isFinite
};
vm.createContext(context);
vm.runInContext(source, context);

context.S.assets = plan.state.assets;
context.S.gpp = { active: plan.id, profiles: { [plan.id]: { name: plan.name, d: plan.state } } };
context.UI = { rsel: [] };
context.window.repSel = () => {
  const idx = context.S.assets.map((asset, index) => index)
    .filter(index => context.UI.rsel === null || context.UI.rsel.includes(String(context.S.assets[index].id)));
  return { all: context.UI.rsel === null || idx.length === context.S.assets.length,
    none: context.UI.rsel !== null && idx.length === 0, idx };
};
context.window.repNone = () => '<div class="em">Please select at least one investment.</div>';
context.window.rsDrops = () => '<div class="msds">shared filters</div>';
context.window.rptInfo = () => '';
context.window.rptCsv = () => '<button id="csv">Copy as CSV</button>';
context.document.getElementById = () => null;
const emptyReport = context.window.repValueOnDate();
assert.ok(emptyReport.includes('shared filters') && emptyReport.includes('Please select at least one investment.'),
  'The report renders shared filters and the existing empty state when no holding is selected');
assert.ok(!emptyReport.includes('Total value on'), 'The empty state does not show unfiltered report totals');
context.UI.rsel = ['3'];
const selectedCsv = context.window.valueOnDateCSV();
assert.ok(selectedCsv.includes('Snapshot holding,Debt,30,100.00%,Projected'),
  'CSV exports only selected holdings and calculates their share of the selected total');
assert.ok(selectedCsv.includes('Total,,30,100.00%,'), 'CSV total matches the selected holding value');

const api = window.VRValueDate;
assert.ok(api.parseDate('2024-02-29'), 'Leap-day calendar dates are valid');
assert.strictEqual(api.parseDate('2023-02-29'), null, 'Invalid leap days are rejected');
assert.strictEqual(api.daysInMonth(2024, 2), 29, 'Leap February has 29 days');
assert.strictEqual(api.daysInMonth(2026, 4), 30, 'April has 30 days');
assert.strictEqual(api.addDays('2024-02-28', 1), '2024-02-29', 'Day arithmetic advances into leap day');
assert.strictEqual(api.addDays('2024-02-29', 1), '2024-03-01', 'Day arithmetic handles leap month ends');
assert.strictEqual(api.addDays('2026-01-31', 1), '2026-02-01', 'Day arithmetic handles ordinary month ends');

assert.strictEqual(api.dateValue(rows, 1, '2026-05-01', plan.state.assets), 22,
  'A first-of-month value exactly matches the corresponding monthly projection row');
const midMonth = api.dateValue(rows, 1, '2026-05-16', plan.state.assets);
assert.ok(midMonth > 22 && midMonth < 24, 'A date within the month accrues between monthly engine balances');

const result = api.compute('2026-05-01', [plan], false);
assert.strictEqual(result.holdings, 2, 'Holdings added after the date are excluded');
assert.strictEqual(result.allHoldings, 3, 'The denominator includes all current holdings');
assert.strictEqual(result.excluded, 1, 'The excluded holding count is returned');
assert.strictEqual(result.notDated, 1, 'Holdings without an entry date are reported');
assert.strictEqual(result.total, 55, 'Only eligible holdings contribute to the total');

const selected = api.compute('2026-04-01', [plan], false, undefined, ['3']);
assert.strictEqual(selected.holdings, 1, 'Only the selected holding is counted');
assert.strictEqual(selected.allHoldings, 1, 'The holding count denominator uses selected holdings');
assert.strictEqual(selected.total, 30, 'The total uses only the selected holding value');

const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const enteredPlan = {
  id: 'entered',
  name: 'Entered',
  state: {
    start: now.getFullYear() - 1,
    end: now.getFullYear() + 1,
    assets: [{ id: 4, name: 'Entered value', cat: 'Cash', value: 44, edate: today, ca: today, ret: 0 }]
  }
};
const entered = api.compute(today, [enteredPlan], false);
assert.strictEqual(entered.rows[0].basis, 'Entered', 'The balance entered on the selected date is labelled Entered');
assert.strictEqual(entered.rows[0].value, 44, 'The entered balance is used on its as-of date');

const snapshots = [
  { created_at: '2026-04-30T12:00:00Z', data: { assets: [{ id: 3, value: 31 }] } },
  { created_at: '2026-05-04T12:00:00Z', data: { assets: [{ id: 3, value: 34 }] } },
  { created_at: '2026-05-06T12:00:00Z', data: { assets: [{ id: 3, value: 36 }] } }
];
const nearest = api.nearestSnapshot(snapshots, '2026-05-05', plan.state.assets[2]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(nearest)), { value: 34, date: '2026-05-04' },
  'The nearest snapshot on or before the selected date is selected per holding');
assert.strictEqual(api.snapshotBasis(nearest), 'Snapshot 2026-05-04',
  'Snapshot-backed holdings carry the selected snapshot date in their basis');

const csv = api.csvForRows([{ name: 'Equity, "Growth"', cat: 'Debt', value: 125000, basis: 'Snapshot 2026-05-04' }], 125000);
assert.ok(csv.startsWith('Holding,Category,Value on date,% of total,Basis\r\n'), 'CSV has the requested column headers');
assert.ok(csv.includes('"Equity, ""Growth"""'), 'CSV values with commas and quotes are escaped');
assert.ok(csv.includes('125000,100.00%,Snapshot 2026-05-04'), 'CSV includes the value, share, and basis');

const enginePolicy = {
  applyToRows() {},
  monthPayout() { return 0; },
  hasPayouts() { return false; },
  receivedByDate() { return 0; }
};
const engineWindow = { VRPolicy: enginePolicy };
const engineContext = {
  window: engineWindow,
  VRPolicy: enginePolicy,
  document: { addEventListener() {} },
  Date,
  Math,
  JSON,
  isFinite
};
vm.createContext(engineContext);
vm.runInContext(engine, engineContext);
vm.runInContext(app.slice(coreStart + '//CALC-START'.length, coreEnd), engineContext);
vm.runInContext(monthly, engineContext);
vm.runInContext(source, engineContext);
const engineState = vm.runInContext(`(function(){
  const s = DEF();
  s.start = 2026; s.end = 2027; s.members = [MB(1, 'Self', 'Self', 40)];
  s.assets = [s.assets[0]];
  return s;
})()`, engineContext);
const engineMonthly = engineWindow.monthData(engineState).rows.find(row => row.calYear === 2026 && row.calMonth === 5);
const engineValue = engineWindow.VRValueDate.compute('2026-05-01', [{
  id: 'engine', name: 'Engine', state: engineState
}], false);
assert.strictEqual(engineValue.rows[0].value, engineMonthly.v[0],
  'First-of-month report values match the real Monthly Portfolio Projection engine');
engineState.assets[0].edate = '2026-05-01';
const enteredMonth = engineWindow.monthData(engineState).rows.find(row => row.calYear === 2026 && row.calMonth === 5);
const enteredEngineValue = engineWindow.VRValueDate.compute('2026-05-01', [{
  id: 'engine-entered', name: 'Engine entry', state: engineState
}], false);
assert.strictEqual(enteredEngineValue.rows[0].value, enteredMonth.v[0],
  'An entered balance on the first of a month still matches the monthly projection engine');

console.log('  ok   Value on Date calendar, projection, entry-date, snapshot, and CSV behavior');
