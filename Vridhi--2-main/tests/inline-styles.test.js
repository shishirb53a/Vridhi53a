#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const stylesheets = [
  ['modules/app-shell/dialog-overrides.css', 'dialog{overflow-x:hidden}', '147'],
  ['modules/holding-form-wizard/form.css', '.hf .hs{border:1px solid var(--bd)', '147'],
  ['modules/retirement-planner/age-bar.css', '.agebar{position:sticky', '147'],
  ['modules/reports/forecast-tint.css', '/* Report tables use a neutral financial header independent of the selected accent. */', '147'],
  ['modules/dashboard-preferences/kpi-tints.css', '/* dashboard KPI tiles, summary strip, readiness meter: soft theme tint */', '147'],
  ['modules/theme/button-tint.css', '/* all buttons: soft theme tint */', '147'],
  ['modules/dashboard-fit/dashboard-fit.css', '/* ===== Fit-to-screen dashboard:', '146'],
  ['modules/ui-pagination/ui.css', '.vpg{display:flex;'],
  ['modules/holding-form-wizard/preview.css', 'html body dialog.hf .hs-pv h3', '147'],
  ['modules/app-shell/goal-timeline.css', '.pt{border:1px solid', '143'],
  ['modules/landing/landing.css', '.vw{--vn:#17294a;'],
  ['modules/app-shell/base.css', ':root{--bg:#F4F7FB;', '155'],
  ['modules/app-shell/control-panel.css', '.cp{width:100%;max-width:330px', '147'],
  ['modules/app-shell/header-theme.css', ':root{--brand:#facc15;--on:#111111}', '147'],
  ['modules/app-shell/compact-tables.css', '/* ===== Compact tables:', '147'],
  ['modules/reports/report-selection.css', '.rsel{margin:0 0 12px;padding:10px 12px', '147'],
  ['modules/categories/categories.css', '.cdlg{', '140'],
  ['modules/dashboard-preferences/dashboard.css', '#dsh{max-width:900px;'],
  ['modules/reports/report-redesign.css', '/* Reports tab redesign */', '149'],
  ['modules/holdings/holdings.css', '/* Holdings page redesign */', '157'],
  ['modules/retirement-planner/ui.css', 'dialog.hf.fh{width:min(560px,96vw)}'],
  ['modules/retirement-planner/page-layout.css', '/* Retirement planner screen:', '147'],
  ['modules/retirement-planner/year-by-year.css', '/* Year by Year table:', '148'],
  ['modules/app-shell/icons.css', '/* Icons (build 47):', '142'],
  ['modules/retirement-planner/planner-page.css', '.rp2-page{display:flex;', '142'],
  ['modules/holdings/notes-history.css', '/* Notes & History (per holding) */', '147'],
  ['modules/reports/holding-report.css', '/* Holding report popup:', '147'],
  ['modules/user-management/user-management.css', '.vr-umf{display:grid', '150'],
  ['modules/app-shell/account-controls.css', 'html body .hd .vr-ver{color:inherit;opacity:.78}', '148'],
  ['modules/holdings/snapshots.css', '.vr-sn input{padding:8px 10px', '147'],
  ['modules/reports/retirement-row.css', '/* the retirement row is yellow in every report', '147']
];

const positions = stylesheets.map(([file, marker]) => {
  const contents = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(contents.includes(marker), `${file} contains its expected feature styles`);
  const escapedFile = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const links = Array.from(html.matchAll(new RegExp(
    `<link rel="stylesheet" href="${escapedFile}\\?v=\\d+">`, 'g'
  )));
  assert.strictEqual(links.length, 1, `${file} is loaded exactly once from index.html`);
  return links[0].index;
});
const holdingsCss = fs.readFileSync(path.join(root, 'modules', 'holdings', 'holdings.css'), 'utf8');
const iconsCss = fs.readFileSync(path.join(root, 'modules', 'app-shell', 'icons.css'), 'utf8');
const coreCss = fs.readFileSync(path.join(root, 'modules', 'app-shell', 'base.css'), 'utf8');
assert.ok(coreCss.includes('--acl:#142B4A;') && coreCss.includes('--bgd:#101B2A;') &&
  coreCss.includes('--ok:#167D68') && coreCss.includes('--sun:#D99A32') &&
  coreCss.includes('--er:#C92A2A'),
'The consolidated theme uses the specified brand and financial status colors');
assert.ok(coreCss.includes('body nav button[data-t=Policies]{--ic:url('),
  'Policies navigation uses a policy icon like the other planner sections');
assert.ok(coreCss.includes('html[data-utl=off] body table :is(th,td){border-bottom-color:transparent!important}') &&
  coreCss.includes('html[data-utc=on] body table :is(th,td){border-right:1px solid var(--bd)!important}') &&
  coreCss.includes('html[data-utc=off] body table :is(th,td){border-right-color:transparent!important}'),
'Row and column borders apply to every table and can be configured in Appearance');
assert.ok(holdingsCss.includes('.hp-actions{display:flex;flex-direction:row;align-items:center;justify-content:flex-end;gap:8px') &&
  holdingsCss.includes('.hp-card-actions .hp-actions{display:grid;grid-template-columns:repeat(3,minmax(44px,1fr))'),
'Holding View, Edit, and Delete actions stay in one desktop row and an accessible mobile row');
assert.ok(holdingsCss.includes('padding-left:36px') &&
  holdingsCss.includes('.hp-contrib{display:flex;flex-direction:column'),
'Search text and yearly/monthly contribution amounts have dedicated spacing');
assert.ok(iconsCss.includes('.hp-card .hp-act-icon::before{content:none!important;display:none!important}') &&
  coreCss.includes('body:has(.hp-card) .w{padding-bottom:calc(120px + env(safe-area-inset-bottom,0px))'),
'Holdings icon duplicates are suppressed and mobile content clears the fixed navigation');
assert.deepStrictEqual(positions.slice().sort((a, b) => a - b), positions,
  'Extracted stylesheets preserve their cascade order');
assert.ok(!html.includes('modules/app-shell/shared-theme.css') &&
  !html.includes('modules/app-shell/ui-system.css') &&
  !html.includes('modules/app-shell/enterprise.css') &&
  !html.includes('modules/app-shell/ux-final.css'),
'App-shell styling loads from one consolidated stylesheet');
assert.ok(!html.includes('<style id="ui-system">') && !html.includes('<style id="fh-css">') &&
  !html.includes('<style id="fh-css2">') && !html.includes('<style id="ds-ent">') &&
  !html.includes('<style id="vfit">') && !html.includes('<style id="hp-style">') &&
  !html.includes('<style id="vr-ux-final">'),
'Large feature styles are no longer embedded in index.html');

console.log('  ok   extracted stylesheets are present and preserve cascade order');
