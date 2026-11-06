
/* Retirement planner · calculation engine
   Pure functions only: no DOM, no storage, no network. Every input is read from the
   `inputs` object (field id -> raw value, string or number; blank = "" / null).
   The formulas and cash-flow timing are a faithful port of the original Financial
   Freedom Calculator wizard; nothing here is shared with Vriddhi's own forecast. */
(function (root) {
  "use strict";

  /* Inflation timing. Household spending, college fees and other income are year-end cash flows in year 1, 2, 3 ...
     With 1 (the shipped setting) each of them is already inflated by one year in year 1, exactly as wedding budgets are
     (wedding cost x (1 + inflation) ^ years). 0 reproduces the original Financial Freedom Calculator, where year 1 was
     charged at today's prices; the reference tests load the engine with 0 to keep proving that conformance. */
  const FIRST_YEAR_INFLATION = 1;

  /* ---------- field catalogue ----------
     panel: wizard step that owns the field
     sub:   household sub-tab ("expenses" | "income"), else null
     child: 1 or 2 when the field only applies if that many children are included
     kind:  "return" | "inflation" | "growth" are labelled as assumptions in the UI */
  const F = (id, label, initial, min, max, help, required, o) =>
    Object.assign({ id, label, initial, min, max, help, required, integer: false,
      panel: "family", sub: null, child: null, assumption: null }, o || {});

  const FIELDS = [
    F("age", "Your age", 48, 18, 110, "", true, { integer: true, panel: "family" }),
    F("children", "Number of children", 2, 0, 2, "", true, { integer: true, panel: "family" }),
    F("childAge1", "Child 1 age", "", 0, 60, "", false, { integer: true, panel: "family", child: 1 }),
    F("stage1", "Child 1 · stage", 0, 0, 4, "", false, { integer: true, panel: "family", child: 1 }),
    F("classToday1", "Child 1 · Class (1–12)", 12, 1, 12, "", true, { integer: true, panel: "family", child: 1 }),
    F("weddingAge1", "Child 1 · wedding age", "", 0, 80, "", false, { integer: true, panel: "family", child: 1 }),
    F("childAge2", "Child 2 age", "", 0, 60, "", false, { integer: true, panel: "family", child: 2 }),
    F("stage2", "Child 2 · stage", 0, 0, 4, "", false, { integer: true, panel: "family", child: 2 }),
    F("classToday2", "Child 2 · Class (1–12)", 9, 1, 12, "", true, { integer: true, panel: "family", child: 2 }),
    F("weddingAge2", "Child 2 · wedding age", "", 0, 80, "", false, { integer: true, panel: "family", child: 2 }),

    // Planning Period tab
    F("retire", "Expected retirement age", 55, 18, 110, "Optional; informational only.", false, { integer: true, panel: "planning", sub: "ready" }),
    F("until", "Money must last until age", 74, 19, 120, "", true, { integer: true, panel: "planning", sub: "ready" }),
    F("corpus", "Total money available today (₹)", 30000000, 0, null, "", true, { panel: "planning", sub: "ready" }),
    F("roi", "Annual portfolio return (%)", 8.05, 0, 100, "Editable assumption, not a forecast.", true, { panel: "planning", sub: "ready", assumption: "return" }),
    // Pre-Retirement Earning Phase (card below the timeline fields). preOn is "1" / "0"; the two inputs only count while it is "1".
    F("preOn", "Pre-retirement earning phase", "1", 0, 1, "", true, { integer: true, panel: "planning", sub: "earning" }),
    F("preEarn", "Annual earnings (₹)", 2000000, 0, null, "", true, { panel: "planning", sub: "earning", gate: "preOn" }),
    F("preRoi", "Expected return on earnings (%)", "5.00", 0, 100, "Editable assumption, not a forecast.", true, { panel: "planning", sub: "earning", gate: "preOn", assumption: "return" }),

    // Money Buckets tab
    F("houseFund", "Money set aside for household (₹)", 14000000, 0, null, "", true, { panel: "buckets" }),
    F("buffer", "Emergency reserve (₹)", 1500000, 0, null, "", true, { panel: "buckets" }),
    F("bufferRoi", "Annual emergency-reserve return (%)", 6, 0, 100, "Editable assumption. Enter 0 if none.", true, { panel: "buckets", assumption: "return" }),
    F("educationFund1", "Child 1 · education set aside (₹)", "", 0, null, "Enter 0 if none.", true, { panel: "buckets", child: 1 }),
    F("weddingFund1", "Child 1 · wedding set aside (₹)", "", 0, null, "Enter 0 if none.", true, { panel: "buckets", child: 1 }),
    F("educationFund2", "Child 2 · education set aside (₹)", "", 0, null, "Enter 0 if none.", true, { panel: "buckets", child: 2 }),
    F("weddingFund2", "Child 2 · wedding set aside (₹)", "", 0, null, "Enter 0 if none.", true, { panel: "buckets", child: 2 }),

    F("monthly", "Monthly household spending today (₹)", 112000, 0, null, "", true, { panel: "household", sub: "expenses" }),
    F("houseInflation", "Annual household inflation (%)", 4, 0, 100, "Editable assumption.", true, { panel: "household", sub: "expenses", assumption: "inflation" }),
    F("reduceAge", "Expenses reduce after age", 55, 18, 120, "", true, { integer: true, panel: "household", sub: "expenses" }),
    F("reducePercent", "Expenses reduce by (%)", 40, 0, 100, "Enter 0 if none.", true, { panel: "household", sub: "expenses" }),

    F("educationInflation", "Annual education inflation (%)", 10, 0, 100, "Editable assumption.", true, { panel: "college", assumption: "inflation" }),
    F("feeYears1", "Child 1 · years of college fees left", 4, 0, 60, "", true, { integer: true, panel: "college", child: 1 }),
    F("annualFee1", "Child 1 · annual fee at today's price (₹)", 40000, 0, null, "Editable example.", true, { panel: "college", child: 1 }),
    F("feeYears2", "Child 2 · years of college fees left", 7, 0, 60, "", true, { integer: true, panel: "college", child: 2 }),
    F("annualFee2", "Child 2 · annual fee at today's price (₹)", 400000, 0, null, "Editable example.", true, { panel: "college", child: 2 }),

    F("weddingInflation", "Annual wedding-cost inflation (%)", 8, 0, 100, "Editable assumption.", true, { panel: "weddings", assumption: "inflation" }),
    F("weddingYears1", "Child 1 · years until wedding", 8, 0, 80, "", true, { integer: true, panel: "weddings", child: 1 }),
    F("weddingCost1", "Child 1 · wedding budget today (₹)", 2000000, 0, null, "Editable example.", true, { panel: "weddings", child: 1 }),
    F("weddingYears2", "Child 2 · years until wedding", 10, 0, 80, "", true, { integer: true, panel: "weddings", child: 2 }),
    F("weddingCost2", "Child 2 · wedding budget today (₹)", 0, 0, null, "Editable example.", true, { panel: "weddings", child: 2 })
  ];
  /* Other income (build 85): a switch plus income streams. Each stream has a name, an annual amount in today's money, a yearly growth rate and the
     years it runs, from one year to another. These sit on the Planning Period step, in its Income tab. */
  FIELDS.push(
    F("incomeOn", "Another income source", "0", 0, 1, "", false, { integer: true, panel: "planning", sub: "income" }),     // optional: plans saved before build 85 have no value
    F("incomeCount", "Income sources", "1", 1, null, "", true, { integer: true, panel: "planning", sub: "income", gate: "incomeOn" }));
  for (let k = 1; k <= 5; k++) FIELDS.push(
    F("incName" + k, "Income source name", "", 0, null, "", false, { panel: "planning", sub: "income", stream: k, kind: "text" }),
    F("incAmt" + k, "Annual income today (₹)", 0, 0, null, "", true, { panel: "planning", sub: "income", stream: k }),
    F("incGrowth" + k, "Annual growth of this income (%)", "2", 0, 100, "Editable assumption.", true, { panel: "planning", sub: "income", stream: k, assumption: "growth" }),
    F("incFrom" + k, "Income from (year)", "", 1900, 2200, "", true, { integer: true, panel: "planning", sub: "income", stream: k, kind: "year" }),
    F("incTo" + k, "Income to (year)", "", 1900, 2200, "", true, { integer: true, panel: "planning", sub: "income", stream: k, kind: "year" }));
  const BY_ID = Object.fromEntries(FIELDS.map(f => [f.id, f]));

  const STEP_LABELS = { family: "Family", planning: "Planning Period", buckets: "Money Buckets", household: "Household",
    college: "College", weddings: "Weddings" };

  /* ---------- small helpers ---------- */
  const isBlank = x => x === "" || x === null || x === undefined ||
    (typeof x === "string" && x.trim() === "");
  const num = (inp, id) => Number(inp[id]);            // blank -> 0, as in the original
  const childCount = inp => num(inp, "children");
  const INCOME_PARTS = ["incName", "incAmt", "incGrowth", "incFrom", "incTo"];
  const streamCount = inp => {
    const count = Number(inp.incomeCount);
    return Number.isSafeInteger(count) && count > 0 ? count : 1;
  };
  const incomeField = (part, k) => {
    const existing = BY_ID[part + k];
    if (existing) return existing;
    const template = BY_ID[part + "1"];
    return Object.assign({}, template, { id: part + k, stream: k });
  };
  const fieldsFor = inp => {
    const fields = FIELDS.slice();
    for (let k = 6; k <= streamCount(inp); k++)
      for (const part of INCOME_PARTS) fields.push(incomeField(part, k));
    return fields;
  };
  const currency = x => Number.isFinite(x)
    ? (x < -0.5 ? "−₹" + Math.round(-x).toLocaleString("en-IN") : "₹" + Math.round(x).toLocaleString("en-IN")) : "—";
  const stepsFor = kids => kids
    ? ["family", "planning", "buckets", "household", "college", "weddings"]
    : ["family", "planning", "buckets", "household"];
  const defaults = () => Object.fromEntries(FIELDS.map(f => [f.id, f.initial]));
  const applies = (f, inp) => (f.child === null || f.child <= childCount(inp)) && (!f.gate || String(inp[f.gate]) === "1") &&
    (!f.stream || (String(inp.incomeOn) === "1" && f.stream <= streamCount(inp)));

  /* ---------- per-field validation (mirrors the HTML min / max / step / required rules) ---------- */
  function checkField(f, raw) {
    if (f.kind === "year") return /^\d{4}$/.test(String(raw).trim()) && Number(raw) >= f.min && Number(raw) <= f.max ? null : "Enter a 4-digit year, for example 2030.";
    if (f.kind === "text") return String(raw == null ? "" : raw).length > 24 ? "Use up to 24 characters." : null;
    if (isBlank(raw)) return f.required ? "Please fill in this field." : null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return "Enter a number.";
    if (f.integer && !Number.isInteger(n)) return "Enter a whole number.";
    if (n < f.min) return "Value must be " + f.min + " or more.";
    if (f.max !== null && n > f.max) return "Value must be " + f.max + " or less.";
    return null;
  }

  /* ---------- cross-field rules ---------- */
  function growthEngine(inp) {
    const kids = childCount(inp);
    const ids = ["houseFund", "buffer"]
      .concat(kids >= 1 ? ["educationFund1", "weddingFund1"] : [])
      .concat(kids >= 2 ? ["educationFund2", "weddingFund2"] : []);
    if (isBlank(inp.corpus) || ids.some(id => isBlank(inp[id]))) return NaN;
    return num(inp, "corpus") - ids.reduce((s, id) => s + num(inp, id), 0);
  }

  // Planning Period rules: target age and retirement age.
  function planningRule(inp) {
    if (num(inp, "until") <= num(inp, "age"))
      return { field: "until", message: "Target age must exceed current age." };
    if (!isBlank(inp.retire) &&
        (num(inp, "retire") < num(inp, "age") || num(inp, "retire") > num(inp, "until")))
      return { field: "retire", message: "Retirement age must fall within the plan." };
    if (String(inp.preOn) === "1") {
      if (isBlank(inp.retire))
        return { field: "retire", message: "Enter a retirement age, or switch off the pre-retirement earning phase." };
      if (num(inp, "retire") <= num(inp, "age"))
        return { field: "retire", message: "Retirement age must be after your current age for the earning phase." };
    }
    return null;
  }
  /* Default allocation (an optional helper for the Money Buckets step): splits the corpus by fixed shares and leaves the rest as the
     growth engine, which is always "corpus minus the buckets", exactly as in growthEngine(). It only suggests input values; it changes
     no calculation. Amounts are whole rupees rounded down, so the buckets can never exceed the corpus.
       household 40%  ·  emergency reserve 10%  ·  each child's education 10%  ·  each child's wedding 10%  ·  rest: growth engine
       Each child's wedding budget (Weddings tab) is set to the same wedding amount, so every child gets the 10% allocation. */
  const DEFAULT_SHARES = Object.freeze({ household: 40, reserve: 10, child: 10 });
  function defaultAllocationPercents(kidCount) {
    const n = kidCount === 1 || kidCount === 2 ? kidCount : 0;
    return { household: DEFAULT_SHARES.household, reserve: DEFAULT_SHARES.reserve, child: DEFAULT_SHARES.child,
      growth: 100 - DEFAULT_SHARES.household - DEFAULT_SHARES.reserve - n * 2 * DEFAULT_SHARES.child };
  }
  function defaultAllocation(corpus, kidCount) {
    const c = Number(corpus);
    if (isBlank(corpus) || !Number.isFinite(c) || c <= 0) return null;
    const n = kidCount === 1 || kidCount === 2 ? kidCount : 0, part = pct => Math.floor(c * pct / 100 + 1e-6);
    const out = { houseFund: part(DEFAULT_SHARES.household), buffer: part(DEFAULT_SHARES.reserve) };
    for (let k = 1; k <= n; k++) {
      out["educationFund" + k] = part(DEFAULT_SHARES.child); out["weddingFund" + k] = part(DEFAULT_SHARES.child);
      out["weddingCost" + k] = out["weddingFund" + k];     // the wedding budget on the Weddings tab starts at the same amount, for every child
    }
    return out;
  }

  // Money Buckets rule: the buckets cannot add up to more than the corpus. Reported on the first bucket field.
  function bucketsRule(inp) {
    if (growthEngine(inp) < 0)
      return { field: "houseFund", message: "Allocations exceed available corpus." };
    return null;
  }
  const moneyRule = inp => planningRule(inp) || bucketsRule(inp);

  /* Every nonzero education fee or wedding budget must fall inside the planning horizon.
     Returns ALL violations (the original reported the first one only). */
  function timingIssues(inp) {
    const years = num(inp, "until") - num(inp, "age");
    const out = [];
    for (let c = 1; c <= childCount(inp); c++) {
      if (num(inp, "annualFee" + c) > 0 && num(inp, "feeYears" + c) > years)
        out.push({ panel: "college", child: c, field: "feeYears" + c, message:
          "Fee years extend beyond the selected planning period. Increase the target age or reduce fee years." });
      if (num(inp, "weddingCost" + c) > 0 && num(inp, "weddingYears" + c) > years)
        out.push({ panel: "weddings", child: c, field: "weddingYears" + c, message:
          "The wedding is after the selected planning period. Increase the target age or enter 0 for the wedding budget." });
    }
    return out;
  }

  /* ---------- validation of every applicable field, active or not ----------
     Returns issues in wizard order: { field, step, sub, child, kind, message }.
     kind = "field" (required / range) | "rule" (cross-field) | "timing".
     Field problems are reported for every applicable field in every step, including fields on
     sub-tabs that are not currently showing. Cross-field rules and timing checks need valid
     numbers, so they only run once no field problem or rule violation precedes them. Timing
     problems never block each other, so every education / wedding timing violation is reported. */
  function validateAll(inp) {
    const kids = childCount(inp);
    const fields = fieldsFor(inp);
    const issues = [];
    let blocked = false;
    const order = ["family", "planning", "buckets", "household", "college", "weddings"];
    for (const step of order) {
      if (kids === 0 && (step === "college" || step === "weddings")) continue;
      let stepHasField = false;
      for (const f of fields) {
        if (f.panel !== step || !applies(f, inp)) continue;
        const msg = f.id === "children"
          ? (["0", "1", "2"].includes(String(inp.children)) ? null : "Choose 0, 1 or 2.")
          : checkField(f, inp[f.id]);
        if (msg) {
          stepHasField = blocked = true;
          issues.push({ field: f.id, step, kind: "field", message: msg,
            sub: f.sub, child: (step === "college" || step === "weddings") ? f.child : null });
        }
      }
      if (stepHasField || blocked) continue;
      if (step === "family" || step === "planning" || step === "buckets") {
        const r = step === "family" ? familyRule(inp) : step === "planning" ? (planningRule(inp) || incomeRule(inp)) : bucketsRule(inp);
        if (r) { blocked = true; issues.push({ field: r.field, step, kind: "rule", message: r.message, sub: r.sub || (step === "planning" ? "ready" : null), child: null }); }
      } else if (step === "college" || step === "weddings") {
        for (const t of timingIssues(inp)) if (t.panel === step)
          issues.push({ field: t.field, step, kind: "timing", message: t.message, sub: null, child: t.child });
      }
    }
    return issues;
  }
  const validateStep = (inp, step) => validateAll(inp).filter(i => i.step === step);

  /* ---------- present-value helpers (same discounting as the original) ---------- */
  function collegeCost(inp, child) {
    if (childCount(inp) < child) return { future: 0, present: 0 };
    const ids = ["feeYears" + child, "annualFee" + child, "educationInflation", "roi"];
    if (ids.some(id => isBlank(inp[id]))) return { future: NaN, present: NaN };
    let future = 0, present = 0;
    for (let year = 1; year <= num(inp, "feeYears" + child); year++) {
      const bill = num(inp, "annualFee" + child) * (1 + num(inp, "educationInflation") / 100) ** (year - 1 + FIRST_YEAR_INFLATION);
      future += bill;
      present += bill / (1 + num(inp, "roi") / 100) ** year;
    }
    return { future, present };
  }

  function weddingCost(inp, child) {
    if (childCount(inp) < child) return { future: 0, present: 0 };
    const ids = ["weddingYears" + child, "weddingCost" + child, "weddingInflation", "roi"];
    if (ids.some(id => isBlank(inp[id]))) return { future: NaN, present: NaN };
    const years = num(inp, "weddingYears" + child);
    const future = num(inp, "weddingCost" + child) * (1 + num(inp, "weddingInflation") / 100) ** years;
    return { future, present: future / (1 + num(inp, "roi") / 100) ** years };
  }

  /* Wedding age (Family tab) is the child's age on the wedding day. Years until the wedding = wedding age - the child's age today;
     that number fills "Years Until Wedding" (Weddings tab), which is what the calculation reads. Both directions stay in step
     while the child's age is known: typing the years there updates the wedding age here. */
  const hasAge = (inp, id) => !isBlank(inp[id]) && Number.isFinite(Number(inp[id]));
  function weddingYearsFromAge(inp, child) {
    if (!hasAge(inp, "weddingAge" + child) || !hasAge(inp, "childAge" + child)) return null;
    return num(inp, "weddingAge" + child) - num(inp, "childAge" + child);
  }
  function weddingAgeOf(inp, child) {                 // the child's age at the wedding, when the child's age is known
    if (childCount(inp) < child || !hasAge(inp, "childAge" + child) || isBlank(inp["weddingYears" + child])) return null;
    return num(inp, "childAge" + child) + num(inp, "weddingYears" + child);
  }
  function familyRule(inp) {
    for (let c = 1; c <= childCount(inp); c++) {
      if (!hasAge(inp, "weddingAge" + c)) continue;
      if (!hasAge(inp, "childAge" + c))
        return { field: "childAge" + c, message: "Add the child's age so the wedding age can be turned into years until the wedding." };
      if (num(inp, "weddingAge" + c) < num(inp, "childAge" + c))
        return { field: "weddingAge" + c, message: "Wedding age cannot be below the child's age today." };
    }
    return null;
  }

  function weddingYear(inp, child, currentYear) {
    if (childCount(inp) < child || isBlank(inp["weddingYears" + child])) return null;
    return currentYear + num(inp, "weddingYears" + child);
  }

  /* Calendar year in which the last college fee falls (fees are paid at the end of each remaining fee year). Display only. */
  function educationYear(inp, child, currentYear) {
    if (childCount(inp) < child || isBlank(inp["feeYears" + child])) return null;
    return currentYear + num(inp, "feeYears" + child);
  }

  /* ---------- Other income: each source runs from one year to another ----------
     Plan year y carries the calendar-year label currentYear + y (the Year column in the reports; year-end timing). A stream earns its full annual amount
     in every plan year whose label lies from its From year to its To year, both included. The amount is in today's money and grows at the stream's own
     rate from today, exactly like the household spending: Annual income x (1 + growth)^(y - 1 + 1).
     Plans saved before build 85 (one income + "years it continues") are read as one stream for those first plan years. */
  let clock = () => new Date();
  const nowYear = () => clock().getFullYear();
  const yearOf = x => { const t = String(x == null ? "" : x).trim(); if (!/^\d{4}$/.test(t)) return null; const n = Number(t); return n >= 1900 && n <= 2200 ? n : null; };
  /* the default window for a new stream: the first plan year to the last one */
  function incomeWindow(inp) {
    const cy = nowYear(), span = !isBlank(inp.age) && !isBlank(inp.until) ? Math.max(1, num(inp, "until") - num(inp, "age")) : 1;
    return { from: String(cy + 1), to: String(cy + span) };
  }
  function incomeStreams(inp) {
    const out = [], cy = nowYear();
    if (isBlank(inp.incomeOn) && !isBlank(inp.income)) {                    // saved before build 85
      const amount = num(inp, "income"), years = isBlank(inp.incomeYears) ? 0 : num(inp, "incomeYears");
      if (amount > 0 && years > 0) out.push({ k: 1, name: "", amount, g: (isBlank(inp.incomeGrowth) ? 2 : num(inp, "incomeGrowth")) / 100, fromY: cy + 1, toY: cy + years });
      return out;
    }
    if (String(inp.incomeOn) !== "1") return out;
    for (let k = 1; k <= streamCount(inp); k++) {
      const f = yearOf(inp["incFrom" + k]), t = yearOf(inp["incTo" + k]);
      if (f === null || t === null || isBlank(inp["incAmt" + k]) || !Number.isFinite(Number(inp["incAmt" + k]))) continue;
      const amount = num(inp, "incAmt" + k);
      if (amount > 0 && t >= f) out.push({ k, name: String(inp["incName" + k] || "").trim(), amount,
        g: (isBlank(inp["incGrowth" + k]) ? 0 : num(inp, "incGrowth" + k)) / 100, fromY: f, toY: t });
    }
    return out;
  }
  function incomeIn(streams, year, cy) {
    const label = cy + year; let t = 0;
    for (const s of streams) if (label >= s.fromY && label <= s.toY) t += s.byYear ? (s.byYear[label] || 0) : s.amount * (1 + s.g) ** (year - 1 + FIRST_YEAR_INFLATION);
    return t;
  }
  /* Fixed-rupee income registered by the host page (insurance policy payouts): { k, name, byYear: {calendarYear: rupees}, fromY, toY }.
     Not inflated (a policy pays the same rupees). Absent unless the page registers root.__vrExtraStreams, so the engine stays pure on its own. */
  let noExtra = false;   // set only inside withoutPolicy(), to measure what the payouts are worth
  function extraStreams(cy) {
    if (noExtra) return [];
    try { const x = typeof root.__vrExtraStreams === "function" ? root.__vrExtraStreams(cy) : []; return Array.isArray(x) ? x : []; } catch (e) { return []; }
  }
  /* Policy payouts as the planner counts them: fixed rupees by calendar year, from next year on */
  const policyStreams = () => extraStreams(nowYear());
  const policyNow = () => { const cy = nowYear(); return extraStreams(cy).reduce((t, s) => t + ((s.byYear && s.byYear[cy + 1]) || 0), 0); };
  const withoutPolicy = fn => { const o = noExtra; noExtra = true; try { return fn(); } finally { noExtra = o; } };
  const incomeLabel = (s, all) => s.name ? s.name + " income" : all.length > 1 ? "Income source " + s.k : "Other income";
  function incomeEvents(streams, year, years, cy) {
    const ev = [];
    for (const s of streams) {
      if (s.fromY - cy > 1 && year === s.fromY - cy) ev.push(incomeLabel(s, streams) + " starts");
      if (year === s.toY - cy + 1 && year <= years) ev.push(incomeLabel(s, streams) + " ends");
    }
    return ev;
  }
  function incomeRule(inp) {
    if (String(inp.incomeOn) !== "1") return null;
    for (let k = 1; k <= streamCount(inp); k++) {
      const f = yearOf(inp["incFrom" + k]), t = yearOf(inp["incTo" + k]);
      if (f !== null && t !== null && t < f) return { field: "incTo" + k, message: "To year must be the same as or later than the From year.", sub: "income" };
    }
    return null;
  }
  /* Other regular income as entered (display only; the cash-flow maths is in simulate()). */
  function incomeSummary(inp) {
    const st = incomeStreams(inp), cy = nowYear(), amount = st.reduce((t, x) => t + x.amount, 0);
    const nowAnnual = st.filter(x => cy + 1 >= x.fromY && cy + 1 <= x.toY).reduce((t, x) => t + x.amount, 0);     // running in the first plan year
    const growths = Array.from(new Set(st.map(x => x.g)));
    const range = st.length === 1 ? (st[0].fromY === st[0].toY ? String(st[0].fromY) : st[0].fromY + " \u2013 " + st[0].toY) : st.length + " sources";
    const span = !isBlank(inp.age) && !isBlank(inp.until) ? Math.max(0, num(inp, "until") - num(inp, "age")) : null;
    const beyond = span === null ? 0 : st.filter(x => x.toY - cy > span).length;
    return { has: st.length > 0, count: st.length, amount, nowAnnual, years: null, growth: growths.length === 1 ? growths[0] * 100 : null, streams: st,
      amountText: currency(amount), yearsText: range, growthText: growths.length === 1 ? `${growths[0] * 100}% a year` : "varies by source",
      note: beyond ? `${beyond} source${beyond === 1 ? "" : "s"} run${beyond === 1 ? "s" : ""} past the end of the plan` : "" };
  }

  function horizonText(inp) {
    return !isBlank(inp.age) && !isBlank(inp.until)
      ? `${num(inp, "until") - num(inp, "age")} years, age ${num(inp, "age")} to ${num(inp, "until")}`
      : "Enter your target age.";
  }

  /* ---------- Pre-retirement earning phase (build 78) ----------
     When the phase is on, years 1..R (R = retirement age - current age) have earnings E (a flat yearly amount, received at year end).
       earnings + savings fund pay that year's spending (household + college fees + weddings), in that order;
       whatever is left is saved in a separate savings fund that grows at the "return on earnings" rate;
       a shortfall is drawn from the savings fund first, then from the corpus;
       at the end of year R the savings fund joins the corpus (the spendable pool), and the plan continues as before.
     With the phase off (or R = 0) every number is exactly what it was before this build. */
  function earningYears(inp) {
    if (String(inp.preOn) !== "1" || isBlank(inp.retire) || isBlank(inp.preEarn) || isBlank(inp.preRoi)) return 0;
    const age = num(inp, "age"), until = num(inp, "until");
    return Math.max(0, Math.min(num(inp, "retire") - age, until - age));
  }
  function earningSummary(inp) {
    const R = earningYears(inp), age = num(inp, "age"), until = num(inp, "until");
    return { on: R > 0, years: R, from: age, retire: R > 0 ? num(inp, "retire") : (isBlank(inp.retire) ? null : num(inp, "retire")), until,
      retiredYears: R > 0 ? until - num(inp, "retire") : null, earn: R > 0 ? num(inp, "preEarn") : 0, roi: R > 0 ? num(inp, "preRoi") : 0,
      total: R > 0 ? num(inp, "preEarn") * R : 0 };
  }

  /* One simulation behind plan(), schedule(), horizonReport() and the earning credit, so they cannot disagree.
     Row y (1..years): spending parts, other income, reserve interest, the pool (P) and the savings fund (S). */
  function simulate(inp, noEarn) {
    const years = num(inp, "until") - num(inp, "age"), rate = num(inp, "roi") / 100, reserve = num(inp, "buffer"), kids = childCount(inp);
    const cy = nowYear(), extra = extraStreams(cy), sources = incomeStreams(inp), streams = sources.concat(extra);
    const R = noEarn ? 0 : earningYears(inp), E = R ? num(inp, "preEarn") : 0, g = R ? num(inp, "preRoi") / 100 : 0, age = num(inp, "age");
    let P = num(inp, "corpus") - reserve, S = 0;
    const today = []; let todayTotal = 0;
    for (let c = 1; c <= kids; c++) if (num(inp, "weddingYears" + c) === 0) { today[c] = num(inp, "weddingCost" + c); todayTotal += today[c]; P -= today[c]; }
    const startPool = P, rows = [];
    for (let year = 1; year <= years; year++) {
      const reduction = age + year > num(inp, "reduceAge") ? 1 - num(inp, "reducePercent") / 100 : 1;
      const house = 12 * num(inp, "monthly") * (1 + num(inp, "houseInflation") / 100) ** (year - 1 + FIRST_YEAR_INFLATION) * reduction;
      const income = incomeIn(streams, year, cy), policy = incomeIn(extra, year, cy);   // policy = the part of income that is policy payouts
      const incomeBySource = Object.fromEntries(sources.map(s => [s.k, incomeIn([s], year, cy)]));
      const policyBySource = Object.fromEntries(extra.map(s => [s.k, incomeIn([s], year, cy)]));
      const reserveYield = reserve * num(inp, "bufferRoi") / 100;
      const fee = new Array(kids + 1).fill(0), wed = new Array(kids + 1).fill(0);
      for (let c = 1; c <= kids; c++) {
        if (year <= num(inp, "feeYears" + c))
          fee[c] = num(inp, "annualFee" + c) * (1 + num(inp, "educationInflation") / 100) ** (year - 1 + FIRST_YEAR_INFLATION);
        if (year === num(inp, "weddingYears" + c))
          wed[c] = num(inp, "weddingCost" + c) * (1 + num(inp, "weddingInflation") / 100) ** year;
      }
      const O = house + fee.reduce((t, x) => t + x, 0) + wed.reduce((t, x) => t + x, 0);
      const earning = year <= R, earn = earning ? E : 0;
      const startP = P, startS = S, interestP = P * rate, interestS = S * g;
      const cash = S + interestS + earn, used = earning ? Math.min(cash, O) : 0;   // spending paid by earnings + savings fund
      let endS = earning ? cash - used : 0;
      const draw = O - used;                                                       // spending paid by the corpus
      P = P * (1 + rate) + income + reserveYield - draw;
      let merged = 0;
      if (R > 0 && year === R) { merged = endS; P += endS; endS = 0; }
      S = endS;
      rows.push({ y: year, age: age + year, earning, house, fee, wed, O, income, incomeBySource, policyBySource, policy, reserveYield, earn, used, draw, startP, interestP, endP: P,
        startS, interestS, endS: earning && merged ? merged : endS, merged, total: P + S, reduction });
    }
    return { rows, startPool, today, todayTotal, R, reserve };
  }

  /* ---------- annual cash-flow plan (year-end timing, as in the original) ----------
     • Spendable pool starts at corpus − emergency reserve.
     • Weddings due today (0 years) are paid immediately.
     • Household, college fees and other income are inflated from year 1 (see FIRST_YEAR_INFLATION).
     • Each year: pool × (1 + return) + other income + reserve interest
                  − household − college fees − weddings due that year   (earnings pay these first while the earning phase runs).
     • The reserve principal is never spent; it is added back after the final year. */
  function plan(inp, noEarn) {
    const years = num(inp, "until") - num(inp, "age");
    const rate = num(inp, "roi") / 100;
    const sim = simulate(inp, noEarn), reserve = sim.reserve;
    let housePV = 0, interestPV = 0, runout = null;
    if (sim.startPool < 0) runout = num(inp, "age");
    for (const r of sim.rows) {
      housePV += (r.house - r.income) / (1 + rate) ** r.y;
      interestPV += r.reserveYield / (1 + rate) ** r.y;
      if (runout === null && r.total < 0) runout = r.age;
    }
    const last = sim.rows.length ? sim.rows[sim.rows.length - 1] : null;
    const endingSpendable = (last ? last.total : sim.startPool) + reserve;
    return { housePV, reservePV: reserve - interestPV - reserve / (1 + rate) ** years, runout, endingSpendable };
  }

  /* ---------- year-by-year schedule (same arithmetic as plan(); used by the Plan Simulation table) ----------
     Row 0 is today (weddings due today are paid). Each later row is one year-end:
       money in  = portfolio growth + other income + reserve interest (+ earnings and savings-fund interest while earning)
       money out = household + college fees + weddings due that year   (a negative growth is shown under money out)
     bal is the spendable money after the year (pool + savings fund), exactly as in plan(). */
  function schedule(inp, toAge, opts) {
    const currentYear = (opts && opts.currentYear) || new Date().getFullYear();
    const age = num(inp, "age"), years = Math.max(0, Math.round(toAge) - age), sim = simulate(inp);
    let seenNeg = false;
    const mk = (a, y, inn, out, bal, house, phase) => {
      const neg = bal < 0, status = !neg ? "Funded" : seenNeg ? "Shortfall" : "Runs out";
      if (neg) seenNeg = true;
      return { age: a, year: y, in: inn, out, bal, status, house: house || 0, phase };
    };
    const rows = [mk(age, currentYear, 0, sim.todayTotal, sim.startPool, 0, sim.R > 0 ? "earning" : "retired")];
    for (const r of sim.rows.slice(0, years)) {
      rows.push(mk(r.age, currentYear + r.y, Math.max(r.interestP, 0) + r.interestS + r.earn + r.income + r.reserveYield,
        r.O + Math.max(-r.interestP, 0), r.total, r.house, r.earning ? "earning" : "retired"));
    }
    return rows;
  }

  /* ---------- corpus by purpose, today or at a later age (Fund Allocation chart) ----------
     toAge == null -> the amounts set aside today. Otherwise each purpose is carried forward with its own flows:
       household bucket: grows, pays household spending, receives other income and reserve interest
       college / wedding buckets: grow, pay their own fees / weddings   (weddings due today are paid at once)
       reserve: principal stays;  growth engine: grows only.
     The values add up to schedule(inp, toAge) closing balance + reserve, so the chart agrees with the table. A negative
     value means that purpose is underfunded at that age. */
  function bucketsAt(inp, toAge, opts) {
    const age = num(inp, "age"), rate = num(inp, "roi") / 100, reserve = num(inp, "buffer"), kids = childCount(inp);
    const years = toAge == null ? 0 : Math.max(0, Math.round(toAge) - age);
    let house = num(inp, "houseFund"), grow = growthEngine(inp), sav = 0;
    const edu = [0], wed = [0];
    for (let c = 1; c <= kids; c++) {
      edu[c] = num(inp, "educationFund" + c); wed[c] = num(inp, "weddingFund" + c);
      if (toAge != null && num(inp, "weddingYears" + c) === 0) wed[c] -= num(inp, "weddingCost" + c);
    }
    const sim = simulate(inp);
    for (const r of sim.rows.slice(0, years)) {
      // earnings + savings fund pay the year's spending first, in this order: household, then each child's college fees and wedding
      let cover = r.used; const take = need => { const t = Math.min(cover, need); cover -= t; return t; };
      const hPaid = take(r.house);
      house = house * (1 + rate) + r.income + r.reserveYield - (r.house - hPaid);
      grow = grow * (1 + rate);
      for (let c = 1; c <= kids; c++) {
        const fPaid = take(r.fee[c]), wPaid = take(r.wed[c]);
        edu[c] = edu[c] * (1 + rate) - (r.fee[c] - fPaid); wed[c] = wed[c] * (1 + rate) - (r.wed[c] - wPaid);
      }
      if (r.earning) sav = r.merged ? 0 : r.endS;
      if (r.merged) grow += r.merged;
    }
    const out = [{ name: "Household", value: house }];
    for (let c = 1; c <= kids; c++) out.push({ name: `Child ${c} · education`, value: edu[c] }, { name: `Child ${c} · wedding`, value: wed[c] });
    out.push({ name: "Emergency reserve", value: reserve }, { name: "Growth engine", value: grow });
    if (sav > 0) out.push({ name: "Earnings savings fund", value: sav });
    return out;
  }

  /* ---------- Horizon Report: every plan year in full (same arithmetic as plan() and schedule()) ----------
     Money here is the spendable pool (corpus minus the emergency reserve, whose principal is never spent).
     end = start + money in - money out, where money in = interest on the pool + interest on the reserve + other income.
     A "Today" row is added only when a wedding falls due today. Child columns are arrays indexed by child (1..kids). */
  function horizonReport(inp, opts) {
    const currentYear = (opts && opts.currentYear) || new Date().getFullYear();
    const age = num(inp, "age"), years = num(inp, "until") - age, kids = childCount(inp), cutP = num(inp, "reducePercent");
    const streams = incomeStreams(inp).concat(extraStreams(nowYear())), sim = simulate(inp), R = sim.R, retireAge = R > 0 ? num(inp, "retire") : null;
    let pool = sim.startPool, seenNeg = false;
    const status = bal => { if (bal >= 0) return "Funded"; const s = seenNeg ? "Shortfall" : "Runs out"; seenNeg = true; return s; };
    const rows = [], zero = () => new Array(kids + 1).fill(0);
    const base = { earn: 0, netSaved: 0, startS: 0, interestS: 0, endS: 0, merged: 0, paidByEarn: 0, fromCorpus: 0 };
    const phase0 = R > 0 ? "Earning" : "Retired";
    const wed0 = zero(), ev0 = [];
    for (let c = 1; c <= kids; c++) if (num(inp, "weddingYears" + c) === 0 && num(inp, "weddingCost" + c) > 0) {
      wed0[c] = num(inp, "weddingCost" + c); ev0.push(`Child ${c} wedding paid today`);
    }
    if (sim.todayTotal > 0 && ev0.length) {
      rows.push(Object.assign({ today: true, year: currentYear, age, phase: phase0, what: ev0.join(" · "), monthly: 0, house: 0, fee: zero(), wed: wed0, spent: sim.todayTotal,
        start: pool + sim.todayTotal, interest: 0, reserveInterest: 0, income: 0, policy: 0, moneyIn: 0, end: pool, status: status(pool) }, base, { fromCorpus: sim.todayTotal }));
    }
    for (const r of sim.rows) {
      const ev = [];
      if (r.earning) ev.push(`Earning year ${r.y} of ${R}`);
      for (let c = 1; c <= kids; c++) {
        if (r.fee[c] > 0) ev.push(`Child ${c} college (year ${r.y} of ${num(inp, "feeYears" + c)})`);
        if (r.wed[c] > 0) ev.push(`Child ${c} wedding`);
      }
      if (R > 0 && r.y === R) { ev.push(`Retires at ${retireAge}`); if (r.merged > 0) ev.push("Savings fund moves into the corpus"); }
      if (cutP > 0 && r.age === num(inp, "reduceAge") + 1) ev.push(`Household spending drops ${cutP}%`);
      for (const e of incomeEvents(streams, r.y, years, nowYear())) ev.push(e);
      const interest = r.startP * (num(inp, "roi") / 100), moneyIn = interest + r.reserveYield + r.income;
      pool = r.endP;
      const st = status(r.total);
      if (st === "Runs out") ev.push("Money runs out");
      if (r.y === years) ev.push("Last year of the plan");
      const plain = ev.length === 1 && r.earning ? ev[0] : ev.length ? ev.join(" · ") : "Regular year";
      rows.push({ today: false, year: currentYear + r.y, age: r.age, phase: r.earning ? "Earning" : "Retired", what: plain, monthly: r.house / 12, house: r.house,
        fee: r.fee, wed: r.wed, spent: r.O, start: r.startP, interest, reserveInterest: r.reserveYield, income: r.income,
        incomeBySource: r.incomeBySource, policyBySource: r.policyBySource, policy: r.policy, moneyIn, end: r.endP, status: st,
        earn: r.earn, netSaved: r.earning ? r.earn - r.O : 0, startS: r.startS, interestS: r.interestS, endS: r.merged ? r.merged : r.endS, merged: r.merged,
        paidByEarn: r.used, fromCorpus: r.draw });
    }
    return rows;
  }

  /* ---------- full result ---------- */
  function calculate(inp, opts) {
    const currentYear = (opts && opts.currentYear) || new Date().getFullYear();
    const issues = validateAll(inp);
    if (issues.length) {
      const first = issues[0];
      const status = issues.some(i => i.kind === "field")
        ? "Complete all required fields, including separate child allocations."
        : first.kind === "rule"
          ? "Check the target age, retirement age and allocations."
          : first.message;
      return { ok: false, issues, status };
    }
    const kids = childCount(inp);
    const est = plan(inp);
    const rows = [{ name: "Household, net of other income", setAside: num(inp, "houseFund"), needed: est.housePV }];
    // Earning phase: its effect on the money left at the end, brought back to today at the portfolio return. A negative "needed" is a credit.
    const earnSum = earningSummary(inp);
    if (earnSum.on) {
      const without = plan(inp, true), yrs = num(inp, "until") - num(inp, "age");
      rows.push({ name: `Pre-retirement earnings, net (age ${earnSum.from}–${earnSum.retire})`, setAside: 0,
        needed: -(est.endingSpendable - without.endingSpendable) / (1 + num(inp, "roi") / 100) ** yrs, credit: true });
    }
    for (let c = 1; c <= kids; c++) {
      rows.push(
        { name: `Child ${c} · education`, setAside: num(inp, "educationFund" + c), needed: collegeCost(inp, c).present },
        { name: `Child ${c} · wedding (${currentYear + num(inp, "weddingYears" + c)})`,
          setAside: num(inp, "weddingFund" + c), needed: weddingCost(inp, c).present });
    }
    rows.push({ name: "Emergency reserve, net", setAside: num(inp, "buffer"), needed: est.reservePV },
      { name: "Growth engine · unallocated", setAside: growthEngine(inp), needed: 0 });
    const needed = rows.reduce((s, r) => s + r.needed, 0);
    const available = num(inp, "corpus");   // money you hold today; policy payouts not yet received are not part of it
    const surplus = available - needed;
    if (![needed, available, surplus].every(Number.isFinite))
      return { ok: false, issues: [], status: "Please check unusually large inputs." };

    rows.push({ name: "TOTAL", setAside: available, needed });
    const until = num(inp, "until");
    const explanation =
      `Over ${until - num(inp, "age")} years, the estimated need today is ${currency(needed)}. ` +
      `With ${currency(available)} available, this is ${surplus >= 0 ? "a surplus" : "a shortfall"} of ` +
      `${currency(Math.abs(surplus))}. The growth engine is ${currency(growthEngine(inp))} of your existing corpus. ` +
      (est.runout === null
        ? `The modeled spendable money remains positive through age ${until}.`
        : `The modeled spendable balance first turns negative around age ${est.runout}.`);
    return { ok: true, issues: [], status: "", needed, available, surplus,
      runout: est.runout, runoutText: est.runout === null
        ? `Does not run out by age ${until}` : `Around age ${est.runout}`,
      rows, explanation, plan: est };
  }

  root.FreedomHorizon = { defaultAllocation, defaultAllocationPercents, schedule, bucketsAt, horizonReport, FIELDS, BY_ID, STEP_LABELS, defaults, stepsFor, isBlank, currency,
    checkField, incomeField, growthEngine, moneyRule, planningRule, bucketsRule, incomeSummary, timingIssues, validateAll, validateStep,
    collegeCost, weddingCost, weddingYear, weddingAgeOf, weddingYearsFromAge, educationYear, incomeStreams, incomeWindow, policyStreams, policyNow, withoutPolicy, setClock: fn => { clock = typeof fn === "function" ? fn : () => new Date(); }, horizonText, plan, calculate, earningYears, earningSummary, simulate };
})(typeof window !== "undefined" ? window : globalThis);
