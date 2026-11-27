#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(ROOT, 'modules', 'app-core', 'app.js'), 'utf8');
const holdingsCss = fs.readFileSync(path.join(ROOT, 'modules', 'holdings', 'holdings.css'), 'utf8');
const navSidebarCss = fs.readFileSync(path.join(ROOT, 'modules', 'nav-sidebar', 'nav-sidebar.css'), 'utf8');
const engineJs = fs.readFileSync(path.join(ROOT, 'modules', 'portfolio-calculations', 'engine.js'), 'utf8');
const policyCoreJs = fs.readFileSync(path.join(ROOT, 'modules', 'policy', 'policy-core.js'), 'utf8');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  PASS:', name);
}

function assertBalancedBraces(cssText, label) {
  let depth = 0;
  for (let i = 0; i < cssText.length; i++) {
    if (cssText[i] === '{') depth++;
    else if (cssText[i] === '}') depth--;
    assert.ok(depth >= 0, `${label}: unexpected closing brace at index ${i}`);
  }
  assert.strictEqual(depth, 0, `${label}: unbalanced braces (${depth})`);
}

function createHoldingsVM() {
  const storage = new Map();
  const dummyEl = () => ({
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    hidden: false,
    disabled: false,
    className: '',
    style: {},
    dataset: {},
    children: [],
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    setAttribute() {},
    getAttribute() { return ''; },
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    append() {},
    remove() {},
    focus() {},
    closest() { return null; }
  });

  const windowObj = {
    VR_PROD: false,
    location: { search: '' },
    scrollTo() {},
    addEventListener() {},
    matchMedia() { return { matches: false }; },
    rptInfo(t, l) { return `<span class="rpi" title="${t}" aria-label="${l || ''}">i</span>`; },
    rptMenu(active) { return `<div class="rpm"><button type="button" class="rpm-t"${active ? ' aria-current="page"' : ''} data-gptab="Reports">Reports</button></div>`; },
    VRTheme: { apply() {} }
  };

  const sandbox = {
    window: windowObj,
    globalThis: null,
    document: {
      documentElement: { lang: 'en', classList: { toggle() {} } },
      body: { appendChild() {} },
      querySelector: () => dummyEl(),
      querySelectorAll: () => [],
      getElementById: () => dummyEl(),
      createElement: () => dummyEl(),
      addEventListener() {}
    },
    localStorage: {
      getItem: k => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v))
    },
    sessionStorage: {
      getItem: () => '',
      setItem() {}
    },
    Intl,
    Math,
    Date,
    Number,
    String,
    Array,
    Object,
    Set,
    Map,
    JSON,
    RegExp,
    Error,
    isNaN,
    isFinite,
    setTimeout: () => 0,
    clearTimeout() {},
    requestAnimationFrame: fn => fn(),
    tr: x => x,
    escn: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    LANGS: [['en', 'English']],
    CSS: { escape: s => String(s) },
    console
  };
  sandbox.globalThis = sandbox;
  Object.assign(windowObj, sandbox);

  vm.runInNewContext(policyCoreJs, sandbox);
  sandbox.VRPolicy = windowObj.VRPolicy;
  vm.runInNewContext(engineJs, sandbox);
  sandbox.VRCalcCore = windowObj.VRCalcCore;
  const appTestable = appJs
    .replace('setTimeout(startApp,250);', '')
    .replace(/\bconst (S|UI)\b/g, 'var $1')
    .replace(/\blet (S|UI)\b/g, 'var $1');
  vm.runInNewContext(appTestable, sandbox);
  return sandbox;
}

console.log('Running Responsive Portfolio Holdings View tests...');

test('CSS files have balanced braces and md=768px responsive breakpoint', () => {
  assertBalancedBraces(holdingsCss, 'holdings.css');
  assertBalancedBraces(navSidebarCss, 'nav-sidebar.css');
  assert.ok(
    holdingsCss.includes('@media(max-width:768px)') && holdingsCss.includes('@media(min-width:769px)'),
    'holdings.css must toggle desktop table vs mobile cards at md (768px / 769px)'
  );
  assert.ok(
    navSidebarCss.includes('body:has(.hp-head) header.hd .vr-side-bc'),
    'nav-sidebar.css must hide desktop breadcrumb when Holdings view (.hp-head) is active'
  );
});

test('hold() and holdRows() exclude redundant top tabs, hp-gf-* classes, and Est. at age column', () => {
  const holdFn = appJs.slice(appJs.indexOf('function hold(){'), appJs.indexOf('function hin('));
  const holdRowsFn = appJs.slice(appJs.indexOf('function holdRows(){'), appJs.indexOf('function hold(){'));

  assert.ok(!holdFn.includes('hp-gf-tabs') && !holdFn.includes('hp-gf-bar'), 'Redundant top tab navigation removed from hold()');
  assert.ok(!holdRowsFn.includes('hp-gf-') && !holdRowsFn.includes('Est. at age'), 'Legacy hp-gf-* classes and Est. at age removed from holdRows()');
  assert.ok(holdFn.includes('<div class="hp-head"><button type="button" class="p hp-add" id="add">'), 'Prominent + Add holding CTA rendered in .hp-head');
  assert.ok(holdFn.includes('<h1>Portfolio Holdings</h1>'), 'Page title rendered in .hp-head');
});

