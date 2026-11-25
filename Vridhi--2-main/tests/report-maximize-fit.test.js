#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules', 'report-maximize', 'report-maximize.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'modules', 'report-maximize', 'report-maximize.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const policyUI = fs.readFileSync(path.join(root, 'modules', 'policy', 'policy-ui.js'), 'utf8');
const appCore = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const annualSavings = fs.readFileSync(path.join(root, 'modules', 'annual-savings', 'annual-savings.js'), 'utf8');
const entryRegister = fs.readFileSync(path.join(root, 'modules', 'holding-entry-register', 'entry-register.js'), 'utf8');
const valueOnDate = fs.readFileSync(path.join(root, 'modules', 'value-on-date', 'value-on-date.js'), 'utf8');
const rpUI = fs.readFileSync(path.join(root, 'modules', 'retirement-planner', 'ui.js'), 'utf8');
const stressCss = fs.readFileSync(path.join(root, 'modules', 'stress-test', 'stress-test.css'), 'utf8');
const stressUI = fs.readFileSync(path.join(root, 'modules', 'stress-test', 'ui.js'), 'utf8');

// 1. Stylesheet wiring and cross-report maximize host checks
assert.ok(html.includes('modules/report-maximize/report-maximize.css'), 'index.html loads report-maximize.css');
assert.ok(
  html.indexOf('modules/report-maximize/report-maximize.css') > html.indexOf('modules/retirement-planner/year-by-year.css'),
  'report-maximize.css loads after table stylesheets so 1-page fit rules take precedence'
);
assert.ok(appCore.includes('data-rpx'), 'Goal Planner projection/interest reports expose data-rpx');
assert.ok(annualSavings.includes('data-rpx'), 'Annual Savings Schedule exposes data-rpx');
assert.ok(entryRegister.includes('data-rpx'), 'Holdings Entry Register exposes data-rpx');
assert.ok(valueOnDate.includes('data-rpx'), 'Value on Date exposes data-rpx');
assert.ok(rpUI.includes('data-rpx'), 'Retirement Planner Year-by-year plan exposes data-rpx');
assert.ok(policyUI.includes('class="rph2 vp-h" data-rpx'), 'Policies reports expose data-rpx for shared maximize');
assert.ok(css.includes('overflow-x:hidden!important') && css.includes('.vr-fit-tight') && css.includes('.vr-fit-ultra'),
  'report-maximize.css defines 1-page no-horizontal-scroll fit rules and density tiers');
assert.ok(stressCss.includes('.st-scen-card.st-max .st-wrap,.st-eng-card.st-max .st-wrap{flex:1;max-height:none;overflow-x:hidden;'),
  'Stress Test maximized wrappers hide horizontal overflow');
assert.ok(stressUI.includes('Math.max(0.35,') && stressUI.includes('avail > 0 && need > avail + 1'),
  'Stress Test fitMaxTable handles wide tables and all viewport widths');

// 2. Behavioral harness for 4-stage 1-page fitting and restore cleanup
function makeClassList(initial = []) {
  const set = new Set(initial);
  return {
    add(...names) { names.forEach(n => set.add(n)); },
    remove(...names) { names.forEach(n => set.delete(n)); },
    toggle(name, force) {
      if (force === undefined) { if (set.has(name)) set.delete(name); else set.add(name); }
      else if (force) set.add(name); else set.delete(name);
    },
    contains(name) { return set.has(name); },
    list() { return Array.from(set); }
  };
}

function makeStyle() {
  const map = {};
  return new Proxy(map, {
    get(target, prop) {
      if (prop === 'removeProperty') return k => { delete target[k]; };
      if (prop === 'getPropertyValue') return k => target[k] || '';
      if (prop === 'setProperty') return (k, v) => { target[k] = String(v); };
      return target[prop] || '';
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    }
  });
}

function makeTable({ avail, baseWidth, tightWidth, ultraWidth, rectRatio = 1, height = 600 }) {
  const wrap = {
    clientWidth: avail,
    scrollLeft: 120,
    style: makeStyle(),
    dataset: {}
  };
  const classList = makeClassList(['rt']);
  const style = makeStyle();
  const tbl = {
    parentElement: wrap,
    classList,
    style,
    dataset: {},
    offsetHeight: height,
    get scrollWidth() {
      if (classList.contains('vr-fit-ultra')) return ultraWidth;
      if (classList.contains('vr-fit-tight')) return tightWidth;
      return baseWidth;
    },
    get offsetWidth() { return this.scrollWidth; },
    getBoundingClientRect() {
      const z = parseFloat(style.zoom) || 1;
      return { width: this.scrollWidth * z * rectRatio };
    }
  };
  return { tbl, wrap };
}

