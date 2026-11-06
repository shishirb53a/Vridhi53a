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
const moduleScript = html.indexOf('<script src="modules/retirement-planner/engine.js?v=130"></script>');
const uiScript = html.indexOf('<script src="modules/retirement-planner/ui.js?v=151"></script>');
const bodyEnd = html.indexOf('</body>');
assert.ok(moduleScript >= 0 && uiScript > moduleScript, 'Retirement Planner engine loads before its UI');
assert.ok(!html.includes('<script id="fh-engine">'), 'Retirement Planner engine is no longer duplicated inline');
assert.ok(!html.includes('<script id="fh-ui">'), 'Retirement Planner UI is no longer duplicated inline');
assert.ok(bodyEnd > uiScript, 'Retirement Planner UI loads before the document ends');
assert.ok(!/\bdocument\s*\.|\blocalStorage\b|\bfetch\s*\(/.test(source), 'Engine stays independent of DOM, storage, and network APIs');
assert.ok(uiSource.includes('window.FreedomHorizon'), 'Extracted UI consumes the existing calculation engine API');
for (const label of ['Serial No', 'Age at Year-End', 'Key Events', 'Monthly Household Expense', 'Annual Household Expense',
  'Total Expenses', 'Opening Corpus', 'Investment Interest', 'Emergency Fund Interest', 'Total Income', 'Closing Corpus', 'Funding Status',
  'Rental Income', 'Agriculture Income', ' Payout', 'hz-expense', 'hz-income'])
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
assert.strictEqual(engine.FIELDS.length, 65, 'Engine field catalogue remains available');
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
