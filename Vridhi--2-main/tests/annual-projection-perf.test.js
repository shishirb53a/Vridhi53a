'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function extractFn(src, sig) {
  const idx = src.indexOf(sig);
  if (idx < 0) throw new Error('Could not find ' + sig);
  let i = src.indexOf('{', idx), depth = 0, inS = false, inD = false, inT = false, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (!inD && !inT && c === "'") inS = !inS;
    else if (!inS && !inT && c === '"') inD = !inD;
    else if (!inS && !inD && c === '`') inT = !inT;
    else if (!inS && !inD && !inT) {
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return src.slice(idx, i + 1); }
    }
  }
  throw new Error('Unclosed function ' + sig);
}

// Build an edge-case state covering every compounding mode, gratuity, maturity, mid-year entry, non-April amon, and policy payouts
function makeEdgeCaseState() {
  return {
    start: 2026,
    end: 2046,
    ret: 58,
    retP: 58,
    goal: 45000000,
    members: [
      { id: 'm1', name: 'Self', role: 'Self', age: 42 },
      { id: 'm2', name: 'Spouse', role: 'Spouse', age: 39 },
      { id: 'm3', name: 'Kid', role: 'Child', age: 10 }
    ],
    grat: { basic: 150000, svc: 12, rem: 16, cap: 2000000 },
    cats: [],
    hide: [],
    assets: [
      { id: 'a1', name: 'Equity MF', cat: 'Equity', value: 1800000, add: 120000, madd: 15000, ret: 0.115, yrs: 14, cmp: 'annual', amon: 4, edate: '2026-06-15' },
      { id: 'a2', name: 'PPF Account', cat: 'PF/PPF/SUK', value: 1400000, add: 150000, madd: 0, ret: 0.071, yrs: 12, cmp: 'ppf', amon: 4 },
      { id: 'a3', name: 'Monthly RD', cat: 'Fixed Deposit', value: 500000, add: 0, madd: 10000, ret: 0.075, yrs: 10, cmp: 'monthly', amon: 9, mat: 2033, icr: true },
      { id: 'a4', name: 'Fixed Maturity FD', cat: 'Fixed Deposit', value: 800000, add: 50000, madd: 0, ret: 0.068, yrs: 8, cmp: 'annual', amon: 1, mat: 2032, icr: false },
      { id: 'a5', name: 'Lump Sum Bond', cat: 'Fixed Deposit', value: 600000, add: 200000, madd: 0, ret: 0.08, yrs: 5, cmp: 'annual', oa: true, yfrom: '2027', yto: '2030', amon: 7 },
      { id: 'a6', name: 'Gratuity', cat: 'Gratuity', type: 'gratuity', value: 1038462, add: 0, madd: 0, ret: 0, yrs: 16 },
      { id: 'a7', name: 'Savings Bank', cat: 'Saving AC', value: 350000, add: 0, madd: 5000, ret: 0.035, yrs: 20, cmp: 'monthly', mfrom: '2027-01', mto: '2035-06' }
    ],
    policies: [
      { id: 'p1', name: 'Endowment', active: true, scope: 'goal', payouts: [{ year: 2035, amount: 500000 }, { year: 2040, amount: 750000 }] }
    ]
  };
}

