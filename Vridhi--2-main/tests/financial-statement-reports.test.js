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

test('financial-statement.css and PDF export left-align headings, values, and flex cells across all report tables', () => {
  const leftBlock = css.slice(css.indexOf('/* Unified Left Alignment Across All Report Tables'));
  assert.ok(leftBlock.length > 0, 'Unified left-alignment CSS block missing in financial-statement.css');
  assert.ok(leftBlock.includes('text-align: left !important;'), 'Report table cells/headers must enforce text-align: left !important');
  assert.ok(leftBlock.includes('justify-content: flex-start !important;'), 'Sortable header buttons and flex cells (.st-thw, .st-sv) must left-align');

  const expectedTables = [
    'table.rt', 'table.rs', 'table.hz-t', 'table.vp-t', 'table.st-t',
    'table.ent-t', 'table.vod-table', 'table.sx-t', 'table.hw-t',
    'table.fh-tbl', '.fh-tblw table', 'table.gpp-table', 'table.gpp-cmp-table',
    'table.vr-sn-t', 'table.vw-tb', 'dialog.hyd table'
  ];
  for (const tbl of expectedTables) {
    assert.ok(leftBlock.includes(tbl), `Missing left-alignment coverage for ${tbl}`);
  }

  assert.ok(maxJs.includes('font-weight:700;text-align:left;vertical-align:bottom;'), 'PDF print th must be left-aligned');
  assert.ok(maxJs.includes('border:1px solid var(--bd);text-align:left;vertical-align:top;'), 'PDF print td must be left-aligned');
  assert.ok(maxJs.includes('.st-sv{display:flex;align-items:center;justify-content:flex-start;gap:4px}'), 'PDF print .st-sv must be left-aligned');
});

test('financial-statement.css has balanced braces', () => {
  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  assert.strictEqual(opens, closes, `Unbalanced braces in financial-statement.css: ${opens} vs ${closes}`);
});

test('Monthly Portfolio Projection consolidates filters and toolbar into one scoped single-line control bar', () => {
  const vm = require('vm');
  const appJs = fs.readFileSync(path.join(ROOT, 'modules', 'app-core', 'app.js'), 'utf8');
  const rcJs = fs.readFileSync(path.join(ROOT, 'modules', 'report-columns', 'report-columns.js'), 'utf8');

  assert.ok(css.includes('#m .mp-card .mp-ctrl-bar') && css.includes('flex-wrap: nowrap;'), 'financial-statement.css defines single-line .mp-ctrl-bar flex row');
  assert.ok(css.includes('.mp-ctrl-bar .msds') && css.includes('.mp-ctrl-bar .tb') && css.includes('display: contents !important;'), 'Monthly control bar promotes all 7 controls to a single flex row');
  assert.ok(css.includes('.mp-ctrl-bar .msd[data-msd="cols"] .msd-p'), 'Monthly control bar anchors COLUMNS popover cleanly');
  assert.ok(css.includes('@media (max-width: 1080px)') && css.includes('@media (max-width: 640px)'), 'Monthly control bar defines tablet and mobile responsive breakpoints');
  assert.ok(css.includes('@media print') && css.includes('#m .mp-card .mp-ctrl-bar'), 'Monthly control bar hides cleanly in print output');

  const repStart = appJs.indexOf('function rep(){');
  const repEnd = appJs.indexOf('window.fyl=function', repStart);
  assert.ok(repStart > -1 && repEnd > repStart, 'Found rep() in app-core/app.js');
  const repFnCode = appJs.slice(repStart, repEnd);

  const ctx = {
    UI: { rv: 'month', rk: 'a', rd: 1, rq: '' },
    S: { assets: [{ id: 1, name: 'Index Fund', yrs: 10 }] },
    VRPolicy: { hasPayouts: () => false },
    repSel: () => ({ min: false, none: false, idx: [0] }),
    gpEmpty: () => '',
    esc: s => String(s || ''),
    repRows: () => '<table></table>',
    vrRrDomKey: () => '',
    __vrRrDomCache: Object.create(null),
    window: {
      rsDrops: () => '<div class="msds">DROPS</div>',
      repISort: () => [['a', 'S.No']],
      rptInfo: () => '',
      rptCsv: () => '<button id="csv"></button>'
    }
  };
  vm.createContext(ctx);
  vm.runInContext(repFnCode, ctx);

  const monthHtml = ctx.rep();
  assert.ok(monthHtml.includes('class="card mp-card"'), 'Monthly Projection card includes mp-card class');
  assert.ok(monthHtml.includes('<div class="mp-ctrl-bar"><div class="msds">DROPS</div>') && monthHtml.includes('</div>\n<div id="rr"'), 'Monthly Projection wraps .msds and .tb inside .mp-ctrl-bar');

  ctx.UI.rv = 'int';
  const intHtml = ctx.rep();
  assert.ok(!intHtml.includes('mp-card') && !intHtml.includes('mp-ctrl-bar'), 'Interest & Income stays uncoupled from Monthly Projection control bar');

  let renderCalls = 0;
  let filterCalls = 0;
  const changeListeners = [];
  const rcCtx = {
    window: {
      render() { renderCalls++; },
      vrUpdateReportFilters(attr, val) {
        filterCalls++;
        return attr === 'data-rck' || attr === 'data-msda';
      }
    },
    document: {
      addEventListener(name, fn) { if (name === 'change') changeListeners.push(fn); },
      getElementById() { return null; },
      querySelector() { return null; }
    },
    localStorage: { getItem() { return null; }, setItem() {} },
    S: { assets: [] },
    CATS: [],
    VRPolicy: { hasPayouts() { return false; } },
    UI: { rv: 'month' },
    render() { renderCalls++; }
  };
  vm.createContext(rcCtx);
  vm.runInContext(rcJs, rcCtx);

  rcCtx.window.__colsAct('all');
  assert.strictEqual(filterCalls, 1, 'Monthly COLUMNS Show all uses surgical vrUpdateReportFilters');
  assert.strictEqual(renderCalls, 0, 'Monthly COLUMNS Show all avoids full page render()');

  changeListeners[0]({ target: { dataset: { rck: 'chg' }, checked: true } });
  assert.strictEqual(filterCalls, 2, 'Monthly COLUMNS checkbox toggle uses surgical vrUpdateReportFilters');
  assert.strictEqual(renderCalls, 0, 'Monthly COLUMNS checkbox toggle avoids full page render()');
});

console.log(`All ${passed} financial-statement report tests passed.`);