test('Portfolio Overview Widget aggregates values and renders multi-segmented bar chart dynamically in VM', () => {
  const ctx = createHoldingsVM();
  vm.runInNewContext(`
    UI.tab = 'Holdings';
    UI.hv = null;
    UI.q = '';
    UI.g = true;
    UI.gc = {};
    S.members[0].age = 48;
    S.ret = 55;
    S.grat = { basic: 297143, svc: 14, rem: 1, cap: 2400000 };
    S.assets = [
      A(1, 'Nifty Index Fund', 'Equity', 11340000, 480000, 0.12, 7),
      A(2, 'EPF & PPF Corpus', 'PF/PPF/SUK', 9949194, 420000, 0.08, 7),
      A(3, 'Gratuity', 'Gratuity', 0, 0, 0.06, 7, 'gratuity'),
      A(4, 'Corporate FD', 'Fixed Deposit', 2042900, 120000, 0.075, 7),
      A(5, 'Primary Savings', 'Savings AC', 799091, 0, 0.04, 7, undefined, 8374, 4, '2026-04-01')
    ];
  `, ctx);

  const pageHtml = ctx.hold();
  const navHtml = ctx.gpNav();

  assert.ok(pageHtml.includes('Total Portfolio Value') && pageHtml.includes('₹ 2,65,31,185'), 'Aggregates exact Total Portfolio Value (₹ 2,65,31,185)');
  assert.ok(pageHtml.includes('Yearly Contribution') && pageHtml.includes('₹ 11,20,488'), 'Aggregates exact Yearly Contribution (₹ 11,20,488)');

  assert.ok(pageHtml.includes('class="hp-ov-bar"'), 'Renders multi-segmented CSS bar chart');
  const expectedShares = [
    ['Equity', '42.7%'],
    ['PF/PPF/SUK', '37.5%'],
    ['Gratuity', '9.0%'],
    ['Fixed Deposit', '7.7%'],
    ['Savings AC', '3.0%']
  ];
  expectedShares.forEach(([cat, pct]) => {
    assert.ok(pageHtml.includes(cat) && pageHtml.includes(pct), `Overview includes ${cat} (${pct})`);
  });

  // Check exact 3.0% case too (3.0% of 26531185 = 795,935; total 26531185 if Equity = 11343156 -> 42.8% or 42.7% + 37.5% + 9.0% + 7.7% + 3.0% = 99.9% rounding)
  assert.ok(pageHtml.includes('<th><button type="button" data-k="name"><span>Holding</span>') || pageHtml.includes('<span>Holding</span>'), 'Desktop table has Holding column');
  assert.ok(pageHtml.includes('<span>Current value</span>'), 'Desktop table has Current value column');
  assert.ok(pageHtml.includes('<span>Yearly contribution</span>'), 'Desktop table has Yearly contribution column');
  assert.ok(pageHtml.includes('<span>Contribution</span>'), 'Desktop table has Contribution column');
  assert.ok(pageHtml.includes('<span>ROI</span>'), 'Desktop table has ROI column');
  assert.ok(pageHtml.includes('<th class="hp-action-heading">Action</th>'), 'Desktop table has Action column');

  assert.ok(pageHtml.includes('class="hc"') && pageHtml.includes('class="hp-card-kpis"') && pageHtml.includes('class="hp-kvd-child"'), 'Mobile view renders stacked tactile cards with KPIs and nested child details');
  assert.ok(pageHtml.includes('data-holding-view=') && pageHtml.includes('data-e=') && pageHtml.includes('data-x='), 'View, Edit, and Delete quick action triggers present');
  assert.ok(pageHtml.includes('<tr class="t"><td>Total (5)</td>') && pageHtml.includes('class="hcard hp-total"'), 'Dynamic anchored summary row rendered in both desktop and mobile views');

  // Verify pinned bottom navigation tabs
  assert.ok(navHtml.includes('rp2-nav rp2-nav3'), 'Pinned bottom nav container rendered');
  assert.ok(navHtml.includes('Summary') && navHtml.includes('View Holding') && navHtml.includes('Reports'), 'Bottom nav includes Summary, View Holding, Reports');
  assert.ok(navHtml.includes('data-gptab="Holdings" aria-current="page"'), 'View Holding tab is active');

  // Verify dynamic search filter updates Overview + Total row
  vm.runInNewContext(`UI.q = 'Nifty';`, ctx);
  const filteredHtml = ctx.hold();
  assert.ok(filteredHtml.includes('₹ 1,13,40,000') && filteredHtml.includes('Total (1)') && filteredHtml.includes('100.0%'), 'Search dynamically recalculates portfolio total, bar segments, and summary row');
});

console.log(`All ${passed} responsive Holdings view tests passed.`);