function runHarness({ zoomSupported = true, initialPref = '1', tables = [] }) {
  const listeners = {};
  const winListeners = {};
  const stored = new Map([['vr-rep-max', initialPref]]);
  let rafCallback = null;
  let timerCallback = null;

  const rpr = {
    children: [],
    appendChild(btn) { this.children.push(btn); },
    contains(btn) { return this.children.includes(btn); }
  };
  const main = {
    classList: makeClassList(),
    querySelector(sel) { return sel === '[data-rpx]' ? rpr : null; },
    querySelectorAll() { return tables.map(t => t.tbl); },
    style: makeStyle()
  };

  const doc = {
    body: {},
    addEventListener(name, cb) { listeners[name] = cb; },
    createElement() {
      return { dataset: {}, setAttribute() {}, className: '', id: '', type: '', innerHTML: '' };
    },
    getElementById(id) { return id === 'm' ? main : rpr.children.find(b => b.id === id) || null; },
    querySelector() { return null; }
  };
  const win = {
    addEventListener(name, cb) { winListeners[name] = cb; }
  };

  const context = {
    document: doc,
    window: win,
    CSS: { supports: (prop) => prop === 'zoom' && zoomSupported },
    MutationObserver: class { constructor(cb) { this.cb = cb; } observe() {} },
    localStorage: {
      getItem(k) { return stored.has(k) ? stored.get(k) : null; },
      setItem(k, v) { stored.set(k, v); }
    },
    getComputedStyle() { return { backgroundColor: 'rgb(244, 247, 251)' }; },
    requestAnimationFrame(cb) { rafCallback = cb; return 1; },
    setTimeout(cb) { timerCallback = cb; return 1; },
    clearTimeout() {}
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  if (rafCallback) rafCallback();

  return {
    main,
    win,
    listeners,
    winListeners,
    stored,
    flushTimer() { if (timerCallback) { const fn = timerCallback; timerCallback = null; fn(); } },
    clickMax() {
      const btn = { id: 'rp-max' };
      listeners.click({
        target: { closest: sel => sel.includes('rp-max') ? btn : null },
        preventDefault() {},
        stopPropagation() {}
      });
    }
  };
}

// Test A: Stage 1 (fits naturally), Stage 2 (tight), Stage 3 (ultra), Stage 4 (zoom)
const t1 = makeTable({ avail: 1200, baseWidth: 980, tightWidth: 900, ultraWidth: 850 });
const t2 = makeTable({ avail: 1200, baseWidth: 1320, tightWidth: 1180, ultraWidth: 1080 });
const t3 = makeTable({ avail: 1200, baseWidth: 1480, tightWidth: 1290, ultraWidth: 1190 });
const t4 = makeTable({ avail: 1200, baseWidth: 2400, tightWidth: 2100, ultraWidth: 1920 });

const h = runHarness({ zoomSupported: true, initialPref: '1', tables: [t1, t2, t3, t4] });

assert.strictEqual(h.main.classList.contains('vr-rmax'), true, 'Maximized state is active');
assert.strictEqual(t1.wrap.scrollLeft, 0, 'Maximizing resets horizontal scroll offset');
assert.strictEqual(t1.tbl.classList.contains('vr-fit-tight'), false, 'Stage 1 table needs no tight tier');
assert.strictEqual(t1.tbl.style.zoom, '', 'Stage 1 table needs no zoom');

assert.strictEqual(t2.tbl.classList.contains('vr-fit-tight'), true, 'Stage 2 table uses tight tier');
assert.strictEqual(t2.tbl.classList.contains('vr-fit-ultra'), false, 'Stage 2 table does not escalate to ultra');
assert.strictEqual(t2.tbl.style.zoom, '', 'Stage 2 table fits without zoom');

assert.strictEqual(t3.tbl.classList.contains('vr-fit-ultra'), true, 'Stage 3 table uses ultra-compact tier');
assert.strictEqual(t3.tbl.style.zoom, '', 'Stage 3 table fits without zoom');

assert.strictEqual(t4.tbl.classList.contains('vr-fit-ultra'), true, 'Stage 4 wide table applies ultra tier first');
assert.strictEqual(t4.tbl.classList.contains('vr-fit-scaled'), true, 'Stage 4 wide table applies proportional scaling');
const z4 = parseFloat(t4.tbl.style.zoom);
assert.ok(z4 > 0.35 && z4 < 1, 'Stage 4 wide table computes proportional zoom factor');
assert.ok(t4.tbl.getBoundingClientRect().width <= 1200, 'Stage 4 wide table fits completely inside viewport width');

// Test B: Restore cleans up every fit class and inline style
h.clickMax();
assert.strictEqual(h.main.classList.contains('vr-rmax'), false, 'Restore exits maximized state');
for (const { tbl } of [t1, t2, t3, t4]) {
  assert.strictEqual(tbl.classList.contains('vr-fit-tight'), false, 'Restore clears vr-fit-tight');
  assert.strictEqual(tbl.classList.contains('vr-fit-ultra'), false, 'Restore clears vr-fit-ultra');
  assert.strictEqual(tbl.classList.contains('vr-fit-scaled'), false, 'Restore clears vr-fit-scaled');
  assert.strictEqual(tbl.style.zoom, '', 'Restore clears inline zoom');
  assert.strictEqual(tbl.dataset.vrFit, undefined, 'Restore clears data-vr-fit');
}

// Test C: Window resize dynamically refits maximized tables
h.clickMax();
t4.wrap.clientWidth = 900;
h.winListeners.resize();
h.flushTimer();
const z4Narrow = parseFloat(t4.tbl.style.zoom);
assert.ok(z4Narrow < z4 && t4.tbl.getBoundingClientRect().width <= 900, 'Window resize refits maximized table to narrower viewport');

// Test D: Transform fallback when CSS zoom is not supported
const tf = makeTable({ avail: 1000, baseWidth: 2000, tightWidth: 1800, ultraWidth: 1600, height: 800 });
const hFallback = runHarness({ zoomSupported: false, initialPref: '1', tables: [tf] });
assert.ok(tf.tbl.style.transform.startsWith('scale('), 'Fallback uses CSS transform scale when zoom is unsupported');
assert.ok(tf.wrap.style.height && parseInt(tf.wrap.style.height, 10) < 800, 'Fallback adjusts wrapper height proportionally');
hFallback.clickMax();
assert.strictEqual(tf.tbl.style.transform, '', 'Restore clears fallback transform');
assert.strictEqual(tf.wrap.style.height, '', 'Restore clears fallback wrapper height');

console.log('  ok   report maximize fits all columns in 1-page view across all reports and restores cleanly');
