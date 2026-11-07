#!/usr/bin/env node
'use strict';
/* Regression test: Policies owns its client selector and must not show Goal Planner clients in the shared header. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'modules', 'retirement-planner', 'ui.js'), 'utf8');
const start = src.indexOf('window.fhpBar = function () {');
assert.ok(start > -1, 'fhpBar exists');
const end = src.indexOf('\n  };', start);
const body = src.slice(start + 'window.fhpBar = function () {'.length, end);

const run = tab => {
  const el = { hidden: true, innerHTML: '' };
  const document = { getElementById: id => (id === 'fhp' ? el : null) };
  const win = { gppBarHTML: () => 'GOAL-PLANNER-CLIENT-BAR' };
  new Function('GP', 'UI', 'document', 'window', 'fhpEnsure', 'fhpBarHTML', body)(
    ['Dashboard', 'Holdings', 'Reports'], { tab }, document, win, () => ({}), () => 'RETIREMENT-CLIENT-BAR');
  return el;
};

for (const tab of ['Dashboard', 'Holdings', 'Reports']) assert.strictEqual(run(tab).hidden, false, tab + ' still shows the Client section');
assert.strictEqual(run('Policies').hidden, true, 'Policies does not show the Goal Planner Client section');
const policyUI = fs.readFileSync(path.join(__dirname, '..', 'modules', 'policy', 'policy-ui.js'), 'utf8');
assert.ok(policyUI.includes('var L = V.clients()'), 'Policies builds its client list from Policy clients');
assert.ok(policyUI.includes("V.selectClient(t.value)"), 'Policies switches between Policy clients');
for (const tab of ['Retirement planner', 'RP Reports']) assert.strictEqual(run(tab).innerHTML, 'RETIREMENT-CLIENT-BAR', tab + ' keeps its own Client section');
console.log('Policies uses its own client selector without showing Goal Planner clients');
