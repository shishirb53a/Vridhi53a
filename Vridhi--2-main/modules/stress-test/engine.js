/* Stress Test · calculation engine (separate module, no DOM / storage / network).
   Reads one client's Retirement Planner inputs (the saved S.fh.v object) through the planner's own engine
   (window.FreedomHorizon) and runs the 14 scenarios of the Excel "Stress Test" tab on them.
   Row 1 of the result (Base Case) therefore agrees with the planner's Year-by-Year report. */
(function (root) {
  "use strict";
  const MAXY = 70, N = 14;

  /* STRESS SETTINGS block (Excel B29:B39). Conservative / Optimistic returns are now editable here
     (they were linked to the Money Needed tab in the workbook). */
  const defaultSettings = () => ({ lean: 0.25, belt: 0.40, expUp: 0.25, bear: 0.03, bull: 0.02, highInfl: 0.08,
    freelance: 0.30, partTime: 0.60, shock: 500000, conservative: 0.06, optimistic: 0.0805 });
  const SETTING_RANGES = { lean: [0, 1], belt: [0, 1], expUp: [0, 5], bear: [0, 1], bull: [0, 1], highInfl: [0, 1],
    freelance: [0, 1], partTime: [0, 1], shock: [0, 1e10], conservative: [0, 1], optimistic: [0, 1] };
  function cleanSettings(s) {
    const d = defaultSettings(), o = {};
    for (const k of Object.keys(d)) {
      const raw = s && s[k], n = raw === null || raw === undefined || raw === "" ? NaN : Number(raw), [lo, hi] = SETTING_RANGES[k];
      o[k] = Number.isFinite(n) && n >= lo && n <= hi ? n : d[k];
    }
    return o;
  }

  /* ---- planner inputs -> base case ---- */
  function fromPlanner(inp, FH) {
    FH = FH || root.FreedomHorizon;
    if (!FH || !inp) return { ok: false, issues: [{ message: "No Retirement Planner plan found for this client." }] };
    const issues = FH.validateAll(inp);
    if (issues.length) return { ok: false, issues };
    const n = k => Number(inp[k]);
    const sim = FH.simulate(inp), planYears = n("until") - n("age");
    const kids = [0], other = [0], lumpInc = [0], lumpPrin = [0];
    for (const r of sim.rows) {
      const li = Object.values(r.lumpIncomeBySource || {}).reduce((t, x) => t + x, 0);
      kids.push(r.fee.reduce((t, x) => t + x, 0) + r.wed.reduce((t, x) => t + x, 0));
      lumpInc.push(li);
      other.push(r.income - li);
      lumpPrin.push(r.lumpReceived - r.lumpSpent - r.lumpHeld + r.lumpAdded);
    }
    const inc = FH.incomeSummary(inp), amt = inc.streams.reduce((t, s) => t + s.amount, 0);
    const growth = amt > 0 ? inc.streams.reduce((t, s) => t + s.amount * s.g, 0) / amt : 0.02;
    return { ok: true, age: n("age"), planYears, corpus: n("corpus"), monthly: n("monthly"), buffer: n("buffer"),
      bufferRoi: n("bufferRoi") / 100, roi: n("roi") / 100, infl: n("houseInflation") / 100,
      reduceAge: n("reduceAge"), reducePct: n("reducePercent") / 100,
      otherToday: inc.nowAnnual, incomeGrowth: growth,        // Excel F6 / B43: other income in today's rupees, and its yearly growth
      kids, other, lumpInc, lumpPrin, todayWeddings: sim.todayTotal,
      earnYears: sim.R, earn: sim.R ? n("preEarn") : 0, earnRoi: sim.R ? n("preRoi") / 100 : 0 };
  }

  /* ---- the 14 scenarios (Excel rows 6-19). ov = columns the scenario overrides (orange cells) ---- */
  const pc = x => Math.round(x * 100) + "%";
  function scenarios(b, s) {
    const C = b.monthly, F = b.otherToday, G = b.roi, I = b.infl;
    const side = (p, c) => Math.max(F, p * c * 12);
    const mk = (name, o) => Object.assign({ name, monthly: C, shock: 0, other: F, roi: G, infl: I, ov: "" }, o);
    const lean = C * (1 - s.lean), up = C * (1 + s.expUp), bear = Math.max(0, G - s.bear), bull = G + s.bull;
    return [
      mk("1. Base Case (your assumptions)"),
      mk(`2. Lean living (−${pc(s.lean)} expenses)`, { monthly: lean, ov: "C" }),
      mk(`3. Belt-tightened (−${pc(s.belt)} expenses)`, { monthly: C * (1 - s.belt), ov: "C" }),
      mk(`4. Lifestyle unchanged (+${pc(s.expUp)} exp)`, { monthly: up, ov: "C" }),
      mk("5. Bear market (poor returns)", { roi: bear, ov: "G" }),
      mk("6. Bull market (strong returns)", { roi: bull, ov: "G" }),
      mk(`7. High inflation (${pc(s.highInfl)} p.a.)`, { infl: s.highInfl, ov: "I" }),
      mk("8. All-safe portfolio (Conservative returns)", { roi: s.conservative, ov: "G" }),
      mk("9. Aggressive portfolio (Optimistic returns)", { roi: s.optimistic, ov: "G" }),
      mk(`10. Freelance covers ${pc(s.freelance)} of costs`, { other: side(s.freelance, C), ov: "F" }),
      mk(`11. Part-time job covers ${pc(s.partTime)} of costs`, { other: side(s.partTime, C), ov: "F" }),
      mk(`12. Medical/emergency shock ₹${+(s.shock / 1e5).toFixed(1)}L`, { shock: s.shock, ov: "E" }),
      mk(`13. WORST CASE (high exp + bear + ${pc(s.highInfl)} infl)`, { monthly: up, roi: bear, infl: s.highInfl, ov: "CGI" }),
      mk(`14. BEST CASE (lean + bull + ${pc(s.freelance)} income)`, { monthly: lean, roi: bull, other: side(s.freelance, lean), ov: "CFG" })
    ];
  }

  /* ---- one scenario, year by year, for up to 70 years (costs continue after the plan ends) ---- */
  function runScenario(b, sc) {
    const investable = b.corpus - b.buffer - sc.shock - b.todayWeddings;
    const bal = [investable], dead = investable < 0;
    let P = investable, S = 0;
    for (let y = 1; y <= MAXY; y++) {
      const prev = bal[y - 1];
      if (dead || prev < 0) { bal.push(prev); continue; }
      const inPlan = y <= b.planYears, age = b.age + y;
      const cut = age > b.reduceAge ? 1 - b.reducePct : 1;
      const house = 12 * sc.monthly * (1 + sc.infl) ** y * cut;
      const uplift = inPlan ? Math.max(0, sc.other - b.otherToday) * (1 + b.incomeGrowth) ** y : 0;
      const income = inPlan ? b.other[y] + uplift + b.lumpInc[y] : 0;
      const O = house + (inPlan ? b.kids[y] : 0);
      const earning = y <= b.earnYears;
      let draw = O, endS = 0;
      if (earning) {
        const cash = S + S * b.earnRoi + b.earn, used = Math.min(cash, O);
        endS = cash - used; draw = O - used;
      }
      P = P * (1 + sc.roi) + income + (inPlan ? b.lumpPrin[y] + b.buffer * b.bufferRoi : 0)
        + (y === b.planYears ? b.buffer : 0) - draw;
      if (b.earnYears > 0 && y === b.earnYears) { P += endS; endS = 0; }
      S = endS;
      bal.push(P + S);
    }
    const years = bal.slice(1), funded = years.filter(v => v >= 0).length;
    let surv;
    if (investable < 0) surv = 0;
    else if (funded >= MAXY) surv = MAXY;
    else { const last = funded === 0 ? investable : years[funded - 1]; surv = funded + last / (last - years[funded]); }
    return { investable, years, funded, survival: surv };
  }

  /* months from the first day of this month; returns { y, m } (month 1-12) for "Runs Out On" */
  function runsOutOn(surv, now) {
    const d = now || new Date(), idx = d.getFullYear() * 12 + d.getMonth() + Math.round(surv * 12);
    return { y: Math.floor(idx / 12), m: idx % 12 + 1 };
  }

  function run(b, settings, opts) {
    const s = cleanSettings(settings), sc = scenarios(b, s);
    const rows = sc.map(x => {
      const r = runScenario(b, x), never = r.survival >= MAXY;
      return Object.assign({}, x, { corpus: b.corpus, buffer: b.buffer, investable: r.investable, netNeed: x.monthly * 12 - x.other,
        survival: r.survival, never, runsAtAge: never ? null : b.age + r.survival,
        runsOn: never ? null : runsOutOn(r.survival, opts && opts.now), funded: r.funded, series: r.years,
        left: r.funded >= b.planYears && b.planYears > 0 ? r.years[b.planYears - 1] : null });
    });
    const surv = rows.map(r => r.survival), at = v => rows[surv.indexOf(v)].name;
    const summary = { min: Math.min(...surv), minName: at(Math.min(...surv)), max: Math.max(...surv), maxName: at(Math.max(...surv)),
      avg: surv.reduce((t, v) => t + v, 0) / N, fullPlan: surv.filter(v => v >= b.planYears).length,
      runOut: surv.filter(v => v < MAXY).length, planYears: b.planYears };
    const engine = [];
    for (let y = 1; y <= MAXY; y++) {
      const inPlan = y <= b.planYears;
      engine.push({ year: y, age: b.age + y, kids: inPlan ? b.kids[y] : 0, lumpIncome: inPlan ? b.lumpInc[y] : 0,
        lumpPrincipal: inPlan ? b.lumpPrin[y] : 0, balances: rows.map(r => r.series[y - 1]) });
    }
    return { ok: true, settings: s, base: b, rows, summary, engine };
  }

  root.StressTest = { MAXY, defaultSettings, cleanSettings, fromPlanner, scenarios, runScenario, runsOutOn, run };
})(typeof window !== "undefined" ? window : globalThis);
