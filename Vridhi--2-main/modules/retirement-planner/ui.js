
/* Retirement planner · pop-up (UI only). All maths lives in FreedomHorizon (engine).
   Opens in the shared <dialog id="dg"> like Add holding (same `hf` classes). Two top-level sections:
     1. Plan    - the input steps: Family, Planning Period, Money Buckets, Household, College, Weddings
     2. Summary - the calculated results
   Finish validates and saves, then opens the summary. Only one calculation exists (see result()). */
(function () {
  "use strict";
  const FHE = window.FreedomHorizon;
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Working copy of the inputs lives in FH.v. It is persisted only by Finish, inside Vriddhi's own state
     object (S.fh) via the app's save(), so it follows the same per-user storage and cloud sync as holdings. */
  const FH = { v: null, step: "family", house: "expenses", plan: "ready", incEdit: 0, incNew: 0, incUndo: null, sel: { college: 1, weddings: 1 }, sig: "",
    sec: "status", mode: "wizard", doneAt: 0, defAlloc: false, smTab: "buckets" };
  const initValues = () => { FH.v = {}; for (const f of FHE.FIELDS) FH.v[f.id] = String(f.initial); FH.defAlloc = false; };
  function ensureIncomeValues() {
    const count = Number(FH.v.incomeCount);
    if (!Number.isSafeInteger(count) || count < 1) return;
    for (let k = 1; k <= count; k++) for (const part of ["incName", "incAmt", "incGrowth", "incFrom", "incTo"]) {
      const id = part + k;
      if (!(id in FH.v)) FH.v[id] = String(FHE.incomeField(part, k).initial);
    }
  }
  const ALLOC_IDS = ["houseFund", "buffer", "educationFund1", "weddingFund1", "educationFund2", "weddingFund2", "weddingCost1", "weddingCost2"];   // editing any of these by hand switches the default off

  /* "₹ 4,00,000 · ₹ 4.00 L" under an amount, the same line Add holding shows under Current Value. */
  const amtText = raw => {
    const n = Number(raw);
    if (raw === "" || raw === null || raw === undefined || !Number.isFinite(n) || n <= 0) return "";
    return typeof f === "function" && typeof cr === "function" ? f(n) + " · " + cr(n) : FHE.currency(n);
  };
  // Education completion: calendar year of the last fee and the child's age then (age only if entered on Family).
  const eduWhen = (v, c, year) => {
    const y = FHE.educationYear(v, c, year);
    if (y === null) return { year: "—", age: "—" };
    const left = Number(v["feeYears" + c]);
    const a = v["childAge" + c];
    return { year: left === 0 ? "No fee years left" : String(y),
      age: FHE.isBlank(a) || !Number.isFinite(Number(a)) ? "Add age in Family" : `Age ${Number(a) + left}` };
  };

  /* The child's age on the wedding date, shown like the education page's "Child's age then" */
  const wedAge = (v, c) => { const a = FHE.weddingAgeOf(v, c); return a === null ? (FHE.isBlank(v["childAge" + c]) ? "Add age in Family" : "\u2014") : `Age ${a}`; };
  let root = null;
  const $ = id => root.querySelector("#fh-" + id);
  const $$ = sel => Array.from(root.querySelectorAll(sel));
  const kids = () => { const n = Number(FH.v.children); return n === 1 || n === 2 ? n : 0; };
  const steps = () => FHE.stepsFor(kids());

  // One calculation per input state, shared by every view (wizard Result, status summary, detailed summary).
  let memo = { key: "", r: null };
  function result() {
    const key = JSON.stringify(FH.v);
    if (memo.key !== key) memo = { key, r: FHE.calculate(FH.v) };
    return memo.r;
  }

  /* ---------- persistence (Vriddhi's S + save() pattern) ---------- */
  const savedState = () => { try { const f = typeof S !== "undefined" && S && S.fh; return f && f.v ? f : null; } catch (e) { return null; } };
  function persist(rep) {
    try {
      if (typeof S === "undefined") return false;
      S.fh = { v: Object.assign({}, FH.v), t: Date.now(), rep: (rep || (S.fh && S.fh.rep)) ? 1 : 0 };
      fhpStore();
      if (typeof save === "function") save();
      FH.doneAt = S.fh.t;
      return true;
    } catch (e) { return false; }
  }
  function applySaved(sv) {
    initValues();
    for (const k of Object.keys(FH.v)) if (k in sv.v) FH.v[k] = String(sv.v[k]);
    for (const c of [1, 2]) {                                    // plans saved before these boxes existed
      if (!("classToday" + c in sv.v)) FH.v["classToday" + c] = String(Math.min(12, Math.max(1, 12 - (Number(FH.v["feeYears" + c]) - COLLEGE_YEARS))));
    }
    if (!("incomeOn" in sv.v) && Number(sv.v.income) > 0 && Number(sv.v.incomeYears) > 0) {      // saved before the income streams: one stream, this month for that many years
      const w = FHE.incomeWindow({ age: "0", until: String(Math.round(Number(sv.v.incomeYears))) });
      Object.assign(FH.v, { incomeOn: "1", incomeCount: "1", incAmt1: String(sv.v.income), incGrowth1: String(sv.v.incomeGrowth == null ? 2 : sv.v.incomeGrowth), incFrom1: w.from, incTo1: w.to });
    }
    ensureIncomeValues();
    if (!("preOn" in sv.v)) FH.v.preOn = "0";                   // plans saved before the earning phase existed keep working unchanged
    memo = { key: "", r: null };
    if (FHE.validateAll(FH.v).length === 0) { FH.mode = "done"; FH.doneAt = sv.t || 0; }
    else { FH.mode = "wizard"; FH.step = "family"; }
  }
  function syncFromState() {
    const sv = savedState();
    if (!FH.v) { initValues(); if (sv) applySaved(sv); return; }
    if (FH.mode === "done") {               // not mid-edit: follow whatever is saved (including another device)
      if (sv) applySaved(sv);
      else { initValues(); FH.mode = "wizard"; FH.step = "family"; memo = { key: "", r: null }; }
    }
  }

  /* ---------- markup (Add-holding vocabulary) ---------- */
  function allocHint() {
    const n = kids(), p = FHE.defaultAllocationPercents(n);
    return `Auto-allocates: ${p.household}% Household, ${p.reserve}% Emergency${n ? `, ${p.child}% Kids (Edu & Wedding)` : ""}, ${p.growth}% Growth. Fully editable.`;
  }
  /* Family tab -> College / Weddings tabs. Typing a child's class or wedding years fills the matching field on the other tab
     (that field stays editable). Years of college fees left = years of school left (12 - class) + college years (4).
     Calculation is untouched: only the two inputs it already reads are filled. */
  const COLLEGE_YEARS = 4;
  const setField = (id, value) => {
    FH.v[id] = String(value);
    const el = $(id); if (el) el.value = FH.v[id];
    setErr(id, "");
  };
  function autofillFromFamily(id) {
    const m = /^(classToday|weddingAge|childAge|weddingYears|stage)([12])$/.exec(id);
    if (!m) return;
    const c = m[2], raw = FH.v[id], blank = isBlankV(raw) || !Number.isFinite(Number(raw));
    if (blank) return;
    if (m[1] === "stage") {                 // College 1-4 = year of a 4-year course: class 12 is done, fee years left = 5 - year
      const st = Math.round(Number(raw)), cEl = $("classToday" + c);
      if (st >= 1 && st <= 4) { setField("classToday" + c, 12); setField("feeYears" + c, 5 - st); if (cEl) { cEl.disabled = true; cEl.title = "Not used while the child is in college"; } }
      else { if (cEl) { cEl.disabled = false; cEl.removeAttribute("title"); } autofillFromFamily("classToday" + c); }
      return;
    }
    if (m[1] === "classToday") {
      const cls = Math.round(Number(raw));
      if (cls >= 1 && cls <= 12) setField("feeYears" + c, 12 - cls + COLLEGE_YEARS);
    } else if (m[1] === "weddingAge" || m[1] === "childAge") {        // wedding age - child's age today = years until wedding
      const y = FHE.weddingYearsFromAge(FH.v, c);
      if (y !== null && y >= 0) setField("weddingYears" + c, Math.round(y));
    } else if (!isBlankV(FH.v["childAge" + c]) && Number.isFinite(Number(FH.v["childAge" + c]))) {   // years typed on the Weddings tab -> wedding age
      setField("weddingAge" + c, Math.round(Number(FH.v["childAge" + c]) + Number(raw)));
    }
  }
  const isBlankV = x => x === "" || x === null || x === undefined || (typeof x === "string" && x.trim() === "");
  /* Writes the suggested amounts into the Money Buckets inputs (the same inputs the user can edit by hand). Calculation is untouched. */
  function applyDefaultAllocation() {
    const a = FHE.defaultAllocation(FH.v.corpus, kids());
    if (!a) return;
    for (const id of Object.keys(a)) {
      FH.v[id] = String(a[id]);
      const el = $(id); if (el) el.value = FH.v[id];
      const amtEl = $(id + "-amt"); if (amtEl) amtEl.textContent = amtText(FH.v[id]);
      setErr(id, "");
    }
    if (FH.mode === "done") FH.mode = "wizard";
    updateLive();
  }
  const FAM_UI = { age: { label: "Age" }, children: { label: "Children" }, childAge: { label: "Age", ph: "Optional" },
    stage: { label: "Stage" }, classToday: { label: "Class", ph: "1–12" }, weddingAge: { label: "Wedding age", ph: "Age" },
    retire: { label: "Target Retirement Age", ph: "Optional" }, until: { label: "Planning Age" },
    corpus: { label: "Current Corpus (₹)" }, roi: { label: "Expected Return (%)" },
    preEarn: { label: "Annual Earnings (₹)" }, preRoi: { label: "Expected Return on Earnings (%)" },
    monthly: { label: "Monthly Living (₹)" }, houseInflation: { label: "Annual Inflation (%)" }, reduceAge: { label: "Reduce After Age" }, reducePercent: { label: "Reduce By (%)" },
    incName: { label: "Source name", ph: "e.g. Rent" }, incAmt: { label: "Annual Income (₹)" }, incGrowth: { label: "Annual Growth (%)" },
    incFrom: { label: "From (year)", ph: "e.g. 2027" }, incTo: { label: "To (year)", ph: "e.g. 2040" },
    educationInflation: { label: "Education Inflation (%)" }, feeYears: { label: "Fee Years Left" }, annualFee: { label: "Annual Fee (₹)" },
    weddingInflation: { label: "Wedding Inflation (%)" }, weddingYears: { label: "Years Until Wedding" }, weddingCost: { label: "Wedding Budget (₹)" } };
  const BK_UI = { houseFund: { pct: true }, buffer: { pct: true }, bufferRoi: { mini: "Return (%)", pct: false },
    educationFund: { mini: "Education", pct: true }, weddingFund: { mini: "Wedding", pct: true } };
  function fieldHTML(f) {
    const id = "fh-" + f.id;
    const fam = f.panel === "family" || f.panel === "planning" || f.panel === "household" || f.panel === "college" || f.panel === "weddings" ? FAM_UI[f.id.replace(/[1-5]$/, "")] : null;      // short label + placeholder; hints live in the placeholder
    const shown = fam ? fam.label : f.label;
    const label = esc(shown) + (f.required ? ' <span aria-hidden="true">*</span>' : fam ? "" : " (optional)") +
      (f.assumption && f.panel !== "planning" ? ' <span class="fh-as">assumption</span>' : "");     // build 113: no "assumption" tag on the Planning period screen
    const hint = f.help && f.id !== "children";
    let ctl;
    if (f.id === "children") {
      ctl = `<select id="${id}" data-fh="${f.id}" aria-describedby="${id}-e">` +
        ["No children", "One child", "Two children"].map((t, i) =>
          `<option value="${i}"${String(FH.v[f.id]) === String(i) ? " selected" : ""}>${t}</option>`).join("") + "</select>";
    } else if (/^stage[12]$/.test(f.id)) {      // School, or the year (1-4) of a 4-year college course
      ctl = `<select id="${id}" data-fh="${f.id}" aria-label="${esc(f.label)}" aria-describedby="${id}-e">` +
        ["School", "College 1", "College 2", "College 3", "College 4"].map((t, i) =>
          `<option value="${i}"${String(FH.v[f.id]) === String(i) ? " selected" : ""}>${t}</option>`).join("") + "</select>";
    } else if (f.kind === "text") {
      ctl = `<input id="${id}" data-fh="${f.id}" type="text" maxlength="24" autocomplete="off" value="${esc(FH.v[f.id])}"` +
        `${f.required ? ' required aria-required="true"' : ""} ${fam && fam.ph ? `placeholder="${fam.ph}" ` : ""}aria-label="${esc(f.label)}" aria-describedby="${id}-e">`;
    } else {
      ctl = `<input id="${id}" data-fh="${f.id}" type="number" inputmode="${f.integer ? "numeric" : "decimal"}" ` +
        `min="${f.min}"${f.max !== null ? ` max="${f.max}"` : ""} step="${f.integer ? 1 : "any"}" ` +
        `value="${esc(FH.v[f.id])}"${f.required ? ' required aria-required="true"' : ""} ` +
        `${/0 if none|if there is none/i.test(f.help) ? 'placeholder="0 if none" ' : ""}` +
        `${fam && fam.ph ? `placeholder="${fam.ph}" ` : ""}${fam && (f.child || !f.required || f.panel === "household" || f.panel === "college" || f.panel === "weddings") ? `aria-label="${esc(f.label)}${f.required ? "" : " (optional)"}" ` : ""}` +
        `${hint ? `aria-description="${esc(f.help)}" ` : ""}aria-describedby="${id}-e">`;
    }
    if (/^classToday[12]$/.test(f.id) && Number(FH.v["stage" + f.id.slice(-1)]) > 0) ctl = ctl.replace("<input ", '<input disabled title="Not used while the child is in college" ');
    const amt = /₹/.test(f.label) ? `<small class="hh fh-amt" id="${id}-amt" aria-live="polite">${esc(amtText(FH.v[f.id]))}</small>` : "";   // "₹ 50,00,000 · ₹ 50.00 L" under every rupee box
    const bk = f.panel === "buckets" ? BK_UI[f.id.replace(/[12]$/, "")] : null;
    if (bk) {      // compact bucket field: amount input with its share of the corpus beside it
      const mini = bk.mini ? `<label for="${id}">${esc(bk.mini)} <span aria-hidden="true">*</span>${f.assumption ? ' <span class="fh-as">assumption</span>' : ""}</label>` : "";
      return `<div class="hf1 fh-bf"${f.child ? ` data-fh-cond="${f.child}"` : ""}>${mini}<div class="fh-bi">${ctl.replace("<input ", `<input aria-label="${esc(f.label)}" `)}${bk.pct ? `<span class="fh-pct" id="${id}-pct" aria-hidden="true">—</span>` : ""}</div>${amt}` +
        `<small class="er fh-err" id="${id}-e" role="alert"></small></div>`;
    }
    const def = f.id === "roi" ? `<div class="hf1 fh-defrow"><label class="fh-def" for="fh-defalloc"><input type="checkbox" id="fh-defalloc"${FH.defAlloc ? " checked" : ""} aria-describedby="fh-defalloc-h"><span>Auto-allocate Corpus</span></label>` +
      `<small id="fh-defalloc-h">${esc(allocHint())}</small></div>` : "";
    return `<div class="hf1"${f.child && f.panel !== "college" && f.panel !== "weddings" ? ` data-fh-cond="${f.child}"` : ""}>` +
      `${f.id === "corpus" ? hpHead(id, label) : `<label for="${id}">${label}</label>`}${ctl}${amt}${hint ? `<small class="hh">${esc(f.help)}</small>` : ""}` +
      `<small class="er fh-err" id="${id}-e" role="alert"></small>${f.id === "corpus" ? '<div id="fh-hold" class="fh-hold" hidden></div>' : ""}</div>${def}`;
  }
  /* Planning period strip (build 78): Today -> Retirement -> Plan ends, with the earning amounts. Used on Plan Input, Summary and Reports. */
  function ptHTML(v, slim) {
    const M0 = typeof cr === "function" ? cr : FHE.currency, M = x => String(M0(x)).replace("\u20b9 ", "\u20b9");
    const age = Number(v.age), until = Number(v.until);
    if (FHE.isBlank(v.age) || FHE.isBlank(v.until) || !Number.isFinite(age) || !Number.isFinite(until) || until <= age) return "";
    const es = FHE.earningSummary(v), total = until - age, R = es.years, yr = n => `${n} yr${n === 1 ? "" : "s"}`;
    const seg = (cls, flex, ttl, sub, a0) => `<div class="pt-seg ${cls}" style="flex:${flex} 1 0"><span class="pt-ar">Age ${a0}</span><i></i><b>${ttl}</b><small>${sub}</small></div>`;
    const bar = es.on
      ? seg("pt-e", R, "Earning phase", `${yr(R)} \u00b7 till ${es.retire}`, age) + seg("pt-r", Math.max(total - R, 0.0001), "Retirement", total - R > 0 ? `${yr(total - R)} \u00b7 till ${until}` : "ends at retirement", es.retire)
      : seg("pt-r", 1, "Plan period", `${yr(total)} \u00b7 till ${until}`, age);
    const st = (l, val, sub) => `<div><small>${l}</small><b>${esc(val)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</div>`;
    const cells = slim ? [] : [st("Corpus today", M(Number(v.corpus) || 0), "available now")];
    if (es.on && !slim) cells.push(st("Earnings a year", M(es.earn), `${yr(R)} = ${M(es.total)}`));
    if (es.on && !slim) cells.push(st("Return on savings", `${es.roi}%`, "on what earnings leave over"));
    if (!slim) cells.push(st("Portfolio return", `${Number(v.roi)}%`, "on the corpus"));
    return `<section class="pt" aria-label="Planning period"><div class="pt-h"><span>Planning period</span><span>${yr(total)} \u00b7 Age ${age}\u2013${until}</span></div><div class="pt-bar">${bar}<span class="pt-ar pt-end">Age ${until}</span></div>${cells.length ? `<div class="pt-g">${cells.join("")}</div>` : ""}</section>`;
  }
  /* Pre-Retirement Earning Phase card: a switch plus two inputs, styled like the other Retirement Timeline cards. */
  function earningTitle(v) {
    const a = Number(v.age), r = Number(v.retire);
    return "\ud83d\udcbc Pre-Retirement Phase" +
      (!FHE.isBlank(v.age) && !FHE.isBlank(v.retire) && Number.isFinite(a) && Number.isFinite(r) ? ` (Age ${a} to ${r})` : "");
  }
  const earningCard = () => {
    const on = String(FH.v.preOn) === "1";
    return `<div class="hs fh-earn" id="fh-earn"><div class="hf1 fh-defrow"><label class="fh-def" for="fh-preon"><input type="checkbox" id="fh-preon"${on ? " checked" : ""} aria-describedby="fh-preon-h"><span id="fh-earn-title">${esc(earningTitle(FH.v))}</span></label>` +
      `<small id="fh-preon-h">Annual earnings cover living expenses first, with any surplus saved to grow and merge into your retirement corpus</small></div>` +
      `<div class="hg" id="fh-earn-fields"${on ? "" : " hidden"}>${fieldHTML(FHE.BY_ID.preEarn)}${fieldHTML(FHE.BY_ID.preRoi)}</div></div>`;
  };
  /* Income tab: a grid of the sources (Edit / Delete on each row, + Add income source below) and one editor that opens for the source being added or edited. */
  const incomeCard = () => {
    const on = String(FH.v.incomeOn) === "1";
    return `<div class="hs fh-inc" id="fh-inc"><div class="hf1 fh-defrow"><label class="fh-def" for="fh-incon"><input type="checkbox" id="fh-incon"${on ? " checked" : ""} aria-describedby="fh-incon-h"><span>Another income source</span></label>` +
      `<small id="fh-incon-h">Rent, pension, a part-time job or any other regular income.</small></div>` +
      `<div id="fh-inc-undo" class="fh-incundo" role="status" hidden></div>` +
      `<div id="fh-inc-body"${on ? "" : " hidden"}><div class="fh-inctw"><table class="fh-inctbl" id="fh-inctbl"><caption class="fh-sr">Income sources</caption><colgroup><col style="width:19%"><col style="width:19%"><col style="width:11%"><col style="width:12%"><col style="width:11%"><col style="width:28%"></colgroup>` +
      `<thead><tr><th scope="col">Source</th><th scope="col">Annual income (\u20b9)</th><th scope="col">Growth (%)</th><th scope="col">From (year)</th><th scope="col">To (year)</th><th scope="col"><span class="fh-sr">Actions</span></th></tr></thead>` +
      `<tbody id="fh-inctbody"></tbody><tfoot><tr><th scope="row" colspan="1" title="Annual income of all sources, in today\u2019s money">Total a year</th><td id="fh-inctot" colspan="5"></td></tr></tfoot></table></div>` +
      `<button type="button" id="fh-incadd" class="fh-addstream">+ Add income source</button><div id="fh-inc-editors"></div></div></div>`;
  };
  const grid = pred => `<div class="hg">${FHE.FIELDS.filter(pred).map(fieldHTML).join("")}</div>`;
  const section = (title, ic, inner) => `<section class="hs" data-ic="${ic}"><h3>${title}</h3>${inner}</section>`;
  // The expand/collapse component first used on the Family tab; reused wherever an explanation is needed.
  const disclosure = (title, body) => `<details class="fh-diff"><summary>${title}</summary><p>${body}</p></details>`;
  const pills = (id, label, buttons) => `<div class="wzt fh-sub" id="${id}" role="tablist" aria-label="${label}">${buttons}</div>`;
  const childPills = sec => pills("fh-cpills-" + sec, sec === "college" ? "College by child" : "Weddings by child",
    [1, 2].map(c => `<button type="button" role="tab" id="fh-st-${sec}-${c}" data-fh-sec="${sec}" data-fh-ct="${c}" aria-controls="fh-cp-${sec}-${c}">Child ${c}</button>`).join(""));
  const stat = (label, valueHTML, cls) => `<div class="fh-stat${cls ? " " + cls : ""}"><span>${label}</span>${valueHTML}</div>`;
  const preview = (sec, c) => `<div class="fh-stats">` + (sec === "college"
    ? stat("Projected total fees", `<b id="fh-cf${c}">—</b>`) + stat("Funding needed today", `<b id="fh-cp${c}">—</b>`) +
      stat("Education completes", `<b id="fh-ey${c}">—</b>`) + stat("Child's age then", `<b id="fh-ea${c}">—</b>`)
    : stat("Wedding calendar year", `<b id="fh-wy${c}">—</b>`) + stat("Child's age then", `<b id="fh-wa${c}">—</b>`) + stat("Budget at wedding date", `<b id="fh-wf${c}">—</b>`) +
      stat("Funding needed today", `<b id="fh-wp${c}">—</b>`)) + "</div>";
  const childPanel = (sec, c) => `<div id="fh-cp-${sec}-${c}" role="tabpanel" aria-labelledby="fh-st-${sec}-${c}" data-fh-sec="${sec}" data-fh-cp="${c}">` +
    section(`Child ${c} · ${sec === "college" ? "college" : "wedding"}`, sec === "college" ? "edu" : "wed",
      grid(f => f.panel === sec && f.child === c) + preview(sec, c)) + "</div>";
  // College / Weddings, one child at a time: the child's fields join the shared 2-column grid, then the preview tiles.
  const cwPanel = (sec, c) => `<div class="fh-cpw" id="fh-cp-${sec}-${c}" role="tabpanel" aria-labelledby="fh-st-${sec}-${c}" data-fh-sec="${sec}" data-fh-cp="${c}">` +
    FHE.FIELDS.filter(f => f.panel === sec && f.child === c).map(f => fieldHTML(f)).join("") + preview(sec, c) + "</div>";
  const panel = (name, inner) => `<div class="fh-panel" id="fh-p-${name}" role="tabpanel" aria-labelledby="fh-t-${name}" data-fh-panel="${name}" tabindex="-1" hidden>${inner}</div>`;

  const keyStats = p => `<div class="fh-stats fh-sum">` + stat("Money needed today", `<b id="fh-${p}needed">—</b>`) +
    stat("Money available today", `<b id="fh-${p}available">—</b>`) + stat("Surplus / (shortfall)", `<b id="fh-${p}diff">—</b>`) +
    stat("When does the money run out?", `<b id="fh-${p}runout">—</b>`) + "</div>";

  const HOW = "Run-out is estimated at the end of the first plan year in which the spendable balance becomes negative; an expense due today is checked first. The spendable corpus earns the assumed portfolio return, then receives regular income and reserve interest and pays that year's household, education and wedding bills. The emergency reserve is not spendable during the plan; its principal is unavailable for spending and returns only at the end of the final plan year. This is a year-end approximation, not a precise day or month. Retirement age is informational. The pre-retirement earning phase inputs are saved with the plan but are not yet part of the projection. Taxes, SIPs, lump sums and market volatility are not modeled. All returns and inflation rates are assumptions and are not guaranteed.";

  // The detailed results. `p` is an id prefix so the wizard's Result tab ("") and the Financial Freedom Summary ("sm-") can coexist.
  const detailHTML = p => `<div id="fh-${p}detail">` +
    section("Your plan", "res", `<p class="fh-lede">An estimate based on the assumptions you entered. All returns and inflation rates are assumptions and are not guaranteed.</p><p class="er" id="fh-${p}status" role="status" aria-live="polite"></p>` + keyStats(p)) +
    section("Growth engine", "grw", `<div class="fh-stats"><div class="fh-stat fh-grow"><span>Corpus minus household, emergency reserve and the included children's allocations</span><b id="fh-${p}growth">—</b></div></div>`) +
    section("Wedding years", "wed", `<p class="fh-lede" id="fh-${p}wed-none" hidden>No children included, so no weddings are planned.</p><div class="fh-stats" id="fh-${p}wed-stats">` +
      [1, 2].map(c => `<div class="fh-stat" data-fh-cond="${c}"><span>Child ${c} · wedding year</span><b id="fh-${p}wy${c}">—</b></div><div class="fh-stat" data-fh-cond="${c}"><span>Child ${c} · age at wedding</span><b id="fh-${p}wa${c}">—</b></div><div class="fh-stat" data-fh-cond="${c}"><span>Child ${c} · budget at wedding date</span><b id="fh-${p}wf${c}">—</b></div>`).join("") + "</div>") +
    section("Education completion", "edu", `<p class="fh-lede" id="fh-${p}edu-none" hidden>No children included, so no college fees are planned.</p><div class="fh-stats" id="fh-${p}edu-stats">` +
      [1, 2].map(c => `<div class="fh-stat" data-fh-cond="${c}"><span>Child ${c} · education completes</span><b id="fh-${p}ey${c}">—</b></div><div class="fh-stat" data-fh-cond="${c}"><span>Child ${c} · age then</span><b id="fh-${p}ea${c}">—</b></div>`).join("") + "</div>") +
    section("Other regular income", "wal", `<p class="fh-lede" id="fh-${p}income-none" hidden>No other regular income entered.</p>` +
      `<div class="fh-stats" id="fh-${p}income-stats">` + stat("Annual income today", `<b id="fh-${p}inc-amount">—</b>`) +
      stat("Runs", `<b id="fh-${p}inc-years">—</b>`) + stat('Annual growth <span class="fh-as">assumption</span>', `<b id="fh-${p}inc-growth">—</b>`) + "</div>" +
      `<p class="fh-lede" id="fh-${p}inc-note"></p>`) +
    section("Purpose-by-purpose funding", "res", `<table class="fh-tbl" id="fh-${p}table" aria-label="Funding breakdown"><thead><tr><th scope="col">Purpose</th><th scope="col">Set aside</th><th scope="col">Needed today</th><th scope="col">Surplus / (gap)</th></tr></thead><tbody id="fh-${p}rows"></tbody></table>` +
      `<p class="fh-lede" id="fh-${p}explain"></p>`) +
    disclosure("How this estimate works", HOW) + "</div>";

  function markup() {
    return `<form id="fh" novalidate><h2><span id="fh-title">Vriddhi</span><span class="fh-pill" id="fh-pill" hidden></span><span class="fh-hact"><button type="button" id="fh-sx-dl" hidden>Download Report</button><button type="button" id="fh-sx-add" hidden>Add to Planner</button><button type="button" id="fh-hedit">\u270f\ufe0f Edit Plan</button><button type="button" id="fh-hx" aria-label="Close">\u2715</button></span></h2>

<div id="fh-s-status" role="tabpanel" aria-label="Plan inputs">
<div id="fh-wizard">
<div class="fh-top"><span id="fh-count">Step 1 of 6</span><span>* required</span></div>
<div class="wzt fh-wzt" id="fh-nav" role="tablist" aria-label="Planning steps"></div>
<p class="fh-note" id="fh-note"><b>Returns and inflation rates are assumptions</b> you can edit, not predictions or guarantees. This pop-up uses its own simple model. It reads your Goal Planner holdings only when you tick them under Current Corpus, and never changes them.</p>
${panel("family", `<div class="fh-fam"><div class="hs">` + grid(f => f.panel === "family" && f.child === null).replace('class="hg"', 'class="hg fh-g2"') +
  [1, 2].map(c => `<div class="fh-crow" data-fh-cond="${c}"><span class="fh-cn">Child ${c}</span>${FHE.FIELDS.filter(f => f.panel === "family" && f.child === c).map(fieldHTML).join("")}</div>`).join("") + `<p class="hh fh-stg-note" data-fh-cond-any>Stage: pick School and enter the Class (1–12), or College 1–4 for the year of a 4-year course. College years fill &ldquo;years of college fees left&rdquo; on the College step.</p></div></div>`)}
${panel("planning", `<div class="fh-plan"><div class="fh-ph"><h3>Retirement Timeline</h3><span class="fh-badge" id="fh-horizon"></span></div><div id="fh-pt" class="fh-ptw"></div>` +
  pills("fh-ppills", "Retirement planning",
    `<button type="button" role="tab" id="fh-st-plan-ready" data-fh-plan="ready" aria-controls="fh-pp-ready">Retirement Readiness</button>` +
    `<button type="button" role="tab" id="fh-st-plan-earning" data-fh-plan="earning" aria-controls="fh-pp-earning">Pre-Retirement Phase</button>` +
    `<button type="button" role="tab" id="fh-st-plan-income" data-fh-plan="income" aria-controls="fh-pp-income">Income</button>`) +
  `<div class="hs" id="fh-pp-ready" role="tabpanel" aria-labelledby="fh-st-plan-ready">${grid(f => f.panel === "planning" && f.sub === "ready")}</div>` +
  `<div id="fh-pp-earning" role="tabpanel" aria-labelledby="fh-st-plan-earning" hidden>${earningCard()}</div>` +
  `<div id="fh-pp-income" role="tabpanel" aria-labelledby="fh-st-plan-income" hidden>${incomeCard()}</div></div>`)}
${panel("buckets", `<div class="fh-plan"><div class="fh-ph"><h3>Money Buckets</h3><span class="fh-badge" id="fh-alloc">—</span></div><div class="fh-bgrid">` +
  `<div class="fh-bk"><h4>Household / Living <span aria-hidden="true">*</span></h4>${fieldHTML(FHE.BY_ID.houseFund)}</div>` +
  `<div class="fh-bk"><h4>Emergency Fund <span aria-hidden="true">*</span></h4>${fieldHTML(FHE.BY_ID.buffer)}${fieldHTML(FHE.BY_ID.bufferRoi)}</div>` +
  [1, 2].map(c => `<div class="fh-bk" data-fh-cond="${c}"><h4>Kids (Edu &amp; Wedding)<span class="fh-chip">Child ${c}</span></h4>${fieldHTML(FHE.BY_ID["educationFund" + c])}${fieldHTML(FHE.BY_ID["weddingFund" + c])}</div>`).join("") +
  `<div class="fh-bk fh-bk-g"><h4>Growth Engine (Balance)</h4><div class="fh-bi"><b id="fh-growth">—</b><span class="fh-pct" id="fh-growth-pct">—</span></div></div></div></div>`)}
${panel("household", `<div class="fh-plan fh-hh"><div class="fh-hrow"><h3>Household expenses</h3>` +
  `<span class="fh-badge" id="fh-net" title="Monthly household spending minus other income running today">—</span></div>` +
  `<div class="hs" id="fh-hp-expenses">${grid(f => f.panel === "household" && f.sub === "expenses")}</div></div>`)}
${panel("college", `<div class="fh-plan fh-cw"><div class="fh-hrow">${childPills("college")}<span class="fh-badge" id="fh-cbadge">—</span></div><div class="hs"><div class="hg">` +
  grid(f => f.panel === "college" && f.child === null).replace('<div class="hg">', "").replace(/<\/div>$/, "") + cwPanel("college", 1) + cwPanel("college", 2) + `</div></div></div>`)}
${panel("weddings", `<div class="fh-plan fh-cw"><div class="fh-hrow">${childPills("weddings")}<span class="fh-badge" id="fh-wbadge">—</span></div><div class="hs"><div class="hg">` +
  grid(f => f.panel === "weddings" && f.child === null).replace('<div class="hg">', "").replace(/<\/div>$/, "") + cwPanel("weddings", 1) + cwPanel("weddings", 2) + `</div></div></div>`)}
</div>

</div>

<div id="fh-s-summary" role="tabpanel" aria-label="Summary" tabindex="-1" hidden>
<p class="fh-note" id="fh-sm-banner" hidden></p>
<div id="fh-sx"></div>
<div id="fh-sm-legacy" hidden>${detailHTML("sm-")}</div>
</div>

<div id="fh-s-milestones" role="tabpanel" aria-label="Milestones" tabindex="-1" hidden><div id="fh-ms"></div></div>

<div class="fh-bn" id="fh-bn" role="navigation" aria-label="Retirement Planner" hidden>
<button type="button" data-fh-top="summary"><span aria-hidden="true">\ud83d\udcca</span><span>Summary</span></button>
<button type="button" data-fh-edit="1"><span aria-hidden="true">\ud83d\udcdd</span><span>Plan Inputs</span></button>
<button type="button" data-fh-top="milestones"><span aria-hidden="true">\ud83c\udfaf</span><span>Milestones</span></button></div>

<div class="tb"><button type="button" id="fh-close">Close</button><button type="button" id="fh-back">Back</button><button type="button" id="fh-edit" hidden>Edit inputs</button><button type="button" class="p" id="fh-next">Continue</button><button type="button" class="p" id="fh-finish" hidden>Finish</button><button type="button" class="p" id="fh-report" hidden>Done</button><button type="button" class="p" id="fh-dl" hidden>Download Report</button></div>
</form>`;
  }

  /* ---------- rendering ---------- */
  function setErr(field, msg) {
    const el = $(field + "-e"), inp = $(field);
    if (el) el.textContent = msg || "";
    if (inp) { if (msg) inp.setAttribute("aria-invalid", "true"); else inp.removeAttribute("aria-invalid"); }
  }
  const clearErrs = () => $$(".fh-err").forEach(e => { e.textContent = ""; });
  const clearInvalid = () => $$("[aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
  const gap = x => x < 0 ? `(${FHE.currency(-x)})` : FHE.currency(x);

  function buildNav() {
    const list = steps(), sig = list.join();
    if (sig === FH.sig && $("nav").children.length) return;
    FH.sig = sig;
    $("nav").replaceChildren(...list.map((name, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.id = "fh-t-" + name; b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", "fh-p-" + name); b.dataset.fhStep = name;
      b.textContent = `${i + 1}. ${FHE.STEP_LABELS[name]}`;
      return b;
    }));
  }

  function updateVisibility() {
    const n = kids();
    $$("[data-fh-cond]").forEach(el => { el.hidden = Number(el.dataset.fhCond) > n; });
    for (const sec of ["college", "weddings"]) {
      if (FH.sel[sec] > n) FH.sel[sec] = 1;
      $$(`.wzt button[data-fh-sec="${sec}"]`).forEach(b => {
        const c = Number(b.dataset.fhCt), on = c === FH.sel[sec];
        b.hidden = c > n; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
      });
      $$(`[data-fh-sec="${sec}"][data-fh-cp]`).forEach(p => {
        const c = Number(p.dataset.fhCp); p.hidden = c > n || c !== FH.sel[sec];
      });
    }
    $$("[data-fh-house]").forEach(b => {
      const on = b.dataset.fhHouse === FH.house;
      b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
    });
    $$("[data-fh-plan]").forEach(b => { const on = b.dataset.fhPlan === FH.plan; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    for (const k of ["ready", "earning", "income"]) { const el = $("pp-" + k); if (el) el.hidden = FH.plan !== k; }
    updateIncomeUI();
  }

  const INC_PARTS = ["incName", "incAmt", "incGrowth", "incFrom", "incTo"];
  const incCount = () => {
    const count = Number(FH.v.incomeCount);
    return Number.isSafeInteger(count) && count > 0 ? count : 1;
  };
  const incOk = k => INC_PARTS.every(pr => !FHE.checkField(FHE.incomeField(pr, k), FH.v[pr + k])) && Number(FH.v["incTo" + k]) >= Number(FH.v["incFrom" + k]);
  function renderIncomeTable() {
    const tb = $("inctbody"); if (!tb) return;
    const M0 = typeof cr === "function" ? cr : FHE.currency, M = x => String(M0(x)).replace("\u20b9 ", "\u20b9");
    let total = 0, rows = "";
    for (let k = 1; k <= incCount(); k++) {
      const ok = incOk(k), amt = Number(FH.v["incAmt" + k]), nm = String(FH.v["incName" + k] || "").trim() || "Income source " + k;
      if (ok) total += amt;
      const cell = (label, v) => `<td data-label="${label}">${v === "" || v == null ? "\u2014" : esc(String(v))}</td>`;
      rows += `<tr class="${k === FH.incEdit ? "is-edit" : ""}${ok ? "" : " is-bad"}"><th scope="row" data-label="Source">${esc(nm)}${ok ? "" : ' <span class="fh-chk">Check</span>'}</th>` +
        cell("Annual income", Number.isFinite(amt) && !FHE.isBlank(FH.v["incAmt" + k]) ? M(amt) : "") + cell("Growth", FHE.isBlank(FH.v["incGrowth" + k]) ? "" : FH.v["incGrowth" + k] + "%") +
        cell("From", FH.v["incFrom" + k]) + cell("To", FH.v["incTo" + k]) +
        `<td class="fh-act"><button type="button" data-fh-incedit="${k}" aria-label="Edit ${esc(nm)}">Edit</button><button type="button" class="d" data-fh-incdel="${k}" aria-label="Delete ${esc(nm)}">Delete</button></td></tr>`;
    }
    tb.innerHTML = rows;
    const t = $("inctot"); if (t) t.textContent = M(total);
  }
  function updateIncomeUI() {
    const on = String(FH.v.incomeOn) === "1", cnt = incCount();
    const body = $("inc-body"), cb = $("incon"), add = $("incadd"), un = $("inc-undo");
    if (!on || FH.incEdit > cnt) { FH.incEdit = 0; FH.incNew = 0; }
    if (body) body.hidden = !on;
    if (cb) cb.checked = on;
    const editorHost = $("inc-editors");
    if (editorHost && editorHost.dataset.count !== String(cnt)) {
      editorHost.innerHTML = Array.from({ length: cnt }, (_, index) => {
        const k = index + 1;
        return `<div class="fh-stream" data-fh-stream="${k}" hidden><div class="fh-sh"><b data-fh-edtitle="${k}">Edit income source</b>` +
          `<span class="fh-edbtns"><button type="button" class="fh-sdone" data-fh-incdone="${k}">Done</button><button type="button" class="fh-scancel" data-fh-inccancel="${k}" hidden>Cancel</button></span></div>` +
          `<div class="hg">${["incName", "incAmt", "incFrom", "incTo", "incGrowth"].map(part => fieldHTML(FHE.incomeField(part, k))).join("")}</div></div>`;
      }).join("");
      editorHost.dataset.count = String(cnt);
    }
    $$("[data-fh-stream]").forEach(el => { el.hidden = Number(el.dataset.fhStream) !== FH.incEdit; });
    $$("[data-fh-inccancel]").forEach(el => { el.hidden = Number(el.dataset.fhInccancel) !== FH.incNew; });
    $$("[data-fh-edtitle]").forEach(el => { el.textContent = (Number(el.dataset.fhEdtitle) === FH.incNew ? "New income source" : "Edit income source") + " " + el.dataset.fhEdtitle; });
    if (add) add.hidden = !on;
    if (un) {
      un.hidden = !FH.incUndo;
      if (FH.incUndo) un.innerHTML = `Deleted \u201c${esc(FH.incUndo.name)}\u201d. <button type="button" id="fh-incundo">Undo</button>`;
    }
    renderIncomeTable();
  }
  const getStream = k => INC_PARTS.map(pr => FH.v[pr + k]);
  const putStream = (k, vals) => INC_PARTS.forEach((pr, i) => setField(pr + k, vals[i]));
  function newStream(k) {                                              // a new source starts with the first plan year and runs to the last one
    const w = FHE.incomeWindow(FH.v);
    putStream(k, ["", "0", "2", w.from, w.to]);
  }
  const dirty = () => { if (FH.mode === "done") FH.mode = "wizard"; };
  function editStream(k) {
    FH.incEdit = k; FH.incNew = 0; FH.incUndo = null;
    updateIncomeUI();
    const el = $("incName" + k); if (el) { if (el.scrollIntoView) el.scrollIntoView({ block: "nearest" }); el.focus(); }
  }
  function addStream() {
    const cnt = incCount();
    FH.v.incomeCount = String(cnt + 1); newStream(cnt + 1);
    FH.incEdit = cnt + 1; FH.incNew = cnt + 1; FH.incUndo = null;
    dirty(); updateIncomeUI(); updateLive();
    const el = $("incName" + (cnt + 1)); if (el) el.focus();
  }
  function finishStream(k) {                                           // Done: check this source, then close the editor
    let first = null;
    for (const pr of INC_PARTS) { const id = pr + k, m = FHE.checkField(FHE.incomeField(pr, k), FH.v[id]); setErr(id, m || ""); if (m && !first) first = id; }
    if (!first && Number(FH.v["incTo" + k]) < Number(FH.v["incFrom" + k])) { first = "incTo" + k; setErr(first, "To year must be the same as or later than the From year."); }
    if (first) { const el = $(first); if (el) el.focus(); return; }
    FH.incEdit = 0; FH.incNew = 0; dirty(); updateIncomeUI(); updateLive();
  }
  function dropStream(k) {                                             // remove source k; the ones below move up; the last one switches the section off
    const cnt = incCount();
    for (const pr of INC_PARTS) setErr(pr + k, "");
    if (cnt === 1) { newStream(1); FH.v.incomeOn = "0"; return; }
    for (let j = k; j < cnt; j++) putStream(j, getStream(j + 1));
    newStream(cnt); FH.v.incomeCount = String(cnt - 1);
    for (const pr of INC_PARTS) setErr(pr + cnt, "");
  }
  function cancelStream(k) { dropStream(k); FH.incEdit = 0; FH.incNew = 0; dirty(); updateIncomeUI(); updateLive(); }
  function deleteStream(k) {
    FH.incUndo = { k, vals: getStream(k), only: incCount() === 1, name: String(FH.v["incName" + k] || "").trim() || "Income source " + k };
    dropStream(k); FH.incEdit = 0; FH.incNew = 0; dirty(); updateIncomeUI(); updateLive();
  }
  function undoDelete() {
    const u = FH.incUndo; if (!u) return;
    FH.incUndo = null;
    if (u.only) { FH.v.incomeOn = "1"; FH.v.incomeCount = "1"; putStream(1, u.vals); }
    else { const cnt = incCount(); for (let j = cnt; j >= u.k; j--) putStream(j + 1, getStream(j)); putStream(u.k, u.vals); FH.v.incomeCount = String(cnt + 1); }
    dirty(); updateIncomeUI(); updateLive();
  }

  function updateLive() {
    if ($("inctbody")) renderIncomeTable();
    const ht = FHE.horizonText(FH.v), hm = /^(\d+) years?, age (\d+) to (\d+)$/.exec(ht);
    { const on = String(FH.v.preOn) === "1", t = $("earn-title"), fl = $("earn-fields"), cb = $("preon");
      if (t) t.textContent = earningTitle(FH.v);
      if (fl) fl.hidden = !on;
      if (cb) cb.checked = on; }
    { const pt = $("pt"); if (pt) pt.innerHTML = ptHTML(FH.v); }
    $("horizon").textContent = hm ? `${hm[1]} ${hm[1] === "1" ? "yr" : "yrs"} (Age ${hm[2]}–${hm[3]})` : ht;
    $("growth").textContent = FHE.currency(FHE.growthEngine(FH.v));
    {
      const n = kids(), M5 = typeof cr === "function" ? cr : FHE.currency;
      const total = fn => { let t = 0; for (let c = 1; c <= n; c++) t += fn(FH.v, c).present; return t; };
      const label = t => Number.isFinite(t) ? `Needs ${M5(t)} today` : "—";
      $("cbadge").textContent = label(total(FHE.collegeCost)); $("wbadge").textContent = label(total(FHE.weddingCost));
    }
    {
      const m = Number(FH.v.monthly), inc = (FHE.incomeSummary(FH.v).nowAnnual || 0) + (FHE.policyNow ? FHE.policyNow() : 0), M3 = typeof cr === "function" ? cr : FHE.currency, nb = $("net");
      if (FH.v.monthly === "" || !Number.isFinite(m)) nb.textContent = "—";
      else { const net = m - inc / 12; nb.textContent = net >= 0 ? `Net spend ${M3(net)}/mo` : `Net surplus ${M3(-net)}/mo`; }
    }
    {
      const cn = Number(FH.v.corpus), cp = FH.v.corpus !== "" && Number.isFinite(cn) && cn > 0 ? cn : null, n = kids();
      const ids = ["houseFund", "buffer"].concat(n >= 1 ? ["educationFund1", "weddingFund1"] : []).concat(n >= 2 ? ["educationFund2", "weddingFund2"] : []);
      const share = x => cp === null || x === "" || !Number.isFinite(Number(x)) ? "—" : (Math.round(Number(x) / cp * 1000) / 10) + "%";
      ["houseFund", "buffer", "educationFund1", "weddingFund1", "educationFund2", "weddingFund2"].forEach(i => { const el = $(i + "-pct"); if (el) el.textContent = share(FH.v[i]); });
      const g = FHE.growthEngine(FH.v); $("growth-pct").textContent = Number.isFinite(g) ? share(g) : "—";
      const used = ids.reduce((t, i) => t + (Number(FH.v[i]) || 0), 0), M2 = typeof cr === "function" ? cr : FHE.currency, ab = $("alloc");
      ab.textContent = cp === null ? "— Allocated" : `${Math.round(Math.max(100, used / cp * 100) * 10) / 10}% Allocated • ${M2(cp)}`;
      ab.classList.toggle("fh-over", cp !== null && used > cp);
    }
    const dh = $("defalloc-h"); if (dh) dh.textContent = allocHint();
    const year = new Date().getFullYear();
    for (let c = 1; c <= 2; c++) {
      const col = FHE.collegeCost(FH.v, c), wed = FHE.weddingCost(FH.v, c), wy = FHE.weddingYear(FH.v, c, year);
      $("cf" + c).textContent = FHE.currency(col.future);
      $("cp" + c).textContent = FHE.currency(col.present);
      $("wy" + c).textContent = wy === null ? "—" : String(wy);
      if ($("wa" + c)) $("wa" + c).textContent = wedAge(FH.v, c);
      const ew = eduWhen(FH.v, c, year); $("ey" + c).textContent = ew.year; $("ea" + c).textContent = ew.age;
      $("wf" + c).textContent = FHE.currency(wed.future);
      $("wp" + c).textContent = FHE.currency(wed.present);
    }
  }

  function fillKeyStats(p, r) {
    const set = (id, t) => { $(p + id).textContent = t; };
    if (!r.ok) { for (const id of ["needed", "available", "diff", "runout"]) set(id, "—"); return; }
    set("needed", FHE.currency(r.needed));
    set("available", FHE.currency(r.available));
    set("diff", gap(r.surplus));
    set("runout", r.runoutText);
  }

  function fillIncome(p) {
    const inc = FHE.incomeSummary(FH.v);
    $(p + "income-none").hidden = inc.has;
    $(p + "income-stats").hidden = !inc.has;
    if (inc.has) {
      $(p + "inc-amount").textContent = inc.amountText;
      $(p + "inc-years").textContent = inc.yearsText;
      $(p + "inc-growth").textContent = inc.growthText;
    }
    $(p + "inc-note").textContent = inc.note;
    $(p + "inc-note").hidden = !inc.note;
  }

  function fillDetail(p) {
    const r = result();
    $(p + "status").textContent = r.ok ? "" : r.status;
    fillKeyStats(p, r);
    fillIncome(p);
    $(p + "growth").textContent = FHE.currency(FHE.growthEngine(FH.v));
    const n = kids(), year = new Date().getFullYear();
    $(p + "wed-none").hidden = n > 0; $(p + "wed-stats").hidden = n === 0;
    $(p + "edu-none").hidden = n > 0; $(p + "edu-stats").hidden = n === 0;
    for (let c = 1; c <= 2; c++) {
      const wy = FHE.weddingYear(FH.v, c, year);
      $(p + "wy" + c).textContent = wy === null ? "—" : String(wy);
      if ($(p + "wa" + c)) $(p + "wa" + c).textContent = wedAge(FH.v, c);
      const ew = eduWhen(FH.v, c, year); $(p + "ey" + c).textContent = ew.year; $(p + "ea" + c).textContent = ew.age;
      $(p + "wf" + c).textContent = FHE.currency(FHE.weddingCost(FH.v, c).future);
    }
    if (!r.ok) { $(p + "rows").replaceChildren(); $(p + "explain").textContent = "Complete your inputs to see an estimate."; return; }
    $(p + "rows").replaceChildren(...r.rows.map(row => {
      const tr = document.createElement("tr");
      tr.setAttribute("role", "row");
      if (row.name === "TOTAL") tr.className = "fh-total";
      [["Purpose", row.name], ["Set aside", FHE.currency(row.setAside)],
       ["Needed today", FHE.currency(row.needed)], ["Surplus / (gap)", gap(row.setAside - row.needed)]]
        .forEach(([label, text], i) => {
          const td = document.createElement("td");
          td.dataset.label = label; td.textContent = text;
          if (i === 0) td.className = "fh-pn";
          tr.append(td);
        });
      return tr;
    }));
    $(p + "explain").textContent = r.explanation;
  }

  function renderSummarySection() {
    fillDetail("sm-");
    renderSummaryX();
    const b = $("sm-banner"), saved = FH.mode === "done";
    b.hidden = saved;
    b.textContent = saved ? "" : "These figures use your current entries. Finish the Plan steps to save them.";
  }

  /* ---------- Summary (v1.9.0 build 48): scorecard, 4 milestones, 3 deep-dive tabs, assumptions, action bar ----------
     Presentation only: every figure comes from FHE.calculate / schedule / collegeCost / weddingCost, nothing is recalculated here. */
  const SX_CSS = `
html body .sx .oi{border:1px solid var(--bd);border-radius:12px;padding:12px 14px;background:var(--card);color:var(--tx);font-size:14px}
html body .sx .oi-h{display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--mu);margin-bottom:6px}
html body .sx .oi ul{list-style:none;margin:0;padding:0}
html body .sx .oi li{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:5px 0;border-top:1px solid var(--bd)}
html body .sx .oi li span{font-weight:600;min-width:0}html body .sx .oi li small{font-size:12px;color:var(--mu);text-align:right}
html body .sx .oi-n{margin:8px 0 0;font-size:12px;line-height:1.4;color:var(--mu)}html body .sx .oi-n b{color:var(--tx)}
html body .sx{display:flex;flex-direction:column;gap:12px;color:var(--tx);--sxg:#10b981;--sxr:#f43f5e;--sxa:#f59e0b}
html body .sx small{font-size:11px;line-height:1.3;color:var(--mu)}
html body .sx .sx-hero{border-radius:12px;padding:14px 16px;color:var(--on,#fff);background:linear-gradient(135deg,color-mix(in srgb,var(--rpc) 94%,#000),color-mix(in srgb,var(--rpc) 62%,#000))}
html body .sx .sx-ht{display:flex;align-items:center;gap:8px;margin-bottom:10px;min-height:36px}
html body .sx .sx-vd{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;border-radius:99px;color:#fff}
html body .sx .sx-ok .sx-vd{background:var(--sxg)}html body .sx .sx-mid .sx-vd{background:var(--sxa)}html body .sx .sx-bad .sx-vd{background:var(--sxr)}
html body .sx .sx-cov{font-size:12px;opacity:.88}
html body .sx .sx-big{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px}
html body .sx .sx-big>div{min-width:0}
html body .sx .sx-big small{display:block;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:inherit;opacity:.78;margin-bottom:2px}
html body .sx .sx-big b{display:block;font-size:20px;line-height:1.15;font-weight:800;overflow-wrap:anywhere}
html body .sx .sx-ok .sx-sur b{color:#6ee7b7}html body .sx .sx-mid .sx-sur b,html body .sx .sx-bad .sx-sur b{color:#fda4af}
html body .sx .sx-bar{height:6px;border-radius:99px;background:#ffffff38;margin-top:12px;overflow:hidden}
html body .sx .sx-bar i{display:block;height:100%;border-radius:99px;background:#fff}
html body .sx .sx-pills{display:grid;grid-template-columns:repeat(var(--np,3),1fr);gap:8px}
html body .sx .sx-pill{border:1px solid var(--bd);border-radius:12px;padding:8px 10px;background:var(--card);min-width:0}
html body .sx .sx-pill small{display:block;text-transform:uppercase;letter-spacing:.06em;font-size:11px}
html body .sx .sx-pill b{display:block;font-size:16px;font-weight:800;margin:1px 0;overflow-wrap:anywhere}
html body .sx .sx-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;border-radius:12px;background:color-mix(in srgb,var(--mu) 13%,var(--card))}
html body dialog.hf.fh .sx .sx-seg button,html body .rptv .sx .sx-seg button{min-height:42px;min-width:0;padding:6px 4px;border:0 !important;border-radius:8px;background:transparent !important;color:var(--mu) !important;font-size:12px;font-weight:700;line-height:1.2;box-shadow:none !important;transform:none;cursor:pointer}
html body dialog.hf.fh .sx .sx-seg button[aria-selected="true"],html body .rptv .sx .sx-seg button[aria-selected="true"]{background:var(--card) !important;color:var(--tx) !important;box-shadow:0 1px 4px #0004 !important}
html body .sx .sx-ph{display:flex;flex-direction:column;gap:2px}
html body .sx ul.sx-bl{list-style:none;margin:0;padding:0}
html body .sx .sx-b{padding:7px 0}
html body .sx .sx-bt{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:14px}
html body .sx .sx-bn{font-weight:600;min-width:0}
html body .sx .sx-bn small{display:block;font-weight:400}
html body .sx .sx-bv{white-space:nowrap;font-size:12px;color:var(--mu);text-align:right}
html body .sx .sx-bv b{color:var(--tx)}
html body .sx .sx-tr{height:6px;border-radius:99px;margin-top:5px;overflow:hidden;background:color-mix(in srgb,var(--mu) 18%,var(--card))}
html body .sx .sx-tr i{display:block;height:100%;border-radius:99px;background:var(--sxg)}
html body .sx .sx-bt .sx-tr{flex:0 0 76px;margin:0;align-self:center}html body .sx .sx-bt .sx-trx{flex:0 0 76px}html body .sx .sx-bt .sx-bn{flex:1 1 auto}
@media (max-width:640px){html body .sx .sx-bt .sx-tr,html body .sx .sx-bt .sx-trx{flex-basis:52px}}
html body .sx .sx-tr i.sx-lo{background:var(--sxr)}html body .sx .sx-tr i.sx-gr{background:var(--rpc)}
html body .sx h4{margin:4px 0 2px;font-size:14px;font-weight:800;display:flex;justify-content:space-between;gap:8px;align-items:baseline}
html body .sx h4 small{font-weight:400}
html body .sx .sx-tw{overflow-x:auto}
html body .sx table.sx-t{width:100%;min-width:0 !important;table-layout:auto;border-collapse:collapse;font-size:12px;border:0}
html body .sx table.sx-t th{font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--rpc);font-weight:700;text-align:right;padding:6px;border:0;border-bottom:1px solid var(--rpc);background:color-mix(in srgb,var(--rpc) 14%,var(--card));white-space:nowrap}
html body .sx table.sx-t td{padding:7px 4px;text-align:right;border:0;background:none;white-space:nowrap;font-variant-numeric:tabular-nums}
html body .sx table.sx-t th:first-child,html body .sx table.sx-t td:first-child{text-align:left;white-space:normal !important;width:40%;min-width:0}
html body .sx table.sx-t td small{white-space:normal}
html body .sx table.sx-t td:first-child{font-weight:600}
html body .sx table.sx-t td:first-child small{display:block;font-weight:400}
html body .sx table.sx-t tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--mu) 7%,var(--card))}
html body .sx table.sx-t td.sx-lo{color:var(--sxr);font-weight:700}html body .sx table.sx-t td.sx-hi{color:var(--sxg);font-weight:700}
html body .sx .sx-empty{margin:6px 0;font-size:14px;color:var(--mu)}
html body .sx .sx-as{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;padding:8px 12px;border-radius:8px;background:color-mix(in srgb,var(--mu) 9%,var(--card));font-size:12px;color:var(--mu)}
html body .sx .sx-as b{color:var(--tx)}
html body .sx .sx-links{margin-left:auto;display:flex;gap:14px;flex-wrap:wrap}
html body dialog.hf.fh .sx .sx-act,html body .rptv .sx .sx-act{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}
html body dialog.hf.fh .sx .sx-btn,html body .rptv .sx .sx-btn{flex:1 1 190px;min-height:46px;padding:10px 16px;border:0 !important;border-radius:12px;background:var(--card) !important;color:var(--rpc) !important;font-size:14px;font-weight:800;line-height:1.2;cursor:pointer;text-decoration:none !important;box-shadow:inset 0 0 0 2px var(--rpc) !important}
html body dialog.hf.fh .sx .sx-btn-p,html body .rptv .sx .sx-btn-p{background:var(--rpc) !important;color:#fff !important}
html body dialog.hf.fh .sx .sx-btn:hover,html body .rptv .sx .sx-btn:hover{filter:brightness(.94)}
html body dialog.hf.fh .sx .sx-btn:focus-visible,html body .rptv .sx .sx-btn:focus-visible{outline:3px solid color-mix(in srgb,var(--rpc) 45%,transparent);outline-offset:2px}
html body dialog.hf.fh .sx .sx-lk,html body .rptv .sx .sx-lk{min-height:36px;padding:0 2px;border:0 !important;background:none !important;box-shadow:none !important;color:var(--rpc) !important;font-size:12px;font-weight:700;text-decoration:underline;cursor:pointer}
html body dialog.hf.fh .sx .sx-x,html body .rptv .sx .sx-x{margin-left:auto;width:34px;min-width:34px;height:34px;min-height:36px;padding:0;border:0 !important;border-radius:99px;background:#ffffff2e !important;color:var(--on,#fff) !important;font-size:16px;line-height:1;box-shadow:none !important;cursor:pointer}
html body .sx .sx-big b{white-space:nowrap}
html body .sx .sx-key{margin:0 0 2px;font-size:11px;color:var(--mu)}
@media (max-width:640px){html body .sx .sx-pills{grid-template-columns:repeat(var(--np,3),1fr);gap:5px}html body .sx .sx-pill{padding:8px 7px}html body .sx .sx-pill b{font-size:14px;overflow-wrap:anywhere}html body .sx .sx-pill small{font-size:11px;letter-spacing:.02em}html body .sx .sx-big b{font-size:16px}html body .sx .sx-big{gap:6px;grid-template-columns:1fr 1fr 1fr}html body .sx .sx-big small{font-size:11px;letter-spacing:.04em}html body .sx table.sx-t{font-size:12px}html body .sx table.sx-t td{padding:7px 3px}html body .sx table.sx-t th{padding:4px 3px 6px;font-size:11px;letter-spacing:.04em}}`;

  function sxParts(v, r, forFile) {
    const M0 = typeof cr === "function" ? cr : FHE.currency, X = FHE.currency, M = x => String(M0(x)).replace("\u20b9 ", "\u20b9");
    const year = new Date().getFullYear(), n = Number(v.children) === 1 || Number(v.children) === 2 ? Number(v.children) : 0;
    const age = Number(v.age), until = Number(v.until), years = until - age, runs = r.plan.runout !== null;
    const cover = r.needed > 0 ? r.available / r.needed * 100 : 100;
    const ok = cover >= 100, mid = cover >= 75, bw = Math.max(0, Math.min(100, cover));
    const vd = ok ? ["Fully funded", "sx-ok"] : mid ? ["Within reach", "sx-mid"] : ["Shortfall", "sx-bad"];
    const sgn = x => (x < 0 ? "\u2212" : "+") + M(Math.abs(x));
    const pill = (l, val, sub) => `<div class="sx-pill"><small>${l}</small><b>${esc(val)}</b><small>${esc(sub)}</small></div>`;

    const hero = `<section class="sx-hero ${vd[1]}" aria-label="Retirement health scorecard"${forFile ? "" : ' data-fh-hero="1" role="button" tabindex="0" aria-label="Retirement health scorecard. Tap to tweak inputs"'}>${forFile ? `<div class="sx-ht"><span class="sx-vd">${vd[0]}</span></div>` : ""}
<div class="sx-big"><div><small>Required</small><b>${M(r.needed)}</b></div><div class="sx-sur"><small>${r.surplus >= 0 ? "Surplus" : "Shortfall"}</small><b>${sgn(r.surplus)}</b></div><div><small>Current corpus</small><b>${M(r.available)}</b></div></div>
<div class="sx-bar" role="progressbar" aria-label="Funding coverage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${bw.toFixed(0)}"><i style="width:${bw}%"></i></div></section>`;

    const hasRet = !FHE.isBlank(v.retire);
    let earnPill = "", np = 3;
    try { const e = FHE.earningSummary(v); if (e.on) { np = 4; earnPill = pill("Earnings a year", M(e.earn), `${e.years} yr${e.years === 1 ? "" : "s"} = ${M(e.total)}`); } } catch (x) { /* no earning phase */ }
    const pills = `<div class="sx-pills" style="--np:${np}">` + pill("Retire age", hasRet ? String(v.retire) : "\u2014", hasRet ? "planned" : "not set") +
      pill("Monthly need", M(Number(v.monthly)), "today's prices") +
      pill("Lasts until", runs ? `Age ${r.plan.runout}` : `Age ${until}+`, runs ? "then a shortfall" : "stays positive") + earnPill + `</div>`;

    // Corpus buckets: thin tracks, share of corpus + exact rupees
    const rows = r.rows.filter(x => x.name !== "TOTAL");
    const buckets = `<p class="sx-key">Bar = share of your corpus \u00b7 green is fully funded, red needs more.</p><ul class="sx-bl" aria-label="Corpus buckets">` + rows.map(x => {
      if (x.credit) return `<li class="sx-b"><div class="sx-bt"><span class="sx-trx" aria-hidden="true"></span><span class="sx-bn">${esc(x.name)}<small>Earnings and their savings fund lower the money needed today by ${M(-x.needed)}</small></span><span class="sx-bv"><b>\u2212${M(-x.needed)}</b></span></div></li>`;
      const pct = r.available > 0 ? x.setAside / r.available * 100 : 0, grow = x.needed === 0, low = !grow && x.setAside < x.needed - 0.5;
      const tk = `<div class="sx-tr" role="progressbar" aria-label="${esc(x.name)} share of corpus" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, Math.min(100, pct)).toFixed(1)}"><i class="${grow ? "sx-gr" : low ? "sx-lo" : ""}" style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
      return `<li class="sx-b"><div class="sx-bt">${tk}<span class="sx-bn">${esc(x.name)}${grow ? "" : `<small>Needs ${M(x.needed)} today</small>`}</span><span class="sx-bv"><b>${pct.toFixed(1)}%</b> \u00b7 ${X(x.setAside)}</span></div></li>`;
    }).join("") + (() => {     // build 124: total of all buckets (what the corpus holds, and what the plan needs today)
      const tl = r.available < r.needed - 0.5, tk = `<div class="sx-tr" role="progressbar" aria-label="Total corpus" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i class="${tl ? "sx-lo" : ""}" style="width:100%"></i></div>`;
      return `<li class="sx-b sx-tot"><div class="sx-bt">${tk}<span class="sx-bn">Total<small>Needs ${M(r.needed)} today</small></span><span class="sx-bv"><b>100%</b> \u00b7 ${X(r.available)}</span></div></li>`;
    })() + `</ul>` + (forFile ? "" : `<p class="sx-howp"><button type="button" class="sx-lnk" data-fh-how="1">How is this calculated? <span aria-hidden="true">\u2192</span></button></p>`);

    // Children goals: borderless micro-tables, inflation-adjusted
    let kidsH = "";
    if (!n) kidsH = `<p class="sx-empty">No children included, so no education or wedding goals are planned.</p>`;
    for (let c = 1; c <= n; c++) {
      const col = FHE.collegeCost(v, c), wed = FHE.weddingCost(v, c), ew = eduWhen(v, c, year), wy = FHE.weddingYear(v, c, year);
      const fy = Number(v["feeYears" + c]), todayEdu = Number(v["annualFee" + c]) * fy, edF = Number(v["educationFund" + c]), wdF = Number(v["weddingFund" + c]);
      const cls = (set, need) => set >= need - 0.5 ? "sx-hi" : "sx-lo";
      const wAge = FHE.weddingAgeOf(v, c), sub = (FHE.isBlank(v["childAge" + c]) ? `${Number(v["stage" + c]) > 0 ? "College year " + v["stage" + c] : "Class " + v["classToday" + c]}` : `Age ${v["childAge" + c]} \u00b7 ${Number(v["stage" + c]) > 0 ? "College year " + v["stage" + c] : "Class " + v["classToday" + c]}`) + (wAge === null ? "" : ` \u00b7 Wedding at ${wAge}`);
      kidsH += `<h4>Child ${c}<small>${esc(sub)}</small></h4><div class="sx-tw"><table class="sx-t"><thead><tr><th scope="col">Goal</th><th scope="col">Inflated</th><th scope="col">Need now</th><th scope="col">Set aside</th></tr></thead><tbody>
<tr><td>Education<small>${fy === 0 ? "No fee years left" : `${M(todayEdu)} today</small><small>${fy} yr${fy === 1 ? "" : "s"} \u00b7 till ${esc(ew.year)}`}</small></td><td title="${X(col.future)}">${M(col.future)}</td><td title="${X(col.present)}">${M(col.present)}</td><td class="${cls(edF, col.present)}" title="${X(edF)}">${M(edF)}</td></tr>
<tr><td>Wedding<small>${M(Number(v["weddingCost" + c]))} today</small>${wy === null ? "" : `<small>in ${wy}${wAge === null ? "" : ` \u00b7 age ${wAge}`}</small>`}</td><td title="${X(wed.future)}">${M(wed.future)}</td><td title="${X(wed.present)}">${M(wed.present)}</td><td class="${cls(wdF, wed.present)}" title="${X(wdF)}">${M(wdF)}</td></tr></tbody></table></div>`;
    }

    // Monthly cash flow: spending stages + other monthly money
    let cash = "";
    try {
      const sch = FHE.schedule(v, until), mo = x => M(x / 12), reduceAge = Number(v.reduceAge), cut = Number(v.reducePercent);
      const st = [["Today", age, Number(v.monthly), String(year)]];
      if (sch[1]) st.push(["Year 1", age + 1, sch[1].house / 12, String(year + 1)]);
      const k = reduceAge + 1 - age;
      if (cut > 0 && k > 1 && k < years && sch[k]) st.push([`After age ${reduceAge}`, age + k, sch[k].house / 12, `spending drops ${cut}%`]);
      if (years > 1 && sch[years]) st.push(["Final year", until, sch[years].house / 12, String(year + years)]);
      const pol = (() => { try { return FHE.policyNow(); } catch (e) { return 0; } })(), inc = (Number(v.income) || 0) + pol, resv = Number(v.buffer) * Number(v.bufferRoi) / 100 / 12, net = Number(v.monthly) - inc / 12;
      cash = `<div class="sx-tw"><table class="sx-t"><thead><tr><th scope="col">Spending stage</th><th scope="col">Age</th><th scope="col">Per month</th></tr></thead><tbody>` +
        st.map(x => `<tr><td>${esc(x[0])}<small>${esc(x[3])}</small></td><td>${x[1]}</td><td title="${X(x[2])}">${M(x[2])}</td></tr>`).join("") +
        `</tbody></table></div><div class="sx-tw"><table class="sx-t"><thead><tr><th scope="col">Other monthly money</th><th scope="col">Per month</th></tr></thead><tbody>` +
        `<tr><td>Other income<small>today's prices</small></td><td>${(Number(v.income) || 0) > 0 ? mo(Number(v.income) || 0) : "None"}</td></tr>` +
        (pol > 0 ? `<tr><td>Policy payouts<small>due next year, fixed rupees</small></td><td>${mo(pol)}</td></tr>` : "") +
        `<tr><td>Emergency-reserve interest<small>at ${Number(v.bufferRoi)}% a year</small></td><td>${mo(Number(v.buffer) * Number(v.bufferRoi) / 100)}</td></tr>` +
        `<tr><td>${net >= 0 ? "Net spend" : "Net surplus"}<small>spending minus other income</small></td><td class="${net >= 0 ? "" : "sx-hi"}">${M(Math.abs(net))}</td></tr></tbody></table></div>`;
      void resv;
    } catch (e) { cash = `<p class="sx-empty">Cash flow is not available for these inputs.</p>`; }

    const pc = x => `${Number(x)}%`;
    const foot = `<div class="sx-as"><span>Inflation <b>${pc(v.houseInflation)}</b></span><span>Edu infl <b>${pc(v.educationInflation)}</b></span>${n ? `<span>Wedding infl <b>${pc(v.weddingInflation)}</b></span>` : ""}${(() => { try { const e = FHE.earningSummary(v); return e.on ? `<span>Return on savings <b>${pc(e.roi)}</b></span>` : ""; } catch (x) { return ""; } })()}<span>Return <b>${pc(v.roi)}</b></span></div>`;
    const sv0 = savedState(), added = !!(sv0 && sv0.rep);
    const actions = forFile ? "" : `<div class="sx-act" role="group" aria-label="Report actions"><button type="button" id="fh-sx-dl" class="sx-btn sx-btn-p">Download Report</button>` +
      `<button type="button" id="fh-sx-add" class="sx-btn"${added ? ' aria-pressed="true"' : ""}>${added ? "\u2713 Added to Planner" : "Add to Planner"}</button></div>`;
    // Other income: the streams entered, and what they save in "money needed today" (needed with them vs without them)
    let oi = "";
    try {
      const st = FHE.incomeStreams(v), sp = x => esc(String(M(x)));
      const rows = st.map(q => `<li><span>${esc(q.name ? q.name : st.length > 1 ? "Income source " + q.k : "Other income")}</span><small>${sp(q.amount)} a year \u00b7 ${q.fromY === q.toY ? q.fromY : q.fromY + "\u2013" + q.toY}${q.g ? " \u00b7 +" + +(q.g * 100).toFixed(2) + "% a year" : ""}</small></li>`).join("");
      let note, head;
      if (st.length) {
        const w = FHE.calculate(Object.assign({}, v, { incomeOn: "0" })), save = w.ok ? w.needed - r.needed : 0, tot = st.reduce((t, q) => t + q.amount, 0);
        head = `${sp(tot)} a year today${st.length > 1 ? " \u00b7 " + st.length + " sources" : ""}`;
        note = save > 0.5 ? `Cuts the money needed today by ${sp(save)} (${sp(w.needed)} \u2192 ${sp(r.needed)}), so your corpus goes further.` : "No effect yet: this income falls outside the plan years.";
      } else {
        head = "None added";
        note = "Rent, pension or part-time income would lower the money needed today, so the same corpus goes further.";
      }
      oi = `<section class="oi" aria-label="Other income"><div class="oi-h"><span>Other income</span><span>${head}</span></div>${rows ? `<ul>${rows}</ul>` : ""}<p class="oi-n"><b>Impact:</b> ${note}</p></section>`;
    } catch (e) { oi = ""; }
    // Policy payouts (Holdings > Policy Payouts): fixed-rupee income the planner already counts, listed with what it saves
    try {
      const ps = FHE.policyStreams(), sp = x => esc(String(M(x)));
      if (ps.length) {
        const sum = q => Object.keys(q.byYear || {}).reduce((t, y) => t + q.byYear[y], 0);
        const li = ps.map(q => `<li><span>${esc(String(q.name || "Policy").replace(/^Policy: /, ""))}</span><small>${sp(sum(q))} to receive \u00b7 ${q.fromY === q.toY ? q.fromY : q.fromY + "\u2013" + q.toY}</small></li>`).join("");
        const w = FHE.withoutPolicy(() => FHE.calculate(v)), save = w.ok && r.ok !== false ? w.needed - r.needed : 0, tot = ps.reduce((t, q) => t + sum(q), 0), y0 = Math.min(...ps.map(q => q.fromY)), y1 = Math.max(...ps.map(q => q.toY)), span = y0 === y1 ? y0 : y0 + "\u2013" + y1;
        const note = save > 0.5 ? `Not part of your corpus until you receive it. Each payout is counted as income in the year it arrives, which cuts the money needed today by ${sp(save)} (${sp(w.needed)} \u2192 ${sp(r.needed)}). Fixed rupees, not inflated.` : "No effect yet: these payouts fall outside the plan years.";
        oi += `<section class="oi" aria-label="Policy payouts"><div class="oi-h"><span>Policy payouts</span><span>${sp(tot)} still to receive \u00b7 ${span}${ps.length > 1 ? " \u00b7 " + ps.length + " policies" : ""}</span></div><ul>${li}</ul><p class="oi-n"><b>Impact:</b> ${note}</p></section>`;
      }
    } catch (e) { }
    return { hero, actions, pills, pt: ptHTML(v, true), oi, buckets, kids: kidsH, cash, foot, vd };
  }

  /* The Summary view as markup. The pop-up and the Reports tab both call this, so the two are identical. */
  function summaryMarkup(v, r, tab, noActions) {
    const P = sxParts(v, r, false);
    tab = ["buckets", "kids", "cash"].includes(tab) ? tab : "buckets";
    const tabs = [["buckets", "Corpus Buckets"], ["kids", "Children Goals"], ["cash", "Monthly Cashflow"]];
    const html = `<div class="sx"><div class="sx-l">${P.hero}${noActions ? "" : P.actions}${P.pills}${P.pt}${P.oi}</div><div class="sx-r">
<div class="sx-seg" role="tablist" aria-label="Summary details">${tabs.map(t => `<button type="button" role="tab" id="fh-sxt-${t[0]}" data-fh-sx="${t[0]}" aria-selected="${t[0] === tab}" aria-controls="fh-sxp" tabindex="${t[0] === tab ? 0 : -1}">${t[1]}</button>`).join("")}</div>
<div id="fh-sxp" role="tabpanel" aria-labelledby="fh-sxt-${tab}">${P[tab]}</div>${P.foot}</div></div>`;
    return { html, vd: P.vd };
  }

  function renderSummaryX() {
    const host = $("sx");
    if (!host) return;
    ensureSxCss();
    const r = result();
    if (!r.ok) { host.innerHTML = `<p class="fh-lede">${esc(r.status || "Complete your inputs to see an estimate.")}</p>`; updatePill(null); return; }
    const M = summaryMarkup(FH.v, r, FH.smTab, true);
    updatePill(M.vd);
    host.innerHTML = typeof tr === "function" ? tr(M.html, 1) : M.html;
    hdrActs();
  }

  /* Download Report shows on the Summary and Milestones views; Add to Planner on the Summary view only. Both sit in the pop-up header, left of Edit Plan */
  function hdrActs() {
    const dl = $("sx-dl"), ad = $("sx-add"); if (!dl || !ad) return;
    const ok = result().ok, show = FH.sec === "summary" && ok, showDl = (FH.sec === "summary" || FH.sec === "milestones") && ok, sv = savedState(), added = !!(sv && sv.rep), T = t => (typeof tr === "function" ? tr(t, 1) : t);
    dl.hidden = !showDl; ad.hidden = !show;
    ad.textContent = T(added ? "\u2713 Added to Planner" : "Add to Planner");
    if (added) ad.setAttribute("aria-pressed", "true"); else ad.removeAttribute("aria-pressed");
  }

  /* ---------- Reports tab (top navigation): the Summary view, moved there by "Add to Report page" ----------
     It is rendered from the saved plan with the same markup as the pop-up (summaryMarkup), so nothing is changed or left out. */
  const RPT = { tab: null };
  window.fhHasReport = () => { const sv = savedState(); return !!(sv && sv.rep); };
  const rptIds = h => h.replace(/fh-sxt-/g, "rpt-sxt-").replace(/id="fh-sxp"/g, 'id="rpt-sxp"').replace(/aria-controls="fh-sxp"/g, 'aria-controls="rpt-sxp"').replace(/id="fh-sx-dl"/g, 'id="rpt-sx-dl"').replace(/id="fh-sx-add"/g, 'id="rpt-sx-add"');
    function rp2Welcome() {
    return window.vrWelcome(window.VRW_RET);
  }
  function rptInner() {
    const sv = savedState();
    if (!sv) return rp2Welcome();
    if (FHE.validateAll(sv.v).length) return `<p class="fh-lede">The saved plan is incomplete. Open Edit Inputs and finish the steps.</p>`;
    if (RPT.tab === null) RPT.tab = FH.smTab;
    // already on the Retirement Planner page, so there is no "Add to Planner" here (it stays in the Summary pop-up header)
    // already on the Retirement Planner page: the score card does not open the pop-up and there are no Download Report / Add to Planner buttons here (both stay in the Summary pop-up header)
    return rptIds(summaryMarkup(sv.v, FHE.calculate(sv.v), RPT.tab).html
      .replace(/<div class="sx-act"[^>]*>[\s\S]*?<\/div>/, "")
      .replace(/ data-fh-hero="1" role="button" tabindex="0"/, ""));
  }
  window.fhReportTab = function () { ensureSxCss(); return `<div class="rptv" id="rptv">${rptInner()}</div>`; };
  function rptRefresh() { const h = document.getElementById("rptv"); if (h) h.innerHTML = simTr(rptInner()); }
  document.addEventListener("click", e => {
    const host = e.target.closest && e.target.closest("#rptv");
    if (!host) return;
    const t = e.target.closest("[data-fh-sx]");
    if (t) { RPT.tab = t.dataset.fhSx; rptRefresh(); const n = document.querySelector('#rptv [data-fh-sx="' + RPT.tab + '"]'); if (n) n.focus({ preventScroll: true }); return; }
    if (e.target.closest("[data-fh-hero]")) { fhOpen("status"); return; }
    if (e.target.closest("#rpt-sx-dl")) { syncFromState(); downloadReport("summary"); return; }
    if (e.target.closest("#rpt-sx-add")) {
      const say = m => { if (typeof toast === "function") { try { toast(m); } catch (x) { /* cosmetic */ } } };
      const sv = savedState();
      if (sv && sv.rep) { say("This report is already on the Reports tab"); return; }
      try { if (sv) { sv.rep = 1; if (typeof save === "function") save(); } if (typeof render === "function") render(); say("Added to the Retirement Planner"); } catch (x) { /* cosmetic */ }
    }
  });
  document.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("#rptv [data-fh-hero]")) { e.preventDefault(); fhOpen("status"); }
  });

  /* Planning period strip styles, copied for the downloaded report (the page itself gets them from the app stylesheet) */
  const PT_CSS = `
html body .pt{border:1px solid var(--bd);border-radius:12px;padding:12px 14px;background:var(--card);color:var(--tx);margin:6px 0 10px;font-size:14px}
html body .pt-h{display:flex;justify-content:space-between;gap:8px;align-items:baseline;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--mu);margin-bottom:8px}
html body .pt-bar{position:relative;display:flex;gap:3px}
html body .pt-seg{min-width:92px;display:flex;flex-direction:column;gap:2px}
html body .pt-seg i{display:block;height:8px;border-radius:99px;background:var(--rpc,var(--ac,#2563eb))}
html body .pt-seg.pt-e i{background:#10b981}
html body .pt-seg b{font-size:14px;font-weight:800}
html body .pt-seg small,html body .pt .pt-g small{font-size:11px;color:var(--mu);line-height:1.3}
html body .pt-ar{font-size:11px;font-weight:700;color:var(--mu)}
html body .pt-end{position:absolute;right:0;top:0;background:var(--card);padding-left:4px}
html body .pt-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;margin-top:10px}
html body .pt-g>div{min-width:0;border-top:1px solid var(--bd);padding-top:6px}
html body .pt-g b{display:block;font-size:14px;font-weight:800;overflow-wrap:anywhere}
html body .pt-g small:first-child{text-transform:uppercase;letter-spacing:.05em;font-size:11px}
html body .pt-n{margin:8px 0 0;font-size:12px;line-height:1.45;color:var(--mu)}
`;
  /* The downloaded files are standalone, so they take the accent of the colour theme chosen in Settings > Appearance (the light-mode accent, so they print well) */
  function reportAccent() {
    try { const a = String(getComputedStyle(document.body).getPropertyValue("--acl") || "").trim(); if (/^#[0-9a-f]{3,8}$/i.test(a)) return a; } catch (e) { /* use the default */ }
    return "#1e3a5f";
  }
  /* Download Report: a clean standalone HTML file (opens anywhere, prints to PDF). */
  function reportDocument() {
    const r = result();
    if (!r.ok) return null;
    const who = (typeof fhpList === "function" ? (fhpList().find(p => p.active) || {}).name : "") || "";
    const P = sxParts(FH.v, r, true), when = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const sec = (t, h) => `<h3>${t}</h3>${h}`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vriddhi \u00b7 Retirement plan summary${who ? " \u00b7 " + esc(who) : ""}</title><style>
:root{--card:#fff;--bd:#e2e8f0;--mu:#64748b;--tx:#0f172a;--rpc:${reportAccent()};--on:#fff}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;padding:24px 16px;background:#f1f5f9;font:14px/1.45 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--tx)}
main{max-width:1060px;margin:0 auto;background:#fff;border-radius:12px;padding:20px}
.rp-h{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
h1{margin:0 0 2px;font-size:20px}p.d{margin:0;color:var(--mu);font-size:12px}h3{margin:18px 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}
.rp-pr{flex:none;min-height:38px;padding:0 16px;border:1.5px solid var(--bd);border-radius:99px;background:#fff;color:var(--tx);font-weight:700;font-size:14px;font-family:inherit;cursor:pointer}
.rp-top{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start}/* two columns when there is room (screen, A4 landscape), stacked when there is not (phone, A4 portrait): no media queries, so print and screen agree */
.rp-l,.rp-r{display:flex;flex-direction:column;gap:12px;min-width:0}.rp-l{flex:5 1 380px}.rp-r{flex:7 1 460px}.rp-r h3{margin-top:0}
${SX_CSS}
${PT_CSS}
html body .sx .sx-tw{overflow-x:auto}
html body .sx .sx-hero{padding:12px 14px}html body .sx .sx-big{gap:8px}html body .sx .sx-big b{font-size:20px}
@page{size:A4 landscape;margin:10mm}
@media print{
body{background:#fff;padding:0;font-size:12px}main{max-width:none;padding:0;border-radius:0}.rp-pr{display:none}
.rp-top{gap:14px}
html body .sx .sx-tw{overflow:visible}
html body .sx table.sx-t{font-size:11px;table-layout:auto}html body .sx table.sx-t th,html body .sx table.sx-t td{padding-left:3px;padding-right:3px}
html body .sx table.sx-t th{white-space:normal}html body .sx table.sx-t td:not(:first-child){white-space:nowrap}
thead{display:table-header-group}tr,.sx-b,.sx-hero,.sx-pill,.pt,.sx-as,.sx-tl li{break-inside:avoid;page-break-inside:avoid}
h3,h4{break-after:avoid;page-break-after:avoid}
}
</style></head><body><main><div class="rp-h"><div><h1>Retirement plan summary${who ? " for " + esc(who) : ""}</h1><p class="d">Vriddhi \u00b7 ${esc(when)} \u00b7 Estimates only, not financial advice. Returns and inflation rates are assumptions, not guarantees.</p></div><button type="button" class="rp-pr" onclick="window.print()">Print / Save as PDF</button></div>
<div class="sx"><div class="rp-top"><div class="rp-l">${P.hero}${P.pills}${P.pt}${P.oi}</div><div class="rp-r">${sec("Corpus buckets", P.buckets)}${P.foot}</div></div>${sec("Children goals", P.kids)}${sec("Monthly cashflow", P.cash)}</div></main></body></html>`;
  }

  /* Milestones report: the Milestones page (Goals + Timeline) as a standalone file that prints to PDF. */
  const MS_DOC_CSS = `
html body .sx{flex-direction:row;flex-wrap:wrap;gap:18px;align-items:flex-start}
html body .sx .sx-l,html body .sx .sx-r{display:flex;flex-direction:column;gap:10px;min-width:0}html body .sx .sx-l{flex:4 1 300px}html body .sx .sx-r{flex:8 1 460px}
html body .sx ol.sx-tl{list-style:none;margin:6px 0 0;padding:0;column-count:2;column-gap:22px}
html body .sx ol.sx-tl li{position:relative;break-inside:avoid;page-break-inside:avoid;border-left:2px solid var(--bd);margin-left:6px;padding:0 0 12px 14px;display:flex;flex-direction:column;gap:1px;font-size:14px}
html body .sx ol.sx-tl li::before{content:"";position:absolute;left:-7px;top:4px;width:10px;height:10px;border-radius:99px;background:var(--rpc);box-shadow:0 0 0 3px #fff}
html body .sx ol.sx-tl li.sx-tlb::before{background:var(--sxr)}
html body .sx ol.sx-tl li b{font-weight:800}
html body .sx ol.sx-tl li.ms-sep{border-left:0;margin-left:0;padding:8px 0 2px;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--mu)}
html body .sx ol.sx-tl li.ms-sep::before{display:none}html body .sx ol.sx-tl li.ms-sep.ms-e{color:#0f7a4e}
html body .sx-tl small b{color:var(--tx)}
html body .ms-chip{display:inline-block;font-style:normal;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:1px 7px;border-radius:99px;margin-left:6px;color:#fff;background:var(--rpc)}
html body .ms-chip.ms-e{background:#10b981}
@media (max-width:640px){html body .sx ol.sx-tl{column-count:1}}
`;
  function milestonesDocument() {
    const r = result();
    if (!r.ok) return null;
    const who = (typeof fhpList === "function" ? (fhpList().find(p => p.active) || {}).name : "") || "";
    const v = FH.v, when = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const bits = [`Age ${esc(v.age)}`]; if (!FHE.isBlank(v.retire)) bits.push(`retiring at ${esc(v.retire)}`); if (!FHE.isBlank(v.until)) bits.push(`planned to ${esc(v.until)}`);
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vriddhi \u00b7 Retirement milestones${who ? " \u00b7 " + esc(who) : ""}</title><style>
:root{--card:#fff;--bd:#e2e8f0;--mu:#64748b;--tx:#0f172a;--rpc:${reportAccent()};--on:#fff}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;padding:24px 16px;background:#f1f5f9;font:14px/1.45 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--tx)}
main{max-width:1060px;margin:0 auto;background:#fff;border-radius:12px;padding:20px}
.rp-h{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
h1{margin:0 0 2px;font-size:20px}p.d{margin:0;color:var(--mu);font-size:12px}
.rp-pr{flex:none;min-height:38px;padding:0 16px;border:1.5px solid var(--bd);border-radius:99px;background:#fff;color:var(--tx);font-weight:700;font-size:14px;font-family:inherit;cursor:pointer}
${SX_CSS}
${MS_DOC_CSS}
@page{size:A4 landscape;margin:10mm}
@media print{
body{background:#fff;padding:0;font-size:12px}main{max-width:none;padding:0;border-radius:0}.rp-pr{display:none}
.sx-b,.sx-tl li{break-inside:avoid;page-break-inside:avoid}
h3,h4{break-after:avoid;page-break-after:avoid}
}
</style></head><body><main><div class="rp-h"><div><h1>Retirement milestones${who ? " for " + esc(who) : ""}</h1><p class="d">${bits.join(" \u00b7 ")} \u00b7 Vriddhi \u00b7 ${esc(when)} \u00b7 Estimates only, not financial advice.</p></div><button type="button" class="rp-pr" onclick="window.print()">Print / Save as PDF</button></div>
${msMarkup(v, r)}</main></body></html>`;
  }

  /* kind: "summary" (default) saves the Summary report; "milestones" saves the Milestones report */
  async function downloadReport(kind) {
    const say = m => { if (typeof toast === "function") { try { toast(m); } catch (e) { /* cosmetic */ } } };
    const ms = kind === "milestones";
    const doc = ms ? milestonesDocument() : reportDocument();
    if (!doc) { say("Complete your plan inputs first"); return; }
    const who = (typeof fhpList === "function" ? (fhpList().find(p => p.active) || {}).name : "") || "";
    const slug = String(who).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
    const name = (ms ? "Vriddhi-Milestones-Report-" : "Vriddhi-Retirement-Report-") + (slug ? slug + "-" : "") + new Date().toISOString().slice(0, 10) + ".html";
    const done = ms ? "Milestones report" : "Report";
    try {
      const dl = window.claude && typeof window.claude.use === "function" ? await window.claude.use("downloads") : null;
      if (dl) { await dl.save({ filename: name, data: doc }); say(done + " saved"); return; }
    } catch (e) {
      if (e && e.code === "declined") return;
      if (e && e.code === "rate_limited") { say("Please wait a moment and try again"); return; }
    }
    try {
      const url = URL.createObjectURL(new Blob([doc], { type: "text/html" })), a = document.createElement("a");
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000); say(done + " downloaded");
    } catch (e) { say("Download is not available here"); }
  }

  function updatePill(vd) {
    const el = $("pill");
    if (!el) return;
    if (!vd) { const r = result(); if (r.ok) { const c = r.needed > 0 ? r.available / r.needed * 100 : 100; vd = c >= 100 ? ["", "sx-ok"] : c >= 75 ? ["", "sx-mid"] : ["", "sx-bad"]; } }
    el.hidden = !vd;
    if (!vd) return;
    el.className = "fh-pill " + vd[1];
    el.textContent = vd[1] === "sx-ok" ? "On Track" : vd[1] === "sx-mid" ? "Within Reach" : "Off Track";
  }

  /* Plan events in date order (college start / end, weddings, spending drop, retirement, last year). Shared by Milestones and the planner page. */
  function planEvents(v) {
    const year = new Date().getFullYear(), age = Number(v.age);
    let ev = [];
    try {
      ev = FHE.horizonReport(v).filter(x => x.what && x.what !== "Regular year").map(x => {
        const parts = x.what.split(" \u00b7 ").filter(t => !/^(Earning year \d+ of \d+|Retires at \d+|Savings fund moves into the corpus)$/.test(t)).map(t => {                     // college runs one line per year: keep only its first and last year
          const m = /^Child (\d) college \(year (\d+) of (\d+)\)$/.exec(t);
          if (!m) return t;
          const k = Number(m[2]), N = Number(m[3]);
          return N === 1 ? `Child ${m[1]} college (1 year)` : k === 1 ? `Child ${m[1]} college starts (${N} years)` : k === N ? `Child ${m[1]} college ends` : null;
        }).filter(Boolean);
        return { year: x.year, age: x.age, what: parts.join(" \u00b7 "), bal: x.end, st: x.status, phase: x.phase };
      }).filter(x => x.what);
    } catch (e) { ev = []; }
    if (!FHE.isBlank(v.retire) && Number(v.retire) >= age) {
      let hr = null; try { hr = FHE.horizonReport(v).filter(x => !x.today && x.age === Number(v.retire))[0] || null; } catch (e) { hr = null; }
      ev.push({ year: year + Number(v.retire) - age, age: Number(v.retire), what: "Planned retirement", bal: hr ? hr.end : null, st: hr ? hr.status : "", phase: hr ? hr.phase : "", ret: true });
    }
    /* build 120: a child's wedding with no budget has no cost to plan, but it is still listed under Goals, so its year is marked on the timeline too */
    try {
      const kidsN = Number(v.children) === 1 || Number(v.children) === 2 ? Number(v.children) : 0, span = Number(v.until) - age;
      for (let c = 1; c <= kidsN; c++) {
        const wy = Number(v["weddingYears" + c]);
        if (!(wy >= 1 && wy <= span) || Number(v["weddingCost" + c]) > 0 || ev.some(x => x.what.indexOf(`Child ${c} wedding`) >= 0)) continue;
        const label = `Child ${c} wedding (no budget set)`, yr = year + wy, same = ev.find(x => x.year === yr);
        if (same) { same.what += " \u00b7 " + label; continue; }
        let hr = null; try { hr = FHE.horizonReport(v).filter(x => !x.today && x.year === yr)[0] || null; } catch (e2) { hr = null; }
        ev.push({ year: yr, age: age + wy, what: label, bal: hr ? hr.end : null, st: hr ? hr.status : "", phase: hr ? hr.phase : "" });
      }
    } catch (e) { /* the timeline still shows the plan's own events */ }
    /* build 118: an explicit milestone at age 60 (when the plan runs through it); merged into an event already due at that age */
    if (age < 60 && Number(v.until) >= 60) {
      const hit = ev.find(x => x.age === 60);
      if (hit) { if (hit.what.indexOf("Age 60 milestone") !== 0) hit.what = "Age 60 milestone \u00b7 " + hit.what; }
      else { let hr = null; try { hr = FHE.horizonReport(v).filter(x => !x.today && x.age === 60)[0] || null; } catch (e) { hr = null; } if (hr) ev.push({ year: hr.year, age: 60, what: "Age 60 milestone", bal: hr.end, st: hr.status, phase: hr.phase }); }
    }
    ev.sort((a, b) => a.year - b.year || (a.ret ? 1 : 0) - (b.ret ? 1 : 0));
    return ev;
  }

  /* Milestones: goal funding + a chronological timeline of plan events (from FHE.horizonReport; nothing recalculated). */
  /* Milestones markup (Goals + Timeline) from the plan values: used by the Milestones view and by its downloaded report. */
  function msMarkup(v, r) {
    const M0 = typeof cr === "function" ? cr : FHE.currency, M = x => String(M0(x)).replace("\u20b9 ", "\u20b9");
    const year = new Date().getFullYear(), n = kids(), age = Number(v.age), until = Number(v.until);
    const goals = [];
    for (let c = 1; c <= n; c++) {
      const ed = r.rows.find(x => x.name === `Child ${c} \u00b7 education`), wd = r.rows.find(x => x.name.indexOf(`Child ${c} \u00b7 wedding`) === 0);
      const ey = FHE.educationYear(v, c, year), wy = FHE.weddingYear(v, c, year);
      if (ed) goals.push({ name: `Child ${c} \u00b7 Education`, due: ey, row: ed });
      if (wd) goals.push({ name: `Child ${c} \u00b7 Wedding`, due: wy, age: FHE.weddingAgeOf(v, c), row: wd });
    }
    goals.sort((a, b) => (a.due === null) - (b.due === null) || a.due - b.due);
    const cover = r.needed > 0 ? r.available / r.needed * 100 : 100;
    const track = (pct, low) => `<div class="sx-tr" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, pct).toFixed(0)}"><i class="${low ? "sx-lo" : ""}" style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
    const goalLi = (name, sub, pct) => `<li class="sx-b"><div class="sx-bt">${track(pct, pct < 99.5)}<span class="sx-bn">${esc(name)}<small>${esc(sub)}</small></span><span class="sx-bv"><b>${pct >= 100 ? "100%+" : pct.toFixed(0) + "%"}</b> funded</span></div></li>`;
    const glist = `<ul class="sx-bl" aria-label="Goals">` + goalLi("Whole plan", `${M(r.available)} corpus vs ${M(r.needed)} needed today`, cover) +
      goals.map(g => { const need = g.row.needed, pct = need > 0 ? g.row.setAside / need * 100 : 100; return goalLi(g.name, `${g.due === null ? "" : "Due " + g.due + (g.age != null ? " (age " + g.age + ")" : "") + " \u00b7 "}needs ${M(need)} today`, pct); }).join("") + `</ul>`;

    const ev = planEvents(v), reserve = Number(v.buffer) || 0, es = FHE.earningSummary(v);
    const rowsAll = FHE.horizonReport(v), sumOf = (rs, f) => rs.reduce((t, x) => t + f(x), 0), yrs = k => `${k} yr${k === 1 ? "" : "s"}`;
    const cm = x => x < 0 ? "\u2212" + M(-x) : M(x);
    const spendToday = rowsAll.length && rowsAll[0].today ? rowsAll[0].end : Number(v.corpus) - reserve;

    /* timeline circle colour = plan status at that age (same rule as the age slider): green ok, orange warning, red runs out */
    const tlc = a => "tl-" + (typeof simSt === "function" ? simSt(v, Number(a)) : "ok");
    let lastPh = null;
    const items = [`<li class="ms-start ${tlc(age)}"><b>Today \u00b7 Age ${age}</b><span>Plan starts</span><small>Corpus today: ${M(Number(v.corpus))} (spendable ${M(spendToday)} + reserve ${M(reserve)})</small></li>`];
    for (const e of ev) {
      const ph = e.phase || lastPh;
      if (es.on && ph && ph !== lastPh && !e.ret) { items.push(`<li class="ms-sep ${ph === "Earning" ? "ms-e" : "ms-rt"}">${ph === "Earning" ? "Earning phase" : "Retirement phase"}</li>`); lastPh = ph; }
      else if (es.on && e.ret && lastPh === null) { items.push(`<li class="ms-sep ms-e">Earning phase</li>`); lastPh = "Earning"; }
      const bad = e.st && e.st !== "Funded";
      items.push(`<li class="${bad ? "sx-tlb " : ""}${bad ? "tl-bad" : tlc(e.age)}"><b>${e.year} \u00b7 Age ${e.age}${es.on && e.phase ? ` <em class="ms-chip ${e.phase === "Earning" ? "ms-e" : "ms-rt"}">${e.phase === "Earning" ? "Earning" : "Retired"}</em>` : ""}</b><span>${esc(e.what)}</span>${e.bal === null ? "" : `<small>Corpus at end of year: <b>${cm(e.bal)}</b> \u00b7 with reserve ${cm(e.bal + reserve)}</small>`}</li>`);
      if (es.on && e.ret) { items.push(`<li class="ms-sep ms-rt">Retirement phase</li>`); lastPh = "Retired"; }
    }
    const tl = ev.length ? `<ol class="sx-tl" aria-label="Plan timeline">${items.join("")}</ol>` : `<p class="sx-empty">No milestones to show.</p>`;
    const html = `<div class="sx"><div class="sx-l"><h4>Goals<small>funding vs need today</small></h4>${glist}</div><div class="sx-r"><h4>Timeline<small>Age ${age} to ${until} \u00b7 corpus at the end of each milestone year</small></h4>${tl}</div></div>`;
    return html;
  }
  function renderMilestones() {
    const host = $("ms");
    if (!host) return;
    if (!document.getElementById("fh-sx-css")) { const st = document.createElement("style"); st.id = "fh-sx-css"; st.textContent = SX_CSS; document.head.appendChild(st); }
    const r = result();
    if (!r.ok) { host.innerHTML = `<p class="fh-lede">${esc(r.status || "Complete your inputs to see milestones.")}</p>`; updatePill(null); return; }
    updatePill(null);
    const html = msMarkup(FH.v, r);
    host.innerHTML = typeof tr === "function" ? tr(html, 1) : html;
  }

  /* ---------- "How is this calculated?" pop-up (build 125) ----------
     Walks through the plan's own numbers, step by step, using the same engine calls the summary uses
     (plan, simulate, collegeCost, weddingCost), so every figure in the pop-up adds up to the Total row. */
  const stM = x => { const M0 = typeof cr === "function" ? cr : FHE.currency; return String(M0(x)).replace("\u20b9 ", "\u20b9"); };
  const hwX = x => (x < 0 ? "\u2212" : "") + String(FHE.currency(Math.abs(x))).replace("\u20b9 ", "\u20b9");
  const hwM = x => (x < 0 ? "\u2212" : "") + stM(Math.abs(x));

  function howHTML(v) {
    const r = FHE.calculate(v);
    if (!r.ok) return `<p class="hw-p">Complete your inputs first, then this explanation will show your numbers.</p>`;
    const age = Number(v.age), until = Number(v.until), N = until - age, roi = Number(v.roi), rt = roi / 100, y0 = new Date().getFullYear();
    const kids = Number(v.children) === 1 || Number(v.children) === 2 ? Number(v.children) : 0;
    const disc = y => (1 + rt) ** y, pc = x => (Math.round(x * 100) / 100) + "%";
    const sim = FHE.simulate(v), est = FHE.plan(v);
    let grossPV = 0, incPV = 0, intPV = 0;
    sim.rows.forEach(q => { grossPV += q.house / disc(q.y); incPV += q.income / disc(q.y); intPV += q.reserveYield / disc(q.y); });
    const tbl = (head, rows) => `<div class="hw-tw"><table class="hw-t"><thead><tr>${head.map((h, i) => `<th scope="col"${i ? ' class="hw-r"' : ""}>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(rw => rw === null
      ? `<tr class="hw-dots"><td colspan="${head.length}">\u2026 and so on for every year in between \u2026</td></tr>`
      : `<tr>${rw.map((c, i) => `<td${i ? ' class="hw-r"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    const pick = (arr, keep) => arr.length <= keep + 1 ? arr : arr.slice(0, keep).concat([null], arr.slice(-1));
    let n = 0;
    const step = (title, body, result) => `<section class="hw-st"><h4><span class="hw-n">${++n}</span>${title}</h4>${body}${result ? `<p class="hw-res">${result}</p>` : ""}</section>`;
    let h = `<div class="hw-key"><b>The big idea</b><p>"Required" is the money you would need <u>today</u> so that every bill in your plan, up to age ${until}, is paid. Bills in the future are bigger because of inflation, but money you invest keeps growing. So each future bill is <b>shrunk back to today's money</b> using your expected return of ${pc(roi)} a year.</p>` +
      `<p class="hw-ex">Example: \u20b9100 invested today becomes \u20b9${(100 * (1 + rt)).toFixed(2)} in one year. So a \u20b9${(100 * (1 + rt)).toFixed(2)} bill next year only needs \u20b9100 set aside today.</p></div>`;

    // 1. household
    const hrows = pick(sim.rows.map(q => [`Year ${q.y} \u00b7 age ${q.age} \u00b7 ${y0 + q.y}`, hwX(q.house), hwX(q.house / disc(q.y))]), 3);
    const reduce = Number(v.reducePercent) > 0 && Number(v.reduceAge) < until ? ` From age ${v.reduceAge}, spending drops by ${pc(Number(v.reducePercent))}, and that is already included.` : "";
    const streams = FHE.incomeStreams(v);
    let hb = `<p class="hw-p">You spend <b>${hwM(Number(v.monthly))}</b> a month (${hwM(Number(v.monthly) * 12)} a year) in today's prices. Prices rise <b>${pc(Number(v.houseInflation))}</b> a year, so each year's bill is a little bigger.${reduce} Each year's bill is then divided by (1 + ${pc(roi)}) once for every year away.</p>` +
      tbl(["Year", "That year's spending", "Worth in today's money"], hrows) +
      `<p class="hw-p">Adding up all ${N} years gives <b>${hwM(grossPV)}</b>.</p>`;
    const polS = (() => { try { return FHE.policyStreams(); } catch (e) { return []; } })();
    if (streams.length || polS.length) {
      hb += `<p class="hw-p">You also expect other income, which pays part of those bills:</p><ul class="hw-ul">` + streams.map(q => `<li>${esc(q.name ? q.name : streams.length > 1 ? "Income source " + q.k : "Other income")}: ${hwM(q.amount)} a year in today's money, ${q.fromY === q.toY ? "in " + q.fromY : "from " + q.fromY + " to " + q.toY}${q.g ? `, growing ${pc(q.g * 100)} a year` : ""}</li>`).join("") + polS.map(q => `<li>${esc(q.name || "Policy payouts")}: ${hwM(Object.keys(q.byYear || {}).reduce((t, y) => t + q.byYear[y], 0))} in all, ${q.fromY === q.toY ? "in " + q.fromY : "from " + q.fromY + " to " + q.toY}, in fixed rupees (not inflated)</li>`).join("") + `</ul>` +
        `<p class="hw-p">In today's money that income is worth <b>${hwM(incPV)}</b>, so it is taken off.</p>`;
    } else hb += `<p class="hw-p">No other income (rent, pension, part-time work) was added, so nothing is taken off.</p>`;
    h += step("Your household spending", hb, `${hwM(grossPV)}${streams.length || polS.length ? ` \u2212 ${hwM(incPV)}` : ""} = <b>Needs ${hwM(est.housePV)} today</b>`);

    // 2. earnings
    const es = FHE.earningSummary(v);
    if (es.on) {
      const A = est.endingSpendable, B = FHE.plan(v, true).endingSpendable, D = A - B, Y = D / disc(N);
      h += step("Your earnings before retirement", `<p class="hw-p">Until age ${es.retire} you earn <b>${hwM(Number(v.preEarn))}</b> a year. Each year your earnings pay that year's household spending first. Whatever is left is saved, grows at ${pc(Number(v.preRoi))} a year, and joins your corpus when you retire. That extra money means you need less today.</p>` +
        `<ul class="hw-ul"><li>Money left at age ${until} <b>with</b> your earnings: ${hwX(A)}</li><li>Money left at age ${until} <b>without</b> them: ${hwX(B)}</li><li>Difference: ${hwX(D)}</li></ul>` +
        `<p class="hw-p">That difference is a future amount, so it is shrunk to today's money: ${hwX(D)} \u00f7 (1 + ${pc(roi)})<sup>${N}</sup> = ${hwX(Y)}.</p>`,
        `Lowers what you need by ${hwM(Y)} (shown as <b>\u2212${hwM(Y)}</b>)`);
    }

    // 3. children
    for (let c = 1; c <= kids; c++) {
      const fy = Number(v["feeYears" + c]), fee = Number(v["annualFee" + c]), ei = Number(v.educationInflation), col = FHE.collegeCost(v, c);
      const wy = Number(v["weddingYears" + c]), wc = Number(v["weddingCost" + c]), wi = Number(v.weddingInflation), wd = FHE.weddingCost(v, c);
      let cb = "";
      if (fy > 0 && fee > 0) {
        const rows = [];
        for (let t = 1; t <= fy; t++) { const bill = fee * (1 + ei / 100) ** t; rows.push([`Year ${t} \u00b7 ${y0 + t - 1}`, hwX(bill), hwX(bill / disc(t))]); }
        cb += `<p class="hw-p"><b>Education.</b> College costs ${hwM(fee)} a year today for ${fy} more year${fy === 1 ? "" : "s"}. Fees rise ${pc(ei)} a year.</p>` + tbl(["Year", "Fee that year", "Worth in today's money"], pick(rows, 4)) +
          `<p class="hw-p">Adding the ${fy} year${fy === 1 ? "" : "s"}: <b>Needs ${hwM(col.present)} today</b>.</p>`;
      } else cb += `<p class="hw-p"><b>Education.</b> No college fees are left to pay, so this needs ${hwM(0)}.</p>`;
      if (wc > 0 && wy >= 0) {
        cb += `<p class="hw-p"><b>Wedding.</b> The budget is ${hwM(wc)} in today's money and the wedding is ${wy === 0 ? "now" : "in " + wy + " years (" + (y0 + wy) + ")"}. Wedding costs rise ${pc(wi)} a year, so it grows to ${hwM(wd.future)} (${hwX(wc)} \u00d7 (1 + ${pc(wi)})<sup>${wy}</sup>). Shrunk back to today: ${hwX(wd.future)} \u00f7 (1 + ${pc(roi)})<sup>${wy}</sup> = <b>Needs ${hwM(wd.present)} today</b>.</p>`;
      } else cb += `<p class="hw-p"><b>Wedding.</b> No wedding budget is set, so this needs ${hwM(0)}.</p>`;
      h += step(`Child ${c}: education and wedding`, cb, `Education ${hwM(col.present)} + wedding ${hwM(wd.present)} = <b>${hwM(col.present + wd.present)}</b>`);
    }

    // 4. reserve
    const R = Number(v.buffer) || 0, retPV = R / disc(N);
    h += step("Your emergency reserve", R > 0
      ? `<p class="hw-p">You keep <b>${hwM(R)}</b> aside for emergencies, earning ${pc(Number(v.bufferRoi) || 0)} a year. You do not spend it. It comes back to you at the end of the plan. So its real cost is only the money you give up by locking it away.</p>` +
        `<ul class="hw-ul"><li>The reserve itself: ${hwX(R)}</li><li>minus the interest it earns, in today's money: \u2212${hwX(intPV)}</li><li>minus the reserve coming back at age ${until}, in today's money: \u2212${hwX(retPV)}</li></ul>`
      : `<p class="hw-p">No emergency reserve is set, so this needs nothing.</p>`,
      `<b>Needs ${hwM(est.reservePV)} today</b>`);

    // 5. add up
    const rows = r.rows.filter(x => x.name !== "TOTAL");
    const surplus = r.available - r.needed;
    h += step("Add it all up", `<p class="hw-p">The part of your corpus that is not set aside for anything (the growth engine) has no bill to cover, so it needs nothing. Adding every need from the steps above:</p>` +
      tbl(["Item", "Needs today"], rows.map(x => [esc(x.name), hwM(x.needed)]).concat([[`<b>Total needed today (Required)</b>`, `<b>${hwM(r.needed)}</b>`]])) +
      `<p class="hw-p">You hold <b>${hwM(r.available)}</b> today. ${hwM(r.available)} \u2212 ${hwM(r.needed)} = <b>${surplus >= 0 ? "surplus" : "shortfall"} of ${hwM(Math.abs(surplus))}</b>.</p>`,
      surplus >= 0 ? `Your corpus is more than the plan needs today.` : `Your corpus is less than the plan needs today.`);
    h += `<p class="hw-fn">These are estimates based on the numbers you entered (spending, inflation and return rates). They are not financial advice.</p>`;
    return h;
  }

  function openHow() {
    const sv = savedState(), v = sv ? sv.v : FH.v, T = t => (typeof tr === "function" ? tr(t, 1) : t);
    if (!document.getElementById("fh-sx-css")) { const st = document.createElement("style"); st.id = "fh-sx-css"; st.textContent = SX_CSS; document.head.appendChild(st); }
    let dg = document.getElementById("fh-how");
    if (!dg) {
      dg = document.createElement("dialog"); dg.id = "fh-how"; dg.className = "fh-how"; dg.setAttribute("aria-labelledby", "fh-how-t");
      document.body.appendChild(dg);
      dg.addEventListener("click", e => { if (e.target === dg || (e.target.closest && e.target.closest("[data-hw-x]"))) dg.close(); });
    }
    dg.innerHTML = `<div class="hw-w"><header class="hw-h"><h3 id="fh-how-t">How is "Required" worked out?</h3><button type="button" class="hw-x" data-hw-x aria-label="Close">\u2715</button></header>` +
      `<div class="hw-b" tabindex="0">${T(howHTML(v))}</div><footer class="hw-f"><button type="button" class="hw-cl" data-hw-x>Got it</button></footer></div>`;
    if (typeof window.fhLogoBadge === "function") window.fhLogoBadge(dg);
    if (!dg.open) dg.showModal();
    const b = dg.querySelector(".hw-b"); if (b) b.scrollTop = 0;
  }
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest("[data-fh-how]")) { e.preventDefault(); openHow(); } });

  function updateFooter() {
    const list = steps(), i = list.indexOf(FH.step), last = i === list.length - 1, status = FH.sec === "status";
    $("back").hidden = !status; $("back").disabled = i <= 0;
    $("next").hidden = !(status && !last);
    $("finish").hidden = !(status && last);
    $("edit").hidden = true;
    $("report").hidden = true;
    $("dl").hidden = true;
    const tbar = root.querySelector(".tb"); if (tbar) tbar.hidden = !status;
    $("bn").hidden = status;
    const he = $("hedit"); if (he) he.textContent = status ? "\ud83d\udcca Summary" : "\u270f\ufe0f Edit Plan";
    root.classList.toggle("fh-sumv", !status);
    hdrActs();
  }

  // Shows the right top-level section: the input steps (Check Retirement Status) or the results (Financial Freedom Summary).
  function applyView() {
    if (!["status", "summary", "milestones"].includes(FH.sec)) FH.sec = "summary";
    const status = FH.sec === "status";
    $("s-status").hidden = !status; $("s-summary").hidden = FH.sec !== "summary"; $("s-milestones").hidden = FH.sec !== "milestones";
    $$("#fh-bn button").forEach(b => {
      const on = b.dataset.fhTop === FH.sec;
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (status) { show(FH.step, { keepScroll: true }); updatePill(null); }
    else {
      if (FH.sec === "summary") renderSummarySection(); else renderMilestones();
      updateFooter();
      const d = root.closest("dialog"); if (d) d.scrollTop = 0;
    }
  }

  function show(step, opts) {
    const list = steps();
    if (!list.includes(step)) step = list[0];
    FH.step = step;
    const i = list.indexOf(step);
    $$(".fh-panel").forEach(p => { p.hidden = p.dataset.fhPanel !== step; });
    $$("#fh-nav button").forEach(b => {
      const on = b.dataset.fhStep === step;
      b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
      if (on) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    });
    $("count").textContent = `Step ${i + 1} of ${list.length}`;
    $("note").hidden = true;
    updateFooter();
    const tabBtn = $("t-" + step);
    if (tabBtn && tabBtn.scrollIntoView) tabBtn.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (!opts || !opts.keepScroll) { const d = root.closest("dialog"); if (d) d.scrollTop = 0; }
    if (opts && opts.focusPanel) $("p-" + step).focus({ preventScroll: true });
  }

  function refresh() { buildNav(); updateVisibility(); updateLive(); }

  function gotoIssue(issue) {
    FH.sec = "status";
    applyView();
    show(issue.step, { keepScroll: true });
    if (issue.step === "household" && issue.sub) FH.house = issue.sub;
    if (issue.step === "planning") FH.plan = issue.sub || "ready";
    { const m = /^inc[A-Za-z]+(\d+)$/.exec(issue.field || ""); if (m) { FH.incEdit = Number(m[1]); FH.incNew = 0; } }
    if ((issue.step === "college" || issue.step === "weddings") && issue.child) FH.sel[issue.step] = issue.child;
    updateVisibility();
    clearErrs(); clearInvalid();
    setErr(issue.field, issue.message);
    const el = $(issue.field);
    if (el) { if (el.scrollIntoView) el.scrollIntoView({ block: "center" }); el.focus(); }
  }

  // Validates every step before `dest`, in order; sends the person to the first problem.
  function tryAdvance(dest) {
    const list = steps(), from = list.indexOf(FH.step), to = list.indexOf(dest);
    if (to > from) {
      for (let i = 0; i < to; i++) {
        const issues = FHE.validateStep(FH.v, list[i]);
        if (issues.length) { gotoIssue(issues[0]); return false; }
      }
    }
    clearErrs(); clearInvalid();
    show(dest);
    return true;
  }

  // Finish: every applicable field is validated first, including hidden sub-tabs; then the wizard is saved.
  function finish() {
    const issues = FHE.validateAll(FH.v);
    if (issues.length) { gotoIssue(issues[0]); return; }
    clearErrs(); clearInvalid();
    persist();
    FH.mode = "done"; FH.sec = "summary";
    applyView();
    $("s-summary").focus({ preventScroll: true });
    root.closest("dialog").scrollTop = 0;
    if (typeof toast === "function") { try { toast("Financial status saved"); } catch (e) { /* cosmetic */ } }
  }

  // Done (on the Financial Freedom Summary): validate, save, mark the final report, close; the report then shows on the page.
  function doneReport() {
    const issues = FHE.validateAll(FH.v);
    if (issues.length) { gotoIssue(issues[0]); return; }
    clearErrs(); clearInvalid();
    persist(true);
    FH.mode = "done";
    root.closest("dialog").close();
    RPT.tab = FH.smTab;
    try { if (typeof UI !== "undefined" && typeof render === "function") { UI.tab = "Retirement planner"; RP.tab = "status"; render(); window.scrollTo(0, 0); } } catch (e) { /* page refresh is cosmetic */ }
    if (typeof toast === "function") { try { toast("Added to the Retirement Planner"); } catch (e) { /* cosmetic */ } }
  }

  function editInputs() {
    if (FH.mode === "done") FH.step = "family";
    FH.sec = "status";
    applyView();
    $("p-" + FH.step).focus({ preventScroll: true });
  }

  function moveFocus(tabs, from, key) {
    const vis = tabs.filter(b => !b.hidden);
    let i = vis.indexOf(from);
    if (key === "ArrowRight") i = (i + 1) % vis.length;
    else if (key === "ArrowLeft") i = (i - 1 + vis.length) % vis.length;
    else if (key === "Home") i = 0; else if (key === "End") i = vis.length - 1;
    else return false;
    vis[i].focus();
    if (vis[i].scrollIntoView) vis[i].scrollIntoView({ block: "nearest", inline: "nearest" });
    return true;
  }

  function bind() {
    root.addEventListener("input", e => {
      const id = e.target.dataset && e.target.dataset.fh;
      if (!id) return;
      FH.v[id] = e.target.value;
      const amtEl = $(id + "-amt"); if (amtEl) amtEl.textContent = amtText(e.target.value);
      setErr(id, "");
      if (FH.mode === "done") FH.mode = "wizard";            // edited after saving: the summary now shows unsaved entries
      if (FH.defAlloc && ALLOC_IDS.includes(id)) { FH.defAlloc = false; const cb = $("defalloc"); if (cb) cb.checked = false; }   // typing an amount takes over from the default
      if (id === "children") { refresh(); show("family", { keepScroll: true }); }
      else { autofillFromFamily(id); updateLive(); }
      if (FH.defAlloc && (id === "corpus" || id === "children")) applyDefaultAllocation();     // follow the corpus / number of children while ticked
    });
    root.addEventListener("change", e => {
      if (e.target && e.target.id === "fh-preon") {
        FH.v.preOn = e.target.checked ? "1" : "0";
        for (const i of ["preEarn", "preRoi", "retire"]) setErr(i, "");
        if (FH.mode === "done") FH.mode = "wizard";
        updateLive(); return;
      }
      if (e.target && e.target.id === "fh-incon") {
        FH.v.incomeOn = e.target.checked ? "1" : "0";
        if (e.target.checked) {                                          // first time on: stream 1 runs from now to the end of the plan
          const w = FHE.incomeWindow(FH.v);
          if (!FH.v.incFrom1) setField("incFrom1", w.from);
          if (!FH.v.incTo1) setField("incTo1", w.to);
        }
        for (let k = 1; k <= incCount(); k++) for (const pr of INC_PARTS) setErr(pr + k, "");
        FH.incUndo = null;
        if (e.target.checked && !Number(FH.v.incAmt1)) { FH.incEdit = 1; FH.incNew = 1; } else { FH.incEdit = 0; FH.incNew = 0; }   // a first, empty source opens its editor
        if (FH.mode === "done") FH.mode = "wizard";
        updateIncomeUI(); updateLive();
        if (FH.incEdit) { const el = $("incName1"); if (el) el.focus(); }
        return;
      }
      if (e.target && e.target.id === "fh-defalloc") { FH.defAlloc = e.target.checked; if (FH.defAlloc) applyDefaultAllocation(); }
    });
    root.addEventListener("submit", e => e.preventDefault());
    root.addEventListener("click", e => {
      const hero = e.target.closest("[data-fh-hero]");
      if (hero) { editInputs(); return; }
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.fhTop) { FH.sec = b.dataset.fhTop; applyView(); }
      else if (b.dataset.fhStep) tryAdvance(b.dataset.fhStep);
      else if (b.dataset.fhHouse) { FH.house = b.dataset.fhHouse; updateVisibility(); }
      else if (b.dataset.fhPlan) { FH.plan = b.dataset.fhPlan; updateVisibility(); }
      else if (b.id === "fh-incadd") addStream();
      else if (b.dataset.fhIncedit) editStream(Number(b.dataset.fhIncedit));
      else if (b.dataset.fhIncdel) deleteStream(Number(b.dataset.fhIncdel));
      else if (b.dataset.fhIncdone) finishStream(Number(b.dataset.fhIncdone));
      else if (b.dataset.fhInccancel) cancelStream(Number(b.dataset.fhInccancel));
      else if (b.id === "fh-incundo") undoDelete();
      else if (b.dataset.fhCt) { FH.sel[b.dataset.fhSec] = Number(b.dataset.fhCt); updateVisibility(); }
      else if (b.dataset.fhSx) { FH.smTab = b.dataset.fhSx; renderSummaryX(); const t = root.querySelector('[data-fh-sx="' + FH.smTab + '"]'); if (t) t.focus({ preventScroll: true }); }
      else if (b.id === "fh-hx") root.closest("dialog").close();
      else if (b.id === "fh-hedit") { if (FH.sec === "status") { FH.sec = "summary"; applyView(); } else editInputs(); }
      else if (b.dataset.fhEdit) editInputs();
      else if (b.id === "fh-sx-dl") downloadReport(FH.sec === "milestones" ? "milestones" : "summary");
      else if (b.id === "fh-sx-add") doneReport();
      else if (b.id === "fh-dl") downloadReport();
      else if (b.id === "fh-next") { const l = steps(); if (tryAdvance(l[Math.min(l.indexOf(FH.step) + 1, l.length - 1)])) $("p-" + FH.step).focus({ preventScroll: true }); }
      else if (b.id === "fh-back") { const l = steps(); show(l[Math.max(l.indexOf(FH.step) - 1, 0)], { focusPanel: true }); }
      else if (b.id === "fh-finish") finish();
      else if (b.id === "fh-edit") editInputs();
      else if (b.id === "fh-report") doneReport();
      else if (b.id === "fh-close") root.closest("dialog").close();
    });
    root.addEventListener("keydown", e => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-fh-hero]")) { e.preventDefault(); editInputs(); return; }
      const t = e.target.closest && e.target.closest('[role="tab"]');
      if (!t) return;
      const tabs = Array.from(t.parentElement.querySelectorAll('[role="tab"]'));
      if (moveFocus(tabs, t, e.key)) e.preventDefault();
    });
  }

  /* ---------- printing (Ctrl+P): a clean copy in normal page flow, because a modal <dialog> cannot paginate ---------- */
  function buildPrintArea() {
    removePrintArea();
    if (!root || !root.isConnected || !document.documentElement.classList.contains("fh-on")) return;
    let src;
    fillDetail("sm-"); src = $("sm-detail");
    const pa = document.createElement("div");
    pa.id = "fh-pa";
    const h = document.createElement("h1"); h.textContent = "Retirement Planner · plan estimate";
    const when = document.createElement("p"); when.className = "fh-pa-date";
    when.textContent = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
      " · Amounts in ₹ · All returns and inflation rates are assumptions, not guarantees.";
    const copy = src.cloneNode(true);
    copy.hidden = false; copy.removeAttribute("id"); copy.removeAttribute("tabindex");
    copy.querySelectorAll("[id]").forEach(e => e.removeAttribute("id"));
    copy.querySelectorAll("details").forEach(d => { d.open = true; });
    pa.append(h, when, copy);
    document.body.appendChild(pa);
  }
  function removePrintArea() { const pa = document.getElementById("fh-pa"); if (pa) pa.remove(); }
  window.addEventListener("beforeprint", buildPrintArea);
  window.addEventListener("afterprint", removePrintArea);

  /* ---------- open in the shared dialog, like Add holding ---------- */
  /* ---------- the Retirement planner page: two sections; each opens the existing pop-up ---------- */
  /* Final report: laid out like the Dashboard (same dz-* components, scoped under #dsh). Presentation only:
     every figure comes from FHE.calculate / the engine helpers, nothing is recalculated here. */
  function reportHTML(v, t) {
    const r = FHE.calculate(v);
    if (!r.ok) return "";
    const M = typeof cr === "function" ? cr : FHE.currency;
    const sg = x => x < 0 ? `(${M(-x)})` : M(x);
    const year = new Date().getFullYear(), n = Number(v.children) === 1 || Number(v.children) === 2 ? Number(v.children) : 0;
    const until = Number(v.until), years = until - Number(v.age);
    const when = t ? new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
    const cover = r.needed > 0 ? r.available / r.needed * 100 : 100;      // how much of the estimated need the corpus covers
    const ok = cover >= 100, mid = cover >= 75, bw = Math.max(0, Math.min(100, cover));
    const stt = ok ? ["Fully Funded", "dz-o"] : mid ? ["Within Reach", "dz-m"] : ["Shortfall", "dz-b"];
    const runs = r.plan.runout !== null, grow = FHE.growthEngine(v), inc = FHE.incomeSummary(v);
    const hz = FHE.horizonText(v).split(", ");
    const kpi = (g, ey, val, vcls, cap, ccls) => `<div class="dz-kpi" style="--g:${g}"><p class="dz-ey">${ey}</p><p class="dz-kv ${vcls || ""}">${esc(val)}</p><p class="dz-kc ${ccls || ""}">${esc(cap)}</p></div>`;
    const card = (ey, h, inner, tag, cls) => `<section class="dz-card${cls ? " " + cls : ""}"><div class="dz-ch"><div><p class="dz-ey">${ey}</p><h2>${h}</h2></div>${tag ? `<div class="dz-tag">${tag}</div>` : ""}</div>${inner}</section>`;

    const status = card("Executive Status", "Your financial freedom status",
      `<div class="dz-kp">` +
        kpi("var(--brand)", "Money Needed Today", M(r.needed), "", `Estimated over ${years} years`) +
        kpi("#10b981", "Money Available Today", M(r.available), "", "Total corpus today", "dz-o") +
        kpi(r.surplus >= 0 ? "#10b981" : "#f43f5e", r.surplus >= 0 ? "Surplus" : "Shortfall", sg(r.surplus), r.surplus >= 0 ? "dz-o" : "dz-b",
          r.surplus >= 0 ? "Corpus covers the estimated need" : "Corpus falls short of the estimated need", r.surplus >= 0 ? "dz-o" : "dz-b") +
      `</div>
<div class="dz-rm"><div class="dz-rmh"><div><p class="dz-ey">Funding Coverage</p><div class="dz-rms"><span class="dz-rsc">${cover.toFixed(1)}%</span><span class="dz-rst ${stt[1]}">${stt[0]}</span></div></div><div class="dz-gp ${runs ? "dz-w" : "dz-o"}"><span>${esc(r.runoutText)}</span></div></div>
<div class="dz-rb" role="progressbar" aria-label="Funding coverage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${bw.toFixed(1)}"><i class="${ok ? "dz-o" : ""}" style="width:${bw}%"></i></div>
<div class="dz-rs"><span>Starting</span><span>50%</span><span>100% Fully funded</span></div></div>
<div class="dz-sum"><div><p class="dz-mini">Planning Period</p><p class="dz-sv">${esc(hz[0])}</p><p class="dz-sn">${esc(hz[1] || "")}</p></div>
<div><p class="dz-mini">Growth Engine</p><p class="dz-sv dz-o">${M(grow)}</p><p class="dz-sn">left over after allocations</p></div>
<div><p class="dz-mini">Money Runs Out</p><p class="dz-sv ${runs ? "dz-w" : "dz-o"}">${runs ? "Age " + r.plan.runout : "Not by " + until}</p><p class="dz-sn">${runs ? "first negative year-end balance" : "balance stays positive"}</p></div>
<div><p class="dz-mini">Other Regular Income</p><p class="dz-sv">${inc.has ? M(inc.amount) : "None"}</p><p class="dz-sn">${inc.has ? esc(inc.yearsText + ", growing " + inc.growthText) : "none entered"}</p></div></div>`);

    const insights = card("Projection Intelligence", "Funding insights",
      `<div class="dz-in"><article class="${r.surplus >= 0 ? "dz-g" : "dz-r"}"><p class="dz-ik">Funding position</p><p>${r.surplus >= 0
          ? `Your ${M(r.available)} covers the estimated ${M(r.needed)} need, leaving a surplus of ${M(r.surplus)}.`
          : `The estimated need of ${M(r.needed)} is ${M(-r.surplus)} more than your ${M(r.available)}.`}</p></article>
<article class="dz-p"><p class="dz-ik">Growth engine</p><p>${M(grow)} of your corpus is not set aside for a purpose and keeps growing at the assumed return.</p></article>
<article class="dz-a"><p class="dz-ik">Timing impact</p><p>${runs ? `The modeled spendable balance first turns negative around age ${r.plan.runout}.` : `The modeled spendable money stays positive through age ${until}.`}</p></article></div>`, "Auto-generated", n ? "" : "fh-wide");

    let ms = "";          // Family Milestones: education + wedding boxes for every child, in one compact row
    if (n) {
      let k = "";
      for (let c = 1; c <= n; c++) {
        const ew = eduWhen(v, c, year);
        k += kpi("#10b981", `Child ${c} · Education Completes`, ew.year, "dz-a", ew.age === "—" ? "" : ew.age === "Add age in Family" ? "Child age not entered" : `Child will be ${ew.age.toLowerCase()}`);
      }
      for (let c = 1; c <= n; c++) {
        const wy = FHE.weddingYear(v, c, year);
        k += kpi("var(--brand)", `Child ${c} · Wedding Year`, wy === null ? "—" : String(wy), "dz-a", `Budget at wedding date ${M(FHE.weddingCost(v, c).future)}`);
      }
      ms = card("Family Milestones", "Education and weddings", `<div class="dz-kp fh-ms">${k}</div>`);
    }

    const alloc = allocHTML(v, "");

    const rows = r.rows.map(x => { const g = x.setAside - x.needed; return `<tr${x.name === "TOTAL" ? ' class="fh-total"' : ""}><td>${esc(x.name)}</td><td>${FHE.currency(x.setAside)}</td><td>${FHE.currency(x.needed)}</td><td class="${g < 0 ? "dz-b" : "dz-o"}">${gap(g)}</td></tr>`; }).join("");
    const table = card("Funding Breakdown", "Purpose-by-purpose funding",
      `<div class="fh-tblw"><table><thead><tr><th scope="col">Purpose</th><th scope="col">Set aside</th><th scope="col">Needed today</th><th scope="col">Surplus / (gap)</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="dz-note">${esc(r.explanation)} All returns and inflation rates are assumptions and are not guaranteed.</p>
<div class="acts"><button type="button" data-fh-open="status">Edit inputs</button><button type="button" data-fh-open="summary">Open detailed summary</button></div>`);

    return `<div id="dsh" class="fh-dsh"><header class="dz-hero"><div class="dz-hl"><div role="navigation" aria-label="Breadcrumb" class="dz-bc"><span>Wealth Management</span><span aria-hidden="true">•</span><span>Retirement Planner</span></div><p>Your final financial freedom report: what you need today, how your money is funded and when it could run out, based on the assumptions you entered.</p></div><div class="dz-hr"><span class="dz-live"><i aria-hidden="true"></i>Final report</span>${when ? `<span class="dz-dt">Completed ${esc(when)}</span>` : ""}</div></header>
${status}${ptHTML(v)}${simHTML(v)}${insights}${ms}${alloc}${table}</div>`;
  }


  /* ---------- Plan Simulation: one slider (your age to 100) -> year-by-year table ----------
     View only: it reads the saved plan and changes nothing. */
  let simAge = null;
  const simM = x => (typeof cr === "function" ? cr : FHE.currency)(x);
  /* Shorthand money for small screens: ₹3.0 Cr, ₹1.8 L, ₹35 K (sign and /mo are added by the caller). */
  const sh = n => {
    const a = Math.abs(n), u = (k, d) => (typeof UN === "function" ? UN(k, d) : d);
    if (!Number.isFinite(a)) return "\u2014";
    const t = a >= 1e7 ? (a / 1e7).toFixed(1) + u("cr", " Cr") : a >= 1e5 ? (a / 1e5).toFixed(1) + u("l", " L") : a >= 1e3 ? Math.round(a / 1e3) + " K" : String(Math.round(a));
    return (n < 0 ? "\u2212" : "") + "\u20b9" + t;
  };
  const ensureSxCss = () => { if (!document.getElementById("fh-sx-css")) { const st = document.createElement("style"); st.id = "fh-sx-css"; st.textContent = SX_CSS; document.head.appendChild(st); } };
  const simTr = h => (typeof tr === "function" ? tr(h, 1) : h);
  /* Slider status at the chosen age: red = money runs out by then, orange = funded but a warning (plan not fully funded, or the balance is under one year of spending), green = all good. */
  const simSt = (v, age) => {
    try {
      const rows = FHE.schedule(v, age);
      if (rows.some(x => x.status !== "Funded")) return "bad";
      const r = FHE.calculate(v), cover = r.needed > 0 ? r.available / r.needed * 100 : 100, last = rows[rows.length - 1];
      if (cover < 100 || (rows.length > 1 && last.bal < last.out)) return "mid";
      return "ok";
    } catch (e) { return "ok"; }
  };
  /* Yearly expenses shown on the slider: what the plan spends in the year at the chosen age (household + college fees + weddings). The first age is the "today" row. */
  const simExpHTML = (v, age) => {
    try {
      const rows = FHE.schedule(v, age), r = rows[rows.length - 1], ex = Math.max(r.out, 0), hs = Math.min(Math.max(r.house, 0), ex), oth = Math.max(ex - hs, 0);
      return `<small>Yearly expenses at age ${age}${rows.length === 1 ? " (today)" : ""}</small><b>${sh(ex)}<em>/yr</em></b><small>Household ${sh(hs)}${oth > 0.5 ? ` \u00b7 College & weddings ${sh(oth)}` : ""} \u00b7 ${sh(ex / 12)}/mo</small>`;
    } catch (e) { return ""; }
  };
  const simFill = (val, mn, mx, v) => { const pc = mx > mn ? (val - mn) / (mx - mn) * 100 : 0, c = `var(--sl-${v ? simSt(v, val) : "ok"})`; return `linear-gradient(to right,${c} 0%,${c} ${pc}%,var(--bd) ${pc}%,var(--bd) 100%)`; };
  function simRange(v) {
    const age = Number(v.age), until = Number(v.until), max = Math.max(100, until);
    if (simAge === null || simAge < age || simAge > max) simAge = until;
    return { age, until, max };
  }
  function simTableHTML(v, to) {
    const rows = FHE.schedule(v, to);
    let ti = 0, to2 = 0;
    const body = rows.map(r => {
      ti += r.in; to2 += r.out;
      const cls = r.status === "Funded" ? "" : r.status === "Runs out" ? "sx-wa" : "sx-lo";
      return `<tr><td>${r.age}<small>${r.year}</small></td><td>${sh(r.in)}</td><td>${sh(r.out)}</td><td class="${cls}" title="Balance after this year: ${esc(simM(r.bal))}">${sh(r.bal)}<small>${r.status}</small></td></tr>`;
    }).join("");
    return `<div class="sx-tw rp2-tw"><table class="sx-t" aria-label="Year-by-year money in and out"><thead><tr><th scope="col">Age</th><th scope="col">In</th><th scope="col">Out</th><th scope="col">Left</th></tr></thead><tbody>${body}</tbody><tfoot><tr><td>Total</td><td>${sh(ti)}</td><td>${sh(to2)}</td><td></td></tr></tfoot></table></div>
<p class="sx-key">In = growth, other income and reserve interest (plus earnings and savings-fund interest while you are still earning). Out = household, college fees and weddings. Left = spendable money after that year, including the savings fund.</p>`;
  }
  function simHouseHTML(v, to) {
    const rows = FHE.schedule(v, to), last = rows[rows.length - 1];
    const annual = rows.length > 1 ? last.house : 12 * Number(v.monthly), total = rows.reduce((s, r) => s + r.house, 0);
    const out = rows.reduce((s, r) => s + r.out, 0), share = out > 0 ? total / out * 100 : 0;
    return `<div><small>Household at ${to}</small><b>${sh(annual / 12)}/mo</b></div><div><small>Total to ${to}</small><b>${sh(total)}</b></div><div><small>Share of spending</small><b>${share.toFixed(0)}%</b></div>`;
  }
  function simHTML(v) {
    const b = simRange(v);
    return `<section class="dz-card" id="fh-sim" aria-labelledby="fh-sim-h"><div class="dz-ch"><div><p class="dz-ey">Plan Simulation</p><h2 id="fh-sim-h">Adjust your goal assumptions</h2></div><span class="dz-tag dz-s">Interactive</span></div>
<div class="dz-ctl" style="grid-template-columns:1fr"><div class="dz-box"><div class="dz-bh"><label for="fh-ua" class="dz-ey">Show Plan Up To Age</label><output id="fh-ul" for="fh-ua" class="dz-pill" data-st="${simSt(v, simAge)}">Age ${simAge} · ${simAge - b.age} yrs</output></div><div class="stp"><button type="button" id="fh-um" aria-label="Decrease age by one year"${simAge <= b.age ? " disabled" : ""}>−</button><input id="fh-ua" type="range" min="${b.age}" max="${b.max}" step="1" value="${simAge}" data-st="${simSt(v, simAge)}" style="background:${simFill(simAge, b.age, b.max, v)}" aria-label="Show the plan up to this age"><button type="button" id="fh-up" aria-label="Increase age by one year"${simAge >= b.max ? " disabled" : ""}>+</button></div><div class="dz-rng"><span>${b.age} Yrs</span><span>Current: ${b.age}</span><span>${b.max} Yrs</span></div><div class="fh-exp" id="fh-exp" aria-live="polite">${simExpHTML(v, simAge)}</div></div></div>
<div id="fh-sim-tbl" aria-live="polite">${simTableHTML(v, simAge)}</div>
<div class="fh-hx" id="fh-sim-house" aria-live="polite">${simHouseHTML(v, simAge)}</div></section>`;
  }
  function simSet(a) {
    const sv = savedState();
    if (!sv) return;
    const b = simRange(sv.v);
    simAge = Math.min(b.max, Math.max(b.age, Math.round(a)));
    const $s = id => document.getElementById(id), ua = $s("fh-ua");
    if (!ua) return;
    ua.value = simAge; ua.style.background = simFill(simAge, b.age, b.max, sv.v); const st0 = simSt(sv.v, simAge); ua.setAttribute("data-st", st0); const ul0 = $s("fh-ul"); if (ul0) ul0.setAttribute("data-st", st0);
    $s("fh-ul").textContent = `Age ${simAge} \u00b7 ${simAge - b.age} yrs`; const ex0 = $s("fh-exp"); if (ex0) ex0.innerHTML = simTr(simExpHTML(sv.v, simAge));
    $s("fh-um").disabled = simAge <= b.age; $s("fh-up").disabled = simAge >= b.max;
    const t = $s("fh-sim-tbl"), h = $s("fh-sim-house"), ys = $s("rp2-yy-s");
    if (t) t.innerHTML = simTr(simTableHTML(sv.v, simAge));
    if (h) h.innerHTML = simTr(simHouseHTML(sv.v, simAge));
    if (ys) ys.textContent = `to age ${simAge}`;
    document.querySelectorAll("[data-rp2-age]").forEach(c => c.setAttribute("aria-pressed", String(Number(c.dataset.rp2Age) === simAge)));
    allocRefresh(sv.v);
  }
  document.addEventListener("input", e => { if (e.target && e.target.id === "fh-ua") simSet(Number(e.target.value)); });
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("#fh-um,#fh-up");
    if (b && simAge !== null) simSet(simAge + (b.id === "fh-um" ? -1 : 1));
  });

  /* ---------- Fund Allocation: same donut + bars as the Dashboard's Asset Allocation, with Today / At age ----------
     "At age" follows the Plan Simulation slider. */
  let allocMode = "at";
  const ALLOC_COL = ["#1f6feb", "#2f9e44", "#d6336c", "#0d9488", "#8b5cf6", "#f08c00", "#868e96"];
  function allocHTML(v, cls) {
    simRange(v);
    const at = allocMode === "at", M = simM, age = Number(v.age);
    const items = FHE.bucketsAt(v, at ? simAge : null).map((x, i) => Object.assign({ c: ALLOC_COL[i % ALLOC_COL.length] }, x));
    const pos = items.filter(x => x.value > 0), neg = items.filter(x => x.value < -0.5), sp = pos.reduce((s, x) => s + x.value, 0);
    const total = items.reduce((s, x) => s + x.value, 0), pc = x => sp ? x / sp * 100 : 0;
    let acc = 0;
    const arcs = pos.map(x => { const s = pc(x.value), o = acc; acc += s; return `<circle cx="110" cy="110" r="82" fill="none" stroke="${x.c}" stroke-width="24" pathLength="100" stroke-dasharray="${Math.max(0, s - .4).toFixed(2)} ${(100 - Math.max(0, s - .4)).toFixed(2)}" stroke-dashoffset="${(-o).toFixed(2)}"><title>${esc(x.name)} ${s.toFixed(1)}%</title></circle>`; }).join("");
    const bars = pos.map(x => { const s = pc(x.value); return `<div><div class="dz-bt"><span class="dz-bn"><i style="background:${x.c}"></i>${esc(x.name)}</span><span class="dz-bp">${s.toFixed(1)}% <em>· ${M(x.value)}</em></span></div><div class="dz-bb" role="progressbar" aria-label="${esc(x.name)} share of total" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.toFixed(1)}"><i style="width:${s}%;background:${x.c}"></i></div></div>`; }).join("")
      + neg.map(x => `<div><div class="dz-bt"><span class="dz-bn"><i style="background:${x.c}"></i>${esc(x.name)}</span><span class="dz-bp dz-b">Shortfall <em>· (${M(-x.value)})</em></span></div><div class="dz-bb" aria-hidden="true"><i style="width:0"></i></div></div>`).join("");
    return `<section class="dz-card${cls ? " " + cls : ""}" id="fh-alloc" aria-labelledby="fh-alloc-h"><div class="dz-ch"><div><p class="dz-ey">Fund Allocation</p><h2 id="fh-alloc-h">Where your corpus is set aside</h2></div><div class="seg" role="group" aria-label="Show allocation for"><button type="button" data-fh-ab="now" aria-pressed="${!at}">Today</button><button type="button" data-fh-ab="at" aria-pressed="${at}">At age ${simAge}</button></div></div>
<div class="dz-al"><div class="dz-bars">${bars}</div>
<div class="dz-dn"><div class="dz-dw"><svg viewBox="0 0 220 220" role="img" aria-label="Corpus by purpose donut chart: ${pos.map(x => esc(x.name) + " " + pc(x.value).toFixed(0) + " percent").join(", ")}"><circle cx="110" cy="110" r="82" fill="none" stroke="var(--bd)" stroke-width="24"/>${total < -0.5 ? '<circle cx="110" cy="110" r="70" fill="#dc2626"/>' : ""}${arcs}</svg><div class="dz-dc${total < -0.5 ? " fh-neg" : ""}"><p class="dz-mini">${at ? "Projected" : "Today"}</p><p class="dz-dv">${M(total)}</p><p class="dz-sn">${at ? "at age " + simAge : "set aside today"}</p></div></div></div></div>
<p class="dz-fn">${at ? `Each purpose is carried to age ${simAge} with its own spending, fees and weddings at your assumed return. Move the Plan Simulation slider to change the age.` : "The amounts you set aside today, by purpose."}${neg.length ? " A shortfall means that purpose is underfunded by then." : ""}</p></section>`;
  }
  function allocRefresh(v) {
    const old = document.getElementById("fh-alloc");
    if (!old) return;
    const tmp = document.createElement("div"); tmp.innerHTML = simTr(allocHTML(v, ["fh-wide", "rp2-flat"].filter(c => old.classList.contains(c)).join(" ")));
    old.replaceWith(tmp.firstElementChild);
  }
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-fh-ab]");
    if (!b) return;
    const sv = savedState();
    if (!sv) return;
    allocMode = b.dataset.fhAb === "now" ? "now" : "at";
    allocRefresh(sv.v);
  });

  /* ---------- Horizon Report (Reports tab): the whole Retirement plan, year by year ---------- */
  const hzNamedIncome = name => {
    const clean = String(name || "").trim().replace(/\s+income$/i, "").trim();
    if (/^rent$/i.test(clean)) return "Rental Income";
    if (/^agriculture$/i.test(clean)) return "Agriculture Income";
    const formatted = clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Other";
    return `${formatted} Income`;
  };
  function hzIncomeSources(v) {
    if (String(v.incomeOn) !== "1") return [];
    const count = Number(v.incomeCount);
    if (!Number.isSafeInteger(count) || count < 1) return [];
    const seen = new Map();
    return Array.from({ length: count }, (_, index) => {
      const k = index + 1, name = hzNamedIncome(v["incName" + k] || "Income Source " + k);
      const occurrences = (seen.get(name) || 0) + 1;
      seen.set(name, occurrences);
      return { k, label: name, occurrence: occurrences };
    });
  }
  function hzPolicySources() {
    const seen = new Map();
    const policies = FHE.policyStreams().map((stream, index) => {
      const name = String(stream.name || `Policy ${index + 1}`).replace(/^Policy:\s*/i, "").trim();
      const occurrences = (seen.get(name) || 0) + 1;
      seen.set(name, occurrences);
      return { k: stream.k, name, occurrence: occurrences };
    });
    const totals = new Map();
    policies.forEach(p => totals.set(p.name, (totals.get(p.name) || 0) + 1));
    return policies.map(p => ({ k: p.k, label: `${p.name} Payout${totals.get(p.name) > 1 ? ` ${p.occurrence}` : ""}` }));
  }
  function hzUniqueColumnLabels(groups) {
    const used = new Set(), occurrences = new Map();
    groups.forEach(group => group.cols.forEach(column => {
      const label = column.label;
      let n = occurrences.get(label) || 1, unique = label;
      while (used.has(unique)) unique = `${label} (${++n})`;
      occurrences.set(label, n);
      used.add(unique);
      column.label = unique;
    }));
    return groups;
  }
  function hzColumns(kids, earn, v) {
    const policies = (() => { try { return hzPolicySources(); } catch (e) { return []; } })();
    const sources = hzIncomeSources(v);
    const incomeTotals = new Map();
    sources.forEach(s => incomeTotals.set(s.label, (incomeTotals.get(s.label) || 0) + 1));
    const kid = (label, key, tone) => { const o = []; for (let c = 1; c <= kids; c++) o.push({ label: `Child ${c} ${label}`, get: r => r[key][c], zero: true, sum: tone === "expense", tone }); return o; };
    const g = [
      { title: "When", cols: [{ label: "Serial No", get: r => String(r.__i + 1), txt: 1, sno: 1 }, { label: "Year", get: r => String(r.year), txt: 1 }, { label: "Age at Year-End", get: r => String(r.age), txt: 1 },
        ...(earn ? [{ label: "Phase", get: r => r.phase, txt: 1 }] : []),
        { label: "Key Events", get: r => r.what, txt: 1, wide: 1 }] },
      { title: "Household living", cols: [{ label: "Monthly Household Expense", get: r => r.monthly, zero: true, tone: "expense" },
        { label: "Annual Household Expense", get: r => r.house, zero: true, sum: 1, tone: "expense" }] }
    ];
    if (kids) g.push({ title: "Kids — college & weddings", cols: kid("College Fees", "fee", "expense").concat(kid("Wedding Cost", "wed", "expense")) });
    g.push({ title: "Money out", cols: [{ label: "Total Expenses", get: r => r.spent, bold: 1, sum: 1, tone: "expense" }] });
    if (earn) g.push({ title: "Earning phase", cols: [
      { label: "Earnings Received", get: r => r.earn, zero: true, sum: 1, tone: "income" },
      { label: "Expenses Paid by Earnings & Savings", get: r => r.paidByEarn, zero: true, sum: 1, tone: "expense" },
      { label: "Expenses Paid from Corpus", get: r => r.fromCorpus, zero: true, sum: 1, tone: "expense" },
      { label: "Net Savings", get: r => r.netSaved, zero: true, sum: 1 },
      { label: "Savings fund at START", get: r => r.startS, zero: true },
      { label: "Savings Fund Interest", get: r => r.interestS, zero: true, sum: 1, tone: "income" },
      { label: "Savings fund at END", get: r => r.endS, zero: true },
      { label: "Savings Fund Added to Corpus", get: r => r.merged, zero: true, sum: 1, tone: "income" }] });
    g.push(
      { title: "Start", cols: [{ label: "Opening Corpus", get: r => r.start }] },
      { title: "Money coming in", cols: [{ label: "Investment Interest", get: r => r.interest, sum: 1, tone: "income" }, { label: "Emergency Fund Interest", get: r => r.reserveInterest, zero: true, sum: 1, tone: "income" },
        ...(sources.length ? sources.map(s => ({ label: `${s.label}${incomeTotals.get(s.label) > 1 ? ` ${s.occurrence}` : ""}`, get: r => r.incomeBySource && r.incomeBySource[s.k] || 0, zero: true, sum: 1, tone: "income" })) :
          [{ label: "Other Income", get: r => r.income - r.policy, zero: true, sum: 1, tone: "income" }]),
        ...policies.map(p => ({ label: p.label, get: r => r.policyBySource && r.policyBySource[p.k] || 0, zero: true, sum: 1, tone: "income" })),
        { label: "Total Income", get: r => r.moneyIn, bold: 1, sum: 1, tone: "income" }] },
      { title: "End", cols: [{ label: "Closing Corpus", get: r => r.end, bold: 1 }, { label: "Funding Status", get: r => r.status, txt: 1, status: 1 }] });
    hzUniqueColumnLabels(g);
    return window.RCOLS && RCOLS.hzOrder ? RCOLS.hzOrder(g) : g;
  }
  const hzWhat = t => String(t) === "Regular year" ? esc(t) : String(t).split(" · ").map(e => `<span class="hz-ev">${esc(e)}</span>`).join(" · ");
  const hzMoney = (x, zero) => x === 0 && zero ? "—" : x < 0 ? `(${FHE.currency(-x)})` : FHE.currency(x);
  const hzEarn = v => FHE.earningYears(v) > 0;
  const hzKids = v => Number(v.children) === 1 || Number(v.children) === 2 ? Number(v.children) : 0;
  window.hzGroupTitles = () => { try { const sv = savedState(); if (!sv || FHE.validateAll(sv.v).length) return null; return hzColumns(hzKids(sv.v), hzEarn(sv.v), sv.v).map(x => x.title); } catch (e) { return null; } };
  function hzView() {
    const sv = savedState();
    if (!sv || FHE.validateAll(sv.v).length) return null;
    const v = sv.v, earn = hzEarn(v), flat = [].concat(...hzColumns(hzKids(v), earn, v).map(g => g.cols));
    let rows = FHE.horizonReport(v).map((r, i) => (r.__i = i, r));
    if (earn && (RP.ph === "Earning" || RP.ph === "Retired")) rows = rows.filter(r => r.phase === RP.ph);
    const q = String(RP.q || "").trim().toLowerCase().replace(/[₹,\s]/g, "");
    if (q) rows = rows.filter(r => flat.some(c => { if (c.sno) return false; const x = c.get(r); return (c.txt ? String(x) : hzMoney(x, c.zero) + " " + Math.round(x)).toLowerCase().replace(/[₹,\s()]/g, "").includes(q); }));
    const k = Number(RP.k);
    if (k >= 0 && flat[k]) {
      const g = flat[k].get, n = x => (isFinite(Number(x)) && String(x).trim() !== "" ? Number(x) : null);
      rows = rows.slice().sort((a, b) => { const x = g(a), y = g(b), nx = n(x), ny = n(y); return (nx !== null && ny !== null ? nx - ny : String(x).localeCompare(String(y))) * RP.d || a.__i - b.__i; });
    } else if (RP.d < 0) rows = rows.slice().reverse();
    return { v, flat, rows, cols: hzColumns(hzKids(v), earn, v) };
  }
  const hzC = x => { const a = Math.abs(x), n = a >= 1e7 ? (a / 1e7).toFixed(2) + " Cr" : a >= 1e5 ? (a / 1e5).toFixed(2) + " L" : null; return n ? (x < 0 ? "(₹" + n + ")" : "₹" + n) : hzMoney(x); };
  function hzPhaseBar(v, shown) {
    if (!hzEarn(v)) return "";
    const all = FHE.horizonReport(v), es = FHE.earningSummary(v), pre = all.filter(r => r.phase === "Earning"), sum = f => pre.reduce((t, r) => t + f(r), 0);
    const last = pre[pre.length - 1], M = x => hzC(x), c = (l, val) => `<div><small>${l}</small><b>${val}</b></div>`;
    return `<div class="mu" style="margin:6px 0 2px;font-size:12px">Pre-retirement plan: age ${es.from} to ${es.retire} (${es.years} year${es.years === 1 ? "" : "s"}), then retirement to ${es.until}. Use the phase filter to see one stage.</div>
<div class="hz-es">${c("Earnings over " + es.years + " yrs", M(sum(r => r.earn)))}${c("Spent over " + es.years + " yrs", M(sum(r => r.spent)))}${c("Paid from corpus", M(sum(r => r.fromCorpus)))}${c("Savings fund interest", M(sum(r => r.interestS)))}${c("Savings fund moved in", M(sum(r => r.merged)))}${c("Corpus at retirement", last ? M(last.end) : "—")}</div>`;
  }
  function hzTable() {
    const w = hzView();
    if (!w) return "";
    const { flat, rows } = w, sel = Number(RP.sel);
    if (!rows.length) return `<div class="mu" style="padding:14px">No rows match your search.</div>`;
    const h = flat.map(c => { const i = flat.indexOf(c), on = Number(RP.k) === i; return `<th scope="col"${c.wide ? ' class="hz-w"' : ""} aria-sort="${on ? (RP.d > 0 ? "ascending" : "descending") : "none"}"><button type="button" data-hzk="${i}">${esc(c.label)}${on ? (RP.d > 0 ? " ▲" : " ▼") : ""}</button></th>`; }).join("");
    const val = (c, r) => { const v = c.get(r); return c.txt || c.status ? esc(v) : c.zero && v === 0 ? "—" : hzC(v); };
    const cell = (c, r) => {
      const v = c.get(r);
      const tone = c.tone ? ` hz-${c.tone}` : "";
      if (c.status) return `<td class="hz-s ${v === "Funded" ? "dz-o" : v === "Runs out" ? "dz-w" : "dz-b"}">${esc(v)}</td>`;
      if (c.txt) return `<td class="${c.wide ? "hz-w" : "hz-c"}${tone}">${c.wide ? hzWhat(v) : esc(v)}</td>`;
      return `<td class="${v < 0 ? "dz-b" : ""}${tone}" title="${esc(hzMoney(v, false))}">${val(c, r)}</td>`;
    };
    const on = r => r.__i === sel ? " sel" : "";
    const isRet = r => !r.today && !FHE.isBlank(w.v.retire) && Number(r.age) === Number(w.v.retire) ? " ret" : "";   // the year you retire: highlighted yellow
    const body = rows.map(r => `<tr data-hzr="${r.__i}" tabindex="0" class="${(on(r) + isRet(r)).trim()}">${flat.map(c => cell(c, r)).join("")}</tr>`).join("");
    const sum = c => rows.reduce((t, r) => t + c.get(r), 0);
    const tot = `<tr class="hz-tot">${flat.map((c, i) => i === 0 ? '<td class="hz-c"></td>' : i === 1 ? '<td class="hz-c">Total</td>' : c.sum ? `<td class="${c.tone ? `hz-${c.tone}` : ""}" title="${esc(hzMoney(sum(c), false))}">${hzC(sum(c))}</td>` : "<td></td>").join("")}</tr>`;
    const skip = c => c.sno || c.wide || /^(Year|Age)/.test(c.label);
    const [cs, cy, ca] = [flat[0], flat[1], flat[2]], wide = flat.find(c => c.wide);
    // Phone cards: year, age and status up top, three key amounts, everything else under a tap-to-open "Breakdown".
    const byLabel = t => flat.find(c => c.label.indexOf(t) === 0), cSp = byLabel("Total Expenses"), cIn = byLabel("Total Income"), cEn = byLabel("Closing Corpus"), cSt = flat.find(c => c.status);
    const stCls = v => v === "Funded" ? "dz-o" : v === "Runs out" ? "dz-w" : "dz-b";
    const km = (l, x, neg, tone) => `<div><small>${l}</small><b class="${neg ? "dz-b" : tone ? `hz-${tone}` : ""}">${x}</b></div>`;
    const cards = rows.map(r => {
      const rest = flat.filter(c => !skip(c) && c !== cSp && c !== cIn && c !== cEn && c !== cSt && !(c.zero && c.get(r) === 0));
      return `<div class="hz-card${on(r)}${isRet(r)}" data-hzr="${r.__i}"><div class="hz-chd"><div class="hz-ct">${esc(cy.get(r))} \u00b7 Age ${esc(ca.get(r))}</div>${cSt ? `<span class="hz-chip ${stCls(cSt.get(r))}">${esc(cSt.get(r))}</span>` : ""}</div>${wide ? `<div class="hz-cn">${hzWhat(wide.get(r))}</div>` : ""}
<div class="hz-km">${cSp ? km("Expenses", hzC(cSp.get(r)), false, "expense") : ""}${cIn ? km("Income", hzC(cIn.get(r)), false, "income") : ""}${cEn ? km("Closing Corpus", hzC(cEn.get(r)), cEn.get(r) < 0) : ""}</div>
<details class="hz-dt"><summary>Breakdown</summary>${rest.map(c => `<div class="hz-cr${c.bold ? " hz-b" : ""}"><span>${esc(c.label)}</span><span class="${c.get(r) < 0 ? "dz-b" : c.tone ? `hz-${c.tone}` : ""}">${val(c, r)}</span></div>`).join("")}</details></div>`;
    }).join("")
      + `<div class="hz-card hz-ctot"><div class="hz-chd"><div class="hz-ct">Total</div></div><div class="hz-km">${cSp ? km("Expenses", hzC(sum(cSp)), false, "expense") : ""}${cIn ? km("Income", hzC(sum(cIn)), false, "income") : ""}</div><details class="hz-dt"><summary>Breakdown</summary>${flat.filter(c => c.sum && c !== cSp && c !== cIn).map(c => `<div class="hz-cr"><span>${esc(c.label)}</span><span class="${c.tone ? `hz-${c.tone}` : ""}">${hzC(sum(c))}</span></div>`).join("")}</details></div>`;
    return `<div class="hz-wrap"><table class="rt hz-t"><thead><tr>${h}</tr></thead><tbody>${body}</tbody><tfoot>${tot}</tfoot></table></div><div class="hz-cards">${cards}</div>`;
  }
  window.hzReport = function () {
    const w = hzView();
    if (!w) return "";
    const rows = FHE.horizonReport(w.v);
    const opt = (val, cur, t) => `<option value="${val}"${String(cur) === String(val) ? " selected" : ""}>${t}</option>`;
    return `<div class="card"><div class="rph2"><div class="rpt"><h2>Year-by-year plan</h2>${window.rptInfo("Click or tap a row to highlight it · click a column heading to sort · Freeze keeps the first columns in view while you scroll · amounts in ₹ Lakh / Crore (hover for the exact amount)", "About this table")}</div><button type="button" id="hzcsv">Copy as CSV</button></div>
<div class="tb hz-tb"><input id="hzq" type="search" placeholder="Search year, age, amount…" aria-label="Search year by year plan" value="${esc(RP.q || "")}"><select id="hzs" aria-label="Sort by">${opt(-1, RP.k, "Sort: S.No")}${w.flat.map((c, i) => opt(i, RP.k, "Sort: " + esc(c.label))).join("")}</select><select id="fzs" aria-label="Freeze columns">${[["0", "Freeze: none"], ["2", "Freeze: Year"], ["3", "Freeze: Year + Ages"]].map(o => `<option value="${o[0]}"${(document.body.dataset.fz || "2") === o[0] ? " selected" : ""}>${o[1]}</option>`).join("")}</select>${hzEarn(w.v) ? `<select id="hzp" aria-label="Show phase">${[["all", "All years"], ["Earning", "Earning phase only"], ["Retired", "Retirement only"]].map(o => `<option value="${o[0]}"${(RP.ph || "all") === o[0] ? " selected" : ""}>${o[1]}</option>`).join("")}</select>` : ""}<button type="button" id="hzd" aria-label="Toggle sort direction">${RP.d > 0 ? "▲" : "▼"}</button></div>
${hzPhaseBar(w.v, rows)}

<div id="hz-rows">${hzTable()}</div>
</div>`;
  };
  function hzRefresh() {
    const el = document.getElementById("hz-rows"), d = document.getElementById("hzd");
    if (el) el.innerHTML = hzTable();
    if (d) d.textContent = RP.d > 0 ? "▲" : "▼";
    const so = document.getElementById("hzs"), fz = document.getElementById("hzz");
    if (so) so.value = String(RP.k);
    if (fz) fz.value = String(RP.z);
  }
  document.addEventListener("input", e => { if (e.target && e.target.id === "hzq") { RP.q = e.target.value; hzRefresh(); } });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t && t.id === "hzs") { RP.k = Number(t.value); hzRefresh(); }
    else if (t && t.id === "hzz") { RP.z = Number(t.value); hzRefresh(); }
    else if (t && t.id === "hzp") { RP.ph = t.value; hzRefresh(); }
  });
  document.addEventListener("click", e => {
    const t = e.target;
    if (!t.closest) return;
    if (t.closest("#hzd")) { RP.d = -RP.d; hzRefresh(); return; }
    const h = t.closest("[data-hzk]");
    if (h) { const i = Number(h.dataset.hzk); if (Number(RP.k) === i) RP.d = -RP.d; else { RP.k = i; RP.d = 1; } hzRefresh(); return; }
    const row = t.closest("#hz-rows [data-hzr]");
    if (row && !t.closest("button,a,input,select,summary,details")) {
      const i = Number(row.dataset.hzr), was = row.classList.contains("sel");
      document.querySelectorAll("#hz-rows .sel").forEach(x => x.classList.remove("sel"));
      RP.sel = was ? -1 : i;
      if (!was) document.querySelectorAll(`#hz-rows [data-hzr="${i}"]`).forEach(x => x.classList.add("sel"));
    }
  });
  document.addEventListener("keydown", e => { const x = e.target; if ((e.key === "Enter" || e.key === " ") && x && x.matches && x.matches("#hz-rows tr[data-hzr]")) { e.preventDefault(); x.click(); } });
  function hzCSV() {
    const w = hzView(), q = x => '"' + String(x).replace(/"/g, '""') + '"';
    return [w.flat.map(c => q(c.label)).join(",")].concat(w.rows.map(r => w.flat.map(c => c.txt ? q(c.get(r)) : Math.round(c.get(r))).join(","))).join("\n");
  }
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("#hzcsv,[data-hz-go]");
    if (!b) return;
    if (b.id === "hzcsv") {
      const csv = hzCSV();
      if (typeof text === "function") text("Year By Year Status CSV", csv);
      else if (navigator.clipboard) navigator.clipboard.writeText(csv).catch(() => {});
    } else if (typeof UI !== "undefined" && typeof render === "function") { UI.tab = "Retirement planner"; render(); }
  });

  /* Retirement planner sub-tabs, like Goal Planner's: Plan | Report (> Year by Year) */
  const RP = window.RPUI = window.RPUI || { tab: "status", rv: "clients", q: "", k: -1, d: 1, z: 0, sel: -1 };
  const rpBar = (id, label, items, cur) => `<div class="seg gpb rpb" role="group" aria-label="${label}">` + items.map(i => `<button type="button" data-rp="${id}:${i[0]}" aria-pressed="${i[0] === cur}">${i[1]}</button>`).join("") + `</div>`;
  document.addEventListener("click", e => {
    const x = e.target.closest && e.target.closest("[data-rp]");
    if (!x) return;
    const [k, v] = x.dataset.rp.split(":");
    RP[k === "tab" ? "tab" : "rv"] = v;
    if (typeof render === "function") { render(); window.scrollTo(0, 0); }
  });
  /* ---------- Retirement planner page (mobile-first): status -> target meter -> 4 metrics -> upcoming events -> explore + bottom bar ---------- */
  function rp2Nav(cur) {
    const it = (ic, label, attrs, on) => `<button type="button" ${attrs}${on ? ' aria-current="page"' : ""}><span aria-hidden="true">${ic}</span><span>${label}</span></button>`;
    return `<div class="rp2-nav" role="navigation" aria-label="Retirement Planner">` + it("\ud83d\udcca", "Summary", 'data-rp="tab:status"', cur === "status") +
      it("\u270f\ufe0f", "Edit Inputs", 'data-fh-open="status"', false) + it("\ud83c\udfaf", "Goals", 'data-fh-open="milestones"', false) +
      it("\ud83d\udcc4", "Reports", 'data-rp="tab:report"', cur === "report") + `</div>`;
  }
  function rp2Chips(v) {
    const b = simRange(v), m = new Map(), add = (a, l) => { if (Number.isFinite(a) && a >= b.age && a <= b.max && !m.has(a)) m.set(a, l); };
    add(b.age, "Today");
    if (!FHE.isBlank(v.retire)) add(Number(v.retire), `Retire ${Number(v.retire)}`);
    add(b.until, `Plan end ${b.until}`);
    [60, 65, 70, 75, 80, 85, 90, 100].forEach(a => add(a, `Age ${a}`));
    return Array.from(m.keys()).sort((x, y) => x - y).map(a => `<button type="button" data-rp2-age="${a}" aria-pressed="${a === simAge}">${esc(m.get(a))}</button>`).join("");
  }
  function rp2Body(sv) {
    const v = sv.v, r = FHE.calculate(v), b = simRange(v);
    ensureSxCss();
    const P = sxParts(v, r, true), year = new Date().getFullYear();
    const n = Number(v.children) === 1 || Number(v.children) === 2 ? Number(v.children) : 0;
    const cover = r.needed > 0 ? r.available / r.needed * 100 : 100;
    const st = cover >= 100 ? ["On Track", "ok"] : cover >= 75 ? ["Within Reach", "mid"] : ["Off Track", "bad"];
    const sgn = x => (x < 0 ? "\u2212" : "+") + sh(Math.abs(x));
    const runs = r.plan.runout !== null, mx = Math.max(100, cover);
    const when = sv.t ? new Date(sv.t).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
    const status = `<section class="rp2-st" aria-label="Plan status"><div class="rp2-sr"><span class="rp2-dot rp2-${st[1]}" aria-hidden="true"></span><b>${st[0]}</b><span class="rp2-am rp2-${st[1]}">(${sgn(r.surplus)})</span>${when ? `<small class="rp2-sv">${sv.rep ? "Final report" : "Saved"} \u00b7 ${esc(when)}</small>` : ""}</div><small>${runs ? `Money runs out around age ${r.plan.runout}` : `Money lasts beyond age ${b.until}`}</small></section>`;
    const meter = `<section class="rp2-mt" aria-label="Funding target"><div class="rp2-mh"><span>Funding target</span><b>${cover.toFixed(0)}% funded</b></div>
<div class="rp2-bar rp2-${st[1]}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, cover).toFixed(0)}"><i style="width:${(cover / mx * 100).toFixed(1)}%"></i><s style="left:${(100 / mx * 100).toFixed(1)}%"></s></div>
<div class="rp2-ms"><span>${sh(r.available)} corpus</span><span>${sh(r.needed)} needed</span></div></section>`;

    const monthly = Number(v.monthly), sch = FHE.schedule(v, b.until), endHouse = sch.length > 1 ? sch[sch.length - 1].house / 12 : monthly;
    const passive = (Number(v.income) || 0) / 12 + Number(v.buffer) * Number(v.bufferRoi) / 100 / 12;
    const kr = r.rows.filter(x => x.name.indexOf("Child") === 0), kSet = kr.reduce((t, x) => t + x.setAside, 0), kNeed = kr.reduce((t, x) => t + x.needed, 0);
    const tile = (open, label, val, sub, cls) => `<button type="button" class="rp2-tile" data-rp2-open="${open}"><small>${label}</small><b class="${cls || ""}">${val}</b><small>${sub}</small></button>`;
    const tiles = `<section class="rp2-grid" aria-label="Key numbers">` +
      tile("yy", "Monthly need", `${sh(monthly)}/mo`, `${sh(endHouse)}/mo by ${b.until}`) +
      tile("yy", "Passive income", `${sh(passive)}/mo`, "income + reserve interest") +
      tile("kids", "Kids goals", n ? sh(kSet) : "None", n ? `needs ${sh(kNeed)} today` : "no children included") +
      tile("fund", "Net surplus", sgn(r.surplus), "corpus minus need", r.surplus >= 0 ? "sx-hi" : "sx-lo") + `</section>`;

    const evs = planEvents(v).slice(0, 4);
    const events = `<section aria-label="Upcoming events"><h3 class="rp2-h">Upcoming events</h3>` + (evs.length ? `<ul class="rp2-ev">` + evs.map(e => `<li><span class="rp2-ey"><b>${e.year}</b><small>Age ${e.age}</small></span><span>${esc(e.what)}</span></li>`).join("") + `</ul>` : `<p class="sx-empty">No upcoming events.</p>`) +
      `<button type="button" class="rp2-more" data-fh-open="milestones">All goals and timeline \u2192</button></section>`;

    const fundRows = r.rows.map(x => { const g = x.setAside - x.needed, tot = x.name === "TOTAL"; return `<tr${tot ? ' class="rp2-tot"' : ""}><td>${esc(tot ? "Total" : x.name)}</td><td>${sh(x.setAside)}</td><td>${sh(x.needed)}</td><td class="${tot && x.needed === undefined ? "" : g < -0.5 ? "sx-lo" : "sx-hi"}">${tot ? sgn(r.surplus) : (g < 0 ? "\u2212" : "+") + sh(Math.abs(g))}</td></tr>`; }).join("");
    const acc = (id, title, sub, body, open) => `<details class="rp2-ac" id="rp2-ac-${id}"${open ? " open" : ""}><summary><span>${title}</span><small${id === "yy" ? ' id="rp2-yy-s"' : ""}>${sub}</small></summary><div class="rp2-ab">${body}</div></details>`;
    const slider = `<div class="rp2-sl"><button type="button" id="fh-um" aria-label="Decrease age by one year"${simAge <= b.age ? " disabled" : ""}>\u2212</button><input id="fh-ua" type="range" min="${b.age}" max="${b.max}" step="1" value="${simAge}" data-st="${simSt(v, simAge)}" style="background:${simFill(simAge, b.age, b.max, v)}" aria-label="Show the plan up to this age"><button type="button" id="fh-up" aria-label="Increase age by one year"${simAge >= b.max ? " disabled" : ""}>+</button></div><output id="fh-ul" for="fh-ua" class="rp2-ol" data-st="${simSt(v, simAge)}">Age ${simAge} \u00b7 ${simAge - b.age} yrs</output><div class="fh-exp" id="fh-exp" aria-live="polite">${simExpHTML(v, simAge)}</div>`;
    const explore = `<section aria-label="Explore the plan"><h3 class="rp2-h">Explore</h3><div class="rp2-chips" role="group" aria-label="Show plan up to age">${rp2Chips(v)}</div>${slider}
${acc("yy", "Year by year", `to age ${simAge}`, `<div id="fh-sim-tbl" aria-live="polite">${simTableHTML(v, simAge)}</div><div class="rp2-hs" id="fh-sim-house" aria-live="polite">${simHouseHTML(v, simAge)}</div>`)}
${acc("kids", "Kids goals", n ? `${sh(kSet)} set aside` : "none", P.kids)}
${acc("fund", "Funding breakdown", `${sgn(r.surplus)}`, `<div class="sx-tw"><table class="sx-t"><thead><tr><th scope="col">Purpose</th><th scope="col">Set aside</th><th scope="col">Need now</th><th scope="col">Gap</th></tr></thead><tbody>${fundRows}</tbody></table></div><p class="sx-key">${esc(r.explanation)}</p>`)}
${acc("alloc", "Fund allocation", "today and by age", `<div id="dsh" class="fh-dsh rp2-dsh">${allocHTML(v, "rp2-flat")}</div>`)}</section>`;
    return `<div class="sx rp2">${status}${meter}${ptHTML(v)}${tiles}${events}${explore}</div>`;
  }
  /* ---------- Client profiles (build 79) ----------
     S.fhp = { active: "<id>", profiles: { "<id>": { name, v, t, rep, created } } } holds one full retirement plan per person.
     S.fh stays the ACTIVE person's plan (a mirror), so every existing view, calculation and the cloud sync keep working unchanged.
     Saving a plan writes it to the active profile; switching copies that profile into S.fh and reloads the planner. */
  const FHP_MAX = 30;
  const fhpSlug = n => String(n).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "client";
  const fhpName = n => String(n == null ? "" : n).replace(/\s+/g, " ").trim().slice(0, 30);
  function fhpDefaultName() {
    try { const m = S.members && S.members[0], nm = m && fhpName(m.name); if (nm && nm.toLowerCase() !== "self") return nm; } catch (e) { /* use the fallback */ }
    return "My plan";
  }
  function fhpNewValues() {                       // a complete plan with the app's default retirement values
    const d = {}; for (const f of FHE.FIELDS) d[f.id] = String(f.initial);
    const a = FHE.defaultAllocation(Number(d.corpus), 2) || {};
    for (const k of Object.keys(a)) d[k] = String(a[k]);
    return d;
  }
  function fhpEnsure() {
    if (typeof S === "undefined" || !S) return null;
    let P = S.fhp;
    if (!P || typeof P !== "object" || !P.profiles || !Object.keys(P.profiles).length) {
      const nm = fhpDefaultName(), id = fhpSlug(nm);
      const cur = S.fh && S.fh.v ? { v: Object.assign({}, S.fh.v), t: S.fh.t || 0, rep: S.fh.rep ? 1 : 0 } : { v: null, t: 0, rep: 0 };
      P = S.fhp = { active: id, profiles: { [id]: Object.assign({ name: nm, created: Date.now() }, cur) } };
    }
    if (!Object.prototype.hasOwnProperty.call(P.profiles, P.active)) P.active = Object.keys(P.profiles)[0];
    return P;
  }
  function fhpStore() {                           // the saved plan (S.fh) goes into the active profile
    const P = fhpEnsure();
    if (P && S.fh) P.profiles[P.active] = Object.assign({}, P.profiles[P.active], { v: Object.assign({}, S.fh.v), t: S.fh.t, rep: S.fh.rep });
  }
  const fhpList = () => { const P = fhpEnsure(); return P ? Object.keys(P.profiles).map(id => Object.assign({ id, active: id === P.active }, P.profiles[id])) : []; };
  const fhpUniqueId = (name, P) => { let base = fhpSlug(name), id = base, i = 2; while (id in Object.prototype || Object.prototype.hasOwnProperty.call(P.profiles, id)) id = base.slice(0, 20) + "-" + i++; return id; };
  const fhpTaken = (name, P, exceptId) => Object.keys(P.profiles).some(id => id !== exceptId && P.profiles[id].name.toLowerCase() === name.toLowerCase());

  function fhpSwitch(id, toPlan) {
    const P = fhpEnsure();
    if (!P || !Object.prototype.hasOwnProperty.call(P.profiles, id)) return false;
    P.active = id;
    const q = P.profiles[id];
    S.fh = q.v ? { v: Object.assign({}, q.v), t: q.t || 0, rep: q.rep ? 1 : 0 } : null;
    if (typeof save === "function") save();
    FH.v = null; FH.step = "family"; FH.house = "expenses"; FH.plan = "ready"; FH.incEdit = 0; FH.incNew = 0; FH.incUndo = null; FH.sel = { college: 1, weddings: 1 }; FH.sig = ""; FH.mode = "wizard"; FH.doneAt = 0;
    memo = { key: "", r: null }; simAge = null; RPT.tab = null;
    hpReset();
    syncFromState();
    if (toPlan) RP.tab = "status";
    if (typeof render === "function") render();
    return true;
  }
  function fhpAdd(name) {
    const P = fhpEnsure(), nm = fhpName(name);
    if (!P) return "Could not add the person.";
    if (!nm) return "Enter a name.";
    if (Object.keys(P.profiles).length >= FHP_MAX) return `You can keep up to ${FHP_MAX} people.`;
    if (fhpTaken(nm, P)) return "A person with this name already exists.";
    const id = fhpUniqueId(nm, P);
    P.profiles[id] = { name: nm, v: null, t: 0, rep: 0, created: Date.now() };   // no saved plan yet: the "Start Your Retirement Plan" page opens, and its steps start from the default values
    fhpSwitch(id, true);
    return "";
  }
  function fhpRename(id, name) {
    const P = fhpEnsure(), nm = fhpName(name);
    if (!P || !P.profiles[id]) return "Could not rename.";
    if (!nm) return "Enter a name.";
    if (fhpTaken(nm, P, id)) return "A person with this name already exists.";
    P.profiles[id].name = nm; if (typeof save === "function") save(); if (typeof render === "function") render();
    return "";
  }
  function fhpDuplicate(id) {
    const P = fhpEnsure();
    if (!P || !P.profiles[id] || Object.keys(P.profiles).length >= FHP_MAX) return null;
    const src = P.profiles[id]; let nm = fhpName(src.name + " (copy)"), i = 2;
    while (fhpTaken(nm, P)) nm = fhpName(src.name).slice(0, 24) + " (copy " + i++ + ")";
    const nid = fhpUniqueId(nm, P);
    P.profiles[nid] = { name: nm, v: src.v ? Object.assign({}, src.v) : null, t: src.t || 0, rep: src.rep ? 1 : 0, hold: src.hold ? JSON.parse(JSON.stringify(src.hold)) : undefined, created: Date.now() };
    if (typeof save === "function") save(); if (typeof render === "function") render();
    return nm;
  }
  function fhpDelete(id) {
    const P = fhpEnsure();
    if (!P || !P.profiles[id] || Object.keys(P.profiles).length < 2) return null;
    const snap = P.profiles[id], wasActive = P.active === id;
    delete P.profiles[id];
    if (wasActive) fhpSwitch(Object.keys(P.profiles)[0], false); else { if (typeof save === "function") save(); if (typeof render === "function") render(); }
    return { id, snap, wasActive };
  }
  function fhpRestore(x) {
    const P = fhpEnsure(); if (!P || !x || P.profiles[x.id]) return;
    P.profiles[x.id] = x.snap;
    if (x.wasActive) fhpSwitch(x.id, false); else { if (typeof save === "function") save(); if (typeof render === "function") render(); }
  }

  /* Sample clients for validation: five complete plans that cover different situations. Adds only the names that are not there yet. */
  const FHP_SAMPLES = [
    { name: "Shishir", o: { age: 48, children: 2, childAge1: 17, classToday1: 12, weddingAge1: 28, childAge2: 14, classToday2: 9, weddingAge2: 28, retire: 55, until: 74, corpus: 30000000, monthly: 112000, preEarn: 2000000, feeYears1: 4, feeYears2: 7, weddingYears1: 11, weddingYears2: 14 } },
    { name: "Deepak", o: { age: 45, children: 1, childAge1: 10, classToday1: 5, weddingAge1: 27, retire: 60, until: 85, corpus: 10000000, roi: 9, monthly: 90000, preEarn: 1600000, preRoi: 6, feeYears1: 11, annualFee1: 300000, weddingYears1: 17, weddingCost1: 2500000 } },
    { name: "Dharam", o: { age: 58, children: 0, retire: 60, until: 90, corpus: 50000000, monthly: 150000, preEarn: 3000000, inc: { amt: 600000, growth: 4, years: 15 }, reduceAge: 75, reducePercent: 20 } },
    { name: "Meera", o: { age: 40, children: 2, childAge1: 12, classToday1: 7, weddingAge1: 26, childAge2: 8, classToday2: 3, weddingAge2: 26, retire: 55, until: 85, corpus: 12000000, monthly: 75000, preEarn: 1800000, houseInflation: 6, feeYears1: 9, feeYears2: 13, weddingYears1: 14, weddingYears2: 18 } },
    { name: "Arjun", o: { age: 62, children: 1, childAge1: 26, classToday1: 12, weddingAge1: 30, retire: 62, preOn: 0, until: 88, corpus: 40000000, monthly: 120000, inc: { amt: 600000, growth: 0, years: 26 }, feeYears1: 0, annualFee1: 0, weddingYears1: 4 } }
  ];
  function fhpLoadSamples() {
    const P = fhpEnsure(); if (!P) return 0;
    let added = 0;
    for (const sm of FHP_SAMPLES) {
      if (Object.keys(P.profiles).length >= FHP_MAX || fhpTaken(sm.name, P)) continue;
      const v = {}; for (const f of FHE.FIELDS) v[f.id] = String(f.initial);
      Object.assign(v, Object.fromEntries(Object.entries(sm.o).filter(([k]) => k !== "inc").map(([k, x]) => [k, String(x)])));
      if (sm.o.inc) { const w = FHE.incomeWindow({ age: "0", until: String(sm.o.inc.years) }); Object.assign(v, { incomeOn: "1", incomeCount: "1", incName1: "Rent", incAmt1: String(sm.o.inc.amt), incGrowth1: String(sm.o.inc.growth), incFrom1: w.from, incTo1: w.to }); }
      const a = FHE.defaultAllocation(Number(v.corpus), Number(v.children)) || {};
      for (const k of Object.keys(a)) if (!(k in sm.o)) v[k] = String(a[k]);
      if (FHE.validateAll(v).length) continue;                    // never store an incomplete sample
      P.profiles[fhpUniqueId(sm.name, P)] = { name: sm.name, v, t: Date.now(), rep: 0, created: Date.now() };
      added++;
    }
    if (added && typeof save === "function") save();
    if (typeof render === "function") render();
    return added;
  }

  /* top bar: client switcher + "+ Add Person" (shown on the Retirement Planner screens) */
  window.fhpBar = function () {
    const el = document.getElementById("fhp"); if (!el) return;
    if (typeof GP !== "undefined" && typeof UI !== "undefined" && GP.includes(UI.tab) && typeof window.gppBarHTML === "function") { el.hidden = false; el.innerHTML = window.gppBarHTML(true); return; }
    const on = typeof UI !== "undefined" && (UI.tab === "Retirement planner" || UI.tab === "RP Reports");
    const P = on ? fhpEnsure() : null;
    el.hidden = !P; if (!P) return;
    el.innerHTML = fhpBarHTML(true);
  };
  /* the same control: in the top bar (id fhp-sel) and, on phones where the top bar has no room, at the top of the page */
  /* ---- Current Corpus from Goal Planner holdings: "View holdings" link on the Current Corpus field.
     The holdings of the Goal Planner client with the same name are listed with check boxes; the ticked ones add up to Current Corpus.
     Read-only for the Goal Planner. The ticked ids are kept on the Retirement client (S.fhp.profiles[id].hold), inside the existing saved state. ---- */
  const HP = { open: false };
  const hpM = x => { const M0 = typeof cr === "function" ? cr : FHE.currency; return String(M0(x)).replace("\u20b9 ", "\u20b9"); };
  function hpHead(id, label) {
    return `<div class="fh-hrow"><label for="${id}">${label}</label><button type="button" class="fh-hlink" data-fh-hold="toggle" aria-expanded="false" aria-controls="fh-hold">View holdings</button></div>`;
  }
  function hpState() {
    const P = fhpEnsure(); if (!P) return null;
    const pr = P.profiles[P.active], L = typeof window.gppHoldingList === "function" ? window.gppHoldingList() : [];
    const h = pr.hold && typeof pr.hold === "object" ? pr.hold : {}, nm = String(pr.name || "").trim().toLowerCase();
    const cl = (h.gp ? L.find(c => c.id === h.gp) : null) || L.find(c => String(c.name).trim().toLowerCase() === nm) || null;
    const ids = cl && h.gp === cl.id && Array.isArray(h.ids) ? h.ids.map(String) : [];
    return { pr, L, cl, ids };
  }
  const hpTotal = (cl, ids) => cl.items.reduce((t, i) => t + (ids.includes(i.id) ? i.val : 0), 0);
  function hpSave(st, ids) { st.pr.hold = { gp: st.cl.id, ids: ids.slice() }; if (typeof save === "function") save(); }
  function hpApply(total) {                       // same steps as typing a new value into the Current Corpus box
    setField("corpus", Math.round(total));
    const a = $("corpus-amt"); if (a) a.textContent = amtText(FH.v.corpus);
    if (FH.mode === "done") FH.mode = "wizard";
    updateLive();
    if (FH.defAlloc) applyDefaultAllocation();
  }
  function hpRender() {
    const box = document.getElementById("fh-hold"), btn = document.querySelector('[data-fh-hold="toggle"]');
    if (btn) { btn.setAttribute("aria-expanded", String(HP.open)); btn.textContent = HP.open ? "Hide holdings" : "View holdings"; }
    if (!box) return;
    box.hidden = !HP.open; if (!HP.open) return;
    const st = hpState(); if (!st) { box.innerHTML = ""; return; }
    const pick = st.L.length > 1 || (st.L.length && !st.cl) ? `<label class="fh-hpk">Goal Planner client <select id="fh-hold-pick">${st.cl ? "" : '<option value="">Choose a client</option>'}${st.L.map(c => `<option value="${esc(c.id)}"${st.cl && c.id === st.cl.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>` : "";
    let body;
    if (!st.L.length) body = `<p class="fh-hmsg">No Goal Planner clients were found.</p>`;
    else if (!st.cl) body = `<p class="fh-hmsg">No Goal Planner client is named \u201c${esc(st.pr.name)}\u201d. Choose the client above.</p>`;
    else if (!st.cl.items.length) body = `<p class="fh-hmsg">${esc(st.cl.name)} has no holdings in the Goal Planner yet.</p>`;
    else {
      const on = new Set(st.ids), all = st.cl.items.every(i => on.has(i.id)), tot = hpTotal(st.cl, st.ids), cur = Number(FH.v.corpus), n = st.cl.items.filter(i => on.has(i.id)).length;
      const rows = st.cl.items.map(i => `<tr><td><input type="checkbox" class="fh-hold-cb" data-hid="${esc(i.id)}" aria-label="Include ${esc(i.name)}"${on.has(i.id) ? " checked" : ""}></td><td>${esc(i.name)}</td><td>${esc(i.cat)}</td><td class="fh-n" title="\u20b9 ${Math.round(i.val).toLocaleString("en-IN")}">${hpM(i.val)}</td></tr>`).join("");
      const differs = n > 0 && Math.round(cur) !== Math.round(tot);
      body = `<div class="fh-htw"><table class="fh-ht"><thead><tr><th><input type="checkbox" id="fh-hold-all" aria-label="Select all holdings"${all ? " checked" : ""}></th><th>Holding</th><th>Category</th><th class="fh-n">Current value</th></tr></thead><tbody>${rows}</tbody></table></div>` +
        `<div class="fh-hf"><span>${n} of ${st.cl.items.length} selected \u00b7 <b>${hpM(tot)}</b></span>${differs ? `<button type="button" class="fh-happly" data-fh-hold="apply">Use ${hpM(tot)} as Current Corpus</button>` : n ? `<span>Current Corpus matches</span>` : ""}</div>` +
        `<small class="hh">Today\u2019s values from the Goal Planner. Ticking a holding sets Current Corpus to the selected total; you can still type over the box. Nothing in the Goal Planner is changed.</small>`;
    }
    box.innerHTML = pick + body;
  }
  function hpReset() { HP.open = false; hpRender(); }
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-fh-hold]"); if (!b) return;
    if (b.dataset.fhHold === "toggle") { HP.open = !HP.open; hpRender(); }
    else if (b.dataset.fhHold === "apply") { const st = hpState(); if (st && st.cl) hpApply(hpTotal(st.cl, st.ids)); hpRender(); }
  });
  document.addEventListener("change", e => {
    const t = e.target; if (!t) return;
    const cb = !!(t.classList && t.classList.contains("fh-hold-cb")), all = t.id === "fh-hold-all", pick = t.id === "fh-hold-pick";
    if (!cb && !all && !pick) return;
    const st = hpState(); if (!st) return;
    const box = document.getElementById("fh-hold"), hid = cb ? t.dataset.hid : null;
    if (pick) {
      const c = st.L.find(x => x.id === t.value);
      if (c) { st.pr.hold = { gp: c.id, ids: [] }; if (typeof save === "function") save(); }
      hpRender(); const p = document.getElementById("fh-hold-pick"); if (p) p.focus(); return;
    }
    if (!st.cl || !box) return;
    const ids = all ? (t.checked ? st.cl.items.map(i => i.id) : []) : Array.from(box.querySelectorAll(".fh-hold-cb:checked")).map(x => x.dataset.hid);
    hpSave(st, ids); hpApply(hpTotal(st.cl, ids)); hpRender();
    const again = all ? document.getElementById("fh-hold-all") : Array.from(box.querySelectorAll(".fh-hold-cb")).find(x => x.dataset.hid === hid);
    if (again) again.focus();
  });
  document.addEventListener("input", e => { if (HP.open && e.target && e.target.id === "fh-corpus") hpRender(); });   // typing over the box refreshes the "matches" line
  (function () {
    if (document.getElementById("fh-hold-css")) return;
    const s = document.createElement("style"); s.id = "fh-hold-css";
    s.textContent = `.fh-hrow{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.fh-hlink{background:none;border:0;padding:0;font:inherit;font-size:12px;color:var(--ac,#0f766e);text-decoration:underline;cursor:pointer;width:auto}
.fh-hold{margin-top:8px;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:8px;padding:12px}
.fh-hold[hidden]{display:none}
.lgsv{display:flex;align-items:center;gap:8px;font-size:13px;margin:2px 0 8px;cursor:pointer}
.lgsv input{width:16px;min-width:16px;height:16px;margin:0;padding:0}
.fhp-g .fhp-sv{grid-column:1/-1}
.hf1:has(>.fh-hold:not([hidden])){grid-column:1/-1}
.fh-hpk{display:flex;gap:8px;align-items:center;font-size:12px;margin-bottom:8px}
.fh-hpk select{width:auto;max-width:100%}
.fh-htw{max-height:240px;overflow:auto}
.fh-ht{width:100%;min-width:0!important;border-collapse:collapse;font-size:13px}
.fh-ht td,.fh-ht th{white-space:normal}
.fh-ht th,.fh-ht td{padding:6px 6px;text-align:left;border-bottom:1px solid color-mix(in srgb,currentColor 12%,transparent)}
.fh-ht .fh-n{text-align:right;white-space:nowrap!important;width:auto;min-width:0}
.fh-ht th:first-child,.fh-ht td:first-child{width:28px;min-width:0;padding-left:4px;padding-right:4px}
.fh-ht input[type=checkbox]{width:16px;min-width:16px;height:16px;padding:0;margin:0}
.fh-hf{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;font-size:13px;flex-wrap:wrap}
.fh-happly{width:auto;padding:4px 10px;font-size:12px;cursor:pointer}
.fh-hmsg{margin:0;font-size:13px}`;
    document.head.appendChild(s);
  })();

  function fhpRelation(p) {
    const members = typeof S !== "undefined" && Array.isArray(S.members) ? S.members : [];
    const member = members.find(m => String(m.name || "").trim().toLowerCase() === String(p.name || "").trim().toLowerCase());
    return member && typeof ROLES !== "undefined" && ROLES.includes(member.role) ? member.role : "Self";
  }
  function closeFhpPickers(focusId) {
    document.querySelectorAll("[data-fhp-picker-trigger]").forEach(t => t.setAttribute("aria-expanded", "false"));
    document.querySelectorAll("[data-fhp-picker-popup]").forEach(p => { p.hidden = true; });
    if (focusId) { const t = document.getElementById(focusId); if (t) t.focus(); }
  }
  function focusFhpOption(popup, selected) {
    const options = Array.from(popup.querySelectorAll("[data-fhp-picker-option]"));
    const target = options.find(o => o.dataset.fhpPickerOption === selected) || options[0];
    if (target) target.focus();
    else { const add = popup.querySelector('[data-fhp="add"]'); if (add) add.focus(); }
  }
  function openFhpPicker(trigger) {
    closeFhpPickers();
    const popup = document.getElementById(trigger.dataset.fhpPickerPopup);
    if (!popup) return;
    trigger.setAttribute("aria-expanded", "true"); popup.hidden = false;
    focusFhpOption(popup, trigger.dataset.fhpActive || "");
  }
  function fhpBarHTML(top) {
    const id = top ? "fhp-sel" : "fhp-sel-m", popupId = id + "-popup", listId = id + "-list", clients = fhpList(), active = clients.find(p => p.active);
    const label = active ? active.name : "Add person…";
    const relation = role => typeof tr === "function" ? tr(role) : role;
    const options = clients.map(p => `<button type="button" class="client-option" role="option" tabindex="-1" aria-selected="${p.active ? "true" : "false"}" data-fhp-picker-option="${esc(p.id)}"><span class="client-check" aria-hidden="true">${p.active ? '<svg viewBox="0 0 16 16" focusable="false"><path d="m3 8 3.2 3.2L13 4.5"/></svg>' : ""}</span><span class="client-name">${esc(p.name)}</span><span class="client-relation">${esc(relation(fhpRelation(p)))}</span></button>`).join("");
    const T = value => esc(typeof tr === "function" ? tr(value) : value);
    return `<span class="fhp-l" id="${id}-label">${T("Client")}</span><div class="client-picker" data-fhp-picker><button type="button" class="client-trigger" id="${id}" data-fhp-picker-trigger data-fhp-picker-popup="${popupId}" data-fhp-active="${esc(active ? active.id : "")}" aria-haspopup="listbox" aria-expanded="false" aria-controls="${listId}" aria-label="${T("Client")}: ${esc(label)}" aria-labelledby="${id}-label ${id}-value"><span class="client-trigger-value" id="${id}-value">${esc(label)}</span><svg class="client-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m3 6 5 5 5-5"/></svg></button><div class="client-popup" id="${popupId}" data-fhp-picker-popup hidden><div class="client-options" id="${listId}" role="listbox" aria-labelledby="${id}-label">${options || `<p class="client-empty">${T("No people yet.")}</p>`}</div><div class="client-divider" aria-hidden="true"></div><button type="button" class="client-add" data-fhp="add" data-fhp-picker-add="${id}"><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="7" cy="6" r="3"/><path d="M1.5 16v-1.5A4.5 4.5 0 0 1 6 10h2a4.5 4.5 0 0 1 4.5 4.5M16 8v7m-3.5-3.5h7"/></svg><span>${T("Add person…")}</span></button></div></div>`;
  }
  function fhpNameDialog(mode, id) {
    const P = fhpEnsure(), cur = mode === "ren" && P.profiles[id] ? P.profiles[id].name : "";
    dg.className = "";
    dg.innerHTML = `<h2>${mode === "ren" ? "Rename person" : "Add person"}</h2><form id="fhp-f" novalidate data-mode="${mode}" data-id="${esc(id || "")}"><p class="fh-note">${mode === "ren" ? "Change the name shown in the client list." : "Opens the Start Your Retirement Plan page for this person. The steps start from the default retirement values and you can change every input."}</p><label for="fhp-n">Name</label><input id="fhp-n" maxlength="30" autocomplete="off" placeholder="e.g. Deepak" value="${esc(cur)}"><div class="fh-err" id="fhp-e" role="alert"></div><div class="tb"><button type="button" id="fhp-x">Cancel</button><button type="submit" class="p">${mode === "ren" ? "Save" : "Create"}</button></div></form>`;
    dg.showModal();
    const i = document.getElementById("fhp-n"); if (i) { i.focus(); i.select(); }
  }
  let fhpAddReturnFocus = null;
  dg.addEventListener("close", () => {
    if (!fhpAddReturnFocus) return;
    const id = fhpAddReturnFocus; fhpAddReturnFocus = null;
    const trigger = document.getElementById(id); if (trigger) trigger.focus();
  });
  document.addEventListener("submit", e => {
    const f = e.target && e.target.id === "fhp-f" ? e.target : null; if (!f) return;
    e.preventDefault();
    const name = document.getElementById("fhp-n").value, err = f.dataset.mode === "ren" ? fhpRename(f.dataset.id, name) : fhpAdd(name);
    if (err) { document.getElementById("fhp-e").textContent = err; return; }
    dg.close(); if (typeof toast === "function") toast(f.dataset.mode === "ren" ? "Renamed" : `${fhpName(name)} added`);
  });
  document.addEventListener("keydown", e => {
    const trigger = e.target.closest && e.target.closest("[data-fhp-picker-trigger]");
    const option = e.target.closest && e.target.closest("[data-fhp-picker-option]");
    const picker = e.target.closest && e.target.closest("[data-fhp-picker]");
    if (trigger) {
      if (["Enter", " ", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        if (trigger.getAttribute("aria-expanded") === "true" && e.key === "ArrowDown") {
          const popup = document.getElementById(trigger.dataset.fhpPickerPopup); if (popup) focusFhpOption(popup, trigger.dataset.fhpActive || "");
        } else if (trigger.getAttribute("aria-expanded") === "true") closeFhpPickers();
        else openFhpPicker(trigger);
      } else if (e.key === "Escape" && trigger.getAttribute("aria-expanded") === "true") { e.preventDefault(); closeFhpPickers(trigger.id); }
      else if (e.key === "Tab" && trigger.getAttribute("aria-expanded") === "true") closeFhpPickers();
      return;
    }
    if (option) {
      const options = Array.from(option.closest('[role="listbox"]').querySelectorAll("[data-fhp-picker-option]")), at = options.indexOf(option);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); options[(at + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length].focus(); }
      else if (e.key === "Home" || e.key === "End") { e.preventDefault(); options[e.key === "Home" ? 0 : options.length - 1].focus(); }
      else if (e.key === "Escape") { e.preventDefault(); closeFhpPickers(option.closest("[data-fhp-picker]").querySelector("[data-fhp-picker-trigger]").id); }
      else if (e.key === "Tab") closeFhpPickers();
      return;
    }
    if (picker && e.key === "Tab") closeFhpPickers();
    else if (picker && e.key === "Escape") {
      const t = picker.querySelector("[data-fhp-picker-trigger]");
      if (t && t.getAttribute("aria-expanded") === "true") { e.preventDefault(); closeFhpPickers(t.id); }
    }
  });
  document.addEventListener("click", e => {
    const trigger = e.target.closest && e.target.closest("[data-fhp-picker-trigger]");
    if (trigger) { if (trigger.getAttribute("aria-expanded") === "true") closeFhpPickers(); else openFhpPicker(trigger); return; }
    const option = e.target.closest && e.target.closest("[data-fhp-picker-option]");
    if (option) {
      const id = option.dataset.fhpPickerOption, triggerId = option.closest("[data-fhp-picker]").querySelector("[data-fhp-picker-trigger]").id;
      closeFhpPickers(); if (fhpSwitch(id, false)) { const t = document.getElementById(triggerId); if (t) t.focus(); } return;
    }
    if (!(e.target.closest && e.target.closest("[data-fhp-picker]"))) closeFhpPickers();
    if (e.target && e.target.id === "fhp-x") { dg.close(); return; }
    const b = e.target.closest && e.target.closest("[data-fhp]"); if (!b) return;
    const [act, id] = b.dataset.fhp.split(":"), P = fhpEnsure(); if (!P) return;
    if (act === "add") {
      const focusId = b.dataset.fhpPickerAdd || null;
      if (Object.keys(P.profiles).length >= FHP_MAX) { closeFhpPickers(focusId); if (typeof toast === "function") toast(`Maximum ${FHP_MAX} family members`); return; }
      fhpAddReturnFocus = focusId; closeFhpPickers(); fhpNameDialog("add");
    }
    else if (act === "ren") fhpNameDialog("ren", id);
    else if (act === "samples") { const n = fhpLoadSamples(); if (typeof toast === "function") toast(n ? `Added ${n} sample client${n === 1 ? "" : "s"}` : "Sample clients are already here"); }
    else if (act === "switch") { fhpSwitch(id, true); window.scrollTo(0, 0); }
    else if (act === "dup") { const nm = fhpDuplicate(id); if (nm && typeof toast === "function") toast(`Duplicated as ${nm}`); }
    else if (act === "del") {
      if (Object.keys(P.profiles).length < 2) { if (typeof toast === "function") toast("Keep at least one person"); return; }
      confirmBox(`Delete \u201c${P.profiles[id].name}\u201d and their saved retirement plan? This cannot be undone.`, () => {
        const x = fhpDelete(id); if (x && typeof toast === "function") toast(`Deleted ${x.snap.name}`, () => fhpRestore(x));
      });
    }
  });

  /* Reports > Clients: one card per saved person */
  function fhpCards() {
    const M0 = typeof cr === "function" ? cr : FHE.currency, M = x => String(M0(x)).replace("\u20b9 ", "\u20b9");
    const list = fhpList(), only = list.length < 2;
    const cards = list.map(p => {
      let body = `<p class="fhp-nil">No saved plan yet. Switch to the plan and finish the steps.</p>`, chip = `<span class="fhp-chip">Incomplete</span>`;
      if (p.v && FHE.validateAll(p.v).length === 0) {
        const r = FHE.calculate(p.v), es = FHE.earningSummary(p.v);
        if (r.ok) {
          const gap = r.surplus >= 0, pct = r.needed > 0 ? Math.round(r.available / r.needed * 100) : null;
          chip = `<span class="fhp-chip ${gap ? "fhp-ok" : "fhp-bad"}">${gap ? "On track" : "Shortfall"}</span>`;
          const st = (l, v, c) => `<div><small>${l}</small><b class="${c || ""}">${v}</b></div>`;
          body = `<div class="fhp-g">${st("Age \u2192 retire \u2192 plan ends", `${p.v.age} \u2192 ${p.v.retire || "\u2014"} \u2192 ${p.v.until}`)}${st("Corpus today", M(r.available))}${st("Required today", M(r.needed))}${st(gap ? "Surplus" : "Shortfall", M(Math.abs(r.surplus)), gap ? "fhp-pos" : "fhp-neg")}${st("Funded", pct === null ? "\u2014" : pct + "%")}${st("Lasts until", r.runout ? "Age " + (r.runout - 1) : "Age " + p.v.until + "+")}</div>${es.on ? `<p class="fhp-ph">Earning ${es.years} yrs (${M(es.earn)}/yr) \u2192 retirement ${es.retiredYears} yrs</p>` : `<p class="fhp-ph">Earning phase off</p>`}`;
        } else chip = `<span class="fhp-chip fhp-bad">Check inputs</span>`;
      }
      const upd = p.t ? new Date(p.t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "\u2014";
      return `<article class="fhp-card${p.active ? " fhp-cur" : ""}" aria-label="${esc(p.name)}"><header><h3>${esc(p.name)}</h3>${p.active ? `<span class="fhp-chip fhp-act">Active</span>` : ""}${chip}</header>${body}<p class="fhp-up">Updated ${upd}</p><div class="fhp-acts"><button type="button" class="p" data-fhp="switch:${esc(p.id)}">Switch to Plan</button><button type="button" data-fhp="dup:${esc(p.id)}">Duplicate</button><button type="button" data-fhp="ren:${esc(p.id)}">Rename</button><button type="button" class="d" data-fhp="del:${esc(p.id)}"${only ? " disabled title=\"Keep at least one person\"" : ""}>Delete</button></div></article>`;
    }).join("");
    return `<div class="fhp-grid">${cards}<button type="button" class="fhp-new" data-fhp="add"><span aria-hidden="true">+</span>Add Person<small>Starts a new retirement plan</small></button></div><p class="fhp-sm"><button type="button" data-fhp="samples">Load 5 sample clients</button><span>Shishir, Deepak, Dharam, Meera and Arjun, each with a complete plan, for testing. Names already in the list are skipped.</span></p>`;
  }

  /* A welcoming header for the client: initials badge, "prepared for", the name in large type and a one-line summary of the plan. Shared by both planners. */
  function clientHeroHTML(name, bits, eyebrow, wide) {
    const nm = String(name || "").trim(); if (!nm) return "";
    const ini = nm.split(/\s+/).filter(Boolean).slice(0, 2).map(w => Array.from(w)[0].toUpperCase()).join("");
    const sub = (bits || []).filter(Boolean);
    return `<header class="fhp-hero${wide ? " wide" : ""}" aria-label="${esc(eyebrow || "Plan prepared for")} ${esc(nm)}"><span class="fhp-av" aria-hidden="true">${esc(ini)}</span><div class="fhp-ht"><span class="fhp-eb">${esc(eyebrow || "Plan prepared for")}</span><h2 class="fhp-nm">${esc(nm)}</h2>${sub.length ? `<span class="fhp-sub">${sub.join(" \u00b7 ")}</span>` : ""}</div></header>`;
  }
  window.clientHeroHTML = clientHeroHTML;
  /* Retirement planner title: the same compact banner as the Goal Planner dashboard (small initials badge, "prepared for", name and the plan line on one row) */
  function rpBannerHTML(name, bits) {
    const nm = String(name || "").trim(); if (!nm) return "";
    const ini = nm.split(/\s+/).filter(Boolean).slice(0, 2).map(w => Array.from(w)[0].toUpperCase()).join("");
    const sub = (bits || []).filter(Boolean), eb = "Retirement plan prepared for";
    return `<header class="rp-ban" aria-label="${eb} ${esc(nm)}"><div class="dz-who"><span class="fhp-av sm" aria-hidden="true">${esc(ini)}</span><div class="fhp-ht"><span class="fhp-eb">${eb}</span><div class="dz-nr"><h2 class="fhp-nm sm">${esc(nm)}</h2>${sub.length ? `<span class="fhp-sub">${sub.join(" \u00b7 ")}</span>` : ""}</div></div></div></header>`;
  }
  function clientHero(name, v) {
    const bits = [];
    if (v && !FHE.isBlank(v.age)) {
      bits.push(`Age ${esc(v.age)}`);
      if (!FHE.isBlank(v.retire)) bits.push(`retiring at ${esc(v.retire)}`);
      if (!FHE.isBlank(v.until)) bits.push(`planned to ${esc(v.until)}`);
    }
    return rpBannerHTML(name, bits);
  }
  window.fhPage = function () {
    const sv = savedState(), ok = !!(sv && FHE.validateAll(sv.v).length === 0);
    const cur = (fhpList().find(p => p.active) || { name: "" }).name;
    if (RP.tab === "report") {
      const view = RP.rv === "yy" ? "yy" : "clients";
      const sub = `<div class="seg" role="group" aria-label="Report type"><button type="button" data-rp="rv:clients" aria-pressed="${view === "clients"}">Clients</button><button type="button" data-rp="rv:yy" aria-pressed="${view === "yy"}">Year by Year</button></div>`;
      const none = `<div class="card em">No saved retirement plan yet. Open <b>Edit Inputs</b> below, answer the steps and press <b>Finish</b>.</div>`;
      const mb = `<div class="fhp fhp-m">${fhpBarHTML(false)}</div>`;
      if (view === "clients") return `<div class="fh-page rp2-pagew">${mb}<div class="rph"><div>${window.rptHead("Clients", "Every saved retirement plan. Switch to a plan to see its summary, goals and cash flow.")}</div><div class="rpr">${sub}</div></div>${fhpCards()}${rp2Nav("report")}</div>`;
      return `<div class="fh-page rp2-pagew">${mb}<div class="rph"><div>${window.rptHead("Year By Year Status", cur + " \u00b7 retirement plan, year by year: money out, money coming in, and the money left at the end of each year.")}</div><div class="rpr">${sub}</div></div>${ok ? `<div class="hz-sec">${window.hzReport()}</div>` : none}${rp2Nav("report")}</div>`;
    }
    const none = rp2Welcome();
    ensureSxCss();
    return `<div class="fh-page rp2-page"><div class="fhp fhp-m">${fhpBarHTML(false)}</div>${clientHero(cur, sv && sv.v)}${ok ? `<div class="rptv" id="rptv">${rptInner()}</div>` : none}${rp2Nav("status")}</div>`;
  };

  document.addEventListener("click", e => {
    const c = e.target.closest && e.target.closest("[data-rp2-age]");
    if (c) { simSet(Number(c.dataset.rp2Age)); return; }
    const o = e.target.closest && e.target.closest("[data-rp2-open]");
    if (o) { const d = document.getElementById("rp2-ac-" + o.dataset.rp2Open); if (d) { d.open = true; if (d.scrollIntoView) d.scrollIntoView({ behavior: "smooth", block: "start" }); } }
  });

  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-fh-open]");
    if (b) fhOpen(b.dataset.fhOpen);
  });

  function fhOpen(sec) {
    const dg = document.getElementById("dg");
    if (!dg || dg.open) return;
    syncFromState();
    FH.sec = sec === "summary" ? "summary" : sec === "milestones" ? "milestones" : "status";
    dg.className = "";
    dg.innerHTML = markup();
    dg.classList.add("hf", "fh");
    dg.setAttribute("aria-labelledby", "fh-title");
    root = dg.querySelector("#fh");
    bind();
    refresh();
    applyView();
    document.documentElement.classList.add("fh-on");
    dg.addEventListener("close", () => {
      dg.classList.remove("fh"); dg.removeAttribute("aria-labelledby");
      document.documentElement.classList.remove("fh-on");
      try {
        if (typeof UI !== "undefined" && (UI.tab === "Retirement planner" || UI.tab === "RP Reports") && typeof render === "function") {
          if (UI.tab === "RP Reports") UI.tab = "Retirement planner";
          RPT.tab = FH.smTab; render();
        }
      } catch (e) { /* page refresh is cosmetic */ }
    }, { once: true });
    dg.showModal();
    const first = FH.sec === "summary" ? $("s-summary") : FH.sec === "milestones" ? $("s-milestones") : root.querySelector(".fh-panel:not([hidden]) input:not([type=hidden]), .fh-panel:not([hidden]) select");
    if (first) first.focus({ preventScroll: true });
  }
  window.fhOpen = fhOpen;
})();
