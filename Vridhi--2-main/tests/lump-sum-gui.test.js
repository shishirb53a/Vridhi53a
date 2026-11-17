#!/usr/bin/env node
'use strict';
/* Retirement Planner > Planning Period > Lump Sum: GUI follows the Income tab pattern (read-only grid + one editor,
   Edit / Delete, Undo, "Check" pills, fixed-width layout) with concise requested labels. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const mod = (...p) => fs.readFileSync(path.join(__dirname, '..', 'modules', ...p), 'utf8');
const ui = mod('retirement-planner', 'ui.js');
const css = mod('app-shell', 'goal-timeline.css');
const help = mod('help', 'help.js');
const reports = mod('reports', 'ui.js');

/* visible headers and editor labels use the concise requested names */
for (const label of ['title="Source">Source', 'title="Amount">Amount', 'title="Year">Year',
  'title="ROI %">ROI %', 'title="Annual Income (\\u20b9)">Annual Income (\\u20b9)', 'title="Principal">Principal'])
  assert.ok(ui.includes(label), 'requested table header: ' + label);
for (const label of ['"Source", false', '"Amount", true', '"Year", true', '"ROI %", true', '"Principal", true',
  '>Keep</option>', '>Withdraw</option>'])
  assert.ok(ui.includes(label), 'requested editor label or treatment: ' + label);
assert.ok(ui.includes('data-fh-plan="lump"') && ui.indexOf('data-fh-plan="income"') < ui.indexOf('data-fh-plan="lump"'), 'Lump Sum tab sits right of Income');

/* Income-style interaction: grid actions, editor with Done / Cancel, undo after delete, empty state */
for (const hook of ['data-fh-lump-edit', 'data-fh-lump-delete', 'data-fh-lump-done', 'data-fh-lump-cancel', 'id="fh-lumpundo"', 'id="fh-lump-undo"', 'No lump sums yet', 'fh-lump-editors'])
  assert.ok(ui.includes(hook), 'ui.js has ' + hook);
assert.ok(!ui.includes('data-fh-lump-duplicate') && !ui.includes('fhLumpDuplicate'), 'duplicate action is removed');
assert.ok(/function undoLumpDelete\(/.test(ui) && /function finishLump\(/.test(ui) && /function cancelLump\(/.test(ui), 'undo, Done and Cancel handlers exist');
assert.ok(!ui.includes('fh-chk-warn') && !ui.includes('is-incomplete') &&
  !ui.includes('will be ignored in calculations. Edit the row and fill the required fields.') &&
  ui.includes('fh-chk">Check'), 'grid omits incomplete status but preserves validation errors');
assert.ok(!ui.includes('fh-lump-warning'), 'lump-sum incomplete warning is removed');
assert.ok(!ui.includes('Years available:') && !ui.includes('Lump sums are added to the general corpus in the year received. Keep invested'), 'the two information lines were removed from the tab');
assert.ok(/lumpEdit = Number\(m\[1\]\)/.test(ui), 'a validation issue on a lump row opens that row\'s editor');
assert.ok(ui.includes('lumpUndo = null') && /FH\.lumpEdit = 0; FH\.lumpNew = 0; FH\.lumpUndo = null;/.test(ui), 'lump editor state resets with the plan');

/* layout: no sideways scrolling table and the calculated annual-income cell is marked */
assert.ok(!/min-width:920px/.test(css), 'lump table no longer forces a 920px width');
assert.ok(/\.fh-lumptbl\{[^}]*table-layout:fixed/.test(css), 'lump table uses a fixed layout like Income');
assert.ok(/fh-auto-chip/.test(css) && /fh-lump-empty/.test(css), 'styles for the Auto chip and empty state');
assert.ok(ui.includes('class="fh-lump-auto"') && !ui.includes('class="fh-auto-chip"'), 'annual income uses the requested label without an Auto chip');

/* text: lump sums are modeled, so the disclaimer and the Help must not say otherwise */
assert.ok(!/lump sums and market volatility are not modeled/.test(ui), 'planner disclaimer no longer says lump sums are not modeled');
assert.ok(!/lump sums and market volatility are not modeled/.test(reports), 'report disclaimer no longer says lump sums are not modeled');
assert.ok(help.includes('Planning Period > Lump Sum'), 'Help describes the Lump Sum tab');
assert.ok(!help.includes('(one lump sum, calendar-year steps, no new contributions)'), 'Help no longer calls the model a single lump sum');
console.log('Lump Sum tab follows the Income tab pattern, uses short headers, and its texts match the behaviour');
