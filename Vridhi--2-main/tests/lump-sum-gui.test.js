#!/usr/bin/env node
'use strict';
/* Retirement Planner > Planning Period > Lump Sum: GUI follows the Income tab pattern (read-only grid + one editor,
   Edit / Duplicate / Delete, Undo, "Check" pills, fixed-width layout) while keeping the requested column headers. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const mod = (...p) => fs.readFileSync(path.join(__dirname, '..', 'modules', ...p), 'utf8');
const ui = mod('retirement-planner', 'ui.js');
const css = mod('app-shell', 'goal-timeline.css');
const help = mod('help', 'help.js');
const reports = mod('reports', 'ui.js');

/* short visible headers; the full names stay as tooltips and as the editor labels */
for (const [short, full] of [['Label', 'Label (optional)'], ['Amount (\\u20b9)', 'Lump sum amount (\\u20b9)'], ['Year received', 'Year in which lump sum is received'], ['Income %', 'Yearly income earned on the lump sum (%)'], ['Yearly income (\\u20b9)', 'Yearly income from the lump sum (\\u20b9)'], ['Principal', 'Principal treatment']])
  assert.ok(ui.includes(`title="${full}`) && ui.includes(`>${short}`), 'short header with full-name tooltip: ' + short);
for (const full of ['Lump sum amount (\\u20b9)', 'Year in which lump sum is received', 'Yearly income earned on the lump sum (%)'])
  assert.ok(ui.includes(`"${full}", true`), 'editor keeps the full label: ' + full);
assert.ok(ui.includes('data-fh-plan="lump"') && ui.indexOf('data-fh-plan="income"') < ui.indexOf('data-fh-plan="lump"'), 'Lump Sum tab sits right of Income');

/* Income-style interaction: grid actions, editor with Done / Cancel, undo after delete, empty state */
for (const hook of ['data-fh-lump-edit', 'data-fh-lump-duplicate', 'data-fh-lump-delete', 'data-fh-lump-done', 'data-fh-lump-cancel', 'id="fh-lumpundo"', 'id="fh-lump-undo"', 'No lump sums yet', 'fh-lump-editors'])
  assert.ok(ui.includes(hook), 'ui.js has ' + hook);
assert.ok(/function undoLumpDelete\(/.test(ui) && /function finishLump\(/.test(ui) && /function cancelLump\(/.test(ui), 'undo, Done and Cancel handlers exist');
assert.ok(ui.includes('fh-chk fh-chk-warn">Incomplete') && ui.includes('fh-chk">Check'), 'row status is stated in words, not colour alone');
assert.ok(!ui.includes('Years available:') && !ui.includes('Lump sums are added to the general corpus in the year received. Keep invested'), 'the two information lines were removed from the tab');
assert.ok(/lumpEdit = Number\(m\[1\]\)/.test(ui), 'a validation issue on a lump row opens that row\'s editor');
assert.ok(ui.includes('lumpUndo = null') && /FH\.lumpEdit = 0; FH\.lumpNew = 0; FH\.lumpUndo = null;/.test(ui), 'lump editor state resets with the plan');

/* layout: no sideways scrolling table, same fixed layout as Income, auto cell is marked */
assert.ok(!/min-width:920px/.test(css), 'lump table no longer forces a 920px width');
assert.ok(/\.fh-lumptbl\{[^}]*table-layout:fixed/.test(css), 'lump table uses a fixed layout like Income');
assert.ok(/fh-chk-warn/.test(css) && /fh-auto-chip/.test(css) && /fh-lump-empty/.test(css), 'styles for the Incomplete pill, Auto chip and empty state');
assert.ok(ui.includes('class="fh-auto-chip"'), 'auto column is labelled Auto');

/* text: lump sums are modeled, so the disclaimer and the Help must not say otherwise */
assert.ok(!/lump sums and market volatility are not modeled/.test(ui), 'planner disclaimer no longer says lump sums are not modeled');
assert.ok(!/lump sums and market volatility are not modeled/.test(reports), 'report disclaimer no longer says lump sums are not modeled');
assert.ok(help.includes('Planning Period > Lump Sum'), 'Help describes the Lump Sum tab');
assert.ok(!help.includes('(one lump sum, calendar-year steps, no new contributions)'), 'Help no longer calls the model a single lump sum');
console.log('Lump Sum tab follows the Income tab pattern, uses short headers, and its texts match the behaviour');
