#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appCore = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const i18n = html.indexOf('<script src="modules/i18n/i18n.js?v=132"></script>');
const landing = html.indexOf('<script src="modules/landing/landing.js?v=131"></script>');
const calculations = html.indexOf('<script src="modules/portfolio-calculations/engine.js?v=136"></script>');
const coreTag = '<script src="modules/app-core/app.js?v=165"></script>';
const core = html.indexOf(coreTag);
const family = html.indexOf('<script src="modules/family-management/family-management.js?v=144"></script>');

assert.ok(i18n >= 0 && landing > i18n && calculations > landing && core > calculations && family > core,
  'App core remains synchronously loaded after its dependencies and before feature modules');
assert.strictEqual(html.indexOf(coreTag, core + coreTag.length), -1,
  'App core is loaded exactly once');
assert.ok(!html.includes('//CALC-START') && !html.includes('setTimeout(startApp,250);'),
  'The large app script and startup call are no longer inline');
assert.ok(appCore.trimStart().startsWith('//CALC-START') && appCore.includes('//CALC-END') &&
  appCore.includes('setTimeout(startApp,250);'),
'Extracted app core preserves its calculation boundaries and initialization behavior');
assert.ok(appCore.includes('function render()') && appCore.includes('async function initSync()') &&
  appCore.includes('M.addEventListener(\'click\'') && appCore.includes('async function startApp()'),
'Extracted app core retains the app render, sync, and delegated event setup');
assert.ok(appCore.includes('aria-controls="module-menu"') &&
  appCore.includes("if(m.tab==='Policies')modules.push") &&
  appCore.includes("${activeModuleItem?activeModuleItem[1]:'Modules'}") &&
  appCore.includes("data-modules-toggle") &&
  appCore.includes("e.key!=='Escape'"),
'Goal Planner, Retirement Planner, and Policies share an accessible dropdown that displays the active module');
const header = html.slice(html.indexOf('<header class="hd">'), html.indexOf('</header>'));
assert.ok(header.indexOf('<div id="fhp" class="fhp" hidden>') > header.indexOf('</nav>') &&
  !appCore.includes("'#fhp'") && appCore.includes("'#settings-menu-wrap'") &&
  appCore.includes('[data-settings-tab="Settings"]') &&
  html.includes('aria-label="Settings" title="Settings" aria-expanded="false" aria-controls="settings-menu" data-settings-toggle') &&
  html.includes('&#8942;'),
'Client switcher retains its stable header host and Settings stays available from the adjacent three-dot menu');
assert.ok(appCore.includes('function holdingDetail(D,i)') &&
  appCore.includes('data-holding-view=') && appCore.includes('data-holding-back') &&
  appCore.includes('data-hdtab=') && appCore.includes('Estimated value through retirement'),
'Holdings include a detail page with projections, tabbed information, and return navigation');
assert.ok(appCore.includes('class="tbs hp-act-icon" data-holding-view=') &&
  appCore.includes('class="tbs hp-act-icon" data-e=') &&
  appCore.includes('class="tbs d hp-act-icon" data-x=') &&
  appCore.includes('<div class="hp-actions"><button') &&
  appCore.includes('aria-hidden="true"'),
'Holding View, Edit, and Delete actions use icons with accessible labels');
assert.ok(appCore.includes('o.x.add>0||!o.x.madd') &&
  appCore.includes('class="hp-recurring"') &&
  appCore.includes('placeholder="Search holdings..."'),
'Recurring additions suppress a zero yearly baseline and the search prompt uses three dots');
assert.ok(appCore.includes("e.key==='ArrowRight'") && appCore.includes("e.key==='Home'") &&
  appCore.includes("e.key==='End'") && appCore.includes("tabs[next].click()"),
'Holding detail tabs support arrow keys and Home/End navigation');
assert.ok(appCore.includes('aria-label="Expand all categories"') &&
  appCore.includes('aria-label="Collapse all categories"') &&
  appCore.includes('class="hp-grp hp-grp-icon"'),
'Category expand and collapse controls use accessible icons');
assert.ok(appCore.includes('id="hcsvi" class="hp-cat hp-csv hp-cat-icon" aria-label="Import CSV"') &&
  appCore.includes('id="hcsv" class="hp-cat hp-csv hp-cat-icon" aria-label="Export CSV"'),
'CSV import and export controls use accessible icons');
assert.ok(appCore.includes('<div class="hp-portfolio-actions"><button type="button" id="mcat"') &&
  appCore.indexOf('id="mcat"') < appCore.indexOf('id="hcsvi"') &&
  appCore.indexOf('id="hcsvi"') < appCore.indexOf('id="hcsv"'),
'Category, import, and export actions are grouped in their own toolbar area');
assert.ok(appCore.includes("th('name','Holding name')") &&
  appCore.includes("th('cur','Current value')") &&
  appCore.includes("th('add','Yearly contribution')") &&
  appCore.includes("th('yrs','Contribution period')") &&
  appCore.includes("th('ret','Expected return')"),
'Holdings table headers clearly describe each column');
const holdingsPage = appCore.slice(appCore.indexOf('function hold(){'), appCore.indexOf('function rep(){'));
assert.ok(!holdingsPage.includes('id="sf"') &&
  !holdingsPage.includes('id="sd"') &&
  appCore.includes('if(d.k){UI.d=UI.k===d.k?-UI.d:1;UI.k=d.k;'),
'Portfolio Holdings keeps sortable table headers and does not bring back the legacy sort ids');
assert.ok(holdingsPage.includes('id="hsf"') && holdingsPage.includes('id="hsd"') &&
  holdingsPage.includes('id="htools"') && holdingsPage.includes('id="hp-more"') &&
  appCore.includes('class="hcard hp-total"') && appCore.includes('class="hp-kvd"') &&
  appCore.includes("id==='hsf'") && appCore.includes("#rsd,#htools,#hsd')"),
'Mobile Holdings adds a Sort control, a Tools menu, compact cards and a sticky Total, and read-only users can still use them');

console.log('App core loads synchronously and preserves its initialization boundaries');
