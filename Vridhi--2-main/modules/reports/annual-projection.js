/* Annual Portfolio Projection: executive dashboard view (desktop) & stacked milestone view (<= 768px mobile).
   Uses live calculation data from calc(S), repSel(), addInfo(D), rowRoi(), depShow(), RCOLS, and VRPolicy.
   Integrates seamlessly with report-filters (#rq, rsDrops, #rsf, #rsd), #fzs Freeze, annual-helpers, and report-maximize/PDF. */
(function () {
  'use strict';

  var HELPERS_KEY = 'vr-annual-helpers';
  var COLS_GRID_SVG = '<svg class="ap-cols-ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="M15 4v16"/></svg>';
  var mobState = { details: false, chip: 'all', openCards: {} };
  var lastRenderedMobKey = '';
  var syncTimer = 0;
  var mobHydrateRaf = 0;
  var pendingMobChunk = null;

  function isMobileViewport() {
    return typeof window !== 'undefined' && typeof window.innerWidth === 'number' ? window.innerWidth <= 768 : true;
  }

  function isStrictMobileViewport() {
    return typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth <= 768;
  }

  function cancelMobHydration() {
    if (mobHydrateRaf && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(mobHydrateRaf);
    }
    mobHydrateRaf = 0;
    pendingMobChunk = null;
  }

  function enhanceDropsHtml(html, assetCount) {
    if (!html) return '';
    var out = String(html).replace(/<b>All holdings<\/b>/g, '<b>All holdings (' + assetCount + ')</b>');
    out = out.replace(/<b>All columns<\/b>/g, '<b>Default columns</b>');
    out = out.replace(/(data-msd="cols"[\s\S]*?<button[^>]*class="msd-b"[^>]*>[\s\S]*?<\/b>)<svg[\s\S]*?<\/svg>(<\/button>)/, '$1' + COLS_GRID_SVG + '$2');
    return out;
  }

  function syncFreezeLabel() {
    var fzs = document.querySelector('#m .ap-fz-wrap #fzs');
    if (!fzs) return;
    var opt3 = fzs.querySelector('option[value="3"]');
    if (opt3 && opt3.textContent !== 'Freeze: Year & Ages') opt3.textContent = 'Freeze: Year & Ages';
  }

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
  function readAnnualPrefs() {
    var out = { cols: 'all', years: 1 };
    try {
      var saved = JSON.parse(localStorage.getItem(HELPERS_KEY) || '{}');
      if (saved.cols === 'hold' || saved.cols === 'inc') out.cols = saved.cols;
      if (saved.years === 5) out.years = 5;
    } catch (e) { /* storage unavailable */ }
    return out;
  }

  function computeMobKey(prefs) {
    var sSig = typeof vrStateSig === 'function' ? vrStateSig(S) : String((S.assets || []).length) + ':' + S.start + ':' + S.end + ':' + S.ret;
    var rselKey = UI && UI.rsel ? UI.rsel.join(',') : 'ALL';
    var openKeys = Object.keys(mobState.openCards);
    var openStr = openKeys.length ? openKeys.filter(function (k) { return mobState.openCards[k]; }).join(',') : '';
    return [
      sSig,
      rselKey,
      (UI && UI.rq) || '',
      (UI && UI.rk) || 'a',
      (UI && UI.rd) || 1,
      UI ? UI.sel : '',
      prefs ? prefs.years : 1,
      mobState.details ? '1' : '0',
      mobState.chip,
      openStr
    ].join('|');
  }

  function computeModel() {
    var D = window.vrReportCalc ? window.vrReportCalc() : calc(S);
    var A = S.assets || [];
    var Ms = S.members || [];
    var SEL = repSel();
    var idx = SEL.idx || [];
    var nIdx = idx.length;
    var rows = D.rows || [];
    var nRows = rows.length;
    var mt = D._meta && D._meta.len === A.length && D._meta.N === nRows ? D._meta : null;
    var first = rows[0] || { a: 1, year: S.start, age: Ms.map(function (m) { return m.age; }), st: [], v: [], tot: 0, add: 0, chg: 0, pay: 0 };
    var ret = rows[D.ri] || first;
    var end = rows[nRows - 1] || ret;
    var spanYrs = Math.max(1, (end.year || S.end) - (first.year || S.start));
    var yToRet = Math.max(0, (ret.year || first.year) - first.year);

    var totOf = function (r) {
      if (!r || SEL.none) return 0;
      if (SEL.all) return r.tot || 0;
      var s = 0;
      for (var k = 0; k < nIdx; k++) s += r.v[idx[k]] || 0;
      return s;
    };
    var roiOf = function (r, preTot) {
      if (!r || SEL.none) return null;
      var t = preTot !== undefined ? preTot : totOf(r);
      if (!(t > 0)) return null;
      var rs = 0;
      for (var k = 0; k < nIdx; k++) {
        var i = idx[k];
        rs += (r.v[i] || 0) * (A[i] ? (A[i].ret || 0) : 0);
      }
      return rs / t;
    };
    var yearlyIntOf = function (r, preTot, preRoi, preAllMat) {
      if (!r || r.a <= 1 || SEL.none) return null;
      if (SEL.all) return (r.chg || 0) - (r.add || 0);
      var t = preTot !== undefined ? preTot : totOf(r);
      var roi = preRoi !== undefined ? preRoi : roiOf(r, t);
      if (roi == null) return 0;
      var allMatured = preAllMat !== undefined ? preAllMat : (typeof allMat === 'function' ? allMat(idx, r, false) : false);
      return allMatured ? 0 : Math.round(t * roi / (1 + roi));
    };
    var monthlyIntOf = function (r, preYInt, preAllMat) {
      if (!r || r.a <= 1 || SEL.none) return null;
      var allMatured = preAllMat !== undefined ? preAllMat : (typeof allMat === 'function' ? allMat(idx, r, false) : false);
      var yInt = preYInt !== undefined ? preYInt : yearlyIntOf(r, undefined, undefined, allMatured);
      if (typeof RCOLS !== 'undefined' && RCOLS && typeof RCOLS.annualMonthlyIncome === 'function') {
        return RCOLS.annualMonthlyIncome(yInt, r.pay || 0, allMatured);
      }
      return allMatured ? null : (yInt || 0) / 12;
    };
    var addOf = function (r) {
      if (!r || r.a <= 1 || SEL.none) return 0;
      if (mt && r.a <= mt.N) {
        if (SEL.all) return mt.depShowAll[r.a] || 0;
        var dr = mt.depShowRow[r.a], t = 0;
        for (var k = 0; k < nIdx; k++) t += dr[idx[k]] || 0;
        return t;
      }
      if (typeof depShow === 'function') return depShow(r.a, SEL.all ? null : idx, nRows);
      return r.add || 0;
    };

    var baseTot = totOf(first);
    var retTot = totOf(ret);
    var endTot = totOf(end);
    var baseRoi = roiOf(first, baseTot);
    var endRoi = roiOf(end, endTot);

    var multRet = baseTot > 0 ? (retTot / baseTot).toFixed(1) + '×' : '—';
    var multEnd = baseTot > 0 ? (endTot / baseTot).toFixed(1) + '×' : '—';

    var ai = typeof addInfo === 'function' ? addInfo(D) : { next: 0, last: end.year, tot: 0 };
    var nextAdd = SEL.none ? 0 : (SEL.all ? ai.next : (rows[1] ? addOf(rows[1]) : 0));
    var discLast = ai.last || ret.year;

    var retAllMat = typeof allMat === 'function' ? allMat(idx, ret, false) : false;
    var retYInt = yearlyIntOf(ret, retTot, roiOf(ret, retTot), retAllMat);
    var retMi = monthlyIntOf(ret, retYInt, retAllMat);
    if (retMi == null && !SEL.none) {
      var retY = D.incT || 0;
      if (SEL.min) {
        retY = 0;
        for (var k2 = 0; k2 < nIdx; k2++) {
          var i2 = idx[k2];
          retY += (ret.v[i2] || 0) * (A[i2] ? A[i2].ret || 0 : 0);
        }
      }
      retMi = (retY + (D.payRet || 0)) / 12;
    }

    var endAnnInt = yearlyIntOf(end, endTot, endRoi);
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

  function filteredSortedRows(m) {
    var rows = m.rows;
    var q = (UI && UI.rq ? UI.rq : '').trim().toLowerCase();
    var rc = m.D && m.D._repCache;
    if (q && m.D && !rc) {
      rc = { cellInner: new Array(rows.length + 1), vAll: new Array(rows.length + 1), hay: new Array(rows.length + 1), hin: new Array(rows.length + 1), roiT: new Array(rows.length + 1) };
      try { Object.defineProperty(m.D, '_repCache', { value: rc, enumerable: false, configurable: true }); } catch (e) {}
    }
    var L = q ? rows.filter(function (r) {
      var hay = rc && rc.hay ? rc.hay[r.a] : undefined;
      if (hay === undefined) {
        var fyTxt = typeof fyl === 'function' ? fyl(r.year) : '';
        var totTxt = typeof f === 'function' ? f(r.tot) : String(r.tot);
        var hinTxt = typeof hin === 'function' ? hin(r.tot) : '';
        var roiTxt = typeof rowRoiTxt === 'function' ? rowRoiTxt(r) : '';
        var vs = r.v.map(function (v) { return typeof f === 'function' ? f(v) : String(v); });
        hay = [r.a, r.year, fyTxt, r.age.join(' '), r.st.join(' '), r.tot, totTxt, hinTxt, roiTxt].concat(vs).join(' ').toLowerCase();
        if (rc && rc.hay) rc.hay[r.a] = hay;
      }
      return hay.indexOf(q) > -1;
    }) : rows.slice();
    var rk = (UI && UI.rk) || 'a';
    var rd = (UI && UI.rd) || 1;
    if (rk !== 'a' || rd < 0) {
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
    }
    return L;
  }

  function buildEscAssetNames(A) {
    var out = new Array(A.length);
    for (var i = 0; i < A.length; i++) {
      out[i] = A[i] ? safeEscName(A[i].name) : '';
    }
    return out;
  }

  function mobBreakdownItems(m, r, expandAll, escNames) {
    if (m.SEL.none || !expandAll) return '';
    var idx = m.idx, len = idx.length, A = m.A;
    var parts = new Array(len);
    for (var k = 0; k < len; k++) {
      var i = idx[k], asset = A[i];
      if (!asset) { parts[k] = ''; continue; }
      var nm = escNames ? escNames[i] : safeEscName(asset.name);
      parts[k] = '<div class="ap-mc-det-item"><span>' + nm + '</span><b>' + safeEsc(fmtCr(r.v[i] || 0)) + '</b></div>';
    }
    return parts.join('');
  }

  function mobCardHtml(m, r, prefs, escNames, escMemNames) {
    var isToday = r.a === 1;
    var isRet = r === m.ret || r.year === m.ret.year;
    var isEnd = r === m.end || r.year === m.end.year;
    var cls = 'ap-mc' + (isToday ? ' is-today' : '') + (isRet ? ' is-retired' : '') + (UI.sel === r.a ? ' sel' : '');
    var idAttr = isRet ? ' id="milestone-retirement"' : '';
    var badge = isToday ? '<span class="ap-mc-badge b-today">Today</span>'
      : isRet ? '<span class="ap-mc-badge b-ret">★ RETIRED</span>'
      : isEnd ? '<span class="ap-mc-badge b-term">Terminal Milestone</span>'
      : '<span class="ap-mc-badge b-phase">Year ' + r.a + '</span>';

    var agesParts = new Array(m.Ms.length);
    for (var mk = 0; mk < m.Ms.length; mk++) {
      var mem = m.Ms[mk];
      var st = mem.role === 'Child' && r.st[mk] && mobState.chip === 'ages' ? ' · ' + safeEsc(r.st[mk]) : '';
      agesParts[mk] = (escMemNames ? escMemNames[mk] : safeEscName(mem.name)) + ' ' + r.age[mk] + st;
    }
    var agesText = agesParts.join(' · ');

    var totVal = m.totOf(r);
    var roiVal = m.roiOf(r, totVal);
    var am = r.a > 1 && typeof allMat === 'function' ? allMat(m.idx, r, false) : false;
    var yInt = m.yearlyIntOf(r, totVal, roiVal, am);
    var mInt = m.monthlyIntOf(r, yInt, am);
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
        var nm = escNames ? escNames[i] : safeEscName(m.A[i].name);
        return '<span>' + nm + ': <b>' + safeEsc(fmtCr(r.v[i] || 0)) + '</b></span>';
      }).join('') + '</div>';
    } else {
      bodyExtra = '<div class="ap-mc-foot">' +
        '<span>Added: <b>' + safeEsc(yAdd > 0 ? fmtCr(yAdd) : '₹ 0') + '</b></span>' +
        '<span>Blended ROI: <b>' + (roiVal != null ? (roiVal * 100).toFixed(2) + '%' : '—') + '</b></span>' +
      '</div>';
    }

    var expandAll = mobState.details || mobState.chip === 'holdings' || !!mobState.openCards[r.a];
    var detItems = mobBreakdownItems(m, r, expandAll, escNames);
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

  function pumpMobHydration() {
    mobHydrateRaf = 0;
    var job = pendingMobChunk;
    if (!job) return;
    var host = document.getElementById('ap-mob-cards');
    if (!host) { pendingMobChunk = null; return; }
    var end = Math.min(job.rows.length, job.offset + job.batchSize);
    var parts = new Array(end - job.offset);
    for (var i = job.offset; i < end; i++) {
      parts[i - job.offset] = mobCardHtml(job.m, job.rows[i], job.prefs, job.escNames, job.escMemNames);
    }
    if (parts.length && typeof host.insertAdjacentHTML === 'function') {
      host.insertAdjacentHTML('beforeend', parts.join(''));
    }
    job.offset = end;
    if (job.offset < job.rows.length) {
      mobHydrateRaf = requestAnimationFrame(pumpMobHydration);
    } else {
      pendingMobChunk = null;
    }
  }

  function flushMobCards() {
    if (!pendingMobChunk) return;
    if (mobHydrateRaf && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(mobHydrateRaf);
      mobHydrateRaf = 0;
    }
    var job = pendingMobChunk;
    pendingMobChunk = null;
    var host = document.getElementById('ap-mob-cards');
    if (!host || job.offset >= job.rows.length) return;
    var parts = new Array(job.rows.length - job.offset);
    for (var i = job.offset; i < job.rows.length; i++) {
      parts[i - job.offset] = mobCardHtml(job.m, job.rows[i], job.prefs, job.escNames, job.escMemNames);
    }
    if (parts.length && typeof host.insertAdjacentHTML === 'function') {
      host.insertAdjacentHTML('beforeend', parts.join(''));
    }
  }

  function mobHtml(m, prefs, allowProgressive) {
    cancelMobHydration();
    var rows = filteredSortedRows(m);
    var helperKeep = window.VRAnnualHelpers && typeof window.VRAnnualHelpers.keepRow === 'function'
      ? window.VRAnnualHelpers.keepRow
      : function (y, isT, isR, isS, yrs) { return yrs !== 5 || isT || isR || isS || y % 5 === 0; };
    var visibleRows = rows.filter(function (r) {
      return helperKeep(r.year, r.a === 1, r === m.ret || r.year === m.ret.year, UI.sel === r.a, prefs.years);
    });
    var escNames = buildEscAssetNames(m.A);
    var escMemNames = m.Ms.map(function (mem) { return safeEscName(mem.name); });
    var agesHorizon = m.Ms.map(function (mem, k) {
      return escMemNames[k] + ' (' + m.first.age[k] + '→' + m.end.age[k] + ')';
    }).join(', ');
    var hasPol = typeof VRPolicy !== 'undefined' && VRPolicy && VRPolicy.hasPayouts && VRPolicy.hasPayouts('goal');
    var noteTxt = 'Projections use per-holding compounding schedules from your active portfolio holdings. Portfolio blended ROI shifts from ' +
      (m.baseRoi != null ? (m.baseRoi * 100).toFixed(2) + '%' : '—') + ' at baseline (' + m.first.year + ') to ' +
      (m.endRoi != null ? (m.endRoi * 100).toFixed(2) + '%' : '—') + ' at horizon (' + m.end.year + ').' +
      (hasPol ? ' Scheduled insurance policy payouts are credited automatically in their payout years.' : '');

    var chipBtn = function (id, label) {
      return '<button type="button" class="ap-chip" data-ap-chip="' + id + '" aria-pressed="' + (mobState.chip === id) + '">' + label + '</button>';
    };

    var heavyCards = mobState.details || mobState.chip === 'holdings';
    var batchSize = heavyCards ? 6 : 14;
    var canChunk = !!allowProgressive && isStrictMobileViewport() && typeof requestAnimationFrame === 'function' && visibleRows.length > batchSize;
    var firstCount = canChunk ? batchSize : visibleRows.length;
    var cardParts = new Array(firstCount);
    for (var ci = 0; ci < firstCount; ci++) {
      cardParts[ci] = mobCardHtml(m, visibleRows[ci], prefs, escNames, escMemNames);
    }
    if (canChunk) {
      pendingMobChunk = {
        m: m,
        prefs: prefs,
        rows: visibleRows,
        offset: firstCount,
        escNames: escNames,
        escMemNames: escMemNames,
        batchSize: batchSize
      };
      mobHydrateRaf = requestAnimationFrame(pumpMobHydration);
    }

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
        (visibleRows.length ? cardParts.join('') : '<div class="em">No milestones match your search or selection.</div>') +
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

  function renderAnnualRowsHtml() {
    if (typeof window.repRows !== 'function') return '';
    try {
      window.__apSkipRc = true;
      return window.repRows();
    } finally {
      window.__apSkipRc = false;
    }
  }

  function sortOptionsFor(m) {
    var SEL = m.SEL, A = m.A;
    return SEL.min
      ? [['a', 'S.No'], ['year', 'As on']].concat(m.idx.map(function (i) { return ['v' + i, A[i].name]; }), [['age', 'Age'], ['tot', 'Year end balance'], ['roi', 'Blended ROI'], ['add', 'Amount deposited'], ['int', 'Yearly income'], ['mi', 'Monthly income'], ['chg', 'Yearly change']])
      : [['a', 'S.No'], ['year', 'As on'], ['age', 'Age'], ['tot', 'Year end balance'], ['roi', 'Blended ROI'], ['add', 'Amount deposited'], ['int', 'Yearly income'], ['mi', 'Monthly income']].concat(
          (typeof VRPolicy !== 'undefined' && VRPolicy.hasPayouts && VRPolicy.hasPayouts('goal')) ? [['pay', 'Policy payouts'], ['ti', 'Total income']] : [],
          [['chg', 'Yearly change']],
          A.map(function (x, i) { return ['v' + i, x.name]; })
        );
  }

  var cachedAnnualHtml = null;
  var cachedAnnualKey = '';

  window.repAnnualPage = function () {
    var prefs = readAnnualPrefs();
    var isMob = isMobileViewport();
    var isStrictMob = isStrictMobileViewport();
    var maxActive = false;
    try { maxActive = localStorage.getItem('vr-rep-max') !== '0'; } catch (e) {}
    var activeClient = typeof window.gppActiveName === 'function' ? window.gppActiveName() : '';
    var mobKey = isMob ? computeMobKey(prefs) : '';
    var key = [
      typeof vrStateSig === 'function' ? vrStateSig(S) : JSON.stringify(S),
      activeClient,
      UI.rq || '',
      UI.rk || 'a',
      UI.rd || 1,
      UI.rsel ? UI.rsel.join(',') : 'ALL',
      prefs.cols,
      prefs.years,
      isStrictMob ? ('sm:' + mobKey) : isMob ? ('m:' + mobKey) : 'd',
      UI.sel,
      UI.msd || '',
      maxActive
    ].join('|');

    if (cachedAnnualHtml && cachedAnnualKey === key && !isStrictMob) {
      return cachedAnnualHtml;
    }

    var m = computeModel();
    var A = m.A;
    var so = isStrictMob ? [] : sortOptionsFor(m);

    var clientSel = typeof window.gppDashClient === 'function' ? window.gppDashClient() : '';
    var horizonYrs = Math.max(1, (S.end || m.end.year) - (S.start || m.first.year) + 1);
    var clientIc = '<span class="ap-head-client-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg></span>';
    var brandLogo = '<svg width="20" height="20" viewBox="3.5 2 27 27" fill="none" aria-hidden="true" focusable="false"><rect x="5.5" y="20" width="4.6" height="7" rx="2.3" fill="currentColor" opacity=".6"/><rect x="13.7" y="15" width="4.6" height="12" rx="2.3" fill="currentColor" opacity=".82"/><rect x="21.9" y="11" width="4.6" height="16" rx="2.3" fill="currentColor"/><path d="M24.2 9.6C23.6 6 25.6 3.6 29 3.2c.4 3.5-1.5 6-4.8 6.4z" fill="currentColor"/><path d="M24.2 9.6C24.4 7 22.7 5.1 20 4.6c-.3 2.8 1.4 4.8 4.2 5z" fill="currentColor" opacity=".82"/></svg>';

    var infoHelp = 'Formula: Closing Balance = (Previous Closing × (1 + Return)) + Yearly Additions · Click a row to highlight it · Retired tag = retirement year · table values in ₹ Lakh (hover for exact amount)';
    var csvBtnHtml = typeof window.rptCsv === 'function' ? window.rptCsv('csv') : '<button type="button" id="csv" class="vr-ib vr-ib-csv" title="Copy as CSV" aria-label="Copy as CSV">CSV</button>';

    var goalHealth = m.goalVal > 0
      ? 'Retirement capital covers ' + m.goalPct.toFixed(1) + '% of ' + safeEsc(fmtCr(m.goalVal)) + ' target goal'
      : 'Portfolio grows ' + safeEsc(m.multEnd) + ' across ' + m.spanYrs + ' projection years';

    var mobMarkup = '';
    if (isMob) {
      lastRenderedMobKey = mobKey;
      mobMarkup = mobHtml(m, prefs, isStrictMob);
    } else {
      lastRenderedMobKey = '';
    }

    var rrMarkup = isStrictMob ? '<div id="rr" data-ap-lazy-tbl="1"></div>' : '<div id="rr">' + renderAnnualRowsHtml() + '</div>';

    cachedAnnualKey = key;
    cachedAnnualHtml = '<div class="ap-wrap">' +
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
      '<section class="ap-controls" aria-label="Projection filters and view controls">' +
        '<div class="ap-ctrl-row1">' +
          '<div class="ap-search-box"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="rq" type="search" placeholder="Search year, family age, asset, or balance..." aria-label="Search forecast" value="' + safeEsc(UI.rq || '') + '"></div>' +
          (typeof window.rsDrops === 'function' ? enhanceDropsHtml(window.rsDrops(), A.length) : '') +
          '<div class="ap-fz-wrap"><select id="rsf" class="ap-sr-ctrl" aria-label="Sort by">' + so.map(function (pair) { return '<option value="' + safeEsc(pair[0]) + '"' + (UI.rk === pair[0] ? ' selected' : '') + '>Sort: ' + safeEsc(pair[1]) + '</option>'; }).join('') + '</select><button type="button" id="rsd" class="ap-sr-ctrl" aria-label="Toggle sort direction">' + (UI.rd > 0 ? '▲' : '▼') + '</button><svg class="ap-fz-lock" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>' +
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
          '<span class="ap-units">Values in <b>₹ Lakhs</b> (individual holdings) &amp; <b>₹ Full Currency</b> (Totals)</span>' +
          csvBtnHtml +
        '</div>' +
        rrMarkup +
        '<footer class="ap-tbl-foot">' +
          '<div class="ap-foot-info"><span>Displaying <b id="ap-snap-n">' + m.rows.length + ' milestone snapshots</b> across a ' + m.spanYrs + '-year trajectory</span><span aria-hidden="true">•</span><span class="ap-foot-health">' + goalHealth + '</span></div>' +
          '<div class="ap-foot-acts">' +
            '<button type="button" class="ap-foot-btn" data-ap-csv>Copy Table</button>' +
            '<button type="button" class="ap-foot-cta" data-ap-pdf>Generate Executive PDF</button>' +
          '</div>' +
        '</footer>' +
      '</div>' +
      '<div id="ap-mob-host">' + mobMarkup + '</div>' +
    '</div>';
    return cachedAnnualHtml;
  };

  function ensureDesktopTableHydrated() {
    var rr = document.getElementById('rr');
    if (!rr) return false;
    var needsTbl = (rr.dataset && rr.dataset.apLazyTbl === '1') || !rr.querySelector(':scope > table.rt');
    if (!needsTbl) return false;
    if (rr.dataset) delete rr.dataset.apLazyTbl;
    rr.innerHTML = renderAnnualRowsHtml();
    var rsf = document.getElementById('rsf');
    if (rsf && !rsf.innerHTML) {
      var m = computeModel();
      var so = sortOptionsFor(m);
      var optsHtml = so.map(function (pair) { return '<option value="' + safeEsc(pair[0]) + '"' + (UI.rk === pair[0] ? ' selected' : '') + '>Sort: ' + safeEsc(pair[1]) + '</option>'; }).join('');
      rsf.__apOpts = optsHtml;
      rsf.innerHTML = optsHtml;
    }
    if (typeof RCOLS !== 'undefined' && RCOLS && typeof RCOLS.apply === 'function') {
      RCOLS.apply(rr, 'year');
    }
    if (typeof window.vrMarkRetired === 'function') {
      window.vrMarkRetired(false);
    }
    if (window.VRAnnualHelpers && typeof window.VRAnnualHelpers.refresh === 'function') {
      window.VRAnnualHelpers.refresh();
    }
    if (typeof window.vrReportFit === 'function') {
      window.vrReportFit();
    }
    return true;
  }

  function highlightPrimaryHoldingCol(t, A, D) {
    if (!t || !t.rows || !t.rows.length || !A || A.length < 2) return;
    var endRow = D.rows[D.rows.length - 1];
    if (!endRow) return;
    var bestIdx = -1, bestVal = -1;
    for (var k = 0; k < A.length; k++) {
      var vv = endRow.v[k] || 0;
      if (vv > bestVal) { bestVal = vv; bestIdx = k; }
    }
    if (bestIdx < 0) return;
    var targetKey = 'v' + bestIdx;
    var cells = t.rows[0].cells;
    var colIdx = -1;
    for (var i = 0; i < cells.length; i++) {
      var btn = cells[i].querySelector && cells[i].querySelector('button[data-rk]');
      if (btn && btn.dataset.rk === targetKey) { colIdx = i; break; }
    }
    if (t.dataset && t.dataset.apHlCol === String(colIdx)) return;
    if (t.dataset) t.dataset.apHlCol = String(colIdx);
    Array.prototype.forEach.call(t.querySelectorAll('.ap-hl-col'), function (el) { el.classList.remove('ap-hl-col'); });
    if (colIdx > -1) {
      for (var r = 0; r < t.rows.length; r++) {
        if (t.rows[r].cells[colIdx]) t.rows[r].cells[colIdx].classList.add('ap-hl-col');
      }
    }
  }

  function syncAnnualProjection(preModel) {
    var wrap = document.querySelector('#m .ap-wrap');
    if (!wrap) return;
    var rr = document.getElementById('rr');
    var isStrictMob = isStrictMobileViewport();
    var t = (!isStrictMob && rr) ? rr.querySelector(':scope > table.rt') : null;
    var A = S.assets || [];

    if (t) {
      var D = preModel ? preModel.D : (window.vrReportCalc ? window.vrReportCalc() : calc(S));
      highlightPrimaryHoldingCol(t, A, D);
      var snapEl = document.getElementById('ap-snap-n');
      if (snapEl) {
        var visCount = t.querySelectorAll('tr[data-r]:not(.vr-skip)').length;
        var snapTxt = visCount + ' milestone snapshot' + (visCount === 1 ? '' : 's');
        if (snapEl.textContent !== snapTxt) snapEl.textContent = snapTxt;
      }
      var holdBtnTxt = wrap.querySelector('.msd[data-msd="hold"] .msd-b b');
      if (holdBtnTxt && holdBtnTxt.textContent === 'All holdings') {
        holdBtnTxt.textContent = 'All holdings (' + A.length + ')';
      }
      var colsBtn = wrap.querySelector('.msd[data-msd="cols"] .msd-b');
      if (colsBtn && !colsBtn.querySelector('.ap-cols-ic')) {
        var oldSvg = colsBtn.querySelector('svg');
        if (oldSvg) oldSvg.outerHTML = COLS_GRID_SVG;
      }
      syncFreezeLabel();
      var mNode = document.getElementById('m');
      var maxBtn = wrap.querySelector('[data-ap-max]');
      if (maxBtn && mNode) {
        var maxStr = String(mNode.classList.contains('vr-rmax'));
        if (maxBtn.getAttribute('aria-pressed') !== maxStr) maxBtn.setAttribute('aria-pressed', maxStr);
      }
    }

    var mobHost = document.getElementById('ap-mob-host');
    if (mobHost && isMobileViewport()) {
      var prefs = readAnnualPrefs();
      var mobKey = computeMobKey(prefs);
      if (mobHost.__apKey === mobKey && mobHost.firstElementChild) return;
      if (mobHost.__apKey == null && mobHost.firstElementChild && mobKey === lastRenderedMobKey) {
        mobHost.__apKey = mobKey;
        return;
      }
      var m = preModel || computeModel();
      mobHost.__apKey = mobKey;
      lastRenderedMobKey = mobKey;
      mobHost.innerHTML = mobHtml(m, prefs, isStrictMob);
    }
  }

  function syncDropdownsInPlace(wrap) {
    var A = S.assets || [];
    var nA = A.length;
    if (!nA) return;
    var SEL = repSel();
    var idx = SEL.idx || [];
    var selLen = idx.length;
    var selSet = Object.create(null);
    for (var k = 0; k < selLen; k++) selSet[String(A[idx[k]].id)] = true;

    var catTotal = Object.create(null);
    var catSel = Object.create(null);
    for (var i = 0; i < nA; i++) {
      var a = A[i], c = a.cat;
      catTotal[c] = (catTotal[c] || 0) + 1;
      if (selSet[String(a.id)]) catSel[c] = (catSel[c] || 0) + 1;
    }

    var cs = [];
    var con = [];
    var conMap = Object.create(null);
    var catList = typeof CATS !== 'undefined' ? CATS : Object.keys(catTotal);
    for (var ci0 = 0; ci0 < catList.length; ci0++) {
      var cat0 = catList[ci0];
      if (!catTotal[cat0]) continue;
      cs.push(cat0);
      if (catSel[cat0] === catTotal[cat0]) {
        con.push(cat0);
        conMap[cat0] = true;
      }
    }

    var clsBtn = wrap.querySelector('.msd[data-msd="cls"] .msd-b b');
    if (clsBtn) {
      var clsLabel = con.length === cs.length ? 'All asset classes' : con.length === 0 ? 'None selected' : con.length === 1 ? con[0] : con.length + ' of ' + cs.length + ' selected';
      if (clsBtn.textContent !== clsLabel) clsBtn.textContent = clsLabel;
    }
    var holdBtn = wrap.querySelector('.msd[data-msd="hold"] .msd-b b');
    if (holdBtn) {
      var firstName = selLen === 1 && A[idx[0]] ? A[idx[0]].name : '';
      var holdLabel = selLen === nA ? 'All holdings (' + nA + ')' : selLen === 0 ? 'None selected' : selLen === 1 ? firstName : selLen + ' of ' + nA + ' selected';
      if (holdBtn.textContent !== holdLabel) holdBtn.textContent = holdLabel;
    }

    var clsInputs = wrap.querySelectorAll('input[data-rcls]');
    for (var ci = 0; ci < clsInputs.length; ci++) {
      var cb = clsInputs[ci], catName = cb.dataset.rcls;
      var want = !!conMap[catName];
      if (cb.checked !== want) cb.checked = want;
    }
    var holdInputs = wrap.querySelectorAll('input[data-rh]');
    for (var hi = 0; hi < holdInputs.length; hi++) {
      var hb = holdInputs[hi], hid = hb.dataset.rh;
      var hwant = !!selSet[hid];
      if (hb.checked !== hwant) hb.checked = hwant;
    }

    var msdEls = wrap.querySelectorAll('.msd');
    for (var di = 0; di < msdEls.length; di++) {
      var d = msdEls[di], open = UI.msd === d.dataset.msd;
      var p = d.querySelector('.msd-p'), b = d.querySelector('.msd-b');
      if (p && p.hidden !== !open) p.hidden = !open;
      if (b) b.setAttribute('aria-expanded', String(open));
    }
  }

  /* Surgical in-place update for Annual Projection filters/columns:
     avoids tearing down #nav, .ap-head, .ap-controls, open dropdowns, and client drawer portal. */
  window.vrUpdateAnnualFilters = function (focusAttr, focusVal) {
    if (typeof UI === 'undefined' || UI.tab !== 'Reports' || (UI.rv && UI.rv !== 'year')) return false;
    var wrap = document.querySelector('#m .ap-wrap');
    var rr = document.getElementById('rr');
    if (!wrap || !rr) return false;

    cachedAnnualHtml = null;
    cachedAnnualKey = '';

    var isStrictMob = isStrictMobileViewport();
    syncDropdownsInPlace(wrap);

    if (isStrictMob) {
      if (rr.dataset) rr.dataset.apLazyTbl = '1';
      if (rr.innerHTML) rr.innerHTML = '';
      var mMob = computeModel();
      syncAnnualProjection(mMob);
    } else {
      if (rr.dataset) delete rr.dataset.apLazyTbl;
      rr.innerHTML = renderAnnualRowsHtml();
      rr.scrollLeft = 0;
      rr.scrollTop = 0;

      var m = computeModel();
      var rsf = document.getElementById('rsf');
      if (rsf && typeof sortOptionsFor === 'function') {
        var so = sortOptionsFor(m);
        var optsHtml = so.map(function (pair) { return '<option value="' + safeEsc(pair[0]) + '"' + (UI.rk === pair[0] ? ' selected' : '') + '>Sort: ' + safeEsc(pair[1]) + '</option>'; }).join('');
        if (rsf.__apOpts !== optsHtml) {
          rsf.__apOpts = optsHtml;
          rsf.innerHTML = optsHtml;
        }
        var footHealth = wrap.querySelector('.ap-foot-health');
        if (footHealth) {
          var goalHealth = m.goalVal > 0
            ? 'Retirement capital covers ' + m.goalPct.toFixed(1) + '% of ' + fmtCr(m.goalVal) + ' target goal'
            : 'Portfolio grows ' + m.multEnd + ' across ' + m.spanYrs + ' projection years';
          if (footHealth.textContent !== goalHealth) footHealth.textContent = goalHealth;
        }
      }

      if (typeof RCOLS !== 'undefined' && RCOLS && typeof RCOLS.apply === 'function') {
        RCOLS.apply(rr, 'year');
      }
      if (typeof window.vrMarkRetired === 'function') {
        window.vrMarkRetired(false);
      }
      if (window.VRAnnualHelpers && typeof window.VRAnnualHelpers.refresh === 'function') {
        window.VRAnnualHelpers.refresh();
      } else {
        syncAnnualProjection(m);
      }
      if (typeof window.vrReportFit === 'function') {
        window.vrReportFit();
      }
    }

    if (focusAttr && focusVal != null) {
      var nodes = wrap.querySelectorAll('[' + focusAttr + ']');
      for (var fi = 0; fi < nodes.length; fi++) {
        if (nodes[fi].getAttribute(focusAttr) === String(focusVal)) {
          if (typeof nodes[fi].focus === 'function') nodes[fi].focus();
          break;
        }
      }
    }
    return true;
  };

  function scheduleSync(delay) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      syncTimer = 0;
      syncAnnualProjection();
    }, delay == null ? 20 : delay);
  }

  function triggerPdfWithVisibleTable() {
    var mEl = document.getElementById('m');
    if (!mEl || typeof window.vrExportReportPDF !== 'function') return;
    ensureDesktopTableHydrated();
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
        scheduleSync(40);
      } else if (b.hasAttribute('data-ap-pdf')) {
        triggerPdfWithVisibleTable();
      } else if (b.hasAttribute('data-ap-mob-jump')) {
        flushMobCards();
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
        scheduleSync(20);
      }
    });

    document.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'rsf' && document.querySelector('#m .ap-wrap')) {
        scheduleSync(20);
      }
    });

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', function () {
        if (!document.querySelector('#m .ap-wrap')) return;
        if (isMobileViewport()) {
          var mobHost = document.getElementById('ap-mob-host');
          if (mobHost && !mobHost.firstElementChild) scheduleSync(30);
        } else {
          ensureDesktopTableHydrated();
        }
      });
    }
  }

  window.vrSyncAnnualProjection = syncAnnualProjection;
  window.vrEnsureAnnualDesktopTable = ensureDesktopTableHydrated;
  window.vrFlushAnnualMobCards = flushMobCards;
  if (typeof document !== 'undefined') bindEvents();
})();
