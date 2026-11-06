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
    s.assets.forEach(x => { if (x.type !== 'gratuity') x.yrs = yearsOf(x, s); });
    for (let a = 1; a <= N; a++) {
      const p = a > 1 ? rows[a - 2] : null;
      const v = s.assets.map((x, i) => {
        if (x.type === 'gratuity') return (a - 1 <= s.grat.rem) ? gratuity(s, a) : p.v[i] * (1 + x.ret);
        if (a === 1) return x.value;
        const o = p.v[i], q = fyInfo(x, s, a);
        if (a < q.e.a0) return o;
        const mt = matOf(x, s);
        if (mt && a > mt.row) return o;
        const mm = x.madd || 0, ay = q.act && q.yp ? x.add : 0, am = q.act ? mm * q.n : 0;
        if (mt && a === mt.row) {
          if (x.cmp === 'oa') return o + ay + am + (o + ay + am) * x.ret;
          if (x.cmp === 'monthly') {
            const ou = mcm(o, x, q);
            return (mt.km > 0 ? ou[mt.km - 1] : o) * Math.pow(1 + x.ret / 12, mt.d / mt.dim);
          }
          if (!x.icr) return o * (1 + x.ret * mt.days / 365) + ay + am;
          const w2 = q.ms.reduce((t, c, k) => t + (c ? mt.km - k : 0), 0);
          const r2 = ay ? Math.max(0, mt.km - FYM(x.amon || 4)) : 0;
          return o + ay + am + o * x.ret * mt.days / 365 + (mm * w2 + ay * r2) * x.ret / 12;
        }
        if (x.cmp === 'oa') return o + ay + am + (o + ay + am) * x.ret;
        if (x.cmp === 'monthly') return mcm(o, x, q)[11];
        if (!x.icr) return o * (1 + x.ret * q.days / 365) + ay + am;
        return o + ay + am + o * x.ret * q.days / 365 + (mm * q.w + ay * q.rem) * x.ret / 12;
      });
      const tot = Math.round(v.reduce((q, c) => q + c, 0));
      rows.push({
        a: a, year: s.start + a - 1, age: s.members.map(m => m.age + a - 1),
        st: s.members.map(m => m.role === 'Child' ? stage(m, a) : ''), v: v, tot: tot,
        add: a > 1 ? s.assets.reduce((q, x) => {
          if (x.type === 'gratuity') return q;
          const k = fyInfo(x, s, a);
          return q + (k.act ? (k.yp ? x.add : 0) + (x.madd || 0) * k.n : 0);
        }, 0) : 0,
        chg: p ? tot - p.tot : 0
      });
    }
    policy.applyToRows(s, rows);
    const cl = n => Math.min(N, Math.max(1, n));
    const ri = cl(s.ret - s.members[0].age + 1) - 1, hi = ri;
    const inc = s.assets.map((x, i) => {
      const mt = matOf(x, s);
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
