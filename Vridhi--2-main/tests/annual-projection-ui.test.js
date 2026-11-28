#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const html = read('index.html');
const css = read('modules/reports/annual-projection.css');
const js = read('modules/reports/annual-projection.js');
const appJs = read('modules/app-core/app.js');
const helpersJs = read('modules/reports/annual-helpers.js');
const navCss = read('modules/nav-sidebar/nav-sidebar.css');
const rpUiJs = read('modules/retirement-planner/ui.js');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  PASS:', name);
}

console.log('Running Annual Portfolio Projection UI tests...');

test('annual-projection.css has balanced braces and safe media-query yield to custom table colors', () => {
  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  assert.strictEqual(opens, closes, `Unbalanced braces: ${opens} vs ${closes}`);
  assert.ok(css.includes('html:not([data-utcol="custom"])'), 'Table theme rules yield when custom Table Colour is active');
  assert.ok(css.includes('@media (max-width: 768px)'), 'Defines responsive <= 768px mobile layout');
});

test('index.html wires annual-projection.js after annual-helpers.js and annual-projection.css before report-maximize.css', () => {
  const iHelpers = html.indexOf('modules/reports/annual-helpers.js?v=');
  const iProjJs = html.indexOf('modules/reports/annual-projection.js?v=');
  const iFinCss = html.indexOf('modules/reports/financial-statement.css?v=1');
  const iProjCss = html.indexOf('modules/reports/annual-projection.css?v=1');
  const iMaxCss = html.indexOf('modules/report-maximize/report-maximize.css?v=2');

  assert.ok(iHelpers > -1 && iProjJs > iHelpers, 'annual-projection.js loads after annual-helpers.js');
  assert.ok(iProjCss > iFinCss && iProjCss < iMaxCss, 'annual-projection.css loads after financial-statement.css and before report-maximize.css');
});

test('app.js, helpers, sidebar CSS, and fhpBar integrate cleanly without breaking other views', () => {
  assert.ok(appJs.includes('if(!MV&&!IV&&window.repAnnualPage)return window.repAnnualPage();'), 'rep() delegates only Annual view to repAnnualPage');
  assert.ok(appJs.includes('function repRows(){'), 'repRows() remains intact for Monthly/Interest/holding-report popup');
  ['[data-aph-cols]', '[data-aph-years]', '[data-aph-jump]', '[data-ap-max]', '[data-ap-pdf]', '[data-ap-csv]', '[data-ap-mob-details]', '[data-ap-mob-jump]', '[data-ap-chip]'].forEach(sel => {
    assert.ok(appJs.includes(sel), `Read-only allowlist includes ${sel}`);
  });
  assert.ok(helpersJs.includes("m.querySelector('.ap-controls')") && helpersJs.includes('vrSyncAnnualProjection'), 'annual-helpers avoids duplicate toolbar and notifies annual-projection sync');
  assert.ok(navCss.includes('body:has(.ap-head) header.hd'), 'nav-sidebar hides duplicate desktop header when .ap-head is rendered');
  assert.ok(rpUiJs.includes('#m .ap-head'), 'fhpBar hides redundant client switcher when .ap-head is active');
});

