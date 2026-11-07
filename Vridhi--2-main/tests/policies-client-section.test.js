#!/usr/bin/env node
'use strict';
/* Regression test: the header Client section must be shown on the Policies tab.
   Policies live in the open client's plan (S.policies), so the person must see, and be able to change, whose policies are on screen. */
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
assert.strictEqual(run('Policies').hidden, false, 'Policies shows the Client section');
assert.strictEqual(run('Policies').innerHTML, 'GOAL-PLANNER-CLIENT-BAR', 'Policies uses the same Client switcher as the Goal Planner');
for (const tab of ['Retirement planner', 'RP Reports']) assert.strictEqual(run(tab).innerHTML, 'RETIREMENT-CLIENT-BAR', tab + ' keeps its own Client section');
console.log('The Client section is shown on the Policies tab');
