/* Portfolio forecast calculations. This engine has no DOM, storage, or network dependencies. */
(function (root) {
  'use strict';

  function mIx(t) {
    const m = /^(\d{4})-(\d{2})$/.exec(t || '');
    return m && +m[2] >= 1 && +m[2] <= 12 ? +m[1] * 12 + (+m[2] - 1) : null;
  }
  const vm = t => mIx(t) != null ? t : '';
  const FYM = m => m >= 4 ? m - 4 : m + 8;

  function entry(x, s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(x.edate || '');
    let y = s.start, mo = 4, d = 1;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || Date.UTC(y, mo - 1, d) < Date.UTC(s.start, 3, 1)) {
      y = s.start; mo = 4; d = 1;
    }
    const fy = mo >= 4 ? y : y - 1;
    return { y: y, mo: mo, d: d, fy: fy, a0: fy - s.start + 2 };
  }

  function matOf(x, s) {
    if (!x || x.type === 'gratuity' || !(x.mat > 0)) return null;
    const e = entry(x, s);
    if (x.mat <= e.y) return null;
    const fyy = e.mo >= 4 ? x.mat : x.mat - 1;
    return {
      ix: x.mat * 12 + e.mo - 1, row: fyy - s.start + 2, km: FYM(e.mo), d: e.d,
      dim: new Date(Date.UTC(x.mat, e.mo, 0)).getUTCDate(),
      days: Math.round((Date.UTC(x.mat, e.mo - 1, e.d) - Date.UTC(fyy, 3, 1)) / 864e5),
      fyy: fyy, mo: e.mo
    };
  }

  function fyInfo(x, s, a) {
    const mt = matOf(x, s), e = entry(x, s), first = a === e.a0, act = a >= e.a0 && a <= x.yrs;
    const f0 = mIx(x.mfrom), t0 = mIx(x.mto), fyy = s.start + a - 2, ms = [];
    for (let k = 0; k < 12; k++) {
      const ix = (k <= 8 ? fyy : fyy + 1) * 12 + (k + 3) % 12;
      ms.push(!!(act && (!first || k >= FYM(e.mo)) && (f0 == null || ix >= f0) &&
        (t0 == null || ix <= t0) && (!mt || ix < mt.ix)));
    }
    const n = ms.filter(Boolean).length;
    const w = ms.reduce((q, c, k) => q + (c ? 12 - k : 0), 0);
    return {
      e: e, first: first, act: act, ms: ms, n: n, w: w,
      yp: (a > e.a0 || FYM(x.amon || 4) >= FYM(e.mo)) &&
        (mIx(x.yfrom) == null || ((x.amon || 4) >= 4 ? fyy : fyy + 1) * 12 + (x.amon || 4) - 1 >= mIx(x.yfrom)) &&
        (mIx(x.yto) == null || ((x.amon || 4) >= 4 ? fyy : fyy + 1) * 12 + (x.amon || 4) - 1 <= mIx(x.yto)) &&
        (!mt || ((x.amon || 4) >= 4 ? fyy : fyy + 1) * 12 + (x.amon || 4) - 1 < mt.ix),
      rem: 12 - FYM(x.amon || 4),
      days: first ? Math.min(365, Math.round((Date.UTC(e.fy + 1, 2, 31) - Date.UTC(e.y, e.mo - 1, e.d)) / 864e5) + 1) : 365
    };
  }

  function mcm(o, x, q) {
    const r = x.ret / 12, mm = x.madd || 0, ek = q.first ? FYM(q.e.mo) : -1, out = [];
    let b = o;
    const f0 = q.first ? Math.min(1, Math.max(0, q.days / 365 * 12 - (11 - ek))) : 1;
    for (let k = 0; k < 12; k++) {
      if (q.first && k < ek) { out.push(b); continue; }
      b *= (q.first && k === ek) ? Math.pow(1 + r, f0) : 1 + r;
      if (q.ms[k]) b += mm;
      if (q.act && q.yp && FYM(x.amon || 4) === k) b += x.add;
      out.push(b);
    }
    return out;
  }

  function yrsOf(x, s) {
    if (x.type === 'gratuity') return x.yrs;
    let t = null;
    const m = mIx(x.mto), y = mIx(x.yto);
    if (x.madd > 0 && m != null) t = m;
    if (x.add > 0 && y != null) t = t == null ? y : Math.max(t, y);
    if (t == null) return 0;
    const fs = t % 12 >= 3 ? Math.floor(t / 12) : Math.floor(t / 12) - 1;
    return Math.round(Math.min(60, Math.max(0, fs - s.start + 2)));
  }

  function gratuity(s, a) {
    const y = s.grat.svc + a - 1;
    return y < 5 ? 0 : Math.min(s.grat.cap, s.grat.basic * 15 / 26 * y);
  }

  function calculate(s, dependencies) {
    const stage = dependencies.stage, policy = dependencies.policy, yearsOf = dependencies.yearsOf;
    const rows = [], N = Math.max(2, Math.min(61, s.end - s.start + 1));
    const assets = s.assets;
    const meta = new Array(assets.length);
    for (let i = 0; i < assets.length; i++) {
      const x = assets[i];
      if (x.type !== 'gratuity') x.yrs = yearsOf(x, s);
      const e = x.type === 'gratuity' ? null : entry(x, s);
      const mt = x.type === 'gratuity' ? null : matOf(x, s);
      meta[i] = {
        e: e, mt: mt,
        ek: e ? FYM(e.mo) : -1,
        f0: x.type === 'gratuity' ? null : mIx(x.mfrom),
        t0: x.type === 'gratuity' ? null : mIx(x.mto),
        yf: x.type === 'gratuity' ? null : mIx(x.yfrom),
        yt: x.type === 'gratuity' ? null : mIx(x.yto),
        amon: x.amon || 4,
        amk: FYM(x.amon || 4),
        rem: 12 - FYM(x.amon || 4),
        firstDays: e ? Math.min(365, Math.round((Date.UTC(e.fy + 1, 2, 31) - Date.UTC(e.y, e.mo - 1, e.d)) / 864e5) + 1) : 365
      };
    }
    const members = s.members;
    const memAges = members.map(m => m.age);
    const isChild = members.map(m => m.role === 'Child');
    for (let a = 1; a <= N; a++) {
      const p = a > 1 ? rows[a - 2] : null;
      const fyy = s.start + a - 2;
      const v = new Array(assets.length);
      let totSum = 0, rowAdd = 0;
      for (let i = 0; i < assets.length; i++) {
        const x = assets[i], md = meta[i];
        let val;
        if (x.type === 'gratuity') {
          val = (a - 1 <= s.grat.rem) ? gratuity(s, a) : p.v[i] * (1 + x.ret);
        } else if (a === 1) {
          val = x.value;
        } else {
          const o = p.v[i], e = md.e, mt = md.mt;
          const first = a === e.a0, act = a >= e.a0 && a <= x.yrs;
          const ek = md.ek, f0 = md.f0, t0 = md.t0;
          const ms = new Array(12);
          let n = 0, w = 0;
          for (let k = 0; k < 12; k++) {
            const ix = (k <= 8 ? fyy : fyy + 1) * 12 + (k + 3) % 12;
            const on = !!(act && (!first || k >= ek) && (f0 == null || ix >= f0) && (t0 == null || ix <= t0) && (!mt || ix < mt.ix));
            ms[k] = on;
            if (on) { n++; w += 12 - k; }
          }
          const amIx = (md.amon >= 4 ? fyy : fyy + 1) * 12 + md.amon - 1;
          const yp = (a > e.a0 || md.amk >= ek) &&
            (md.yf == null || amIx >= md.yf) &&
            (md.yt == null || amIx <= md.yt) &&
            (!mt || amIx < mt.ix);
          const mm = x.madd || 0, ay = act && yp ? x.add : 0, am = act ? mm * n : 0;
          rowAdd += ay + am;
          if (a < e.a0 || (mt && a > mt.row)) {
            val = o;
          } else {
            const q = { e: e, first: first, act: act, ms: ms, n: n, w: w, yp: yp, rem: md.rem, days: first ? md.firstDays : 365 };
            if (mt && a === mt.row) {
              if (x.cmp === 'oa') val = o + ay + am + (o + ay + am) * x.ret;
              else if (x.cmp === 'monthly') {
                const ou = mcm(o, x, q);
                val = (mt.km > 0 ? ou[mt.km - 1] : o) * Math.pow(1 + x.ret / 12, mt.d / mt.dim);
              } else if (!x.icr) {
                val = o * (1 + x.ret * mt.days / 365) + ay + am;
              } else {
                let w2 = 0;
                for (let k = 0; k < 12; k++) if (ms[k]) w2 += mt.km - k;
                const r2 = ay ? Math.max(0, mt.km - md.amk) : 0;
                val = o + ay + am + o * x.ret * mt.days / 365 + (mm * w2 + ay * r2) * x.ret / 12;
              }
            } else if (x.cmp === 'oa') {
              val = o + ay + am + (o + ay + am) * x.ret;
            } else if (x.cmp === 'monthly') {
              val = mcm(o, x, q)[11];
            } else if (!x.icr) {
              val = o * (1 + x.ret * q.days / 365) + ay + am;
            } else {
              val = o + ay + am + o * x.ret * q.days / 365 + (mm * w + ay * md.rem) * x.ret / 12;
            }
          }
        }
        v[i] = val;
        totSum += val;
      }
      const tot = Math.round(totSum);
      const ages = new Array(members.length), sts = new Array(members.length);
      for (let mi = 0; mi < members.length; mi++) {
        ages[mi] = memAges[mi] + a - 1;
        sts[mi] = isChild[mi] ? stage(members[mi], a) : '';
      }
      rows.push({
        a: a, year: s.start + a - 1, age: ages, st: sts, v: v, tot: tot,
        add: a > 1 ? rowAdd : 0,
        chg: p ? tot - p.tot : 0
      });
    }
    policy.applyToRows(s, rows);
    const cl = n => Math.min(N, Math.max(1, n));
    const ri = cl(s.ret - s.members[0].age + 1) - 1, hi = ri;
    const inc = assets.map((x, i) => {
      const mt = meta[i].mt;
      return rows[ri].v[i] * (mt && ri + 1 >= mt.row ? 0 : x.ret);
    });
    const nx = rows[ri + 1];
    return {
      rows: rows, ri: ri, hi: hi, inc: inc, incT: inc.reduce((q, c) => q + c, 0),
      payRet: nx ? nx.payR : 0, payT: rows.reduce((q, r) => q + r.pay, 0)
    };
  }

  root.VRCalcCore = {
    mIx: mIx, vm: vm, FYM: FYM, entry: entry, matOf: matOf, fyInfo: fyInfo, mcm: mcm,
    yrsOf: yrsOf, gratuity: gratuity, calculate: calculate
  };
})(window);
