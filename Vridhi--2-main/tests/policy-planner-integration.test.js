#!/usr/bin/env node
'use strict';
/* Policies <-> Retirement Planner hand-off.
   The Policies module finds retirement clients through window.fhpClientList (like window.gppClientList for the Goal Planner).
   The planner creates its client profiles lazily, so that function must exist and must create them; otherwise Policies shows
   "No Retirement Planner clients are available yet" and shared policy payouts never reach the planner. */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const mod = (...p) => fs.readFileSync(path.join(__dirname, '..', 'modules', ...p), 'utf8');

/* 1. the planner exports the function and builds profiles from it */
const ui = mod('retirement-planner', 'ui.js');
assert.ok(/window\.fhpClientList\s*=\s*\(\)\s*=>\s*fhpList\(\)\.map\(/.test(ui), 'retirement-planner/ui.js exports window.fhpClientList built on fhpList() (which creates S.fhp when missing)');
assert.ok(ui.indexOf('window.fhpClientList') > ui.indexOf('const fhpList ='), 'fhpClientList is defined after fhpList');

/* 2. Policies asks the planners for their clients before it decides nothing is shared */
const win = { document: { dispatchEvent() {} }, CustomEvent: function () {} }; win.window = win;
vm.createContext(win);
vm.runInContext(mod('policy', 'policy-core.js') + '\n;this.__setS=function(v){S=v};this.__getS=function(){return S}', win);
const V = win.VRPolicy;
const policy = V.clean([{ id: 'a', name: 'Tata', amt: 94000, freq: 'yearly', start: '2031-04-01', yrs: 5, lump: 0 }]);
const state = () => ({
  start: 2026, polFh: true, polGp: true, policies: [], fhp: null,
  polClients: { active: 'pc', profiles: { pc: { name: 'Asha', policies: policy, enabled: { goal: false, retirement: true }, share: { goal: [], retirement: ['asha'] }, created: 1 } } }
});

win.__setS(state());
assert.deepStrictEqual(Array.from(win.__vrExtraStreams(2030)), [], 'without the planner API nothing is shared and no payouts reach the planner');

win.fhpClientList = function () {            // what the planner does: build the first profile on demand
  const s = win.__getS(); if (!s.fhp) s.fhp = { active: 'asha', profiles: { asha: { name: 'Asha' } } };
  return [{ id: 'asha', name: 'Asha' }];
};
const unloaded = state();
V.cleanClients(unloaded.polClients, { polFh: true, polGp: true }, unloaded);
win.__setS(unloaded);
const afterLoad = win.__vrExtraStreams(2030);
assert.strictEqual(afterLoad.length, 1, 'cleaning a plan before lazy Retirement Planner initialization preserves its policy share');
assert.strictEqual(afterLoad[0].name, 'Policy: Tata');

win.__setS(state());
const streams = win.__vrExtraStreams(2030);
assert.strictEqual(streams.length, 1, 'a policy shared with a not-yet-created retirement profile reaches the planner once the profile is created');
assert.strictEqual(streams[0].name, 'Policy: Tata');
assert.strictEqual(streams[0].fromY, 2031);

win.__setS(Object.assign(state(), { polClients: { active: 'pc', profiles: { pc: { name: 'Asha', policies: policy, enabled: { goal: false, retirement: false }, share: { goal: [], retirement: ['asha'] }, created: 1 } } } }));
assert.deepStrictEqual(Array.from(win.__vrExtraStreams(2030)), [], 'switching the Retirement Planner off in Policies still stops the payouts');

win.__setS(Object.assign(state(), { polClients: { active: 'pc', profiles: { pc: { name: 'Asha', policies: policy, enabled: { goal: false, retirement: true }, share: { goal: [], retirement: ['someone-else'] }, created: 1 } } } }));
assert.deepStrictEqual(Array.from(win.__vrExtraStreams(2030)), [], 'a policy shared only with another client is not counted');
delete win.fhpClientList;

/* 3. regression: planner cache must change when linked policies change; linked premium-only policies are listed */
assert.ok(/function result\(\)\s*\{[\s\S]{0,600}policyStreams\(\)[\s\S]{0,300}const key = JSON\.stringify\(FH\.v\) \+ "\|" \+ pk;/.test(ui), 'planner result() cache key includes policy payouts');
const termOnly = V.clean([{ id: 't', name: 'taaaa', amt: 0, freq: 'yearly', start: '2026-11-07', yrs: 10, lump: 0, prem: { amt: 3250000, freq: 'yearly', start: '2026-11-07', yrs: 10 } }]);
win.fhpClientList = function () { const s = win.__getS(); if (!s.fhp) s.fhp = { active: 'live', profiles: { live: { name: 'Live Plan Validation' } } }; return [{ id: 'live', name: 'Live Plan Validation' }]; };
win.__setS({ start: 2026, polFh: true, polGp: true, policies: [], fhp: { active: 'live', profiles: { live: { name: 'Live Plan Validation' } } },
  polClients: { active: 'pc', profiles: { pc: { name: 'abc', policies: termOnly, enabled: { goal: false, retirement: true }, share: { goal: [], retirement: ['live'] }, created: 1 } } } });
assert.strictEqual(V.linkedPolicies('retirement').length, 1, 'a premium-only policy shared with the planner client is reported as linked');
assert.strictEqual(win.__vrExtraStreams(2026).length, 0, 'a premium-only policy has no payout stream');
assert.ok(/linkedPolicies/.test(ui), 'planner lists linked policies');
delete win.fhpClientList;
console.log('Policies and the Retirement Planner hand over clients and payouts correctly');