// 1. Financial parity between fast _meta paths and reference fyInfo / matOf loops
(function testFinancialParity() {
  const appSrc = read('modules/app-core/app.js');
  const engSrc = read('modules/portfolio-calculations/engine.js');
  const selSrc = read('modules/reports/report-selection.js');
  const intSrc = read('modules/reports/interest-income.js');

  const S = makeEdgeCaseState();
  const UI = { tab: 'Reports', rv: 'year', rq: '', rk: 'a', rd: 1, sel: null, rsel: null, rcl: null, age: 42 };
  const sandbox = {
    console, Math, Number, String, Array, Object, Date, JSON, RegExp, Intl,
    Float64Array, Int32Array, Map, Set, Boolean, parseInt, parseFloat, isNaN, isFinite,
    S, UI,
    esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    escn: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    MNL: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    MSN: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    fyl: y => `FY ${y}-${String(y + 1).slice(-2)}`,
    sh: s => s || '—',
    pc: n => n == null ? '—' : (n * 100).toFixed(2) + '%',
    cr: n => '₹ ' + (n / 1e7).toFixed(2) + ' Cr',
    tr: s => s,
    stage: (a, r) => r === 'Child' ? (a < 18 ? 'School' : 'College') : '—',
    RCOLS: {
      vis: () => true,
      annualMonthlyIncome: (interest, pay, allm) => {
        const p = pay > 0 ? pay : 0;
        if ((interest == null && !p) || (allm && !p)) return null;
        return ((allm ? 0 : (interest || 0)) + p) / 12;
      }
    },
    VRPolicy: {
      hasPayouts: () => true,
      forState: st => st.policies || [],
      payoutForYear: (st, y) => (st.policies || []).reduce((s, p) => s + (p.payouts || []).filter(x => x.year === y).reduce((a, b) => a + b.amount, 0), 0),
      applyToRows: (st, rows) => {
        rows.forEach(r => {
          const p = (st.policies || []).reduce((s, po) => s + (po.payouts || []).filter(x => x.year === r.year).reduce((a, b) => a + b.amount, 0), 0);
          r.pay = p; r.payR = p;
        });
      },
      payoutForMonth: () => 0,
      receivedBy: () => 0
    },
    render: () => {},
    document: { addEventListener: () => {}, querySelector: () => null, getElementById: () => null }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  const I = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const LK = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  sandbox.f = n => n == null ? '—' : '₹ ' + I.format(Math.round(n));
  sandbox.rf = n => n == null ? '—' : I.format(Math.round(n));
  sandbox.lk = n => n == null ? '—' : LK.format(n / 1e5);

  vm.runInContext(engSrc, sandbox);
  vm.runInContext(`
    var gratAt = (st, k) => window.VRCalcCore.gratuity(st, k);
    var fyInfo = (x, st, a) => window.VRCalcCore.fyInfo(x, st, a);
    var entry = x => window.VRCalcCore.entry(x);
    var matOf = (x, st) => window.VRCalcCore.matOf(x, st);
    var calc = st => window.VRCalcCore.calculate(st, { stage: stage, yearsOf: window.VRCalcCore.yrsOf, policy: VRPolicy });
    var calcM = st => ({ rows: [] });
    var rowRoi = (r, mon) => {
      let n = 0, d = 0;
      S.assets.forEach((x, i) => {
        if (x.type === 'gratuity') return;
        const mt = matOf(x, S);
        if (mt && (mon ? r.a > mt.km : r.a > mt.row)) return;
        const v = r.v[i];
        if (v > 0) { n += v * x.ret; d += v; }
      });
      return d > 0 ? n / d : null;
    };
    var rowRoiTxt = (r, mon) => pc(rowRoi(r, mon));
  `, sandbox);

  for (const sig of [
    'function hin(',
    'function vrStateSig(',
    'function allMat(',
    'function depShow(',
    'function polTiVal(',
    'function polTiTxt(',
    'function repRows('
  ]) {
    vm.runInContext(extractFn(appSrc, sig), sandbox);
  }
  vm.runInContext(`
    window.vrReportCalc = function(){
      var sig = vrStateSig(S), c = window.__vrReportCalcCache;
      if (c && c.state === S && c.sig === sig) return c.value;
      var value = calc(S);
      window.__vrReportCalcCache = { state: S, sig: vrStateSig(S), value: value };
      return value;
    };
  `, sandbox);
  vm.runInContext(selSrc, sandbox);
  vm.runInContext(intSrc, sandbox);

  const D = sandbox.vrReportCalc();
  assert(D._meta, 'calc(S) must attach precomputed _meta');
  assert(!Object.keys(D).includes('_meta'), '_meta must be non-enumerable');
  assert(!JSON.stringify(D).includes('_meta'), '_meta must not serialize into JSON');

  const subsets = [
    S.assets.map((_, i) => i),
    [0, 1, 2],
    [2, 3],
    [3],
    [4, 5, 6],
    [5]
  ];

  // Reference formulas (pre-optimization)
  function refDepShow(a, idx, N) {
    if (a < 2 || a > N) return 0;
    const is = idx || S.assets.map((_, i) => i);
    return is.reduce((s, i) => {
      const x = S.assets[i];
      if (!x || x.type === 'gratuity') return s;
      const fv = sandbox.fyInfo(x, S, a);
      return s + (fv.act ? (fv.yp ? x.add : 0) + (x.madd || 0) * fv.n : 0);
    }, 0);
  }
  function refAllMat(idx, r) {
    return idx.length > 0 && idx.every(i => {
      const x = S.assets[i], mt = sandbox.matOf(x, S);
      return mt && r.a > mt.row;
    });
  }
  function refSelDI(r, idx, rows) {
    if (r.a === 1) return [0, null];
    const p = rows[r.a - 2];
    const add = idx.reduce((s, i) => {
      const x = S.assets[i];
      if (!x || x.type === 'gratuity') return s;
      const fv = sandbox.fyInfo(x, S, r.a);
      return s + (fv.act ? (fv.yp ? x.add : 0) + (x.madd || 0) * fv.n : 0);
    }, 0);
    const st = idx.reduce((s, i) => s + r.v[i], 0);
    const pv = idx.reduce((s, i) => s + p.v[i], 0);
    return [add, st - pv - add];
  }

  for (const r of D.rows) {
    assert.strictEqual(sandbox.depShow(r.a, null, D.rows.length), refDepShow(r.a, null, D.rows.length), `depShow(all) mismatch at row ${r.a}`);
    for (const idx of subsets) {
      assert.strictEqual(sandbox.depShow(r.a, idx, D.rows.length), refDepShow(r.a, idx, D.rows.length), `depShow(sub) mismatch at row ${r.a}`);
      assert.strictEqual(sandbox.allMat(idx, r, false), refAllMat(idx, r), `allMat mismatch at row ${r.a}`);
      const fastDI = sandbox.selDI(r, false, idx, D.rows);
      const refDI = refSelDI(r, idx, D.rows);
      assert.strictEqual(fastDI[0], refDI[0], `selDI dep mismatch at row ${r.a}`);
      assert.strictEqual(fastDI[1], refDI[1], `selDI int mismatch at row ${r.a}`);
    }
  }

  // Verify intData parity against reference fyInfo
  const intRes = sandbox.intData();
  for (let k = 0; k < intRes.rows.length; k++) {
    const ir = intRes.rows[k];
    const r = D.rows[ir.a], prev = D.rows[ir.a - 1];
    for (let i = 0; i < S.assets.length; i++) {
      const x = S.assets[i];
      const fv = x.type === 'gratuity' ? { act: false, yp: false, n: 0 } : sandbox.fyInfo(x, S, r.a);
      const expAdd = x.type === 'gratuity' ? 0 : (fv.act ? (fv.yp ? x.add : 0) + (x.madd || 0) * fv.n : 0);
      assert.strictEqual(ir.ad[i], expAdd, `intData ad mismatch at row ${r.a} asset ${i}`);
      assert.strictEqual(ir.it[i], r.v[i] - prev.v[i] - expAdd, `intData it mismatch at row ${r.a} asset ${i}`);
    }
  }

  // Verify repRows() + D._repCache parity across full render, repeated search, and repMin()
  sandbox.__apSkipRc = true;
  const full1 = sandbox.repRows();
  assert(!full1.includes('<div class="rc">'), '__apSkipRc omits dead hidden .rc block');
  assert(D._repCache && !Object.keys(D).includes('_repCache'), '_repCache is non-enumerable');
  const full2 = sandbox.repRows();
  assert.strictEqual(full2, full1, 'Cached repRows() output must be byte-for-byte identical');

  UI.rq = '2035';
  const search1 = sandbox.repRows();
  const search2 = sandbox.repRows();
  assert.strictEqual(search2, search1, 'Cached search haystack must return identical results');
  assert(search1.includes('1 Apr 2035') && !search1.includes('1 Apr 2026'), 'Search filters to matching year');
  UI.rq = '';

  // Subset repMin parity: cold cache vs warm cache
  UI.rsel = ['a1', 'a2', 'a3'];
  const sub1 = sandbox.repRows();
  const sub2 = sandbox.repRows();
  assert.strictEqual(sub2, sub1, 'Cached repMin() output must be byte-for-byte identical');
  assert(sub1.includes('Equity MF') && sub1.includes('PPF Account') && !sub1.includes('Savings Bank'));
  sandbox.__apSkipRc = false;
  UI.rsel = null;
  console.log('PASS: Financial formula & cache parity verified across all edge cases');
})();

// 2. Annual Projection cache hit, desktop lazy mobile skip, and surgical vrUpdateAnnualFilters
(function testAnnualProjectionLifecycle() {
  const apSrc = read('modules/reports/annual-projection.js');
  const S = makeEdgeCaseState();
  const UI = { tab: 'Reports', rv: 'year', rq: '', rk: 'a', rd: 1, sel: null, rsel: null, rcl: null, msd: null };

  let repRowsCalls = 0, fullRenderCalls = 0, rcolsApplyCalls = 0, retiredCalls = 0, helperCalls = 0, fitCalls = 0;

  function makeFakeDom(width) {
    const rrEl = { id: 'rr', innerHTML: '', querySelector: () => null };
    const rsfEl = { id: 'rsf', innerHTML: '' };
    const mobEl = { id: 'ap-mob-host', innerHTML: '', dataset: {} };
    const footHealthEl = { className: 'ap-foot-health', innerHTML: '' };
    const classBtn = { textContent: 'All asset classes' };
    const holdBtn = { textContent: 'All holdings (7)' };
    const cbA1 = { type: 'checkbox', dataset: { rsel: 'a1' }, checked: true, focus: () => {} };
    const classDd = {
      dataset: { msd: 'class' },
      querySelector: sel => sel === '.msd-b b' ? classBtn : null,
      querySelectorAll: sel => sel === 'input[data-rcat]' ? [] : []
    };
    const holdDd = {
      dataset: { msd: 'hold' },
      querySelector: sel => sel === '.msd-b b' ? holdBtn : null,
      querySelectorAll: sel => sel === 'input[data-rsel]' ? [cbA1] : []
    };
    const apWrap = {
      className: 'ap-wrap',
      querySelector: sel => {
        if (sel === '.ap-foot-health') return footHealthEl;
        if (sel === '.msd[data-msd="class"] .msd-b b') return classBtn;
        if (sel === '.msd[data-msd="hold"] .msd-b b') return holdBtn;
        if (sel === '.msd[data-msd="class"]') return classDd;
        if (sel === '.msd[data-msd="hold"]') return holdDd;
        if (sel === '#rr') return rrEl;
        if (sel === '#rsf') return rsfEl;
        if (sel === '[data-rsel="a1"]') return cbA1;
        return null;
      },
      querySelectorAll: sel => {
        if (sel === 'input[data-rsel]') return [cbA1];
        return [];
      }
    };
    const doc = {
      getElementById: id => id === 'rr' ? rrEl : id === 'rsf' ? rsfEl : id === 'ap-mob-host' ? mobEl : null,
      querySelector: sel => {
        if (sel === '#m .ap-wrap') return apWrap;
        if (sel === '#m .ap-wrap .msd[data-msd="class"]') return classDd;
        if (sel === '#m .ap-wrap .msd[data-msd="hold"]') return holdDd;
        if (sel === '#m .ap-wrap [data-rsel="a1"]' || sel === '[data-rsel="a1"]') return cbA1;
        return null;
      },
      querySelectorAll: () => [],
      addEventListener: () => {}
    };
    return { doc, rrEl, rsfEl, mobEl, footHealthEl, classBtn, holdBtn, cbA1, width };
  }

  function runInEnv(innerWidth) {
    const dom = makeFakeDom(innerWidth);
    const D = {
      ri: 10,
      rows: Array.from({ length: 15 }, (_, i) => ({
        a: i + 1,
        year: 2026 + i,
        age: [42 + i, 39 + i, 10 + i],
        st: ['—', '—', 'School'],
        v: [1e6 * (1 + i * 0.1), 5e5 * (1 + i * 0.07)],
        tot: 1.5e6 * (1 + i * 0.09),
        add: i === 0 ? 0 : 100000,
        chg: i === 0 ? 0 : 200000,
        pay: 0
      }))
    };
    const sandbox = {
      console, Math, Number, String, Array, Object, Date, JSON, RegExp, Set, Map,
      S: Object.assign({}, S, { assets: S.assets.slice(0, 2) }),
      UI: Object.assign({}, UI),
      innerWidth,
      document: dom.doc,
      addEventListener: () => {},
      setTimeout: fn => { fn(); return 1; },
      clearTimeout: () => {},
      vrReportCalc: () => D,
      vrStateSig: () => 'sig-1',
      repSel: () => {
        const rsel = sandbox.UI.rsel;
        const idx = rsel ? sandbox.S.assets.map((x, i) => rsel.includes(x.id) ? i : -1).filter(i => i >= 0) : [0, 1];
        return { all: idx.length === 2, none: idx.length === 0, min: idx.length > 0 && idx.length < 2, idx };
      },
      repRows: () => { repRowsCalls++; return '<table class="rt"><tr><th>As on</th></tr></table>'; },
      repSelDrops: () => '<div class="msd"></div>',
      depShow: a => a > 1 ? 100000 : 0,
      allMat: () => false,
      selDI: () => [100000, 100000],
      rowRoi: () => 0.085,
      esc: s => String(s == null ? '' : s),
      escn: s => String(s == null ? '' : s),
      f: n => '₹ ' + Math.round(n),
      rf: n => String(Math.round(n)),
      cr: n => '₹ ' + (n / 1e7).toFixed(2) + ' Cr',
      RCOLS: {
        vis: () => true,
        apply: () => { rcolsApplyCalls++; },
        annualMonthlyIncome: (i, p) => ((i || 0) + (p || 0)) / 12
      },
      VRPolicy: { hasPayouts: () => false },
      VRAnnualHelpers: { refresh: () => { helperCalls++; } },
      vrMarkRetired: () => { retiredCalls++; },
      vrReportFit: () => { fitCalls++; },
      render: () => { fullRenderCalls++; }
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(apSrc, sandbox);
    return { sandbox, dom };
  }

  // Desktop (>768px): skips mobile card rendering & hits HTML cache on reopen
  repRowsCalls = 0;
  const desk = runInEnv(1440);
  const h1 = desk.sandbox.repAnnualPage();
  assert.strictEqual(repRowsCalls, 1, 'Initial open renders table once');
  assert(h1.includes('id="ap-mob-host"'), 'Desktop renders empty mobile host container');
  assert(!h1.includes('id="milestone-retirement"'), 'Desktop skips heavy mobile milestone cards');

  const h2 = desk.sandbox.repAnnualPage();
  assert.strictEqual(h2, h1, 'Reopen returns cached HTML');
  assert.strictEqual(repRowsCalls, 1, 'Cache hit skips repRows() completely');

  // Surgical filter update on Annual Projection does NOT call full render()
  fullRenderCalls = rcolsApplyCalls = retiredCalls = helperCalls = fitCalls = 0;
  desk.sandbox.UI.rsel = ['a1'];
  const ok = desk.sandbox.vrUpdateAnnualFilters('data-rsel', 'a1');
  assert.strictEqual(ok, true, 'vrUpdateAnnualFilters succeeds when .ap-wrap is active');
  assert.strictEqual(fullRenderCalls, 0, 'Surgical filter update must NOT trigger full render()');
  assert.strictEqual(rcolsApplyCalls, 1, 'Applies column prefs once');
  assert.strictEqual(retiredCalls, 1, 'Marks retired rows once');
  assert.strictEqual(helperCalls, 1, 'Refreshes annual helpers once');
  assert.strictEqual(fitCalls, 1, 'Fits report width once');
  assert.strictEqual(desk.dom.holdBtn.textContent, 'Equity MF', 'Updates holdings dropdown label in place');

  // Mobile (<=768px): renders mobile cards including milestone-retirement AND skips hidden desktop table
  repRowsCalls = rcolsApplyCalls = retiredCalls = helperCalls = fitCalls = fullRenderCalls = 0;
  const mob = runInEnv(390);
  const hm = mob.sandbox.repAnnualPage();
  assert(hm.includes('id="milestone-retirement"'), 'Mobile renders retirement milestone card');
  assert(hm.includes('data-ap-lazy-tbl="1"'), 'Strict mobile marks #rr as lazy desktop table');
  assert.strictEqual(repRowsCalls, 0, 'Strict mobile skips hidden desktop table repRows() on initial open');

  // Mobile surgical filter update skips hidden desktop table rebuild & desktop post-processors
  mob.dom.rrEl.dataset = { apLazyTbl: '1' };
  mob.sandbox.UI.rsel = ['a1'];
  const okMob = mob.sandbox.vrUpdateAnnualFilters('data-rh', 'a1');
  assert.strictEqual(okMob, true, 'Mobile surgical filter update succeeds');
  assert.strictEqual(repRowsCalls, 0, 'Mobile filter toggle does NOT rebuild hidden desktop table');
  assert.strictEqual(rcolsApplyCalls, 0, 'Mobile filter toggle skips desktop RCOLS.apply');
  assert.strictEqual(fitCalls, 0, 'Mobile filter toggle skips desktop vrReportFit');
  assert.strictEqual(fullRenderCalls, 0, 'Mobile filter toggle does NOT trigger full render()');
  assert(mob.dom.mobEl.innerHTML.includes('id="milestone-retirement"'), 'Mobile filter toggle updates mobile milestone cards');

  console.log('PASS: Annual Projection cache hit, desktop lazy mobile skip, mobile lazy desktop skip, and surgical filter update verified');
})();

// 3. Mobile checkbox rAF coalescing & Select All / Clear synchronous paint in report-filters.js
(function testMobileCheckboxBatching() {
  const rfSrc = read('modules/report-filters/report-filters.js');
  const selSrc = read('modules/reports/report-selection.js');
  const S = makeEdgeCaseState();
  const UI = { tab: 'Reports', rv: 'year', rq: '', rk: 'a', rd: 1, sel: null, rsel: null, rcl: null, msd: 'hold' };
  const listeners = {};
  const rafQueue = new Map();
  let nextRafId = 1;
  let annualUpdateCalls = 0;
  let fullRenderCalls = 0;

  const holdBtnLabel = { textContent: 'All holdings' };
  const clsBtnLabel = { textContent: 'All asset classes' };
  const holdCbs = S.assets.map(a => ({ dataset: { rh: a.id }, checked: true }));
  const clsCbs = ['Equity', 'PF/PPF/SUK', 'Fixed Deposit', 'Gratuity', 'Saving AC'].map(c => ({ dataset: { rcls: c }, checked: true }));
  const holdDd = {
    dataset: { msd: 'hold' },
    querySelector: sel => sel === '.msd-b b' ? holdBtnLabel : null,
    querySelectorAll: sel => sel === 'input[data-rh]' ? holdCbs : []
  };
  const clsDd = {
    dataset: { msd: 'cls' },
    querySelector: sel => sel === '.msd-b b' ? clsBtnLabel : null,
    querySelectorAll: sel => sel === 'input[data-rcls]' ? clsCbs : []
  };

  const sandbox = {
    console, Math, Number, String, Array, Object, Date, JSON, RegExp, Set, Map,
    S, UI,
    CATS: ['Equity', 'PF/PPF/SUK', 'Fixed Deposit', 'Gratuity', 'Saving AC'],
    CC: {}, COL: ['#000'],
    esc: s => String(s == null ? '' : s),
    escn: s => String(s == null ? '' : s),
    f: n => '₹ ' + Math.round(n || 0),
    render: () => { fullRenderCalls++; },
    vrUpdateAnnualFilters: () => { annualUpdateCalls++; return true; },
    requestAnimationFrame: fn => { const id = nextRafId++; rafQueue.set(id, fn); return id; },
    cancelAnimationFrame: id => { rafQueue.delete(id); },
    document: {
      addEventListener: (ev, fn) => { listeners[ev] = fn; },
      querySelector: sel => sel === '.msd[data-msd="hold"]' ? holdDd : sel === '.msd[data-msd="cls"]' ? clsDd : null,
      querySelectorAll: () => [],
      getElementById: () => null
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(selSrc, sandbox);
  vm.runInContext(rfSrc, sandbox);

  // 5 rapid consecutive checkbox unchecks must update labels synchronously and coalesce into 1 rAF update
  for (let i = 0; i < 5; i++) {
    listeners.change({ target: { dataset: { rh: S.assets[i].id }, checked: false } });
  }
  assert.strictEqual(annualUpdateCalls, 0, 'Heavy report update is deferred to rAF so browser paints checkmarks immediately');
  assert.strictEqual(rafQueue.size, 1, '5 rapid checkbox taps coalesce into exactly 1 pending rAF');
  assert.strictEqual(holdBtnLabel.textContent, '2 of 7 selected', 'Dropdown summary updates synchronously before rAF');

  // Flush the single coalesced animation frame
  const callbacks = Array.from(rafQueue.values());
  rafQueue.clear();
  callbacks.forEach(fn => fn());
  assert.strictEqual(annualUpdateCalls, 1, 'Coalesced rAF executes exactly 1 surgical report update');
  assert.strictEqual(fullRenderCalls, 0, 'Zero full page renders during rapid checkbox burst');

  // Select All updates all checkboxes & label synchronously and coalesces into 1 rAF
  const selectAllTarget = { closest: sel => sel === '[data-msda]' ? { dataset: { msda: 'hold:all' } } : null };
  listeners.click({ target: selectAllTarget });
  assert.strictEqual(UI.rsel, null, 'Select All resets UI.rsel to null');
  assert.strictEqual(holdBtnLabel.textContent, 'All holdings', 'Select All updates label synchronously');
  assert(holdCbs.every(cb => cb.checked === true), 'Select All checks every holding checkbox synchronously');
  assert.strictEqual(rafQueue.size, 1, 'Select All schedules 1 rAF report update');
  sandbox.vrFlushFilterUpdate();
  assert.strictEqual(annualUpdateCalls, 2, 'Select All flush runs 1 surgical report update');
  assert.strictEqual(fullRenderCalls, 0, 'Select All triggers zero full page renders');

  console.log('PASS: Mobile checkbox rAF coalescing and synchronous Select All feedback verified');
})();

// 4. Lazy client switcher drawer in goal-planner-clients.js
(function testLazyClientDrawer() {
  const gppSrc = read('modules/goal-planner-clients/goal-planner-clients.js');
  let calcCalls = 0;
  const portal = { id: 'gpp-drawer-portal', innerHTML: '' };
  const sandbox = {
    console, Math, Number, String, Array, Object, Date, JSON,
    S: makeEdgeCaseState(),
    UI: { tab: 'Reports', rv: 'year' },
    GPP_KEYS: ['start', 'end', 'ret', 'retP', 'goal', 'members', 'assets', 'grat', 'cats', 'hide'],
    DEF: () => makeEdgeCaseState(),
    clean: x => x,
    tr: s => s,
    VRPolicy: { forState: () => [], hasPayouts: () => false },
    dg: { addEventListener: () => {}, close: () => {}, showModal: () => {}, innerHTML: '' },
    calc: st => { calcCalls++; return { ri: 0, rows: [{ a: 1, tot: 100000, v: [100000] }] }; },
    esc: s => String(s == null ? '' : s),
    escn: s => String(s == null ? '' : s),
    f: n => '₹ ' + Math.round(n),
    cr: n => '₹ ' + (n / 1e7).toFixed(2) + ' Cr',
    save: () => {},
    render: () => {},
    toast: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    document: {
      body: { appendChild: () => {} },
      getElementById: id => id === 'gpp-drawer-portal' ? portal : null,
      createElement: () => portal,
      querySelector: () => null,
      addEventListener: () => {}
    },
    addEventListener: () => {}
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(gppSrc, sandbox);

  // Add multiple clients to the switcher
  sandbox.S.gpp = {
    active: 'c1',
    profiles: {
      c1: { name: 'Client 1', d: makeEdgeCaseState(), created: 1 },
      c2: { name: 'Client 2', d: makeEdgeCaseState(), created: 2 },
      c3: { name: 'Client 3', d: makeEdgeCaseState(), created: 3 },
      c4: { name: 'Client 4', d: makeEdgeCaseState(), created: 4 }
    }
  };
  calcCalls = 0;
  const chipHtml = sandbox.gppDashClient();
  assert(chipHtml.includes('Client 1'), 'gppDashClient renders active client chip');
  assert.strictEqual(calcCalls, 0, 'Closed drawer must NOT run calc() for all clients on every report render');
  assert.strictEqual(portal.__gppLazy, true, 'Closed drawer marks portal as lazy');

  // Opening via gppBarHTML(true) still hydrates eagerly for backwards compatibility
  const barHtml = sandbox.gppBarHTML(true);
  assert(barHtml.includes('Client 1'));
  assert(portal.innerHTML.includes('gpp-drawer'), 'gppBarHTML(true) still populates drawer portal');

  console.log('PASS: Lazy client drawer avoids O(clients) calc() on every render');
})();

// 5. Static regression checks for refactored DOM post-processors & mobile optimizations
(function testDomPostProcessorContracts() {
  const helpersSrc = read('modules/reports/annual-helpers.js');
  assert(/refresh\s*:\s*work/.test(helpersSrc), 'annual-helpers exposes refresh: work');
  assert(!/\bdelete\b/.test(helpersSrc), 'annual-helpers stays free of delete keyword');

  const retiredSrc = read('modules/reports/retired-row-tags.js');
  assert(retiredSrc.includes('window.vrMarkRetired=mark'), 'retired-row-tags exposes vrMarkRetired');
  assert(retiredSrc.includes('dataset.rtgDone'), 'retired-row-tags guards already-processed tables');

  const dragSrc = read('modules/app-shell/input-drag-init.js');
  assert(!dragSrc.includes('MutationObserver(()=>fix(document))'), 'input-drag-init no longer rescans entire document on every mutation');

  const numFmtSrc = read('modules/app-shell/dialog-number-format.js');
  assert(numFmtSrc.indexOf("nv.indexOf('\\u20b9') < 0") < numFmtSrc.indexOf('pe.closest(SKIP_CONT)'), 'dialog-number-format pre-filters text before ancestor closest() walk');
  assert(numFmtSrc.includes('#ap-mob-host'), 'dialog-number-format skips #ap-mob-host mobile cards');

  const apCss = read('modules/reports/annual-projection.css');
  assert(/content-visibility\s*:\s*auto/.test(apCss), 'annual-projection.css enables content-visibility on mobile cards');
  assert(/touch-action\s*:\s*manipulation/.test(apCss), 'annual-projection.css eliminates mobile tap delay on controls');

  const rfCss = read('modules/report-filters/report-filters.css');
  assert(/touch-action\s*:\s*manipulation/.test(rfCss), 'report-filters.css eliminates mobile tap delay on filter controls');
  assert(/contain\s*:\s*content/.test(rfCss), 'report-filters.css isolates dropdown list layout');

  const rcSrc = read('modules/report-columns/report-columns.js');
  assert(rcSrc.includes('assetMap'), 'report-columns uses O(1) assetMap instead of O(H) .some() per card row');
  assert(rcSrc.includes('apLazyTbl'), 'report-columns skips lazy mobile Annual table');

  const pgSrc = read('modules/ui-pagination/ui-pagination.js');
  assert(pgSrc.includes("M.querySelector('.ap-wrap')"), 'ui-pagination skips mobile Annual Projection');

  const drSrc = read('modules/app-shell/mobile-drawer.js');
  assert(drSrc.includes('isInternalReportNoise'), 'mobile-drawer filters internal report DOM mutations');

  console.log('PASS: DOM post-processor & mobile optimization contracts verified');
})();

// 6. Maximize/Minimize fit caching, observer removal guards, Monthly column pre-filtering, lazy cards & #rr DOM cache
(function testMaximizeMinimizeAndReportSwitching() {
  const rmSrc = read('modules/report-maximize/report-maximize.js');
  const mpSrc = read('modules/reports/monthly-projection.js');
  const apSrc = read('modules/reports/annual-projection.js');
  const iiSrc = read('modules/reports/interest-income.js');
  const pgSrc = read('modules/ui-pagination/ui-pagination.js');
  const rtSrc = read('modules/reports/retired-row-tags.js');
  const ahSrc = read('modules/reports/annual-helpers.js');
  const hiSrc = read('modules/app-shell/heading-icons-init.js');
  const nfSrc = read('modules/app-shell/dialog-number-format.js');
  const rcSrc = read('modules/report-columns/report-columns.js');
  const appSrc = read('modules/app-core/app.js');

  // Contract checks: observer removedNodes filtering & __vrStashingRr guard
  assert(rmSrc.includes('__vrFitCache') && rmSrc.includes('applyCachedFit'), 'report-maximize caches fit geometry across minimize/maximize');
  assert(rmSrc.includes('findFitTables') && rmSrc.includes('hydrateReportPart'), 'report-maximize uses O(1) table lookup and non-destructive mobile partial hydration');
  assert(rmSrc.includes('allNodesMatch(r.removedNodes,IGNORE)'), 'report-maximize ignores #rp-pdf removal mutations');
  assert(pgSrc.includes('allNodesMatch(r.removedNodes,IGN)') && pgSrc.includes('clearTrackedUi'), 'ui-pagination ignores removedNodes noise and avoids 4x full-DOM scans');
  assert(rtSrc.includes('allNodesMatch(r.removedNodes,IGNORE)') && rtSrc.includes('dataset.agselKey'), 'retired-row-tags ignores removedNodes noise and avoids rescanning cached tables');
  assert(ahSrc.includes('allNodesMatch(rec.removedNodes, IGNORE)') && ahSrc.includes('!onAnnualPage()'), 'annual-helpers ignores removedNodes noise and cancels timers off Annual page');
  assert(hiSrc.includes('walkHeadings') && hiSrc.includes('__vrStashingRr'), 'heading-icons-init prunes #rr/table subtrees and skips stashing mutations');
  assert(nfSrc.includes('function walk(node, hits)') && nfSrc.includes('#rr table.rt'), 'dialog-number-format prunes table.rt/.rc subtrees without walking 80k text nodes');
  assert(apSrc.includes('cleanupBackgroundWork') && apSrc.includes('cachedModel'), 'annual-projection memoizes computeModel() and cleans up background timers on view switch');
  assert(rcSrc.includes('applyCard:applyCard') && rcSrc.includes('sig:sig'), 'report-columns exports applyCard and sig for lazy card hydration and cache keys');
  assert(appSrc.includes('stashRrDom') && appSrc.includes('restoreRrDom') && appSrc.includes('__vrStashingRr'), 'app.js preserves detached #rr DOM across Monthly/Interest report switches');
  assert(iiSrc.includes('data-lazy-kv="int"') && iiSrc.includes('_htmlKey'), 'interest-income caches HTML and uses lazy mobile cards');

  // Functional test: repMRows() skips .rc on desktop, skips hidden table on mobile minimized, pre-filters RCOLS columns, and supports partial mode=('table'|'rc')
  const S = makeEdgeCaseState();
  const UI = { tab: 'Reports', rv: 'month', rq: '', rk: 'a', rd: 1, sel: null, rsel: null, rcl: null, age: 42 };
  const hiddenCols = new Set(['a', 'fy', 's', 'chg', 'hi']);
  let hinCalls = 0;

  function makeMonthlyEnv(innerWidth, isMax) {
    const mEl = { id: 'm', classList: { contains: c => c === 'vr-rmax' && isMax } };
    const sandbox = {
      console, Math, Number, String, Array, Object, Date, JSON, RegExp, Intl, Set, Map,
      S, UI: Object.assign({}, UI),
      innerWidth,
      esc: s => String(s == null ? '' : s),
      escn: s => String(s == null ? '' : s),
      fyl: y => `FY ${y - 1}-${String(y).slice(-2)}`,
      sh: s => s || '—',
      f: n => n == null ? '—' : '₹ ' + Math.round(n),
      rf: n => n == null ? '—' : String(Math.round(n)),
      lk: n => n == null ? '—' : (n / 1e5).toFixed(2),
      hin: n => { hinCalls++; return 'Hindi ' + Math.round(n || 0); },
      FYM: m => ((m || 4) + 8) % 12,
      rowRoi: () => 0.08,
      rowRoiTxt: () => '8.00%',
      rowRoiPct: () => '8.00',
      allMat: () => false,
      polTiVal: (i, p) => (i || 0) + (p || 0),
      polTiTxt: (i, am, p) => String(Math.round((i || 0) + (p || 0))),
      RCOLS: { vis: (v, k) => !hiddenCols.has(k), apply: () => {}, applyCard: () => {}, sig: () => 'def' },
      VRPolicy: { hasPayouts: () => false, monthPayout: () => 0, forState: () => [] },
      addEventListener: () => {},
      document: {
        getElementById: id => id === 'm' ? mEl : null,
        addEventListener: () => {},
        querySelector: () => null
      },
      render: () => {}
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    const engSrc = read('modules/portfolio-calculations/engine.js');
    const selSrc = read('modules/reports/report-selection.js');
    vm.runInContext(engSrc, sandbox);
    vm.runInContext(`
      var fyInfo = (x, st, a) => window.VRCalcCore.fyInfo(x, st, a);
      var matOf = (x, st) => window.VRCalcCore.matOf(x, st);
      var mcm = (s, x, q) => window.VRCalcCore.mcm(s, x, q);
      var calc = st => window.VRCalcCore.calculate(st, { stage: (a, r) => r === 'Child' ? 'School' : '—', yearsOf: window.VRCalcCore.yrsOf, policy: { applyToRows: () => {} } });
    `, sandbox);
    vm.runInContext(selSrc, sandbox);
    vm.runInContext(mpSrc, sandbox);
    return sandbox;
  }

  // Desktop wide: omits .rc, pre-filters optional columns, and avoids 660 hin() calls when hi is hidden
  hinCalls = 0;
  const deskEnv = makeMonthlyEnv(1440, false);
  const deskHtml1 = deskEnv.repMRows();
  assert(deskHtml1.includes('<table class="rt">'), 'Desktop Monthly renders table.rt');
  assert(!deskHtml1.includes('<div class="rc">'), 'Desktop Monthly omits hidden mobile .rc cards');
  assert(!deskHtml1.includes('data-rk="a"') && !deskHtml1.includes('data-rk="hi"') && !deskHtml1.includes('data-rk="fy"'), 'Desktop Monthly pre-filters hidden optional columns');
  assert.strictEqual(hinCalls, 0, 'Desktop Monthly skips hin() computation when hi column is hidden');
  const deskHtml2 = deskEnv.repMRows();
  assert.strictEqual(deskHtml2, deskHtml1, 'Repeated repMRows() returns cached HTML');

  // Enabling optional column invalidates colMask cache and includes column
  hiddenCols.delete('hi');
  const deskHtmlWithHi = deskEnv.repMRows();
  assert(deskHtmlWithHi.includes('data-rk="hi"'), 'Enabling hi column updates cacheKey and renders hi column');
  assert(hinCalls > 0, 'Enabling hi column computes hin() on demand');
  hiddenCols.add('hi');

  // Mobile minimized: skips hidden table.rt, emits lazy .kv cards; mode='table' emits only table.rt
  const mobEnv = makeMonthlyEnv(390, false);
  const mobMinHtml = mobEnv.repMRows();
  assert(!mobMinHtml.includes('<table class="rt">'), 'Mobile minimized Monthly skips hidden table.rt');
  assert(mobMinHtml.includes('data-lazy-kv="month"'), 'Mobile minimized Monthly uses lazy .kv cards');
  const mobTblPart = mobEnv.repMRows('table');
  assert(mobTblPart.includes('<table class="rt">') && !mobTblPart.includes('<div class="rc">'), 'repMRows("table") returns only table.rt for non-destructive mobile maximize');
  const mobRcPart = mobEnv.repMRows('rc');
  assert(!mobRcPart.includes('<table class="rt">') && mobRcPart.includes('<div class="rc">'), 'repMRows("rc") returns only .rc for non-destructive mobile minimize');

  console.log('PASS: Maximize/Minimize caching, observer guards, Monthly pre-filtering & partial hydration verified');
})();

