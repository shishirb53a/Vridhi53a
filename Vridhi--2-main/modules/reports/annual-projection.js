/* Annual Portfolio Projection: executive dashboard view (desktop) & stacked milestone view (<= 768px mobile).
   Uses live calculation data from calc(S), repSel(), addInfo(D), rowRoi(), depShow(), RCOLS, and VRPolicy.
   Integrates seamlessly with report-filters (#rq, rsDrops, #rsf, #rsd), #fzs Freeze, annual-helpers, and report-maximize/PDF. */
(function () {
  'use strict';

  var HELPERS_KEY = 'vr-annual-helpers';
  var mobState = { details: false, chip: 'all', openCards: {} };

  function safeEsc(s) {
    return typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeEscName(s) {
    return typeof escn === 'function' ? escn(s) : safeEsc(s);
  }
  function fmtCr(n) {
    return typeof cr === 'function' ? cr(n) : '₹ ' + Math.round(n || 0).toLocaleString('en-IN');
  }
  function fmtSplit(n) {
    var txt = fmtCr(n);
    var m = /^(.+?)\s+(Cr|L)$/i.exec(txt);
    if (m) return safeEsc(m[1]) + ' <small>' + safeEsc(m[2]) + '</small>';
    return safeEsc(txt);
  }
  function readAnnualPrefs() {
    var out = { cols: 'all', years: 1 };
    try {
      var saved = JSON.parse(localStorage.getItem(HELPERS_KEY) || '{}');
      if (saved.cols === 'hold' || saved.cols === 'inc') out.cols = saved.cols;
      if (saved.years === 5) out.years = 5;
    } catch (e) { /* storage unavailable */ }
    return out;
  }

  function computeModel() {
    var D = calc(S);
    var A = S.assets || [];
    var Ms = S.members || [];
    var SEL = repSel();
    var idx = SEL.idx || [];
    var rows = D.rows || [];
    var first = rows[0] || { a: 1, year: S.start, age: Ms.map(function (m) { return m.age; }), st: [], v: [], tot: 0, add: 0, chg: 0, pay: 0 };
    var ret = rows[D.ri] || first;
    var end = rows[rows.length - 1] || ret;
    var spanYrs = Math.max(1, (end.year || S.end) - (first.year || S.start));
    var yToRet = Math.max(0, (ret.year || first.year) - first.year);

    var totOf = function (r) {
      if (!r) return 0;
      if (SEL.none) return 0;
      if (SEL.all) return r.tot || 0;
      return idx.reduce(function (s, i) { return s + (r.v[i] || 0); }, 0);
    };
    var roiOf = function (r) {
      if (!r || SEL.none) return null;
      var t = totOf(r);
      if (!(t > 0)) return null;
      return idx.reduce(function (s, i) { return s + (r.v[i] || 0) * (A[i] ? (A[i].ret || 0) : 0); }, 0) / t;
    };
    var yearlyIntOf = function (r) {
      if (!r || r.a <= 1 || SEL.none) return null;
      if (SEL.all) return (r.chg || 0) - (r.add || 0);
      var t = totOf(r);
      var roi = roiOf(r);
      if (roi == null) return 0;
      var allMatured = typeof allMat === 'function' ? allMat(idx, r, false) : false;
      return allMatured ? 0 : Math.round(t * roi / (1 + roi));
    };
    var monthlyIntOf = function (r) {
      if (!r || r.a <= 1 || SEL.none) return null;
      var yInt = yearlyIntOf(r);
      var allMatured = typeof allMat === 'function' ? allMat(idx, r, false) : false;
      if (typeof RCOLS !== 'undefined' && RCOLS && typeof RCOLS.annualMonthlyIncome === 'function') {
        return RCOLS.annualMonthlyIncome(yInt, r.pay || 0, allMatured);
      }
      return allMatured ? null : (yInt || 0) / 12;
    };
    var addOf = function (r) {
      if (!r || r.a <= 1 || SEL.none) return 0;
      if (typeof depShow === 'function') return depShow(r.a, SEL.all ? null : idx, rows.length);
      return r.add || 0;
    };

    var baseTot = totOf(first);
    var retTot = totOf(ret);
    var endTot = totOf(end);
    var baseRoi = roiOf(first);
    var endRoi = roiOf(end);

    var multRet = baseTot > 0 ? (retTot / baseTot).toFixed(1) + '×' : '—';
    var multEnd = baseTot > 0 ? (endTot / baseTot).toFixed(1) + '×' : '—';

    var ai = typeof addInfo === 'function' ? addInfo(D) : { next: 0, last: end.year, tot: 0 };
    var nextAdd = SEL.none ? 0 : (SEL.all ? ai.next : (rows[1] ? addOf(rows[1]) : 0));
    var discLast = ai.last || ret.year;

    var retMi = monthlyIntOf(ret);
    if (retMi == null && !SEL.none) {
      var retY = D.incT || 0;
      if (SEL.min) retY = idx.reduce(function (s, i) { return s + (ret.v[i] || 0) * (A[i] ? A[i].ret || 0 : 0); }, 0);
      retMi = (retY + (D.payRet || 0)) / 12;
    }

    var endAnnInt = yearlyIntOf(end);
    if (endAnnInt == null) endAnnInt = Math.round(endTot * (endRoi || 0));

    var goalVal = S.goal || 0;
    var goalPct = goalVal > 0 ? (retTot / goalVal * 100) : 0;

    return {
      D: D, A: A, Ms: Ms, SEL: SEL, idx: idx, rows: rows,
      first: first, ret: ret, end: end, spanYrs: spanYrs, yToRet: yToRet,
      baseTot: baseTot, retTot: retTot, endTot: endTot,
      baseRoi: baseRoi, endRoi: endRoi,
      multRet: multRet, multEnd: multEnd,
      nextAdd: nextAdd, discLast: discLast,
      retMi: retMi, endAnnInt: endAnnInt,
      goalVal: goalVal, goalPct: goalPct,
      totOf: totOf, roiOf: roiOf, yearlyIntOf: yearlyIntOf, monthlyIntOf: monthlyIntOf, addOf: addOf
    };
  }

  function kpiHtml(m) {
    var baseBar = 46;
    var retBar = m.goalVal > 0 ? Math.max(12, Math.min(100, Math.round(m.goalPct))) : 68;
    var endBar = 100;
    var infBar = m.spanYrs > 0 ? Math.max(10, Math.min(100, Math.round(Math.max(1, (m.discLast - m.first.year)) / m.spanYrs * 100))) : 35;

    var agesStart = m.first.age.join(' / ');
    var agesRet = m.ret.age.join(' / ');

    return '<section class="ap-kpis" aria-label="Portfolio trajectory highlights">' +
      '<article class="ap-kpi k-base">' +
        '<div class="ap-kpi-top"><span class="ap-kpi-lbl"><span class="ap-kpi-dot" aria-hidden="true"></span>Current Baseline</span><span class="ap-kpi-tag">1 Apr ' + m.first.year + '</span></div>' +
        '<div class="ap-kpi-main">' +
          '<div><div class="ap-kpi-val">' + fmtSplit(m.baseTot) + '</div><div class="ap-kpi-sub">Family Ages: <b>' + safeEsc(agesStart) + '</b></div></div>' +
          '<div class="ap-kpi-right"><span class="ap-kpi-rval">ROI ' + (m.baseRoi != null ? (m.baseRoi * 100).toFixed(2) + '%' : '—') + '</span><span class="ap-kpi-rlbl">Nominal</span></div>' +
        '</div>' +
        '<div class="ap-kpi-bar" aria-hidden="true"><i style="width:' + baseBar + '%"></i></div>' +
      '</article>' +
      '<article class="ap-kpi k-ret">' +
        '<div class="ap-kpi-top"><span class="ap-kpi-lbl"><span class="ap-kpi-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg></span>Retirement Goal</span><span class="ap-kpi-tag">1 Apr ' + m.ret.year + ' (' + m.yToRet + 'Y)</span></div>' +
        '<div class="ap-kpi-main">' +
          '<div><div class="ap-kpi-val">' + fmtSplit(m.retTot) + '</div><div class="ap-kpi-sub">' + safeEsc(m.multRet) + ' baseline · Ages: <b>' + safeEsc(agesRet) + '</b></div></div>' +
          '<div class="ap-kpi-right"><span class="ap-kpi-rval">' + (m.retMi != null ? safeEsc(fmtCr(m.retMi)) + '/mo' : '—') + '</span><span class="ap-kpi-rlbl">Target Inflow</span></div>' +
        '</div>' +
        '<div class="ap-kpi-bar" aria-hidden="true"><i style="width:' + retBar + '%"></i></div>' +
      '</article>' +
      '<article class="ap-kpi k-end">' +
        '<div class="ap-kpi-top"><span class="ap-kpi-lbl"><span class="ap-kpi-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 17 6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg></span>Long-Term Horizon (' + m.spanYrs + 'Y)</span><span class="ap-kpi-tag">1 Apr ' + m.end.year + '</span></div>' +
        '<div class="ap-kpi-main">' +
          '<div><div class="ap-kpi-val">' + fmtSplit(m.endTot) + '</div><div class="ap-kpi-sub">' + safeEsc(m.multEnd) + ' capital · Blended ROI: <b>' + (m.endRoi != null ? (m.endRoi * 100).toFixed(2) + '%' : '—') + '</b></div></div>' +
          '<div class="ap-kpi-right"><span class="ap-kpi-rval">' + (m.endAnnInt != null ? '+' + safeEsc(fmtCr(m.endAnnInt)) : '—') + '</span><span class="ap-kpi-rlbl">Annual Annuity</span></div>' +
        '</div>' +
        '<div class="ap-kpi-bar" aria-hidden="true"><i style="width:' + endBar + '%"></i></div>' +
      '</article>' +
      '<article class="ap-kpi k-inflow">' +
        '<div class="ap-kpi-top"><span class="ap-kpi-lbl"><span class="ap-kpi-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M16 12h.01"/></svg></span>Yearly Inflow</span></div>' +
        '<div class="ap-kpi-main">' +
          '<div><div class="ap-kpi-val">' + fmtSplit(m.nextAdd) + '<small>/yr</small></div><div class="ap-kpi-sub">Discipline window: <b>' + m.first.year + ' — ' + m.discLast + '</b></div></div>' +
        '</div>' +
        '<div class="ap-kpi-bar" aria-hidden="true"><i style="width:' + infBar + '%"></i></div>' +
      '</article>' +
    '</section>';
  }

  function filteredSortedRows(m) {
    var A = m.A, Ms = m.Ms, rows = m.rows;
    var q = (UI && UI.rq ? UI.rq : '').trim().toLowerCase();
    var L = rows.filter(function (r) {
      if (!q) return true;
      var fyTxt = typeof fyl === 'function' ? fyl(r.year) : '';
      var totTxt = typeof f === 'function' ? f(r.tot) : String(r.tot);
      var hinTxt = typeof hin === 'function' ? hin(r.tot) : '';
      var roiTxt = typeof rowRoiTxt === 'function' ? rowRoiTxt(r) : '';
      var vs = r.v.map(function (v) { return typeof f === 'function' ? f(v) : String(v); });
      return [r.a, r.year, fyTxt, r.age.join(' '), r.st.join(' '), r.tot, totTxt, hinTxt, roiTxt].concat(vs).join(' ').toLowerCase().indexOf(q) > -1;
    });
    var rk = (UI && UI.rk) || 'a';
    var rd = (UI && UI.rd) || 1;
    var keyVal = function (r, k) {
      if (k === 'a' || k[0] === 's') return r.a;
      if (k === 'year') return r.year;
      if (k === 'age') return r.age[0];
      if (k === 'tot' || k === 'hi') return m.totOf(r);
      if (k === 'roi') return m.roiOf(r) || 0;
      if (k === 'chg') return r.chg || 0;
      if (k === 'add') return m.addOf(r);
      if (k === 'pay') return r.pay || 0;
      if (k === 'ti') return typeof polTiVal === 'function' ? polTiVal(r.a > 1 ? r.chg - r.add : null, r.pay) : 0;
      if (k === 'int') return r.a > 1 ? (m.yearlyIntOf(r) || 0) : -1e18;
      if (k === 'mi') { var mi = m.monthlyIntOf(r); return mi == null ? -1e18 : mi; }
      return r.v[+k.slice(1)] || 0;
    };
    L.sort(function (x, y) {
      var a = keyVal(x, rk), b = keyVal(y, rk);
      return (a > b ? 1 : a < b ? -1 : 0) * rd;
    });
    return L;
  }

  function mobBreakdownItems(m, r) {
    if (m.SEL.none) return '';
    return m.idx.map(function (i) {
      var asset = m.A[i];
      if (!asset) return '';
      return '<div class="ap-mc-det-item"><span>' + safeEscName(asset.name) + '</span><b>' + safeEsc(fmtCr(r.v[i] || 0)) + '</b></div>';
    }).join('');
  }

  function mobCardHtml(m, r, prefs) {
    var isToday = r.a === 1;
    var isRet = r === m.ret || r.year === m.ret.year;
    var isEnd = r === m.end || r.year === m.end.year;
    var cls = 'ap-mc' + (isToday ? ' is-today' : '') + (isRet ? ' is-retired' : '') + (UI.sel === r.a ? ' sel' : '');
    var idAttr = isRet ? ' id="milestone-retirement"' : '';
    var badge = isToday ? '<span class="ap-mc-badge b-today">Today</span>'
      : isRet ? '<span class="ap-mc-badge b-ret">★ RETIRED</span>'
      : isEnd ? '<span class="ap-mc-badge b-term">Terminal Milestone</span>'
      : '<span class="ap-mc-badge b-phase">Year ' + r.a + '</span>';

    var agesText = m.Ms.map(function (mem, k) {
      var st = mem.role === 'Child' && r.st[k] ? ' · ' + safeEsc(r.st[k]) : '';
      return safeEscName(mem.name) + ' ' + r.age[k] + (mobState.chip === 'ages' ? st : '');
    }).join(' · ');

    var totVal = m.totOf(r);
    var roiVal = m.roiOf(r);
    var yInt = m.yearlyIntOf(r);
    var mInt = m.monthlyIntOf(r);
    var yAdd = m.addOf(r);
    var mult = m.baseTot > 0 ? (totVal / m.baseTot).toFixed(1) + '×' : '';

    var kpi2Label = isToday ? 'Yearly Inflow' : 'Monthly Income';
    var kpi2Val = isToday ? fmtCr(m.nextAdd) + '/yr' : (mInt != null ? fmtCr(mInt) + '/mo' : '—');
    var kpi2Cls = isToday ? 'is-indigo' : 'is-green';

    var bodyExtra = '';
    if (isRet || mobState.chip === 'cashflow') {
      bodyExtra = '<div class="ap-mc-cf">' +
        '<div><span>Amount Added</span><b>' + safeEsc(yAdd > 0 ? fmtCr(yAdd) : '₹ 0') + '</b></div>' +
        '<div><span>Yearly Income</span><b>' + safeEsc(yInt != null ? fmtCr(yInt) : '—') + '</b></div>' +
        '<div><span>Policy / Total</span><b>' + safeEsc((r.pay || 0) > 0 ? fmtCr(r.pay) : fmtCr(totVal)) + '</b></div>' +
      '</div>';
    } else if (isToday && m.idx.length > 0) {
      var sortedIdx = m.idx.slice().sort(function (a, b) { return (r.v[b] || 0) - (r.v[a] || 0); }).slice(0, 3);
      bodyExtra = '<div class="ap-mc-mix">' + sortedIdx.map(function (i) {
        var asset = m.A[i];
        return '<span>' + safeEscName(asset.name) + ': <b>' + safeEsc(fmtCr(r.v[i] || 0)) + '</b></span>';
      }).join('') + '</div>';
    } else {
      bodyExtra = '<div class="ap-mc-foot">' +
        '<span>Added: <b>' + safeEsc(yAdd > 0 ? fmtCr(yAdd) : '₹ 0') + '</b></span>' +
        '<span>Blended ROI: <b>' + (roiVal != null ? (roiVal * 100).toFixed(2) + '%' : '—') + '</b></span>' +
      '</div>';
    }

    var expandAll = mobState.details || mobState.chip === 'holdings' || !!mobState.openCards[r.a];
    var detItems = mobBreakdownItems(m, r);
    var detBlock = detItems ? '<div class="ap-mc-det"' + (expandAll ? '' : ' hidden') + '><div class="ap-mc-det-ttl">Asset Holdings Breakdown</div><div class="ap-mc-det-grid">' + detItems + '</div></div>' : '';

    return '<article' + idAttr + ' class="' + cls + '" data-r="' + r.a + '">' +
      '<div class="ap-mc-hd">' +
        '<div><div class="ap-mc-title-row"><span class="ap-mc-date">1 Apr ' + r.year + '</span>' + badge + '</div><div class="ap-mc-ages">' + agesText + '</div></div>' +
        '<span class="ap-mc-age-tag">Age ' + r.age[0] + (mult && !isToday ? ' · ' + mult : '') + '</span>' +
      '</div>' +
      '<div class="ap-mc-kpis">' +
        '<div><div class="ap-mc-kl">' + (isToday ? 'Initial Corpus' : 'Year End Balance') + '</div><div class="ap-mc-kv">' + safeEsc(fmtCr(totVal)) + '</div><div class="ap-mc-ks">ROI ' + (roiVal != null ? (roiVal * 100).toFixed(2) + '%' : '—') + '</div></div>' +
        '<div><div class="ap-mc-kl">' + kpi2Label + '</div><div class="ap-mc-kv ' + kpi2Cls + '">' + safeEsc(kpi2Val) + '</div><div class="ap-mc-ks">' + (yInt != null ? safeEsc(fmtCr(yInt)) + ' / yr' : 'Starting year') + '</div></div>' +
      '</div>' +
      bodyExtra + detBlock +
    '</article>';
  }

  function mobHtml(m, prefs) {
    var rows = filteredSortedRows(m);
    var helperKeep = window.VRAnnualHelpers && typeof window.VRAnnualHelpers.keepRow === 'function'
      ? window.VRAnnualHelpers.keepRow
      : function (y, isT, isR, isS, yrs) { return yrs !== 5 || isT || isR || isS || y % 5 === 0; };
    var visibleRows = rows.filter(function (r) {
      return helperKeep(r.year, r.a === 1, r === m.ret || r.year === m.ret.year, UI.sel === r.a, prefs.years);
    });
    var agesHorizon = m.Ms.map(function (mem, k) {
      return safeEscName(mem.name) + ' (' + m.first.age[k] + '→' + m.end.age[k] + ')';
    }).join(', ');
    var hasPol = typeof VRPolicy !== 'undefined' && VRPolicy && VRPolicy.hasPayouts && VRPolicy.hasPayouts('goal');
    var noteTxt = 'Projections use per-holding compounding schedules from your active portfolio holdings. Portfolio blended ROI shifts from ' +
      (m.baseRoi != null ? (m.baseRoi * 100).toFixed(2) + '%' : '—') + ' at baseline (' + m.first.year + ') to ' +
      (m.endRoi != null ? (m.endRoi * 100).toFixed(2) + '%' : '—') + ' at horizon (' + m.end.year + ').' +
      (hasPol ? ' Scheduled insurance policy payouts are credited automatically in their payout years.' : '');

    var chipBtn = function (id, label) {
      return '<button type="button" class="ap-chip" data-ap-chip="' + id + '" aria-pressed="' + (mobState.chip === id) + '">' + label + '</button>';
    };

    return '<div class="ap-mob">' +
      '<section class="ap-mob-hero" aria-label="Portfolio trajectory baseline">' +
        '<div class="ap-mob-hero-top">' +
          '<div><p class="ap-mob-eyebrow">Net Worth Baseline</p><div class="ap-mob-big">' + safeEsc(fmtCr(m.baseTot)) + '</div><div class="ap-mob-base-sub">Today · 1 Apr ' + m.first.year + '</div></div>' +
          '<span class="ap-mob-agebadge">Age ' + m.first.age[0] + '</span>' +
        '</div>' +
        '<div class="ap-mob-retbox">' +
          '<div class="ap-mob-ret-hd"><span>Retirement Horizon</span><span class="ap-mob-mult">' + safeEsc(m.multRet) + '</span></div>' +
          '<div class="ap-mob-ret-dt">1 Apr ' + m.ret.year + ' (Age ' + m.ret.age[0] + ')</div>' +
          '<div class="ap-mob-ret-corpus">' + safeEsc(fmtCr(m.retTot)) + ' at retirement</div>' +
          '<div class="ap-mob-ret-long">Long Target: ' + safeEsc(fmtCr(m.endTot)) + ' (' + m.end.year + ')</div>' +
        '</div>' +
        '<div class="ap-mob-hero-foot">' +
          '<span>Family Horizon: <b>' + agesHorizon + '</b></span>' +
          '<button type="button" class="ap-mob-jump" data-ap-mob-jump>To Retirement ↓</button>' +
        '</div>' +
      '</section>' +
      '<div class="ap-mob-ctrl">' +
        '<div class="ap-mob-ctrl-row">' +
          '<div class="ap-seg" role="group" aria-label="Timeline interval">' +
            '<button type="button" data-aph-years="1" class="' + (prefs.years === 1 ? 'on' : '') + '" aria-pressed="' + (prefs.years === 1) + '">Every year</button>' +
            '<button type="button" data-aph-years="5" class="' + (prefs.years === 5 ? 'on' : '') + '" aria-pressed="' + (prefs.years === 5) + '">Every 5 years</button>' +
          '</div>' +
          '<button type="button" class="ap-mob-detbtn" data-ap-mob-details aria-pressed="' + mobState.details + '">' + (mobState.details ? 'Hide Details' : 'Full Details') + '</button>' +
        '</div>' +
        '<div class="ap-mob-chips" role="group" aria-label="Card view filter">' +
          chipBtn('all', 'All Projections') +
          chipBtn('holdings', 'Holdings Breakdown') +
          chipBtn('cashflow', 'Cashflow & Payouts') +
          chipBtn('ages', 'Family Ages') +
        '</div>' +
      '</div>' +
      '<div class="ap-mob-cards" id="ap-mob-cards">' +
        (visibleRows.length ? visibleRows.map(function (r) { return mobCardHtml(m, r, prefs); }).join('') : '<div class="em">No milestones match your search or selection.</div>') +
      '</div>' +
      '<section class="ap-mob-notes" aria-label="Projection notes">' +
        '<div class="ap-mob-notes-hd"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg><span>Projection Notes</span></div>' +
        '<p>' + safeEsc(noteTxt) + '</p>' +
        '<div class="ap-mob-notes-acts">' +
          '<button type="button" class="ap-foot-btn" data-ap-csv>Copy CSV</button>' +
          '<button type="button" class="ap-foot-cta" data-ap-pdf>Download PDF</button>' +
        '</div>' +
      '</section>' +
    '</div>';
  }

  window.repAnnualPage = function () {
    var m = computeModel();
    var prefs = readAnnualPrefs();
    var SEL = m.SEL, A = m.A;
    var so = SEL.min
      ? [['a', 'S.No'], ['year', 'As on']].concat(m.idx.map(function (i) { return ['v' + i, A[i].name]; }), [['age', 'Age'], ['tot', 'Year end balance'], ['roi', 'Blended ROI'], ['add', 'Amount deposited'], ['int', 'Yearly income'], ['mi', 'Monthly income'], ['chg', 'Yearly change']])
      : [['a', 'S.No'], ['year', 'As on'], ['age', 'Age'], ['tot', 'Year end balance'], ['roi', 'Blended ROI'], ['add', 'Amount deposited'], ['int', 'Yearly income'], ['mi', 'Monthly income']].concat(
          (typeof VRPolicy !== 'undefined' && VRPolicy.hasPayouts && VRPolicy.hasPayouts('goal')) ? [['pay', 'Policy payouts'], ['ti', 'Total income']] : [],
          [['chg', 'Yearly change']],
          A.map(function (x, i) { return ['v' + i, x.name]; })
        );

    var clientSel = typeof window.gppDashClient === 'function' ? window.gppDashClient() : '';
    var horizonYrs = Math.max(1, (S.end || m.end.year) - (S.start || m.first.year) + 1);
    var clientIc = '<span class="ap-head-client-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg></span>';
    var brandLogo = '<svg width="20" height="20" viewBox="3.5 2 27 27" fill="none" aria-hidden="true" focusable="false"><rect x="5.5" y="20" width="4.6" height="7" rx="2.3" fill="currentColor" opacity=".6"/><rect x="13.7" y="15" width="4.6" height="12" rx="2.3" fill="currentColor" opacity=".82"/><rect x="21.9" y="11" width="4.6" height="16" rx="2.3" fill="currentColor"/><path d="M24.2 9.6C23.6 6 25.6 3.6 29 3.2c.4 3.5-1.5 6-4.8 6.4z" fill="currentColor"/><path d="M24.2 9.6C24.4 7 22.7 5.1 20 4.6c-.3 2.8 1.4 4.8 4.2 5z" fill="currentColor" opacity=".82"/></svg>';

    var infoHelp = 'Formula: Closing Balance = (Previous Closing × (1 + Return)) + Yearly Additions · Click a row to highlight it · Retired tag = retirement year · table values in ₹ Lakh (hover for exact amount)';
    var csvBtnHtml = typeof window.rptCsv === 'function' ? window.rptCsv('csv') : '<button type="button" id="csv" class="vr-ib vr-ib-csv" title="Copy as CSV" aria-label="Copy as CSV">CSV</button>';

    var goalHealth = m.goalVal > 0
      ? 'Retirement capital covers ' + m.goalPct.toFixed(1) + '% of ' + safeEsc(fmtCr(m.goalVal)) + ' target goal'
      : 'Portfolio grows ' + safeEsc(m.multEnd) + ' across ' + m.spanYrs + ' projection years';

    var maxActive = false;
    try { maxActive = localStorage.getItem('vr-rep-max') !== '0'; } catch (e) {}

    return '<div class="ap-wrap">' +
      '<header class="ap-head">' +
        '<div class="ap-head-left">' +
          '<div class="ap-brand"><div class="ap-brand-mark">' + brandLogo + '</div><div class="ap-brand-txt"><strong>Vriddhi</strong><span>Portfolio Projections</span></div></div>' +
          (clientSel ? '<div class="ap-head-client">' + clientIc + clientSel + '</div>' : '') +
          '<div class="ap-horizon-pill"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 17 6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg><span>Horizon: <b>' + S.start + ' — ' + S.end + ' (' + horizonYrs + 'Y)</b></span><i class="ap-horizon-dot" aria-hidden="true"></i></div>' +
        '</div>' +
        '<div class="ap-head-acts">' +
          '<button type="button" class="ap-hbtn" data-ap-csv><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg><span>Export</span></button>' +
          '<button type="button" class="ap-hbtn ap-hbtn-sq" data-ap-max aria-pressed="' + maxActive + '" title="Maximize / Restore table" aria-label="Maximize / Restore table"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>' +
          '<button type="button" class="ap-hbtn ap-hbtn-sq" data-ap-pdf title="Print / Export PDF" aria-label="Print / Export PDF"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></button>' +
          '<button type="button" class="ap-head-av" data-go="Settings" title="Settings & Preferences" aria-label="Settings & Preferences"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 14.5-4 16 0"/></svg></button>' +
        '</div>' +
      '</header>' +
      '<div id="ap-kpis-host">' + kpiHtml(m) + '</div>' +
      '<section class="ap-controls" aria-label="Projection filters and view controls">' +
        '<div class="ap-ctrl-row1">' +
          '<div class="ap-search-box"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="rq" type="search" placeholder="Search year, family age, asset, or balance..." aria-label="Search forecast" value="' + safeEsc(UI.rq || '') + '"></div>' +
          (typeof window.rsDrops === 'function' ? window.rsDrops() : '') +
          '<div class="ap-sort-grp"><select id="rsf" aria-label="Sort by">' + so.map(function (pair) { return '<option value="' + safeEsc(pair[0]) + '"' + (UI.rk === pair[0] ? ' selected' : '') + '>Sort: ' + safeEsc(pair[1]) + '</option>'; }).join('') + '</select><button type="button" id="rsd" aria-label="Toggle sort direction">' + (UI.rd > 0 ? '▲' : '▼') + '</button></div>' +
        '</div>' +
        '<div class="ap-ctrl-row2">' +
          '<div class="ap-seg" role="group" aria-label="Columns shown">' +
            '<button type="button" data-aph-cols="all" class="' + (prefs.cols === 'all' ? 'on' : '') + '" aria-pressed="' + (prefs.cols === 'all') + '">All columns</button>' +
            '<button type="button" data-aph-cols="hold" class="' + (prefs.cols === 'hold' ? 'on' : '') + '" aria-pressed="' + (prefs.cols === 'hold') + '">Holdings only</button>' +
            '<button type="button" data-aph-cols="inc" class="' + (prefs.cols === 'inc' ? 'on' : '') + '" aria-pressed="' + (prefs.cols === 'inc') + '">Income only</button>' +
          '</div>' +
          '<div class="ap-seg" role="group" aria-label="Rows shown">' +
            '<button type="button" data-aph-years="1" class="' + (prefs.years === 1 ? 'on' : '') + '" aria-pressed="' + (prefs.years === 1) + '">Every year</button>' +
            '<button type="button" data-aph-years="5" class="' + (prefs.years === 5 ? 'on' : '') + '" aria-pressed="' + (prefs.years === 5) + '">Every 5 years</button>' +
          '</div>' +
          '<button type="button" class="ap-jump-btn" data-aph-jump><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 4v16"/><path d="M5 5h12l-2 4 2 4H5"/></svg><span>Jump to retirement (' + m.ret.year + ')</span></button>' +
        '</div>' +
      '</section>' +
      '<div class="card ap-tbl-card">' +
        '<div class="rph2 ap-tbl-hd" data-rpx>' +
          '<div class="rpt"><h2>Annual Portfolio Projection</h2>' + (typeof window.rptInfo === 'function' ? window.rptInfo(infoHelp, 'About this table') : '') + '</div>' +
          '<span class="ap-units">Values in ₹ Lakhs (individual holdings) &amp; ₹ Full Currency (Totals)</span>' +
          csvBtnHtml +
        '</div>' +
        '<div id="rr">' + (typeof window.repRows === 'function' ? window.repRows() : '') + '</div>' +
        '<footer class="ap-tbl-foot">' +
          '<div class="ap-foot-info"><span>Displaying <b id="ap-snap-n">' + m.rows.length + ' milestone snapshots</b> across a ' + m.spanYrs + '-year trajectory</span><span aria-hidden="true">•</span><span class="ap-foot-health">' + goalHealth + '</span></div>' +
          '<div class="ap-foot-acts">' +
            '<button type="button" class="ap-foot-btn" data-ap-csv>Copy Table</button>' +
            '<button type="button" class="ap-foot-cta" data-ap-pdf>Generate Executive PDF</button>' +
          '</div>' +
        '</footer>' +
      '</div>' +
      '<div id="ap-mob-host">' + mobHtml(m, prefs) + '</div>' +
    '</div>';
  };

  function highlightPrimaryHoldingCol(t, A, D) {
    if (!t || !t.rows || !t.rows.length || !A || A.length < 2) return;
    var endRow = D.rows[D.rows.length - 1];
    if (!endRow) return;
    var bestIdx = -1, bestVal = -1;
    A.forEach(function (x, i) {
      if ((endRow.v[i] || 0) > bestVal) { bestVal = endRow.v[i] || 0; bestIdx = i; }
    });
    if (bestIdx < 0) return;
    var targetKey = 'v' + bestIdx;
    var cells = t.rows[0].cells;
    var colIdx = -1;
    for (var i = 0; i < cells.length; i++) {
      var btn = cells[i].querySelector && cells[i].querySelector('button[data-rk]');
      if (btn && btn.dataset.rk === targetKey) { colIdx = i; break; }
    }
    Array.prototype.forEach.call(t.querySelectorAll('.ap-hl-col'), function (el) { el.classList.remove('ap-hl-col'); });
    if (colIdx > -1) {
      Array.prototype.forEach.call(t.rows, function (r) {
        if (r.cells[colIdx]) r.cells[colIdx].classList.add('ap-hl-col');
      });
    }
  }

  function syncAnnualProjection() {
    var wrap = document.querySelector('#m .ap-wrap');
    if (!wrap) return;
    var prefs = readAnnualPrefs();
    var rr = document.getElementById('rr');
    var t = rr && rr.querySelector(':scope > table.rt');
    var m = computeModel();

    if (t) highlightPrimaryHoldingCol(t, m.A, m.D);

    var snapEl = document.getElementById('ap-snap-n');
    if (snapEl && t) {
      var visCount = t.querySelectorAll('tr[data-r]:not(.vr-skip)').length;
      snapEl.textContent = visCount + ' milestone snapshot' + (visCount === 1 ? '' : 's');
    }

    var mNode = document.getElementById('m');
    var maxBtn = wrap.querySelector('[data-ap-max]');
    if (maxBtn && mNode) maxBtn.setAttribute('aria-pressed', String(mNode.classList.contains('vr-rmax')));

    var mobHost = document.getElementById('ap-mob-host');
    if (mobHost) mobHost.innerHTML = mobHtml(m, prefs);
  }

  function triggerPdfWithVisibleTable() {
    var mEl = document.getElementById('m');
    if (!mEl || typeof window.vrExportReportPDF !== 'function') return;
    var tblCard = mEl.querySelector('.ap-tbl-card');
    var wasHidden = false;
    try {
      if (tblCard && typeof getComputedStyle === 'function' && getComputedStyle(tblCard).display === 'none') {
        wasHidden = true;
        tblCard.style.setProperty('display', 'block', 'important');
      }
      window.vrExportReportPDF(mEl);
    } finally {
      if (wasHidden && tblCard) tblCard.style.removeProperty('display');
    }
  }

  function bindEvents() {
    if (window.__apEventsBound) return;
    window.__apEventsBound = true;

    document.addEventListener('click', function (e) {
      var tgt = e.target;
      if (!tgt || !tgt.closest) return;

      var rowEl = tgt.closest('#m .ap-wrap [data-r]');
      if (rowEl && !tgt.closest('button')) {
        setTimeout(function () {
          var cards = document.querySelectorAll('#ap-mob-cards .ap-mc[data-r]');
          Array.prototype.forEach.call(cards, function (c) {
            c.classList.toggle('sel', +c.dataset.r === (typeof UI !== 'undefined' ? UI.sel : null));
          });
        }, 0);
      }

      var b = tgt.closest('[data-ap-csv],[data-ap-max],[data-ap-pdf],[data-ap-mob-jump],[data-ap-mob-details],[data-ap-chip]');
      if (!b) return;

      if (b.hasAttribute('data-ap-csv')) {
        var csv = document.getElementById('csv');
        if (csv) csv.click();
      } else if (b.hasAttribute('data-ap-max')) {
        var rpMax = document.getElementById('rp-max');
        if (rpMax) rpMax.click();
        setTimeout(syncAnnualProjection, 40);
      } else if (b.hasAttribute('data-ap-pdf')) {
        triggerPdfWithVisibleTable();
      } else if (b.hasAttribute('data-ap-mob-jump')) {
        var retCard = document.getElementById('milestone-retirement');
        if (retCard && typeof retCard.scrollIntoView === 'function') {
          retCard.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      } else if (b.hasAttribute('data-ap-mob-details')) {
        mobState.details = !mobState.details;
        syncAnnualProjection();
      } else if (b.hasAttribute('data-ap-chip')) {
        mobState.chip = b.getAttribute('data-ap-chip') || 'all';
        syncAnnualProjection();
      }
    });

    document.addEventListener('input', function (e) {
      if (e.target && e.target.id === 'rq' && document.querySelector('#m .ap-wrap')) {
        setTimeout(syncAnnualProjection, 20);
      }
    });

    document.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'rsf' && document.querySelector('#m .ap-wrap')) {
        setTimeout(syncAnnualProjection, 20);
      }
    });
  }

  window.vrSyncAnnualProjection = syncAnnualProjection;
  if (typeof document !== 'undefined') bindEvents();
})();
