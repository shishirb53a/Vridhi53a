#!/usr/bin/env node
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
require(path.join(root, 'modules', 'retirement-planner', 'engine.js'));
require(path.join(root, 'modules', 'stress-test', 'engine.js'));
const FH = globalThis.FreedomHorizon, ST = globalThis.StressTest;
const src = fs.readFileSync(path.join(root, 'modules', 'stress-test', 'engine.js'), 'utf8');
assert.ok(!/\bdocument\s*\.|\blocalStorage\b|\bfetch\s*\(/.test(src), 'engine stays free of DOM, storage and network');

/* The workbook's Money Needed inputs, entered as a planner plan (no children, no other income, no lump sum, no earning phase). */
const inp = Object.assign(FH.defaults(), { age: 48, children: 0, until: 74, corpus: 30000000, roi: 8.05, preOn: '0',
  houseFund: 14000000, buffer: 1500000, bufferRoi: 6, monthly: 112000, houseInflation: 4, reduceAge: 60, reducePercent: 0,
  incomeOn: '0', lumpCount: '0' });
const base = ST.fromPlanner(inp);
assert.ok(base.ok, 'planner inputs convert');
const res = ST.run(base, ST.defaultSettings(), { now: new Date(2026, 10, 24) });
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const expect = [51.387, 70, 70, 30.451, 25.323, 70, 22.002, 29.43, 51.387, 51.387, 51.387, 48.821, 14.098, 70]; /* Stress Test!L6:L19 (workbook rounds G6 to 8.1%; ±0.15 yr) */
res.rows.forEach((r, i) => { if (i === 9 || i === 10) return; near(r.survival, expect[i], 0.15, 'scenario ' + (i + 1) + ' survival'); });
/* Scenarios 10 and 11 (side income): the workbook gates side income by "years other income continues" (Money Needed B42 = 0 in this file),
   so it never reached the balance and both rows equalled the base case. The module applies it for every plan year, so they must beat the base. */
assert.ok(res.rows[9].survival > res.rows[0].survival + 5 && res.rows[10].survival >= res.rows[9].survival, 'side-income scenarios improve survival');
assert.strictEqual(res.rows.length, 14);
assert.ok(res.rows[0].left > 5.9e7 && res.rows[0].left < 6.1e7, 'base money left at end of plan ~₹5.94 Cr');
assert.strictEqual(res.rows[4].left, null, 'bear market runs out before the plan ends');
assert.strictEqual(res.summary.minName.slice(0, 2), '13');
assert.strictEqual(res.summary.fullPlan, res.rows.filter(r => r.survival >= 26).length); assert.ok(res.summary.runOut <= 10);
assert.strictEqual(res.engine.length, 70);
/* Base case must agree with the planner's own plan: same ending balance at the end of the plan (reserve added back). */
const sim = FH.simulate(inp), last = sim.rows[sim.rows.length - 1];
near(res.rows[0].series[base.planYears - 1], last.total + 1500000, 1, 'base case equals planner year-by-year');
/* Settings are editable, including the two return settings moved from the Money Needed tab. */
const s2 = Object.assign(ST.defaultSettings(), { conservative: 0.05, optimistic: 0.10 });
const r2 = ST.run(base, s2);
assert.ok(r2.rows[7].survival < res.rows[7].survival && r2.rows[8].survival > res.rows[8].survival, 'scenario 8 and 9 follow the stress settings');
assert.strictEqual(ST.cleanSettings({ lean: 7 }).lean, 0.25, 'out-of-range settings fall back to defaults');
assert.deepStrictEqual(ST.cleanSettings(null), ST.defaultSettings(), 'no saved settings means the defaults');
assert.strictEqual(ST.cleanSettings({ lean: '' }).lean, 0.25, 'a blank setting means the default');
/* Incomplete plans are reported, not guessed. */
assert.strictEqual(ST.fromPlanner(Object.assign({}, inp, { corpus: '' })).ok, false);
assert.deepStrictEqual(ST.runsOutOn(1.5, new Date(2026, 10, 24)), { y: 2028, m: 5 });
console.log('stress-test-engine: all checks passed');
