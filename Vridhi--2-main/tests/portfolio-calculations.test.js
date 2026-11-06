#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const enginePath = path.join(root, 'modules', 'portfolio-calculations', 'engine.js');
const engineSource = fs.readFileSync(enginePath, 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appCorePath = path.join(root, 'modules', 'app-core', 'app.js');
const appCoreSource = fs.readFileSync(appCorePath, 'utf8');
const coreStart = appCoreSource.indexOf('//CALC-START');
const coreEnd = appCoreSource.indexOf('//CALC-END', coreStart);
const engineTag = html.indexOf('<script src="modules/portfolio-calculations/engine.js?v=136"></script>');
const appCoreTag = html.indexOf('<script src="modules/app-core/app.js?v=165"></script>');
assert.ok(coreStart >= 0 && coreEnd > coreStart, 'Goal Planner core block remains clearly bounded');
assert.ok(engineTag >= 0 && appCoreTag > engineTag, 'Calculation engine loads before app calculation adapters');
assert.ok(!appCoreSource.slice(coreStart, coreEnd).includes('function fyInfo('), 'Financial-year schedule logic is not duplicated in app core');
assert.ok(!appCoreSource.slice(coreStart, coreEnd).includes('function calc(s){const rows='), 'Forecast loop is not duplicated in app core');
assert.ok(!html.includes('//CALC-START'), 'Calculation adapters load from the extracted app core script');

const policy = {
  applyToRows(state, rows) {
    rows.forEach(row => {
      row.pay = 0;
      row.payR = 0;
    });
  }
};
const window = { VRPolicy: policy };
const context = {
  window,
  VRPolicy: policy,
  Date,
  Math,
  JSON,
  stg: (member, age) => 'stage-' + age
};
vm.createContext(context);
vm.runInContext(engineSource, context);
vm.runInContext(appCoreSource.slice(coreStart + '//CALC-START'.length, coreEnd), context);

const defaultForecast = vm.runInContext('calc(DEF())', context);
assert.deepStrictEqual(Array.from(defaultForecast.rows, row => row.tot), [
  24777224, 27816182, 31133217, 34732920, 38640076, 42881686,
  46419475, 50260903, 54432776, 58964316, 63887385, 69236720,
  75050207, 81369160, 88238643, 95707813, 103830298, 112664609,
  122274589, 132729909, 144106607, 156487674, 169963702, 184633589
], 'Default forecast totals remain unchanged');
assert.strictEqual(defaultForecast.ri, 9, 'Retirement row selection remains unchanged');
assert.strictEqual(defaultForecast.incT, 4923068.29853925, 'Retirement income calculation remains unchanged');

const ppfForecast = vm.runInContext(`(function(){
  const s = {
    start: 2026, end: 2035, ret: 48, members: [MB(1, 'Self', 'Self', 40)],
    grat: { basic: 0, svc: 0, rem: 0, cap: 0 }, policies: [],
    assets: [A(10, 'PPF', 'Retirement', 0, 0, 0, 0, undefined, 25196, 4,
      '2026-04-01', true, '2026-04', '2033-03', 'ppf')]
  };
  return calc(s);
})()`, context);
assert.deepStrictEqual(Array.from(ppfForecast.rows, row => row.add), [
  0, 302352, 302352, 302352, 302352, 302352, 302352, 302352, 0, 0
], 'Monthly PPF contributions from April 2026 through March 2033 are scheduled in the correct financial years');
assert.strictEqual(ppfForecast.rows[0].add, 0, 'Today row remains free of future deposits');
assert.strictEqual(ppfForecast.rows[1].v[0], 302352, 'First financial-year PPF balance includes all 12 deposits');

const maturityForecast = vm.runInContext(`(function(){
  const s = {
    start: 2026, end: 2035, ret: 48, members: [MB(1, 'Self', 'Self', 40)],
    grat: { basic: 0, svc: 0, rem: 0, cap: 0 }, policies: [],
    assets: [{
      id: 1, name: 'PPF maturity', cat: 'Retirement', type: 'fund', value: 100000,
      add: 12000, ret: 0.08, yrs: 0, madd: 2000, amon: 4, edate: '2026-10-07',
      icr: true, mfrom: '2026-11', mto: '2031-02', cmp: 'ppf',
      yfrom: '2027-04', yto: '2030-04', mat: 2030
    }]
  };
  return calc(s);
})()`, context);
assert.deepStrictEqual(Array.from(maturityForecast.rows, row => row.tot), [
  100000, 114058, 161182, 212077, 267043, 302865, 302865, 302865, 302865, 302865
], 'Maturity dates and contribution windows retain their original forecast');

const core = window.VRCalcCore;
assert.deepStrictEqual(JSON.parse(JSON.stringify(core.entry({ edate: '2026-10-07' }, { start: 2026 }))), {
  y: 2026, mo: 10, d: 7, fy: 2026, a0: 2
}, 'Entry dates retain the correct financial-year index');
assert.strictEqual(core.mIx('2026-13'), null, 'Invalid contribution months are rejected');
assert.strictEqual(core.mIx('2026-04'), 24315, 'Valid contribution months use the established month index');

console.log('  ok   Goal Planner engine preserves forecast and PPF contribution calculations');