test('repAnnualPage() dynamically renders desktop dashboard and mobile milestone cards from calc(S)', () => {
  const S = {
    start: 2026,
    end: 2032,
    ret: 52,
    goal: 40000000,
    members: [
      { id: 1, name: 'Asha', role: 'Self', age: 48 },
      { id: 2, name: 'Riya', role: 'Child', age: 16 }
    ],
    assets: [
      { id: 101, name: 'Equity Fund', cat: 'Equity', value: 15000000, add: 600000, madd: 0, ret: 0.11, yrs: 4 },
      { id: 102, name: 'PPF Account', cat: 'Retirement', value: 10000000, add: 150000, madd: 0, ret: 0.071, yrs: 4 }
    ]
  };
  const D = {
    ri: 4,
    incT: 3200000,
    payRet: 0,
    rows: [
      { a: 1, year: 2026, age: [48, 16], st: ['', 'Class 12'], v: [15000000, 10000000], tot: 25000000, add: 0, chg: 0, pay: 0 },
      { a: 2, year: 2027, age: [49, 17], st: ['', 'College 1'], v: [17250000, 10860000], tot: 28110000, add: 750000, chg: 3110000, pay: 0 },
      { a: 5, year: 2030, age: [52, 20], st: ['', 'College 4'], v: [25500000, 14100000], tot: 39600000, add: 750000, chg: 4100000, pay: 0 },
      { a: 7, year: 2032, age: [54, 22], st: ['', 'Career'], v: [31400000, 16180000], tot: 47580000, add: 0, chg: 4400000, pay: 0 }
    ]
  };
  D.ri = 2; // index 2 is 2030 retirement row in this fixture

  const sandbox = {
    window: {},
    document: { addEventListener() {} },
    localStorage: { getItem() { return null; }, setItem() {} },
    S,
    UI: { tab: 'Reports', rv: 'year', rq: '', rk: 'a', rd: 1, sel: null },
    calc: () => D,
    repSel: () => ({ all: true, min: false, none: false, idx: [0, 1] }),
    addInfo: () => ({ next: 750000, last: 2029, tot: 2250000 }),
    depShow: a => (a > 1 && a <= 3 ? 750000 : 0),
    allMat: () => false,
    fyl: y => `FY ${y - 1}-${String(y).slice(-2)}`,
    f: n => '₹ ' + Math.round(n).toLocaleString('en-IN'),
    cr: n => Math.abs(n) >= 1e7 ? `₹ ${(n / 1e7).toFixed(2)} Cr` : `₹ ${(n / 1e5).toFixed(2)} L`,
    hin: () => '',
    rowRoiTxt: () => '9.44%',
    polTiVal: i => i || 0,
    esc: s => String(s),
    escn: s => String(s),
    RCOLS: { annualMonthlyIncome: (i, p) => ((i || 0) + (p || 0)) / 12 },
    VRPolicy: { hasPayouts: () => false },
    repRows: () => '<table class="rt"><tr><th>As on</th></tr><tr data-r="1"><td>1 Apr 2026</td></tr></table>',
    rsDrops: () => '<div class="msds"><div class="msd" data-msd="cls"><button class="msd-b"><b>All asset classes</b><svg></svg></button></div><div class="msd" data-msd="hold"><button class="msd-b"><b>All holdings</b><svg></svg></button></div><div class="msd" data-msd="cols"><button class="msd-b"><b>All columns</b><svg class="old"></svg></button></div></div>',
    gppDashClient: () => '<button id="gpp-sel" type="button">Asha</button>',
    rptInfo: t => `<span class="rpi" title="${t}">i</span>`,
    rptCsv: id => `<button type="button" id="${id}">CSV</button>`
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox, { filename: 'annual-projection.js' });

  const out = sandbox.repAnnualPage();
  assert.ok(out.includes('class="ap-wrap"'), 'Wraps report in .ap-wrap');
  assert.ok(out.includes('id="gpp-sel"'), 'Includes inline client switcher in .ap-head');
  assert.ok(!out.includes('ap-kpis-host') && !out.includes('class="ap-kpis"') && !out.includes('class="ap-kpi '), 'Does not render desktop KPI grid host');
  assert.ok(!out.includes('Current Baseline') && !out.includes('Retirement Goal') && !out.includes('Long-Term Horizon') && !out.includes('</span>Yearly Inflow<'), 'Does not render removed KPI cards');
  assert.ok(out.includes('Jump to retirement (2030)'), 'Labels Jump button with live retirement year');
  assert.ok(out.includes('All holdings (2)'), 'Displays dynamic holding count inside Holdings filter');
  assert.ok(out.includes('Default columns') && out.includes('class="ap-cols-ic"'), 'Replaces Columns icon with 3-column grid SVG and Default columns label');
  assert.ok(out.includes('class="ap-fz-wrap"') && out.includes('id="rsf" class="ap-sr-ctrl"') && out.includes('class="ap-fz-lock"'), 'Hosts hidden #rsf/#rsd inside .ap-fz-wrap for #fzs freeze pill');
  assert.ok(out.includes('Values in <b>₹ Lakhs</b> (individual holdings) &amp; <b>₹ Full Currency</b> (Totals)'), 'Bolds unit labels in .ap-tbl-hd');
  assert.ok(out.includes('data-rpx') && out.includes('Annual Portfolio Projection') && out.includes('id="csv"'), 'Exposes data-rpx header and #csv trigger for report-maximize and PDF export');
  assert.ok(css.includes('.ap-tbl-hd :is(#csv, #rp-max, #rp-pdf)'), 'Visually hides redundant inline icons in .ap-tbl-hd while keeping programmatic triggers');
  assert.ok(out.includes('id="milestone-retirement"'), 'Renders featured mobile retirement milestone card');
  assert.ok(out.includes('All Projections') && out.includes('Holdings Breakdown') && out.includes('Cashflow & Payouts') && out.includes('Family Ages'), 'Renders mobile filter chips');
  assert.ok(out.includes('data-ap-csv') && out.includes('data-ap-pdf'), 'Renders export CSV and PDF triggers');
});

console.log(`All ${passed} Annual Portfolio Projection UI tests passed.`);
