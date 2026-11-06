#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [
  ['modules/reports/roi-summary.js', 'window.rowRoi=function(r)'],
  ['modules/reports/report-date.js', 'window.rpDate=function()'],
  ['modules/user-management/registry.js', 'window.FSREG={get:rget,set:rset'],
  ['modules/user-management/dialog.js', "dlg.id='udlg'"],
  ['modules/retirement-planner/age-selector.js', 'window.ageBar=function()'],
  ['modules/reports/retired-row-tags.js', 'one Retired tag per retirement row'],
  ['modules/dashboard-preferences/mobile-tabs.js', "var T=[['status','Status'],['plan','Plan'],['insights','Insights'],['alloc','Allocation']]"],
  ['modules/app-shell/dashboard-tabs.js', "cur='status',K={'executive status'"],
  ['modules/reports/holding-report.js', 'var TT={year:'],
  ['modules/app-shell/dialog-number-format.js', 'build 112: wrap every amount'],
  ['modules/app-shell/dialog-logo.js', 'build 126: put the Vriddhi logo'],
  ['modules/theme/professional-themes.js', 'Original colours'],
  ['modules/theme/skin-selector.js', '"enterprise","Enterprise"'],
  ['modules/holdings/snapshot-ui.js', 'window.snapUI=function()']
];

const positions = scripts.map(([file, marker]) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(source.includes(marker), `${file} contains its expected feature code`);
  const scriptId = file === 'modules/app-shell/dialog-number-format.js' ? 'fh-nb'
    : file === 'modules/app-shell/dialog-logo.js' ? 'fh-logo' : null;
  const tag = scriptId
    ? `<script id="${scriptId}" src="${file}?v=147"></script>`
    : `<script src="${file}?v=${file === 'modules/reports/roi-summary.js' ? '148' : '147'}"></script>`;
  const index = html.indexOf(tag);
  assert.ok(index >= 0, `${file} is loaded synchronously from index.html`);
  assert.strictEqual(html.indexOf(tag, index + tag.length), -1, `${file} is included only once`);
  assert.ok(!/\s(?:async|defer)(?:\s|>)/.test(tag), `${file} stays synchronous`);
  return index;
});
assert.deepStrictEqual(positions.slice().sort((a, b) => a - b), positions,
  'Extracted scripts preserve their original execution order');

const inlineBlocks = [...html.matchAll(/<(style|script)\b([^>]*)>([\s\S]*?)<\/\1>/gi)]
  .filter(match => !(match[1].toLowerCase() === 'script' && match[2].includes('src=')));
assert.ok(inlineBlocks.every(match => match[3].length < 850),
  'index.html has no remaining inline style or script block of 850 bytes or larger');

assert.ok(html.startsWith('<!DOCTYPE html>'), 'The HTML document declaration remains in the entry point');
assert.ok(html.includes('<head>') && html.includes('<body>') &&
  html.includes('<meta charset="utf-8">') &&
  html.includes('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">') &&
  html.includes('<title>Vriddhi · Retirement &amp; Wealth Planner</title>'),
'Document metadata and title remain in the entry point');
assert.ok(html.includes('<header class="hd">') && html.includes('<nav id="nav"') &&
  html.includes('<main id="m">') && html.includes('<dialog id="dg">'),
'The static app shell and dialog host remain in the entry point');

console.log('  ok   HTML shell retains document structure and loads extracted scripts in order');
