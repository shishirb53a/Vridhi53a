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

// 3. Export to PDF static wiring, security, and cross-report checks
assert.ok(!/\bwindow\.open\s*\(|\bwindow\.alert\s*\(/.test(source), 'report-maximize.js avoids window.open and window.alert calls');
assert.ok(css.includes('.rp-pdf') && css.includes('.hy-pdf') && css.includes('.fh-pdf') && css.includes('@media print'),
  'report-maximize.css styles Export to PDF buttons and print layout');
assert.ok(stressUI.includes('data-st-pdf="scen"') && stressUI.includes('data-st-pdf="eng"') && stressUI.includes('vrExportReportPDF'),
  'Stress Test renders Export to PDF buttons in maximized views and delegates to vrExportReportPDF');
assert.ok(appCore.includes('#rp-pdf') && appCore.includes('#hy-pdf') && appCore.includes('#fh-pdf') && appCore.includes('[data-st-pdf]'),
  'app.js allowlists Export to PDF buttons for read-only users');

// 4. Export to PDF behavioral harness: button lifecycle, sanitization, thead wrapping, and hidden iframe print
function runPdfHarness() {
  const listeners = {};
  const stored = new Map([['vr-rep-max', '1']]);
  const rafQueue = [];
  const bodyChildren = [];
  let windowOpenCalled = false;
  let printCalled = 0;
  let focusCalled = 0;
  let writtenHtml = '';
  let afterPrintCb = null;

  function makeEl(tag) {
    const el = {
      tagName: String(tag || 'div').toUpperCase(),
      id: '',
      className: '',
      type: '',
      innerHTML: '',
      textContent: '',
      dataset: {},
      style: makeStyle(),
      classList: makeClassList(),
      children: [],
      attributes: [],
      parentNode: null,
      get firstChild() { return this.children[0] || null; },
      get nextSibling() {
        if (!this.parentNode) return null;
        const idx = this.parentNode.children.indexOf(this);
        return idx >= 0 ? this.parentNode.children[idx + 1] || null : null;
      },
      setAttribute(k, v) {
        const existing = this.attributes.find(a => a.name === k);
        if (existing) existing.value = String(v);
        else this.attributes.push({ name: k, value: String(v) });
      },
      getAttribute(k) {
        const existing = this.attributes.find(a => a.name === k);
        return existing ? existing.value : null;
      },
      removeAttribute(k) {
        this.attributes = this.attributes.filter(a => a.name !== k);
      },
      appendChild(child) {
        if (child.parentNode && child.parentNode !== this) child.parentNode.removeChild(child);
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
      insertBefore(child, ref) {
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        const idx = ref ? this.children.indexOf(ref) : -1;
        if (idx >= 0) this.children.splice(idx, 0, child);
        else this.children.push(child);
        return child;
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) this.children.splice(idx, 1);
        child.parentNode = null;
        return child;
      },
      remove() {
        if (this.parentNode) this.parentNode.removeChild(this);
      },
      contains(node) {
        return this === node || this.children.some(c => c.contains && c.contains(node));
      }
    };
    return el;
  }

  const rpr = makeEl('div');
  const titleEl = makeEl('h2');
  titleEl.textContent = 'Annual Portfolio Projection <FY26>';

  // Build a mock live table with a visible header row, a hidden .vr-skip row, a hidden cell, an onclick attr, and a script tag
  function makeMockTable() {
    let theadWrapped = false;
    let removedRows = [];
    let removedCells = [];
    let removedTags = [];
    let removedAttrs = [];

    const hdrRow = {
      tagName: 'TR',
      classList: makeClassList(),
      cells: [
        { tagName: 'TH', classList: makeClassList(), style: makeStyle(), remove() { removedCells.push('h0'); } },
        { tagName: 'TH', classList: makeClassList(), style: makeStyle(), hidden: true, remove() { removedCells.push('h1-hidden'); } }
      ],
      querySelector(s) { return s === 'th' ? this.cells[0] : null; },
      remove() { removedRows.push('hdr'); }
    };
    const skipRow = {
      tagName: 'TR',
      classList: makeClassList(['vr-skip']),
      cells: [],
      remove() { removedRows.push('skip'); }
    };
    const dataRow = {
      tagName: 'TR',
      classList: makeClassList(),
      cells: [
        { tagName: 'TD', classList: makeClassList(), style: makeStyle(), remove() { removedCells.push('d0'); } },
        { tagName: 'TD', classList: makeClassList(), style: makeStyle(), hidden: true, remove() { removedCells.push('d1-hidden'); } }
      ],
      remove() { removedRows.push('data'); }
    };
    const badScript = { remove() { removedTags.push('script'); } };
    const clickableNode = {
      attributes: [{ name: 'onclick', value: 'alert(1)' }, { name: 'class', value: 'ok' }],
      removeAttribute(name) { removedAttrs.push(name); }
    };

    const cloneTbl = {
      tagName: 'TABLE',
      classList: makeClassList(['rt', 'vr-fit-tight']),
      style: makeStyle(),
      dataset: {},
      children: [hdrRow, skipRow, dataRow],
      get firstChild() { return this.children[0] || null; },
      insertBefore(node) { if (node.tagName === 'THEAD') theadWrapped = true; this.children.unshift(node); },
      appendChild(node) { if (node.tagName === 'THEAD') theadWrapped = true; this.children.push(node); },
      querySelector(sel) {
        if (sel === 'thead') return null;
        if (sel === 'tr') return hdrRow;
        return null;
      },
      querySelectorAll(sel) {
        if (sel === 'tr') return [hdrRow, skipRow, dataRow];
        if (sel.includes('script')) return [badScript];
        if (sel === '*') return [clickableNode];
        if (sel === 'th button') return [];
        return [];
      },
      get outerHTML() {
        return '<table class="rt">' + (theadWrapped ? '<thead><tr><th>Year</th></tr></thead>' : '') + '<tbody><tr><td>2026</td></tr></tbody></table>';
      }
    };

    const liveTbl = {
      tagName: 'TABLE',
      parentElement: { clientWidth: 1200, scrollLeft: 0, style: makeStyle(), dataset: {} },
      classList: makeClassList(['rt']),
      style: makeStyle(),
      dataset: {},
      scrollWidth: 900,
      offsetWidth: 900,
      querySelectorAll(sel) { return sel === 'tr' ? [hdrRow, skipRow, dataRow] : []; },
      cloneNode() { return cloneTbl; }
    };

    return {
      liveTbl,
      stats: () => ({ theadWrapped, removedRows, removedCells, removedTags, removedAttrs })
    };
  }

  const mockTbl = makeMockTable();
  const main = {
    id: 'm',
    classList: makeClassList(),
    style: makeStyle(),
    querySelector(sel) {
      if (sel === '[data-rpx]') return rpr;
      if (sel.includes('[data-rpx] h2')) return titleEl;
      return null;
    },
    querySelectorAll(sel) {
      if (sel.includes('table.rt')) return [mockTbl.liveTbl];
      return [];
    }
  };

  const doc = {
    body: {
      appendChild(child) {
        child.parentNode = this;
        bodyChildren.push(child);
        return child;
      },
      removeChild(child) {
        const idx = bodyChildren.indexOf(child);
        if (idx >= 0) bodyChildren.splice(idx, 1);
        child.parentNode = null;
      }
    },
    addEventListener(name, cb) { listeners[name] = cb; },
    createElement(tag) {
      const el = makeEl(tag);
      if (String(tag).toLowerCase() === 'iframe') {
        const frameDoc = {
          open() {},
          write(s) { writtenHtml = s; },
          close() {}
        };
        const frameWin = {
          document: frameDoc,
          addEventListener(ev, cb) { if (ev === 'afterprint') afterPrintCb = cb; },
          focus() { focusCalled++; },
          print() { printCalled++; }
        };
        el.contentWindow = frameWin;
        el.contentDocument = frameDoc;
      }
      return el;
    },
    getElementById(id) {
      if (id === 'm') return main;
      const inRpr = rpr.children.find(c => c.id === id);
      if (inRpr) return inRpr;
      return bodyChildren.find(c => c.id === id) || null;
    },
    querySelector() { return null; }
  };

  const win = {
    addEventListener() {},
    gppActiveName() { return 'Asha & <script>alert(1)</script>'; },
    open() { windowOpenCalled = true; }
  };

  const context = {
    document: doc,
    window: win,
    CSS: { supports: () => true },
    MutationObserver: class { observe() {} },
    localStorage: {
      getItem(k) { return stored.has(k) ? stored.get(k) : null; },
      setItem(k, v) { stored.set(k, v); }
    },
    getComputedStyle() {
      return {
        backgroundColor: 'rgb(244, 247, 251)',
        display: 'table',
        getPropertyValue(prop) { return prop === '--acl' ? '#1b4d3e' : ''; }
      };
    },
    requestAnimationFrame(cb) { rafQueue.push(cb); return rafQueue.length; },
    setTimeout() { return 1; },
    clearTimeout() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);
  while (rafQueue.length) rafQueue.shift()();

  return {
    rpr,
    win,
    bodyChildren,
    mockTbl,
    getState: () => ({ windowOpenCalled, printCalled, focusCalled, writtenHtml, afterPrintCb }),
    flushRaf() { while (rafQueue.length) rafQueue.shift()(); },
    click(id) {
      const btn = { id };
      listeners.click({
        target: { closest: sel => sel.includes(id) ? btn : null },
        preventDefault() {},
        stopPropagation() {}
      });
    }
  };
}

const pdfH = runPdfHarness();
// Button appears before #rp-max when maximized
assert.deepStrictEqual(pdfH.rpr.children.map(c => c.id), ['rp-pdf', 'rp-max'],
  'Maximized report renders Export to PDF button immediately before Restore button');
assert.ok(pdfH.rpr.children[0].innerHTML.includes('<svg') && !pdfH.rpr.children[0].innerHTML.includes('<span>'),
  'Export to PDF button renders consistently as an icon-only button');
assert.strictEqual(pdfH.rpr.children[0].getAttribute('aria-label'), 'Export to PDF', 'Export to PDF icon button exposes accessible aria-label');
assert.strictEqual(pdfH.rpr.children[0].title, 'Export to PDF', 'Export to PDF icon button exposes tooltip title');
assert.ok(pdfH.rpr.children[0].className.includes('vr-ib') && pdfH.rpr.children[0].className.includes('vr-ib-pdf'),
  'Export to PDF button uses consistent vr-ib icon button classes');

// Clicking Export to PDF builds a sanitized landscape A4 document and prints via hidden iframe
pdfH.click('rp-pdf');
pdfH.flushRaf();
const pdfState = pdfH.getState();
const tblStats = pdfH.mockTbl.stats();
assert.strictEqual(pdfState.windowOpenCalled, false, 'PDF export never calls window.open');
assert.strictEqual(pdfState.focusCalled, 1, 'PDF export focuses hidden print iframe');
assert.strictEqual(pdfState.printCalled, 1, 'PDF export triggers iframe contentWindow.print()');
assert.strictEqual(pdfH.bodyChildren.some(c => c.id === 'vr-pdf-frame'), true, 'Hidden print iframe #vr-pdf-frame is attached');
assert.ok(pdfState.writtenHtml.includes('@page{size:A4 landscape;margin:9mm}'), 'Printable HTML specifies A4 landscape page size');
assert.ok(pdfState.writtenHtml.includes('Annual Portfolio Projection &lt;FY26&gt;'), 'Report title is HTML-escaped');
assert.ok(pdfState.writtenHtml.includes('Asha &amp; &lt;script&gt;alert(1)&lt;/script&gt;'), 'Client name is HTML-escaped');
assert.ok(!pdfState.writtenHtml.includes('<script>alert(1)</script>'), 'Unescaped script injection never appears in print HTML');
assert.ok(pdfState.writtenHtml.includes('--ac:#1b4d3e'), 'Validated theme accent color is applied');
assert.ok(pdfState.writtenHtml.includes('<thead><tr><th>Year</th></tr></thead>'), 'Header row is wrapped in <thead> for page repetition');
assert.strictEqual(tblStats.theadWrapped, true, 'clonePrintableTable promotes header row into <thead>');
assert.deepStrictEqual(tblStats.removedRows, ['skip'], 'Hidden .vr-skip rows are omitted from PDF');
assert.deepStrictEqual(tblStats.removedCells, ['d1-hidden', 'h1-hidden'], 'Hidden columns/cells are omitted from PDF');
assert.deepStrictEqual(tblStats.removedTags, ['script'], 'Embedded script tags are stripped from cloned report');
assert.deepStrictEqual(tblStats.removedAttrs, ['onclick'], 'Inline event handler attributes are stripped');

// afterprint cleans up the hidden iframe
assert.strictEqual(typeof pdfState.afterPrintCb, 'function', 'afterprint cleanup listener is registered');
pdfState.afterPrintCb();
assert.strictEqual(pdfH.bodyChildren.some(c => c.id === 'vr-pdf-frame'), false, 'Hidden print iframe is removed after printing');

// buildPrintDocument rejects unsafe accent strings
const safeDoc = pdfH.win.__vrPdfBuilder.buildPrintDocument({
  title: 'Test',
  accent: 'red;background:url(javascript:alert(1))',
  bodyHtml: '<table></table>',
  isTable: true
});
assert.ok(safeDoc.includes('--ac:#0f2a4a'), 'Invalid CSS accent falls back to safe default hex color');

// Restoring hides/removes the Export to PDF button; maximizing brings it back
pdfH.click('rp-max');
assert.deepStrictEqual(pdfH.rpr.children.map(c => c.id), ['rp-max'], 'Restoring report removes Export to PDF button');
pdfH.click('rp-max');
assert.deepStrictEqual(pdfH.rpr.children.map(c => c.id), ['rp-pdf', 'rp-max'], 'Re-maximizing restores Export to PDF button');

console.log('  ok   report maximize fits all columns in 1-page view and exports clean A4 landscape PDFs across all reports');
