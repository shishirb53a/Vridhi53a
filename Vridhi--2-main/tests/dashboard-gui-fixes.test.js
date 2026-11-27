#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function checkCssBraces(rel) {
  const css = read(rel);
  let depth = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    assert.ok(depth >= 0, `${rel}: unmatched closing brace at index ${i}`);
  }
  assert.strictEqual(depth, 0, `${rel}: unclosed CSS braces remaining (${depth})`);
}

// 1. JS syntax & CSS brace parity on all modified files
['modules/app-core/app.js', 'modules/goal-planner-clients/goal-planner-clients.js', 'modules/categories/categories.js'].forEach(rel => {
  execFileSync(process.execPath, ['--check', path.join(root, rel)], { stdio: 'pipe' });
});
['modules/dashboard-preferences/dashboard.css', 'modules/dashboard-fit/dashboard-fit.css', 'modules/nav-sidebar/nav-sidebar.css', 'modules/pwa/pwa.css'].forEach(checkCssBraces);
console.log('  ok   JS syntax checks and CSS brace balance pass');

// 2. CSS layout fixes
const dashCss = read('modules/dashboard-preferences/dashboard.css');
const fitCss = read('modules/dashboard-fit/dashboard-fit.css');
const sideCss = read('modules/nav-sidebar/nav-sidebar.css');
const pwaCss = read('modules/pwa/pwa.css');

assert.ok(dashCss.includes('#dsh .dz-in article{border:1px solid;border-radius:12px;padding:16px;display:flex;flex-direction:column;height:auto;min-height:0;overflow:visible;'),
  'Insight sub-cards use auto height and visible overflow in dashboard.css');
assert.ok(dashCss.includes('#dsh .dz-ik{margin:0;'),
  'Insight eyebrow margin is zeroed cleanly');
assert.ok(dashCss.includes('width:16px;height:16px;border-radius:50%;background:var(--ac);border:2px solid #fff'),
  'Slider thumb uses refined 16px size and 2px border');
assert.ok(dashCss.includes('#dsh .dz-rmin{display:inline-flex;align-items:baseline;gap:4px;flex-wrap:wrap}'),
  'Current age label aligns alongside slider minimum bound');

assert.ok(fitCss.includes('html body #dsh .dz-pr{margin-top:6px;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}') &&
  fitCss.includes('html body #dsh .dz-pr button{min-height:30px;padding:4px 6px;font-size:11px;border-radius:8px;white-space:nowrap}'),
  'Target corpus presets use balanced 3x2 grid with nowrap');
assert.ok(fitCss.includes('html body #dsh .dz-sum{margin-top:8px;border-radius:12px;grid-template-columns:repeat(2,minmax(0,1fr))}'),
  'Plan Simulation metric strip uses balanced 2x2 grid on desktop');
assert.ok(fitCss.includes('html body #dsh .dz-in article{padding:11px 12px 13px;border-radius:12px;height:auto;min-height:0;overflow:visible}'),
  'Desktop fit stylesheet prevents bottom text clipping in insight sub-cards');

assert.ok(sideCss.includes('html.vr-side-on:not(#vrx) body:has(#dsh) header.hd') &&
  sideCss.includes('html.vr-side-on:not(#vrx) body header.hd #ap-mode') &&
  sideCss.includes('html.vr-side-on:not(#vrx) body header.hd #vr-pwa-install'),
  'Dashboard removes top breadcrumb bar, Install App button, and header theme toggle');
assert.ok(sideCss.includes('justify-content: flex-start !important;') &&
  sideCss.includes('left: 256px !important;') &&
  sideCss.includes('width: calc(100% - 256px) !important;'),
  'Desktop bottom navigation bar is left-aligned flush with the main workspace');
assert.ok(pwaCss.includes('.vr-pwa-install {\n  display: none !important;\n}'),
  'Install App button stays hidden');
console.log('  ok   CSS fixes verified across dashboard, fit, sidebar, and pwa stylesheets');

// 3. Color distinction + displayName + formatting checks via VM
const gpcSrc = read('modules/goal-planner-clients/goal-planner-clients.js');
const appSrc = read('modules/app-core/app.js');

assert.ok(appSrc.includes("'Policy payouts':'#0891b2','Gratuity':'#7c3aed'"),
  'Policy payouts and Gratuity have distinct palette colors');
assert.ok(appSrc.includes('const FALLBACK_COLS=') && appSrc.includes('usedCols.has(col)'),
  'Runtime Asset Allocation palette resolver deduplicates category colors');
assert.ok(appSrc.includes('cr(py.m[y])') && appSrc.includes('Total received: ${cr(bs.polV)}'),
  'Policy payouts footnote uses unified cr() formatting matching Asset Allocation bars');
assert.ok(appSrc.includes('const nodes=goalEarly?[mStart,mGoal,mRet]:[mStart,mRet,mGoal]'),
  'Timeline orders milestones chronologically across equal 0%/50%/100% positions');
assert.ok(appSrc.includes('₹ ${v} Cr'),
  'Preset buttons use consistent rupee symbol spacing');

// Execute goal-planner-clients.js in lightweight VM to verify displayName & hero formatting
const S = {
  members: [{ id: 1, name: 'without_saving', rel: 'Self', age: 48 }],
  start: 2026, end: 2056, ret: 56, retP: 0, hor: 85, goal: 40000000,
  link: false, grat: { basic: 0, svc: 0, rem: 0, cap: 0 }, policies: [], assets: [{ id: 1 }]
};
const sandbox = {
  S,
  UI: { q: '', cat: 'All', sel: null, rq: '', rsel: undefined, rcl: undefined, tab: 'Dashboard' },
  GPP_KEYS: ['members', 'start', 'end', 'ret', 'retP', 'hor', 'goal', 'link', 'grat', 'policies', 'assets'],
  DEF: () => JSON.parse(JSON.stringify(S)),
  MB: (id, name, rel, age) => ({ id, name, rel, age }),
  esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  cr: v => '₹ ' + (Number(v) >= 1e7 ? (v / 1e7).toFixed(2) + ' Cr' : (v / 1e5).toFixed(2) + ' L'),
  dg: { addEventListener: () => {} },
  save: () => {},
  render: () => {},
  calc: () => ({ incT: 0, payRet: 0, ri: 8, rows: [{ tot: 0, add: 0, v: [0] }] }),
  ctx: () => ({ r0: { tot: 0 }, rr: { tot: 0 }, G: 40000000, yr: 8, tm: null, D: { incT: 0, rows: [{ v: [0] }] } }),
  document: {
    getElementById: () => null,
    createElement: () => ({ set id(v) {}, innerHTML: '' }),
    body: { appendChild: () => {} },
    addEventListener: () => {}
  },
  window: {},
  setTimeout,
  clearTimeout
};
sandbox.window = sandbox;
vm.runInNewContext(gpcSrc, sandbox);

const hero = sandbox.gppHeroInner();
assert.ok(hero.includes('>Without Saving</h2>'), 'Hero banner formats snake_case without_saving -> Without Saving');
assert.ok(!hero.includes('without_saving'), 'Raw snake_case identifier is not exposed in hero HTML');
assert.ok(hero.includes('goal ₹ 4.00 Cr'), 'Hero subtitle preserves consistent rupee space formatting');
assert.strictEqual(sandbox.gppActiveName(), 'Without Saving', 'gppActiveName formats snake_case profile names');
const dashClient = sandbox.gppDashClient();
assert.ok(dashClient.includes('>Without Saving</span>'), 'Client selector trigger formats snake_case profile names');
console.log('  ok   Dashboard copy, formatting, color uniqueness, and scenario name formatting pass');
