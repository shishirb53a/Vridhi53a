/* Stress Test · screen (UI only). All maths lives in window.StressTest (engine.js).
   4-Tab Executive layout:
     Tab 1 (overview)  : 70-year corpus trajectory across stress scenarios + Resilience summary
     Tab 2 (scenarios) : Scenarios Report (Goal Planner Annual Projection format: Outcome/Scenarios/Columns dropdowns, Search, Sort, Row highlight, Maximize full-window view)
     Tab 3 (settings)  : Stress settings (11 editable per-client parameters in 4 groups)
     Tab 4 (engine)    : Year-by-year money balance (70 years) + Notes: how the numbers are worked out
   Colours come from the app's theme variables (light / dark / accent).
   Mount:  StressTestUI.mount(hostElement, provider?)   provider = { clients, activeId, inputs, settings, saveSettings, onBack, onYearByYear } */
(function () {
  "use strict";
  const ST = window.StressTest;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
  const cr = n => {
    const abs = Math.abs(n);
    if (abs >= 1e7) return (n < 0 ? "−" : "") + "₹" + (abs / 1e7).toFixed(2) + " Cr";
    if (abs >= 1e5) return (n < 0 ? "−" : "") + "₹" + (abs / 1e5).toFixed(1) + " L";
    return inr(n);
  };
  const pct = (n, d) => (n * 100).toFixed(d == null ? 2 : d) + "%";
  const yrs = v => v >= ST.MAXY ? "Never runs out" : v.toFixed(2) + " yrs";
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const IC_MAX = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  const IC_MIN = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  const IC_CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  const go = tab => { try { if (typeof UI !== "undefined" && typeof render === "function") { UI.tab = tab; render(); } } catch (e) { /* ignore */ } };
  const rp = (tab, rv) => { if (window.RPUI) { window.RPUI.tab = tab; if (rv) window.RPUI.rv = rv; } go("Retirement planner"); };
  /* Default provider: the app's own state. Clients are the Retirement Planner profiles (S.fhp); the active one is S.fh. */
  function appProvider() {
    const A = () => (typeof S !== "undefined" && S) || {};
    const profiles = () => (A().fhp && A().fhp.profiles) || {};
    return {
      clients() { const p = profiles(), ids = Object.keys(p); return ids.length ? ids.map(id => ({ id, name: p[id].name })) : [{ id: "_active", name: "Active plan" }]; },
      activeId() { return (A().fhp && A().fhp.active) || "_active"; },
      inputs(id) { const p = profiles()[id]; return p && p.v ? p.v : (id === this.activeId() && A().fh ? A().fh.v : null); },
      settings(id) { return (A().stress || {})[id]; },
      saveSettings(id, s) { try { A().stress = Object.assign({}, A().stress, { [id]: s }); if (typeof save === "function") save(); } catch (e) { /* best effort */ } },
      onBack() { rp("status"); },
      onYearByYear() { rp("report", "yy"); }
    };
  }

  const NOTES = [
    "Each year: money at end = money at start × (1 + investment return) + buffer interest + other income + lump sums − household cost − children’s costs. Same logic as the Year-by-Year report, so scenario 1 matches it.",
    "Household cost = monthly expense × 12, grown by the scenario’s inflation and reduced by the planner’s expense-reduction rule after the chosen age. Unlike the Year-by-Year report, costs continue after the plan ends so you can see how long money truly lasts (maximum 70 years).",
    "The emergency buffer is kept aside and earns its own return; it joins the corpus when the plan ends. A one-time shock is taken from the investable money on day 1.",
    "Children’s college fees and weddings, lump sums, other-income growth, the pre-retirement earning phase and the expense-reduction rule come from the Retirement Planner in every scenario. Once the balance turns negative the money has run out and the balance stays frozen.",
    "Survival is the number of full years funded plus the part of the next year before the money reaches zero. “Never runs out” means the money was still positive after 70 years. “Runs out on” counts from this month.",
    "Money is held in one blended pool. “All-safe” uses the Conservative return and “Aggressive” uses the Optimistic return from the stress settings."];
  const SETTINGS = [
    ["Spending", [["lean", "Lean living: cut expenses by", "Scenarios 2, 14", "p"], ["belt", "Belt-tightened: cut expenses by", "Scenario 3", "p"], ["expUp", "Lifestyle unchanged: expenses rise by", "Scenarios 4, 13", "p"]]],
    ["Markets", [["bear", "Bear market: return falls by (points)", "Scenarios 5, 13 (not below 0%)", "p"], ["bull", "Bull market: return rises by (points)", "Scenarios 6, 14", "p"], ["conservative", "All-safe portfolio return", "Scenario 8", "p"], ["optimistic", "Aggressive portfolio return", "Scenario 9", "p"]]],
    ["Inflation and shocks", [["highInfl", "High inflation of", "Scenarios 7, 13", "p"], ["shock", "Medical / emergency shock (₹)", "Scenario 12, paid on day 1", "r"]]],
    ["Income", [["freelance", "Freelance covers % of yearly costs", "Scenarios 10, 14", "p"], ["partTime", "Part-time job covers % of yearly costs", "Scenario 11", "p"]]]];
  const TIPS = { corpus: "Planner: total money available today", monthly: "Planner: monthly household spending today", buffer: "Planner: emergency reserve",
    other: "Planner: other income running in year 1 (today’s rupees)", roi: "Planner: annual portfolio return", bufferRoi: "Planner: emergency-reserve return", infl: "Planner: annual household inflation" };

  /* Column definitions matching Goal Planner > Annual Portfolio Projection Report (Fixed / Default / Optional) */
  const PRIMARY_COLS = [
    ["monthly", "Monthly expense", "C"],
    ["roi", "Investment return", "G"],
    ["infl", "Inflation", "I"],
    ["shock", "One-time shock", "E"],
    ["other", "Other income p.a.", "F"],
    ["surv", "Survival", "L"],
    ["age", "Runs out at age", "M"],
    ["on", "Runs out on", "N"],
    ["left", "Money left at end of plan", "O"],
    ["funded", "Full years funded", "P"]
  ];
  const STARTING_COLS = [
    ["corpus", "Corpus", "B"],
    ["buffer", "Emergency buffer", "D"],
    ["invest", "Investable", "J"],
    ["need", "Net need p.a.", "K"],
    ["bufRoi", "Buffer return", "H"]
  ];
  const ALL_COLS = STARTING_COLS.concat(PRIMARY_COLS);
  const DEFAULT_KEYS = PRIMARY_COLS.map(c => c[0]);
  const COLS_KEY = "vr-st-cols" + (typeof window !== "undefined" && window.__UK ? "-" + window.__UK : "");
  function defaultCols() {
    const o = {};
    STARTING_COLS.forEach(c => { o[c[0]] = false; });
    PRIMARY_COLS.forEach(c => { o[c[0]] = true; });
    return o;
  }
  function loadCols() {
    const base = defaultCols();
    try {
      const raw = typeof localStorage !== "undefined" && localStorage.getItem(COLS_KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === "object") {
        ALL_COLS.forEach(c => { if (typeof saved[c[0]] === "boolean") base[c[0]] = saved[c[0]]; });
      }
    } catch (e) { /* ignore */ }
    return base;
  }
  function saveCols(cols) {
    try {
      if (typeof localStorage === "undefined") return;
      const def = defaultCols(), diff = {};
      ALL_COLS.forEach(c => { if (!!cols[c[0]] !== def[c[0]]) diff[c[0]] = !!cols[c[0]]; });
      if (Object.keys(diff).length) localStorage.setItem(COLS_KEY, JSON.stringify(diff));
      else localStorage.removeItem(COLS_KEY);
    } catch (e) { /* ignore */ }
  }
  function isDefaultCols(cols) {
    const def = defaultCols();
    return ALL_COLS.every(c => !!cols[c[0]] === def[c[0]]);
  }

  const LINKED = { corpus: 1, monthly: 1, buffer: 1, other: 1, roi: 1, bufRoi: 1, infl: 1 };
  const TABS = [
    ["overview", "Trajectory & Summary", "\ud83d\udcc8"],
    ["scenarios", "Scenarios", "\ud83d\udccb"],
    ["settings", "Stress Settings", "\u2699\ufe0f"],
    ["engine", "Engine & Notes", "\ud83d\udcc4"]
  ];
  const SORT_OPTS = [
    ["no", "Scenario (#)"],
    ["name", "Scenario name"],
    ["surv", "Survival"],
    ["monthly", "Monthly expense"],
    ["roi", "Investment return"],
    ["infl", "Inflation"],
    ["shock", "One-time shock"],
    ["other", "Other income p.a."],
    ["age", "Runs out at age"],
    ["on", "Runs out on"],
    ["left", "Money left at end"],
    ["funded", "Full years funded"],
    ["corpus", "Corpus"],
    ["buffer", "Emergency buffer"],
    ["invest", "Investable"],
    ["need", "Net need p.a."],
    ["bufRoi", "Buffer return"]
  ];
  let lastTab = "overview";

  function mount(host, provider) {
    const P = provider || appProvider();
    const st = {
      client: P.activeId(),
      tab: lastTab,
      result: null,
      issues: null,
      cols: loadCols(),
      outcomes: { ok: true, short: true },
      scens: null,          /* null = all 14 selected; or Set/map of scenario numbers 1..14 */
      msd: null,            /* open dropdown key: 'out' | 'scen' | 'cols' | null */
      rq: "",               /* scenario search text */
      sortKey: "no",
      sortDir: 1,
      selRow: null,         /* highlighted scenario number */
      filter: "all",        /* engine filter: all | out | base */
      engQ: "",             /* engine year/age search */
      open: { engine: true, notes: true },
      dirty: false,
      max: false
    };

    function compute() {
      const b = ST.fromPlanner(P.inputs(st.client));
      st.issues = b.ok ? null : b.issues;
      st.result = b.ok ? ST.run(b, P.settings(st.client)) : null;
      st.dirty = false;
    }
    const sec = (t, n, extra) => `<div class="st-tile${extra ? " " + extra : ""}"><small>${esc(t)}</small><b>${esc(n[0])}</b><span>${esc(n[1])}</span></div>`;
    function infoBtn(text, label) {
      if (typeof window !== "undefined" && typeof window.rptInfo === "function") return window.rptInfo(text, label);
      return `<span class="rpi" tabindex="0" role="button" aria-label="${esc(label || "About this table")}"><span class="rpi-i" aria-hidden="true">i</span><span class="rpi-t" role="tooltip">${esc(text)}</span></span>`;
    }

    function bar() {
      const opts = P.clients().map(c => `<option value="${esc(c.id)}"${c.id === st.client ? " selected" : ""}>${esc(c.name)}</option>`).join("");
      return `<div class="st-bar"><h1>Stress Test</h1><label>Client <select data-st="client">${opts}</select></label></div>`;
    }
    function bottomNav() {
      const btns = TABS.map(([id, label, icon]) => {
        const active = st.tab === id;
        const badge = id === "settings" && st.dirty ? `<i class="st-dot" aria-label="Unsaved changes"></i>` : "";
        return `<button type="button" id="st-tab-${id}" class="st-btab" data-st-tab="${id}" role="tab" aria-selected="${active}"${active ? ' aria-current="page"' : ""} aria-controls="st-panel-${id}"><span aria-hidden="true">${icon}</span><span>${esc(label)}</span>${badge}</button>`;
      }).join("");
      return `<div class="rp2-nav st-bnav" role="tablist" aria-label="Stress Test sections">${btns}</div>`;
    }
    function problem() {
      const list = (st.issues || []).slice(0, 4).map(i => `<li>${esc(i.message)}</li>`).join("");
      return `<div class="st-problem" role="alert"><b>This client’s Retirement Planner plan is not complete yet.</b><ul>${list}</ul></div>`;
    }
    function fanChart(R, includeBear) {
      const W = 720, H = 248, L = 66, Rpad = 20, T = 20, B = 28;
      const baseRow = R.rows[0], bearRow = R.rows[4], worstRow = R.rows[12], bestRow = R.rows[13];
      const curves = includeBear ? [bestRow, baseRow, bearRow, worstRow] : [bestRow, baseRow, worstRow];
      const vals = [0];
      curves.forEach(row => {
        vals.push(row.investable);
        row.series.forEach(v => vals.push(v));
      });
      const maxV = Math.max(1e6, Math.max(...vals));
      const minV = Math.min(0, Math.min(...vals));
      const span = maxV - minV || 1;
      const X = yr => L + (yr / ST.MAXY) * (W - L - Rpad);
      const Y = v => T + ((maxV - v) / span) * (H - T - B);
      const ptsFor = row => [[0, row.investable]].concat(row.series.map((v, i) => [i + 1, v]));
      const pathFor = row => ptsFor(row).map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join(" ");
      const bestPts = ptsFor(bestRow);
      const worstPts = ptsFor(worstRow).slice().reverse();
      const bandPath = bestPts.concat(worstPts).map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(Math.max(minV, p[1])).toFixed(1)).join(" ") + " Z";
      const yZero = Y(0), xPlan = X(Math.min(ST.MAXY, Math.max(0, R.base.planYears)));
      const grid = [0, 0.5, 1].map(f => {
        const v = minV + span * f, y = Y(v);
        return `<line x1="${L}" x2="${W - Rpad}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="st-grid"/><text x="${L - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="st-ax">${esc(cr(v))}</text>`;
      }).join("");
      const xTicks = [0, 10, 20, 30, 40, 50, 60, 70].map(yr => `<text x="${X(yr).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="st-ax">${yr}y</text>`).join("");
      const planLabelX = xPlan > W - 180 ? xPlan - 8 : xPlan + 6;
      const planAnchor = xPlan > W - 180 ? "end" : "start";
      return `<svg class="st-fan" viewBox="0 0 ${W} ${H}" role="img" aria-label="70-year corpus survival trajectory across best, base, and worst scenarios">
        ${grid}${xTicks}
        <path d="${bandPath}" class="st-band"/>
        <line x1="${L}" x2="${W - Rpad}" y1="${yZero.toFixed(1)}" y2="${yZero.toFixed(1)}" class="st-zero"/>
        <line x1="${xPlan.toFixed(1)}" x2="${xPlan.toFixed(1)}" y1="${T}" y2="${H - B}" class="st-plan-line"/>
        <text x="${planLabelX.toFixed(1)}" y="${T + 12}" text-anchor="${planAnchor}" class="st-plan-lbl">Plan end (${R.base.planYears} yrs · age ${R.base.age + R.base.planYears})</text>
        <path d="${pathFor(bestRow)}" class="st-cv st-cv-best"/>
        <path d="${pathFor(baseRow)}" class="st-cv st-cv-base"/>
        ${includeBear ? `<path d="${pathFor(bearRow)}" class="st-cv st-cv-bear"/>` : ""}
        <path d="${pathFor(worstRow)}" class="st-cv st-cv-worst"/>
      </svg>`;
    }
    function hero(R) {
      const s = R.summary;
      const kpis = `<div class="st-sum">${sec("Shortest survival (worst case)", [yrs(s.min), s.minName])}${sec("Longest survival (best case)", [yrs(s.max), s.maxName])}` +
        `${sec("Lasting the full " + s.planYears + "-year plan", [s.fullPlan + " of 14", "scenarios"])}` +
        `${sec("Money runs out inside 70 yrs", [s.runOut + " of 14", "scenarios"])}` +
        `${sec("Average across scenarios", [s.avg.toFixed(2) + " yrs", "never-run-out counts as 70 years"], "st-tile-wide")}</div>`;
      return `<section class="st-hero" aria-label="Resilience overview">
        <div class="st-card st-chart-card">
          <div class="st-chead">
            <div><h2>70-year corpus trajectory across stress scenarios</h2><p class="st-note">Age ${R.base.age} today · ${R.base.planYears}-year plan horizon</p></div>
            <div class="st-cleg" aria-label="Chart legend">
              <span><i class="sw best"></i>Best case</span>
              <span><i class="sw base"></i>Base case</span>
              <span><i class="sw bear"></i>Bear market</span>
              <span><i class="sw worst"></i>Worst case</span>
            </div>
          </div>
          ${fanChart(R, true)}
        </div>
        <div class="st-card st-kpi-card">
          <div class="st-chead"><div><h2>Resilience summary</h2><p class="st-note">14 conditions tested</p></div></div>
          ${kpis}
          <div class="st-qlinks">
            <button type="button" class="st-link" data-st-tab="scenarios">View all 14 scenarios →</button>
            <button type="button" class="st-link" data-st-tab="settings">Adjust stress settings →</button>
          </div>
        </div>
      </section>`;
    }

    function activeCols() {
      const startOn = STARTING_COLS.filter(c => !!st.cols[c[0]]);
      const primOn = PRIMARY_COLS.filter(c => !!st.cols[c[0]]);
      return {
        list: startOn.concat(primOn),
        splitAt: startOn.length && primOn.length ? startOn.length : -1,
        hasStart: startOn.length > 0
      };
    }
    function sortVal(r, k, R) {
      switch (k) {
        case "name": return r.name.toLowerCase();
        case "monthly": return r.monthly;
        case "roi": return r.roi;
        case "infl": return r.infl;
        case "shock": return r.shock;
        case "other": return r.other;
        case "surv": return r.survival;
        case "age": return r.never ? 9999 : r.runsAtAge;
        case "on": return r.never ? 999999 : (r.runsOn.y * 100 + r.runsOn.m);
        case "left": return r.left == null ? -1 : r.left;
        case "funded": return r.funded;
        case "corpus": return r.corpus;
        case "buffer": return r.buffer;
        case "invest": return r.investable;
        case "need": return r.netNeed;
        case "bufRoi": return R.base.bufferRoi;
        default: return r.no;
      }
    }
    function filteredRows(R) {
      const all = R.rows.map((r, i) => { r.no = i + 1; return r; });
      const q = st.rq.trim().toLowerCase();
      const selSet = st.scens;
      const rows = all.filter(r => {
        const ok = r.survival >= R.base.planYears;
        if (ok && !st.outcomes.ok) return false;
        if (!ok && !st.outcomes.short) return false;
        if (selSet && !selSet[r.no]) return false;
        if (q) {
          const hay = [
            r.no, r.name, yrs(r.survival), ok ? "covers plan" : "falls short",
            r.never ? "never runs out" : (r.runsAtAge.toFixed(1) + " " + MON[r.runsOn.m - 1] + "-" + r.runsOn.y),
            inr(r.monthly), inr(r.corpus), inr(r.investable),
            r.left == null ? "runs out first" : inr(r.left)
          ].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      const k = st.sortKey, d = st.sortDir;
      rows.sort((x, y) => {
        const a = sortVal(x, k, R), b = sortVal(y, k, R);
        if (a === b) return (x.no - y.no) * d;
        return (a > b ? 1 : -1) * d;
      });
      return rows;
    }
    function cellVal(r, key, R) {
      switch (key) {
        case "monthly": return inr(r.monthly);
        case "roi": return pct(r.roi);
        case "infl": return pct(r.infl);
        case "shock": return r.shock ? inr(r.shock) : "–";
        case "other": return r.other ? inr(r.other) : "–";
        case "surv": return yrs(r.survival);
        case "age": return r.never ? "—" : r.runsAtAge.toFixed(1);
        case "on": return r.never ? "never runs out" : MON[r.runsOn.m - 1] + "-" + r.runsOn.y;
        case "left": return r.left == null ? "Runs out first" : inr(r.left);
        case "funded": return String(r.funded);
        case "corpus": return inr(r.corpus);
        case "buffer": return inr(r.buffer);
        case "invest": return inr(r.investable);
        case "need": return inr(r.netNeed);
        default: return pct(R.base.bufferRoi);
      }
    }
    function cell(r, c, R, sep) {
      const base = r.no === 1, ov = r.ov.includes(c[2]);
      const clsList = [];
      if (base && LINKED[c[0]]) clsList.push("l");
      if (ov) clsList.push("o");
      if (sep) clsList.push("st-sep");
      const cls = clsList.length ? ` class="${clsList.join(" ")}"` : "";
      const tip = base && LINKED[c[0]] ? ` title="${esc(TIPS[c[0]] || "Linked to the Retirement Planner")}"` : "";
      const b = R.base; let t;
      if (c[0] === "surv") {
        const ok = r.survival >= b.planYears, w = Math.min(100, r.survival / ST.MAXY * 100), pm = b.planYears / ST.MAXY * 100;
        t = `<div class="st-sv"><span class="st-ch ${ok ? "ok" : "bad"}">${ok ? "Covers plan" : "Falls short"}</span><b>${yrs(r.survival)}</b><span class="st-mb" aria-hidden="true"><i style="width:${w}%;background:${ok ? "var(--ok,#167d68)" : "var(--er,#c92a2a)"}"></i><u style="left:${pm}%"></u></span></div>`;
      } else {
        t = cellVal(r, c[0], R);
      }
      return `<td${cls}${tip}>${t}</td>`;
    }
    function thBtn(k, label, extraCls) {
      const on = st.sortKey === k;
      const ariaSort = on ? (st.sortDir > 0 ? "ascending" : "descending") : "none";
      const arrow = on ? (st.sortDir > 0 ? " ▲" : " ▼") : "";
      return `<th${extraCls ? ` class="${extraCls}"` : ""} aria-sort="${ariaSort}"><button type="button" data-st-rk="${k}">${esc(label)}${arrow}</button></th>`;
    }
    function scenRowsHTML(R) {
      const cols = activeCols();
      const rows = filteredRows(R);
      const noneSelected = (!st.outcomes.ok && !st.outcomes.short) || (st.scens && Object.keys(st.scens).every(k => !st.scens[k]));
      if (noneSelected) {
        return `<div class="em st-empty-box">Please select at least one scenario or outcome.</div>`;
      }
      if (!rows.length) {
        return `<div class="em st-empty-box">No scenarios match your search.</div>`;
      }
      const head = `<thead><tr>${thBtn("name", "Scenario")}${cols.list.map((c, idx) => thBtn(c[0], c[1], idx === cols.splitAt ? "st-sep" : "")).join("")}</tr></thead>`;
      const body = rows.map(r => {
        const cls = [r.no === 1 ? "st-base" : "", st.selRow === r.no ? "st-sel" : ""].filter(Boolean).join(" ");
        return `<tr data-st-r="${r.no}"${cls ? ` class="${cls}"` : ""} tabindex="0" aria-selected="${st.selRow === r.no}"><td>${esc(r.name)}</td>${cols.list.map((c, idx) => cell(r, c, R, idx === cols.splitAt)).join("")}</tr>`;
      }).join("");
      const mobCards = rows.map(r => {
        const ok = r.survival >= R.base.planYears, w = Math.min(100, r.survival / ST.MAXY * 100);
        const selCls = st.selRow === r.no ? " st-sel" : "";
        const kvCols = cols.list.filter(c => c[0] !== "surv");
        const kvHTML = kvCols.map(c => `<span>${esc(c[1])}</span><b>${esc(cellVal(r, c[0], R))}</b>`).join("");
        return `<article class="st-mcard${selCls}" data-st-r="${r.no}"><div class="st-mhead"><strong>${esc(r.name)}</strong><span class="st-ch ${ok ? "ok" : "bad"}">${ok ? "Covers plan" : "Falls short"}</span></div>` +
          (st.cols.surv ? `<div class="st-msurv"><b>${yrs(r.survival)}</b><span class="st-mb" aria-hidden="true"><i style="width:${w}%;background:${ok ? "var(--ok,#167d68)" : "var(--er,#c92a2a)"}"></i></span></div>` : "") +
          (kvHTML ? `<div class="st-mkv">${kvHTML}</div>` : "") +
          `</article>`;
      }).join("");
      return `<div class="st-wrap"><table class="st-t">${head}<tbody>${body}</tbody></table></div><div class="st-mcards">${mobCards}</div>`;
    }
    function msdBox(key, title, summaryText, actionsHTML, bodyHTML) {
      const open = st.msd === key;
      return `<div class="msd" data-st-msd="${key}"><span class="msd-t">${esc(title)}</span>` +
        `<button type="button" class="msd-b" data-st-msdb="${key}" aria-haspopup="true" aria-expanded="${open}"><b>${esc(summaryText)}</b>${IC_CHEV}</button>` +
        `<div class="msd-p"${open ? "" : " hidden"} role="group" aria-label="${esc(title)}"><div class="msd-a">${actionsHTML}</div><div class="msd-l">${bodyHTML}</div></div></div>`;
    }
    function scenDrops(R) {
      const allRows = R.rows.map((r, i) => { r.no = i + 1; return r; });
      const nOk = allRows.filter(r => r.survival >= R.base.planYears).length;
      const nShort = allRows.length - nOk;
      const outSummary = st.outcomes.ok && st.outcomes.short ? "All outcomes" : st.outcomes.ok ? "Covers plan" : st.outcomes.short ? "Falls short" : "None selected";
      const outBody = `<label class="msd-i"><input type="checkbox" data-st-out="ok"${st.outcomes.ok ? " checked" : ""}><i style="background:var(--c-ok)"></i><span>Covers plan</span><em>${nOk}</em></label>` +
        `<label class="msd-i"><input type="checkbox" data-st-out="short"${st.outcomes.short ? " checked" : ""}><i style="background:var(--c-er)"></i><span>Falls short</span><em>${nShort}</em></label>`;
      const outAct = `<button type="button" data-st-msda="out:all">Select all</button><button type="button" data-st-msda="out:none">Clear</button>`;

      const selCount = st.scens ? allRows.filter(r => !!st.scens[r.no]).length : allRows.length;
      const firstSel = st.scens ? allRows.find(r => !!st.scens[r.no]) : null;
      const scenSummary = selCount === allRows.length ? "All 14 scenarios" : selCount === 0 ? "None selected" : selCount === 1 && firstSel ? firstSel.name : `${selCount} of 14 selected`;
      const scenBody = allRows.map(r => {
        const checked = !st.scens || !!st.scens[r.no];
        const ok = r.survival >= R.base.planYears;
        return `<label class="msd-i"><input type="checkbox" data-st-sc="${r.no}"${checked ? " checked" : ""}><i style="background:${ok ? "var(--c-ok)" : "var(--c-er)"}"></i><span>${esc(r.name)}</span><em>${ok ? "Covers" : "Short"}</em></label>`;
      }).join("");
      const scenAct = `<button type="button" data-st-msda="scen:all">Select all</button><button type="button" data-st-msda="scen:none">Clear</button>`;

      const totalCols = ALL_COLS.length + 1;
      const visCols = 1 + ALL_COLS.filter(c => !!st.cols[c[0]]).length;
      const colsSummary = isDefaultCols(st.cols) ? "Default columns" : visCols === totalCols ? `All columns (${totalCols})` : `${visCols} of ${totalCols} shown`;
      const colRow = (key, label, tierLabel, fixed) => fixed
        ? `<label class="msd-i"><input type="checkbox" checked disabled><span>${esc(label)}</span><em>Fixed 🔒</em></label>`
        : `<label class="msd-i"><input type="checkbox" data-st-col="${key}"${st.cols[key] ? " checked" : ""}><span>${esc(label)}</span><em>${tierLabel}</em></label>`;
      const colsBody = colRow("scenario", "Scenario", "Fixed 🔒", true) +
        PRIMARY_COLS.map(c => colRow(c[0], c[1], "Default", false)).join("") +
        STARTING_COLS.map(c => colRow(c[0], c[1], "Optional", false)).join("");
      const colsAct = `<button type="button" data-st-msda="cols:reset">Reset to default</button><button type="button" data-st-msda="cols:all">Show all</button>`;

      return `<div class="msds">${msdBox("out", "Outcome", outSummary, outAct, outBody)}${msdBox("scen", "Scenarios", scenSummary, scenAct, scenBody)}${msdBox("cols", "Columns", colsSummary, colsAct, colsBody)}</div>`;
    }
    function table(R) {
      const rows = filteredRows(R);
      const clientName = (P.clients().find(c => c.id === st.client) || {}).name || "Active plan";
      const cols = activeCols();
      const extraClass = (st.max ? " st-max" : "") + (cols.hasStart ? " st-wide-cols" : "");
      const maxBtn = `<button type="button" class="st-btn st-max-btn" data-st-max aria-pressed="${st.max}" title="${st.max ? "Exit full window (Esc)" : "Open full window"}">${st.max ? IC_MIN : IC_MAX}<span>${st.max ? "Restore" : "Maximize"}</span></button>`;
      const aboutTip = `Each scenario runs up to 70 years. Base Case matches the live Retirement Planner · Click a row to highlight it · Use Outcome, Scenarios, and Columns dropdowns to filter or customize columns · Hover linked Base Case values for details.`;
      const sortOpts = SORT_OPTS.map(([k, lbl]) => `<option value="${k}"${st.sortKey === k ? " selected" : ""}>Sort: ${esc(lbl)}</option>`).join("");
      return `<div class="st-main"><div class="st-card st-scen-card${extraClass}">` +
        `<div class="rph2 st-scen-head"><div class="rpt"><h2>How long does the corpus last under each condition?</h2>${infoBtn(aboutTip, "About this table")}</div><div class="st-scen-actions">${maxBtn}</div></div>` +
        `<p class="st-note st-scen-sub" id="st-scen-sub">${esc(clientName)} · <span data-st-count>${rows.length} of 14 scenarios shown</span> · ${R.summary.fullPlan} of 14 cover the ${R.base.planYears}-year plan.</p>` +
        scenDrops(R) +
        `<div class="tb st-tb-bar"><input id="st-rq" type="search" placeholder="Search scenario, survival, age, amount…" aria-label="Search scenarios" value="${esc(st.rq)}"><select id="st-rsf" aria-label="Sort by">${sortOpts}</select><button type="button" id="st-rsd" aria-label="Toggle sort direction" title="Toggle sort direction">${st.sortDir > 0 ? "▲" : "▼"}</button></div>` +
        `<div id="st-rr">${scenRowsHTML(R)}</div>` +
        `</div></div>`;
    }
    function settings(R) {
      const s = R.settings;
      const fields = SETTINGS.map(g => `<div class="st-sg-card"><h3>${g[0]}</h3>` + g[1].map(f => {
        const k = f[0], v = f[3] === "r" ? Math.round(s[k]).toLocaleString("en-IN") : +(s[k] * 100).toFixed(2);
        return `<div class="st-f"><label for="st-${k}">${esc(f[1])}<small>${esc(f[2])}${f[3] === "p" ? " · %" : ""}</small></label><input id="st-${k}" data-set="${k}" data-fmt="${f[3]}" inputmode="decimal" value="${v}"></div>`;
      }).join("") + `</div>`).join("");
      return `<div class="st-card st-set-panel" aria-label="Stress settings">
        <div class="st-chead">
          <div><h2>Stress settings</h2><p class="st-note">Adjust how severe each shock is. Changes are saved per client.</p></div>
          <div class="st-acts st-acts-top"><button type="button" class="st-btn p" data-st="apply" disabled>Apply</button><button type="button" class="st-btn" data-st="reset">Reset to defaults</button></div>
        </div>
        <div class="st-sgrid">${fields}</div>
      </div>`;
    }
    function engineTableHTML(R) {
      let idx = R.rows.map((r, i) => i);
      if (st.filter === "out") idx = idx.filter(i => !R.rows[i].never); else if (st.filter === "base") idx = [0];
      const q = st.engQ.trim().toLowerCase();
      const engRows = R.engine.filter(e => !q || String(e.year).includes(q) || String(e.age).includes(q));
      const head = `<thead><tr><th>Year</th><th>Your age</th><th>Kids: college + weddings</th><th>Lump-sum income</th><th>Lump-sum principal back</th>${idx.map(i => `<th title="${esc(R.rows[i].name)}">S${i + 1}</th>`).join("")}</tr></thead>`;
      const body = engRows.length
        ? engRows.map(e => `<tr><td>${e.year}</td><td>${e.age}</td><td>${inr(e.kids)}</td><td>${inr(e.lumpIncome)}</td><td>${inr(e.lumpPrincipal)}</td>${idx.map(i => `<td class="${e.balances[i] < 0 ? "neg" : ""}">${inr(e.balances[i])}</td>`).join("")}</tr>`).join("")
        : `<tr><td colspan="${5 + idx.length}" class="st-empty">No years match your search.</td></tr>`;
      return `<div class="st-wrap st-short"><table class="st-t">${head}<tbody>${body}</tbody></table></div>`;
    }
    function engine(R) {
      const f = [["all", "All 14 scenarios"], ["out", "Only scenarios that run out"], ["base", "Base case only"]].map(o => `<option value="${o[0]}"${st.filter === o[0] ? " selected" : ""}>${o[1]}</option>`).join("");
      return `<details class="st-d" data-open="engine"${st.open.engine ? " open" : ""}><summary>Year-by-year money balance for each scenario (calculation engine, 70 years)</summary>` +
        `<div class="st-tb"><label>Show <select data-st="filter">${f}</select></label><input id="st-eng-q" type="search" class="st-eng-q" placeholder="Search year or age…" aria-label="Search year or age" value="${esc(st.engQ)}"><span class="st-note">Negative balance = the money has run out. S1 to S14 are the scenarios above, in order.</span></div>` +
        `<div id="st-eng-rr">${engineTableHTML(R)}</div></details>`;
    }
    const notes = () => `<details class="st-d" data-open="notes"${st.open.notes ? " open" : ""}><summary>Notes: how the numbers are worked out</summary><ul>${NOTES.map(n => `<li>${esc(n)}</li>`).join("")}</ul></details>`;

    function panel(id, content) {
      return `<div id="st-panel-${id}" class="st-panel" role="tabpanel" aria-labelledby="st-tab-${id}" data-st-panel="${id}"${st.tab === id ? "" : " hidden"}>${content}</div>`;
    }
    function syncMsd() {
      host.querySelectorAll("[data-st-msd]").forEach(d => {
        const o = st.msd === d.getAttribute("data-st-msd");
        const p = d.querySelector(".msd-p"), b = d.querySelector(".msd-b");
        if (p) p.hidden = !o;
        if (b) b.setAttribute("aria-expanded", String(o));
      });
    }
    function updateScenBody() {
      const R = st.result; if (!R) return;
      const rr = host.querySelector("#st-rr");
      if (rr) rr.innerHTML = scenRowsHTML(R);
      const cnt = host.querySelector("[data-st-count]");
      if (cnt) cnt.textContent = `${filteredRows(R).length} of 14 scenarios shown`;
      if (st.max) fitMaxTable();
    }
    function switchTab(id) {
      if (!TABS.some(t => t[0] === id)) return;
      if (id !== "scenarios" && st.max) toggleMax(false);
      st.msd = null;
      syncMsd();
      st.tab = id;
      lastTab = id;
      host.querySelectorAll(".st-btab[data-st-tab]").forEach(b => {
        const on = b.getAttribute("data-st-tab") === id;
        b.setAttribute("aria-selected", String(on));
        if (on) b.setAttribute("aria-current", "page");
        else if (b.removeAttribute) b.removeAttribute("aria-current");
      });
      host.querySelectorAll("[data-st-panel]").forEach(p => { p.hidden = p.getAttribute("data-st-panel") !== id; });
      if (typeof window !== "undefined" && window.scrollTo) window.scrollTo(0, 0);
    }
    function fitMaxTable() {
      if (!st.max) return;
      const wrap = host.querySelector(".st-scen-card.st-max .st-wrap");
      const tbl = wrap && wrap.querySelector("table.st-t");
      if (!wrap || !tbl) return;
      tbl.style.zoom = "";
      const avail = wrap.clientWidth, need = tbl.scrollWidth;
      if (avail > 700 && need > avail) {
        const z = Math.max(0.65, Math.floor((avail / need) * 1000) / 1000);
        tbl.style.zoom = String(z);
      }
    }
    function toggleMax(next) {
      st.max = typeof next === "boolean" ? next : !st.max;
      render();
    }
    function render(refocusSel) {
      compute();
      const R = st.result;
      if (!R) st.max = false;
      const body = R
        ? panel("overview", hero(R)) +
          panel("scenarios", table(R)) +
          panel("settings", settings(R)) +
          panel("engine", engine(R) + notes()) +
          bottomNav()
        : problem();
      host.innerHTML = `<section class="st-root" aria-label="Stress Test">${bar()}${body}</section>`;
      if (st.max) {
        fitMaxTable();
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(fitMaxTable);
      }
      if (refocusSel) {
        const el = host.querySelector(refocusSel);
        if (el && el.focus) el.focus();
      }
    }
    function readSettings() {
      const o = {};
      host.querySelectorAll("[data-set]").forEach(i => {
        const txt = String(i.value).replace(/[,₹\s]/g, ""), n = Number(txt);
        if (txt === "" || !Number.isFinite(n)) return;
        o[i.dataset.set] = i.dataset.fmt === "r" ? n : n / 100;
      });
      return ST.cleanSettings(Object.assign({}, st.result.settings, o));
    }
    function selectRow(no) {
      st.selRow = st.selRow === no ? null : no;
      host.querySelectorAll("#st-rr [data-st-r]").forEach(x => {
        const s = Number(x.getAttribute("data-st-r")) === st.selRow;
        x.classList.toggle("st-sel", s);
        if (x.tagName === "TR") x.setAttribute("aria-selected", String(s));
      });
    }

    host.addEventListener("click", e => {
      const maxBtn = e.target.closest("[data-st-max]");
      if (maxBtn) { st.msd = null; toggleMax(); return; }
      const tabBtn = e.target.closest("[data-st-tab]");
      if (tabBtn) { switchTab(tabBtn.getAttribute("data-st-tab")); return; }
      const msdb = e.target.closest("[data-st-msdb]");
      if (msdb) {
        const k = msdb.getAttribute("data-st-msdb");
        st.msd = st.msd === k ? null : k;
        syncMsd();
        return;
      }
      const msda = e.target.closest("[data-st-msda]");
      if (msda) {
        const act = msda.getAttribute("data-st-msda");
        const parts = act.split(":");
        if (parts[0] === "cols") {
          if (parts[1] === "all") ALL_COLS.forEach(c => { st.cols[c[0]] = true; });
          else st.cols = defaultCols();
          saveCols(st.cols);
          st.msd = "cols";
          render(`[data-st-msda="${act}"]`);
          return;
        }
        if (parts[0] === "out") {
          const v = parts[1] === "all";
          st.outcomes = { ok: v, short: v };
          st.msd = "out";
          render(`[data-st-msda="${act}"]`);
          return;
        }
        if (parts[0] === "scen") {
          if (parts[1] === "all") st.scens = null;
          else { st.scens = {}; }
          st.msd = "scen";
          render(`[data-st-msda="${act}"]`);
          return;
        }
      }
      if (st.msd && !e.target.closest(".msd")) {
        st.msd = null;
        syncMsd();
      }
      const rkBtn = e.target.closest("[data-st-rk]");
      if (rkBtn) {
        const k = rkBtn.getAttribute("data-st-rk");
        const fk = k === "name" ? "name" : k;
        st.sortDir = st.sortKey === fk ? -st.sortDir : 1;
        st.sortKey = fk;
        const sf = host.querySelector("#st-rsf"); if (sf) sf.value = st.sortKey;
        const sd = host.querySelector("#st-rsd"); if (sd) sd.textContent = st.sortDir > 0 ? "▲" : "▼";
        updateScenBody();
        return;
      }
      if (e.target.closest("#st-rsd")) {
        st.sortDir = -st.sortDir;
        const sd = host.querySelector("#st-rsd"); if (sd) sd.textContent = st.sortDir > 0 ? "▲" : "▼";
        updateScenBody();
        return;
      }
      const rowEl = e.target.closest("#st-rr [data-st-r]");
      if (rowEl && !e.target.closest("button")) {
        selectRow(Number(rowEl.getAttribute("data-st-r")));
        return;
      }
      const t = e.target.closest("[data-st]"); if (!t) return;
      const k = t.getAttribute("data-st");
      if (k === "apply") { P.saveSettings(st.client, readSettings()); render(); }
      else if (k === "reset") { P.saveSettings(st.client, ST.defaultSettings()); render(); }
    });
    host.addEventListener("change", e => {
      const t = e.target;
      if (t.matches("[data-st=client]")) { st.client = t.value; render(); }
      else if (t.matches("[data-st=filter]")) { st.filter = t.value; render(); }
      else if (t.id === "st-rsf") {
        st.sortKey = t.value;
        updateScenBody();
      } else if (t.matches("[data-st-col]")) {
        const c = t.getAttribute("data-st-col");
        st.cols[c] = !!t.checked;
        saveCols(st.cols);
        st.msd = "cols";
        render(`[data-st-col="${c}"]`);
      } else if (t.matches("[data-st-out]")) {
        const k = t.getAttribute("data-st-out");
        st.outcomes[k] = !!t.checked;
        st.msd = "out";
        render(`[data-st-out="${k}"]`);
      } else if (t.matches("[data-st-sc]")) {
        const no = Number(t.getAttribute("data-st-sc"));
        if (!st.scens) {
          st.scens = {};
          for (let i = 1; i <= 14; i++) st.scens[i] = true;
        }
        st.scens[no] = !!t.checked;
        let allOn = true;
        for (let i = 1; i <= 14; i++) { if (!st.scens[i]) { allOn = false; break; } }
        if (allOn) st.scens = null;
        st.msd = "scen";
        render(`[data-st-sc="${no}"]`);
      }
    });
    host.addEventListener("input", e => {
      const t = e.target;
      if (t.id === "st-rq") {
        st.rq = t.value;
        updateScenBody();
        return;
      }
      if (t.id === "st-eng-q") {
        st.engQ = t.value;
        const wrap = host.querySelector("#st-eng-rr");
        if (wrap && st.result) wrap.innerHTML = engineTableHTML(st.result);
        return;
      }
      if (!t.matches("[data-set]")) return;
      st.dirty = true;
      t.classList.add("dirty");
      t.classList.add("chg");
      const a = host.querySelector("[data-st=apply]"); if (a) a.disabled = false;
      const stBtn = host.querySelector("#st-tab-settings");
      if (stBtn && !stBtn.querySelector(".st-dot")) stBtn.insertAdjacentHTML("beforeend", '<i class="st-dot" aria-label="Unsaved changes"></i>');
    });
    host.addEventListener("keydown", e => {
      const rowEl = e.target.closest && e.target.closest("#st-rr tr[data-st-r]");
      if (rowEl && e.target === rowEl && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        selectRow(Number(rowEl.getAttribute("data-st-r")));
        return;
      }
      if (e.key === "Escape") {
        if (st.msd) { e.preventDefault(); st.msd = null; syncMsd(); return; }
        if (st.max) { e.preventDefault(); toggleMax(false); return; }
      }
      if (e.key === "Enter" && e.target.matches && e.target.matches("[data-set]")) {
        e.preventDefault(); P.saveSettings(st.client, readSettings()); render();
      }
    });
    if (document.addEventListener) {
      document.addEventListener("click", e => {
        if (st.msd && host.isConnected && !e.target.closest("[data-st-msd]")) {
          st.msd = null;
          syncMsd();
        }
      });
      document.addEventListener("keydown", e => {
        if (e.key === "Escape" && host.isConnected) {
          if (st.msd) { e.preventDefault(); st.msd = null; syncMsd(); return; }
          if (st.max) { e.preventDefault(); toggleMax(false); }
        }
      });
    }
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("resize", () => { if (st.max && host.isConnected) fitMaxTable(); });
    }
    host.addEventListener("toggle", e => { const d = e.target; if (d.dataset && d.dataset.open) st.open[d.dataset.open] = d.open; }, true);
    render();
    return { refresh: render, state: st, switchTab, toggleMax, fitMaxTable };
  }

  /* Register Stress Test as a top-level module (Modules dropdown > Stress Test) and mount into [data-st-host]. */
  window.VRMODULES = (window.VRMODULES || []).concat([{
    tab: "Stress Test",
    label: "Stress Test",
    bar: function () { return ""; },
    page: function () { return '<div class="fh-page rp2-pagew st-page"><div class="st-host" data-st-host></div></div>'; },
    nav: function () { return ""; }
  }]);
  const fill = () => { const h = document.querySelector("[data-st-host]"); if (h && !h.firstChild) mount(h); };
  new MutationObserver(fill).observe(document.documentElement, { childList: true, subtree: true });
  window.StressTestUI = { mount, appProvider, open: function (tab) { if (tab && TABS.some(t => t[0] === tab)) lastTab = tab; if (typeof UI !== "undefined" && typeof render === "function") { UI.tab = "Stress Test"; render(); } } };
})();
