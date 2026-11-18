#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules', 'retirement-planner', 'engine.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'modules', 'retirement-planner', 'ui.js'), 'utf8');
const reportCss = fs.readFileSync(path.join(root, 'modules', 'retirement-planner', 'year-by-year.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const moduleScript = html.indexOf('<script src="modules/retirement-planner/engine.js?v=132"></script>');
const uiScript = html.indexOf('<script src="modules/retirement-planner/ui.js?v=159"></script>');
const bodyEnd = html.indexOf('</body>');
assert.ok(moduleScript >= 0 && uiScript > moduleScript, 'Retirement Planner engine loads before its UI');
assert.ok(!html.includes('<script id="fh-engine">'), 'Retirement Planner engine is no longer duplicated inline');
assert.ok(!html.includes('<script id="fh-ui">'), 'Retirement Planner UI is no longer duplicated inline');
assert.ok(bodyEnd > uiScript, 'Retirement Planner UI loads before the document ends');
assert.ok(!/\bdocument\s*\.|\blocalStorage\b|\bfetch\s*\(/.test(source), 'Engine stays independent of DOM, storage, and network APIs');
assert.ok(uiSource.includes('window.FreedomHorizon'), 'Extracted UI consumes the existing calculation engine API');
assert.ok(uiSource.includes('document.addEventListener("focusout"') && !uiSource.includes('root.addEventListener("focusout"'),
  'Amount formatting uses delegated focusout because the planner root is created on demand');
assert.ok(uiSource.indexOf('data-fh-plan="lump"') > uiSource.indexOf('data-fh-plan="income"'), 'Lump Sum follows Income in Planning Period tabs');
assert.ok(uiSource.includes('Principal is spent in the year received. No ongoing income.'), 'Spent principal explains that there is no ongoing income');
assert.ok(!uiSource.includes('Lump sums are added to the general corpus'), 'Lump-sum explanatory text is removed');
for (const label of ['title="Source">Source', 'title="Amount">Amount', 'title="Year">Year',
  'title="ROI %">ROI %', 'title="Annual Income (\\u20b9)">Annual Income (\\u20b9)', 'title="Principal">Principal',
  '>Keep</option>', '>Withdraw</option>'])
  assert.ok(uiSource.includes(label), `Lump-sum table includes the requested label: ${label}`);
assert.ok(!uiSource.includes('data-fh-lump-duplicate') && !uiSource.includes('fhLumpDuplicate'),
  'Lump-sum rows no longer offer duplicate actions');
for (const label of ['Serial No', 'Age at Year-End', 'Key Events', 'Monthly Household Expense', 'Annual Household Expense',
  'Total Expenses', 'Opening Corpus', 'Investment Interest', 'Emergency Fund Interest', 'Total Income', 'Closing Corpus', 'Funding Status',
  'Rental Income', 'Agriculture Income', ' Payout', 'Lump Sums Received', 'Lump Sums Spent', 'hz-expense', 'hz-income'])
  assert.ok(uiSource.includes(label) || reportCss.includes(label),
    `Year-by-year report defines meaningful header or amount styling: ${label}`);
assert.ok(uiSource.includes('function hzUniqueColumnLabels(groups)') && uiSource.includes('hzUniqueColumnLabels(g);'),
  'Year-by-year report disambiguates duplicate column labels across all groups');

const context = {};
vm.createContext(context);
vm.runInContext(source, context);

const engine = context.FreedomHorizon;
assert.ok(engine, 'Engine exposes the existing FreedomHorizon global API');
const inputs = engine.defaults();
assert.strictEqual(engine.FIELDS.length, 71, 'Engine field catalogue remains available');
assert.strictEqual(engine.stepsFor(0).length, 4, 'A plan without children has four wizard steps');
assert.strictEqual(JSON.stringify(engine.defaultAllocation(1000000, 0)), JSON.stringify({ houseFund: 400000, buffer: 100000 }), 'Default bucket allocation remains available');

inputs.children = '0';
inputs.houseFund = 0;
inputs.buffer = 0;
assert.deepStrictEqual(Array.from(engine.validateAll(inputs)), [], 'A valid no-children plan passes validation');
const result = engine.calculate(inputs);
assert.strictEqual(result.ok, true, 'Valid inputs calculate successfully');
assert.strictEqual(result.rows[result.rows.length - 1].name, 'TOTAL', 'Calculation includes its total row');
assert.ok(Number.isFinite(result.needed) && result.needed > 0, 'Calculation returns a finite present-day funding need');
assert.strictEqual(result.available, 30000000, 'Calculation carries through the available corpus');
console.log('  ok   Retirement Planner engine loads independently and calculates a valid plan');

engine.setClock(() => new Date('2026-01-01T00:00:00Z'));
const manyIncomeInputs = engine.defaults();
manyIncomeInputs.children = '0';
manyIncomeInputs.houseFund = 0;
manyIncomeInputs.buffer = 0;
manyIncomeInputs.incomeOn = '1';
manyIncomeInputs.incomeCount = '6';
for (let k = 1; k <= 6; k++) {
  for (const [part, value] of Object.entries({
    incName: `Source ${k}`,
    incAmt: String(k * 1000),
    incGrowth: '0',
    incFrom: '2027',
    incTo: '2200'
  })) manyIncomeInputs[engine.incomeField(part, k).id] = value;
}
assert.deepStrictEqual(Array.from(engine.validateAll(manyIncomeInputs)), [], 'Plans can validate more than five independent income sources');
const incomeRow = engine.horizonReport(manyIncomeInputs)[0];
assert.strictEqual(incomeRow.incomeBySource[1], 1000, 'Year-by-year rows retain the first source amount');
assert.strictEqual(incomeRow.incomeBySource[6], 6000, 'Year-by-year rows retain sources beyond the old five-source limit');
assert.strictEqual(incomeRow.income, 21000, 'Per-source reporting preserves the existing aggregate income calculation');
console.log('  ok   Retirement Planner reports retain the annual amount for every added income source');

context.__vrExtraStreams = () => [
  { k: 101, name: 'Policy: Tata AIA', byYear: { 2027: 11000, 2028: 12000 }, fromY: 2027, toY: 2028 },
  { k: 102, name: 'Policy: LIC', byYear: { 2027: 21000 }, fromY: 2027, toY: 2027 }
];
const policyRow = engine.horizonReport(engine.defaults())[0];
assert.strictEqual(policyRow.policyBySource[101], 11000, 'Year-by-year rows retain Tata AIA payouts by policy');
assert.strictEqual(policyRow.policyBySource[102], 21000, 'Year-by-year rows retain LIC payouts by policy');
assert.strictEqual(policyRow.policy, 32000, 'Per-policy reporting preserves the total payout amount');
console.log('  ok   Retirement Planner reports retain each policy payout separately');

engine.setClock(() => new Date('2029-01-01T00:00:00Z'));
const lumpBase = engine.defaults();
lumpBase.children = '0';
lumpBase.houseFund = 0;
lumpBase.buffer = 0;
lumpBase.age = 48;
lumpBase.until = 53;
lumpBase.retire = 53;
lumpBase.preOn = '0';
lumpBase.monthly = 1000;
lumpBase.houseInflation = 0;
lumpBase.roi = 10;
lumpBase.corpus = 5000000;
const legacyShape = Object.assign({}, lumpBase);
delete legacyShape.lumpCount;
assert.deepStrictEqual(engine.calculate(lumpBase), engine.calculate(legacyShape), 'Plans without lump sums preserve their prior calculation result');

const keep = Object.assign({}, lumpBase, {
  lumpCount: '1',
  lumpLabel1: 'Maturity',
  lumpAmount1: '1000000',
  lumpYear1: '2030',
  lumpRate1: '7',
  lumpTreatment1: 'keep'
});
assert.deepStrictEqual(Array.from(engine.validateAll(keep)), [], 'A valid lump sum in the planning period passes validation');
const keepRows = engine.horizonReport(keep, { currentYear: 2029 });
assert.strictEqual(keepRows[0].year, 2030, 'Lump sum year uses the report calendar year');
assert.strictEqual(keepRows[0].lumpReceived, 1000000, 'Principal is shown as a receipt in the received year');
assert.strictEqual(keepRows[0].income, 0, 'A kept lump sum earns no income in its received year');
assert.strictEqual(keepRows[1].income, 70000, 'A kept lump sum starts its stated annual income the next year');
assert.strictEqual(keepRows[1].lumpIncomeBySource[1], 70000, 'Lump income remains attributable to its source in reports');
assert.strictEqual(keepRows[4].income, 70000, 'Lump income continues through the end of the planning period');
const baseRows = engine.horizonReport(lumpBase, { currentYear: 2029 });
assert.strictEqual(keepRows[0].lumpHeld, 1000000, 'Kept principal is held outside the corpus in the received year');
assert.strictEqual(keepRows[0].end - baseRows[0].end, 0, 'Kept principal does not enter the corpus in the received year');
assert.strictEqual(keepRows[1].end - baseRows[1].end, 70000, 'Held principal does not compound in the corpus; only its stated income is added');
const keepLast = keepRows[keepRows.length - 1], baseLast = baseRows[baseRows.length - 1];
assert.strictEqual(keepLast.lumpAdded, 1000000, 'Remaining kept principal is added in the final plan year');
assert.ok(keepRows.slice(0, -1).every(row => row.lumpAdded === 0), 'Kept principal is added only in the final year');
assert.ok(keepLast.what.includes('Lump sum principal added to the closing corpus'), 'Final-year event notes the principal added');
assert.ok(keepLast.end - baseLast.end >= 1000000, 'Closing corpus in the final year includes the full kept principal');
keepRows.forEach((row, n) => assert.ok(Math.abs(row.start + row.moneyIn - row.spent - row.lumpSpent - row.lumpHeld - row.end) < 0.01,
  'Year ' + (n + 1) + ': closing corpus = opening + money in - money out, with kept principal added only at the end'));

assert.strictEqual(engine.schedule(keep, 53, { currentYear: 2029 })[1].in - engine.schedule(lumpBase, 53, { currentYear: 2029 })[1].in, 1000000,
  'Cash-flow projection includes the year-end principal inflow');
assert.ok(engine.calculate(keep).needed < engine.calculate(lumpBase).needed, 'Lump sums reduce present-day funding need and affect FI metrics');
const allocationTotal = engine.bucketsAt(keep, 53).reduce((total, bucket) => total + bucket.value, 0);
assert.ok(Math.abs(allocationTotal - engine.schedule(keep, 53, { currentYear: 2029 }).at(-1).bal) < 0.01,
  'Un earmarked lump-sum principal flows into the general growth bucket without changing total-corpus parity');
console.log('  ok   Kept lump sums are held outside the corpus, pay income from the following year, and join the final closing corpus');

const spent = Object.assign({}, keep, { lumpTreatment1: 'spent', lumpRate1: '0' });
assert.deepStrictEqual(Array.from(engine.validateAll(spent)), [], 'Spent principal with a zero rate passes validation');
const spentRows = engine.horizonReport(spent, { currentYear: 2029 });
assert.strictEqual(spentRows[0].lumpReceived, 1000000, 'Spent principal remains visible as a receipt');
assert.strictEqual(spentRows[0].lumpSpent, 1000000, 'Spent principal is shown as a same-year outflow');
assert.strictEqual(spentRows[0].end, baseRows[0].end, 'Receipt and spending have zero net corpus effect in the received year');
assert.ok(spentRows.every(row => row.income === 0), 'Spent principal produces no ongoing income');
assert.ok(spentRows.every(row => row.lumpAdded === 0 && row.lumpHeld === 0), 'Spent principal is never added to the closing corpus');
console.log('  ok   Spent lump sums are net-zero same-year cash flows and produce no income');

const twoLumps = Object.assign({}, keep, {
  lumpCount: '2',
  lumpLabel2: 'Bonus',
  lumpAmount2: '2000000',
  lumpYear2: '2032',
  lumpRate2: '4',
  lumpTreatment2: 'keep'
});
const twoRows = engine.horizonReport(twoLumps, { currentYear: 2029 });
assert.strictEqual(twoRows[1].income, 70000, 'The first lump sum continues after a second sum is added');
assert.strictEqual(twoRows[3].income, 150000, 'A second lump sum starts income after its own receipt year');
assert.strictEqual(twoRows[2].lumpReceived, 2000000, 'The second principal arrives in its selected year');
twoLumps.lumpCount = '1';
assert.strictEqual(engine.horizonReport(twoLumps, { currentYear: 2029 })[2].lumpReceived, 0, 'Removing a row removes its cash-flow effect');
console.log('  ok   Multiple lump sums are independent and removing one removes its effect');

const incomplete = Object.assign({}, lumpBase, { lumpCount: '1', lumpAmount1: '1000000', lumpYear1: '', lumpRate1: '', lumpTreatment1: 'keep' });
assert.deepStrictEqual(Array.from(engine.validateAll(incomplete)), [], 'Incomplete rows warn rather than blocking a plan');
assert.strictEqual(engine.lumpSumSummary(incomplete).rows[0].complete, false, 'Incomplete rows are identified for UI warnings');
assert.strictEqual(engine.horizonReport(incomplete, { currentYear: 2029 })[0].lumpReceived, 0, 'Incomplete rows are ignored in calculations');
const incompleteOutside = Object.assign({}, incomplete, { lumpYear1: '2035' });
assert.deepStrictEqual(Array.from(engine.validateAll(incompleteOutside)), [], 'Incomplete out-of-period rows stay warning-only');
assert.strictEqual(engine.lumpSumRows(incompleteOutside)[0].outsidePlan, true, 'An out-of-period incomplete row remains visibly flaggable');

const grouped = Object.assign({}, keep, { lumpAmount1: '25,00,000' });
assert.deepStrictEqual(Array.from(engine.validateAll(grouped)), [], 'Indian-grouped lump-sum amounts validate');
assert.strictEqual(engine.lumpSumStreams(grouped)[0].amount, 2500000, 'Indian-grouped amounts parse to the intended rupee value');
for (const [field, value] of [['lumpAmount1', '-1'], ['lumpRate1', '100.01'], ['lumpRate1', '7.123']]) {
  const invalid = Object.assign({}, keep, { [field]: value });
  assert.ok(engine.validateAll(invalid).some(issue => issue.field === field), `${field} rejects ${value}`);
}
const outside = Object.assign({}, keep, { lumpYear1: '2035' });
assert.ok(engine.validateAll(outside).some(issue => issue.field === 'lumpYear1'), 'Years outside the planning period are rejected');
const shortened = Object.assign({}, keep, { until: 52, lumpYear1: '2034' });
assert.ok(engine.lumpSumRows(shortened)[0].outsidePlan, 'Changing the planning period flags rather than deletes an out-of-period row');
console.log('  ok   Lump sums validate ranges, accept Indian grouping, and leave incomplete rows out of calculations');
