#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'modules', 'reports', 'financial-statement.css'), 'utf8');
const maxJs = fs.readFileSync(path.join(ROOT, 'modules', 'report-maximize', 'report-maximize.js'), 'utf8');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  PASS:', name);
}

console.log('Running Vriddhi Financial-Statement Reports verification tests...');

test('index.html loads financial-statement.css after design-system.css and before report-maximize.css', () => {
  const idxDs = html.indexOf('modules/theme/design-system.css?v=1');
  const idxFs = html.indexOf('modules/reports/financial-statement.css?v=1');
  const idxMax = html.indexOf('modules/report-maximize/report-maximize.css?v=2');

  assert.ok(idxFs > -1, 'financial-statement.css link missing in index.html');
  assert.ok(idxFs > idxDs, 'financial-statement.css must load after design-system.css');
  assert.ok(idxFs < idxMax, 'financial-statement.css must load before report-maximize.css so Maximize 1-page fit stays sovereign');
});

test('financial-statement.css standardises report headers across all report modules', () => {
  for (const sel of ['.rph', '.rpd', '.rph2', '#vp-pg .vp-card .vp-h', '.st-root .st-scen-head', '.hyd .hyh']) {
    assert.ok(css.includes(sel), `Missing standardized report header selector: ${sel}`);
  }
  assert.ok(css.includes('border-left: 0 !important'), 'Thick left accent bars removed from report headers');
});

test('financial-statement.css standardises report filters, dropdowns, and summary strips', () => {
  for (const sel of ['.rsel', '.rsel .lgb', '.msds', '.hz-fr', '.st-root .msds', '.msd-b', '.msd-a button', '.vod-toolbar', '.rsum', '.vr-aph .vr-sum', '.rpk-c']) {
    assert.ok(css.includes(sel), `Missing standardized report filter/summary selector: ${sel}`);
  }
});

test('financial-statement.css applies accounting double-rule totals across all report tables while yielding to custom Table Colour', () => {
  assert.ok(css.includes('border-bottom: 3px double var(--ds-border-strong) !important'), 'Accounting double bottom rule missing on total rows');
  assert.ok(css.includes(':not([data-utcol="custom"])'), 'Default table surface rules must yield to custom Table Colour');
  for (const tbl of ['table.rt', 'table.rs', 'table.hz-t', 'table.vp-t', 'table.st-t', 'table.ent-t', 'table.vod-table', 'table.sx-t']) {
    assert.ok(css.includes(tbl), `Missing financial-statement table coverage for ${tbl}`);
  }
});

test('financial-statement.css standardises export & maximize action controls across all reports', () => {
  for (const ctl of ['button#csv', 'button#rp-max', 'button#rp-pdf', 'button#hy-max', 'button#hy-pdf', 'button#fh-max', 'button#fh-pdf', 'button.st-max-btn', 'button.st-pdf-btn', 'button.st-wreset-btn']) {
    assert.ok(css.includes(ctl), `Missing standardized export/view control styling: ${ctl}`);
  }
});

test('PDF print document applies institutional financial-statement styling and accounting double-rule totals', () => {
  assert.ok(maxJs.includes('"Plus Jakarta Sans"'), 'PDF print stylesheet uses Plus Jakarta Sans typography');
  assert.ok(maxJs.includes('border-bottom:3px double var(--ac)'), 'PDF print stylesheet applies accounting double-rule totals');
});

test('Copy as CSV and Export to PDF are consistent icon-only buttons across all reports', () => {
  const appJs = fs.readFileSync(path.join(ROOT, 'modules', 'app-core', 'app.js'), 'utf8');
  const rpUiJs = fs.readFileSync(path.join(ROOT, 'modules', 'retirement-planner', 'ui.js'), 'utf8');
  const repUiJs = fs.readFileSync(path.join(ROOT, 'modules', 'reports', 'ui.js'), 'utf8');
  const policyUiJs = fs.readFileSync(path.join(ROOT, 'modules', 'policy', 'policy-ui.js'), 'utf8');
  const stressUiJs = fs.readFileSync(path.join(ROOT, 'modules', 'stress-test', 'ui.js'), 'utf8');
  const savJs = fs.readFileSync(path.join(ROOT, 'modules', 'annual-savings', 'annual-savings.js'), 'utf8');
  const entJs = fs.readFileSync(path.join(ROOT, 'modules', 'holding-entry-register', 'entry-register.js'), 'utf8');
  const vodJs = fs.readFileSync(path.join(ROOT, 'modules', 'value-on-date', 'value-on-date.js'), 'utf8');
  const iconsCss = fs.readFileSync(path.join(ROOT, 'modules', 'app-shell', 'icons.css'), 'utf8');

  assert.ok(appJs.includes('class="vr-ib vr-ib-csv"') && appJs.includes('class="vr-ib vr-ib-pdf"'), 'app.js defines consistent vr-ib-csv and vr-ib-pdf icon button helpers');
  assert.ok(rpUiJs.includes('window.rptCsv("hzcsv")') && !rpUiJs.includes('>Copy as CSV</button>'), 'Retirement Planner Year-by-year uses consistent icon-only Copy as CSV button');
  assert.ok(repUiJs.includes('window.rptCsv("hzcsv")') && !repUiJs.includes('>Copy as CSV</button>'), 'reports/ui.js Year-by-year uses consistent icon-only Copy as CSV button');
  assert.ok(policyUiJs.includes("window.rptCsv('csv', 'data-vp=\"csv\"')") && !policyUiJs.includes('>Export CSV</button>'), 'Policies Reports uses consistent icon-only Copy as CSV button');
  assert.ok(!savJs.includes('>Copy as CSV</button>') && !entJs.includes('>Copy as CSV</button>') && !vodJs.includes('>Copy as CSV</button>'), 'Annual Savings, Entry Register, and Value on Date fallbacks are icon-only');
  assert.ok(!savJs.includes("b.textContent='Copied'") && !entJs.includes("t.textContent='Copied'"), 'CSV copy feedback preserves SVG icon instead of overwriting button textContent');
  assert.ok(!maxJs.includes('<span>Export to PDF</span>') && maxJs.includes('vr-ib vr-ib-pdf rp-pdf') && maxJs.includes('vr-ib vr-ib-pdf hy-pdf') && maxJs.includes('vr-ib vr-ib-pdf fh-pdf'), 'report-maximize.js renders all Export to PDF buttons as icon-only vr-ib buttons');
  assert.ok(!stressUiJs.includes('<span>Export to PDF</span>') && stressUiJs.includes('st-pdf-btn vr-ib vr-ib-pdf'), 'Stress Test renders Export to PDF buttons as icon-only vr-ib buttons');
  assert.ok(!iconsCss.includes('#hzcsv::before'), 'icons.css no longer attaches duplicate ::before icon to #hzcsv');
  assert.ok(css.includes('button.vr-ib-csv') && css.includes('button.vr-ib-pdf') && css.includes('width: 34px !important'), 'financial-statement.css enforces uniform 34x34 square icon sizing for CSV and PDF buttons');
});

test('financial-statement.css has balanced braces', () => {
  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  assert.strictEqual(opens, closes, `Unbalanced braces in financial-statement.css: ${opens} vs ${closes}`);
});

console.log(`All ${passed} financial-statement report tests passed.`);
