/* Stress Test · screen (UI only). Draws the grid of the Excel "Stress Test" tab cell for cell (rows 1-123, columns A-S)
   for one Retirement Planner client. All maths lives in window.StressTest (engine.js).
   Mount:  StressTestUI.mount(hostElement, provider?)   provider = { clients, activeId, inputs, settings, saveSettings, onBack, onYearByYear } */
(function () {
  "use strict";
  const ST = window.StressTest;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const L = "ABCDEFGHIJKLMNOPQRS".split("");
  const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
  const pct = (n, d) => (n * 100).toFixed(d == null ? 2 : d) + "%";
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* Default provider: the app's own state. Clients are the Retirement Planner profiles (S.fhp); the active one is S.fh. */
  const go = tab => { try { if (typeof UI !== "undefined" && typeof render === "function") { UI.tab = tab; render(); } } catch (e) { /* ignore */ } };
  function appProvider() {
    const A = () => (typeof S !== "undefined" && S) || {};
    const profiles = () => (A().fhp && A().fhp.profiles) || {};
    return {
      clients() { const p = profiles(), ids = Object.keys(p); return ids.length ? ids.map(id => ({ id, name: p[id].name })) : [{ id: "_active", name: "Active plan" }]; },
      activeId() { return (A().fhp && A().fhp.active) || "_active"; },
      inputs(id) { const p = profiles()[id]; return p && p.v ? p.v : (id === this.activeId() && A().fh ? A().fh.v : null); },
      settings(id) { return (A().stress || {})[id]; },
      saveSettings(id, s) { try { A().stress = Object.assign({}, A().stress, { [id]: s }); if (typeof save === "function") save(); } catch (e) { /* best effort */ } },
      onBack() { go("Retirement planner"); },
      onYearByYear() { if (typeof UI !== "undefined") UI.rps = "summary"; go("RP Reports"); }
    };
  }

  const NOTES = [
    "• Each year: Money at END = Money at START × (1 + investment return) + buffer interest + other income + lump-sum income/principal − household cost − children's costs. Same logic as the Year-by-Year tab, so Scenario 1 matches it.",
    "• Household cost = Monthly Exp × 12, grown by the scenario's inflation, and cut by the planner's expense-reduction % after the chosen age. Unlike the Year-by-Year tab, costs here continue AFTER the plan ends so you can see how long money truly lasts (max 70 years).",
    "• The emergency buffer is kept aside and earns its own return; it is released back into the corpus at the end of the plan. One-time shock is deducted from the investable money on day 1.",
    "• Children's college fees and weddings, the lump-sum receipt, other-income growth, the pre-retirement earning phase and the expense-reduction rule are inherited from the Retirement Planner in every scenario. Once the balance turns negative the money has run out and the balance is frozen.",
    "• Survival (Yrs) = full years funded + the fraction of the next year before the money hits zero. 'Never runs out' means the money was still positive after 70 years. 'Runs Out On' counts from today's month.",
    "• Single blended return: money is not split into buckets, so 'All-safe' uses the Conservative return and 'Aggressive' uses the Optimistic return set in the Stress Settings block above."
  ];
  const HEAD = ["Scenario", "Corpus (₹)", "Monthly Exp (₹)", "Emergency Buffer (₹)", "One-time Shock (₹)", "Other Income p.a. (₹)", "Investment Return", "Buffer Return", "Inflation",
    "Investable (₹)", "Net Need p.a. (₹)", "SURVIVAL (Yrs)", "Money Runs Out At Age", "Runs Out On", "Money Left at End of Plan (₹)", "Full years funded (helper)"];
  const SETTING_ROWS = [
    ["lean", "Lean living — cut expenses by", "Scenario 2 and 14", "p0"], ["belt", "Belt-tightened — cut expenses by", "Scenario 3", "p0"],
    ["expUp", "Lifestyle unchanged — expenses rise by", "Scenario 4 and 13", "p0"], ["bear", "Bear market — investment return falls by (percentage points)", "Scenario 5 and 13 (floored at 0%)", "p0"],
    ["bull", "Bull market — investment return rises by (percentage points)", "Scenario 6 and 14", "p0"], ["highInfl", "High inflation — household inflation of", "Scenario 7 and 13", "p0"],
    ["freelance", "Freelance / side income covers this % of yearly costs", "Scenario 10 and 14", "p0"], ["partTime", "Part-time job covers this % of yearly costs", "Scenario 11", "p0"],
    ["shock", "Medical / emergency one-time shock (₹)", "Scenario 12; paid from corpus on day 1", "inr"],
    ["conservative", "All-safe portfolio return (Conservative)", "Scenario 8", "p2"], ["optimistic", "Aggressive portfolio return (Optimistic)", "Scenario 9", "p2"]];

  function mount(host, provider) {
    const P = provider || appProvider();
    const st = { client: P.activeId(), result: null, issues: null };

    function compute() {
      const inp = P.inputs(st.client), b = ST.fromPlanner(inp);
      st.issues = b.ok ? null : b.issues;
      st.result = b.ok ? ST.run(b, P.settings(st.client)) : null;
    }
    const td = (t, cls, o) => `<td class="${cls || ""}"${o && o.span ? ` colspan="${o.span}"` : ""}${o && o.tip ? ` title="${esc(o.tip)}"` : ""}>${t == null ? "" : t}</td>`;
    const tr = (n, cells, cls) => `<tr class="${cls || ""}"><th class="st-rn">${n}</th>${cells}</tr>`;
    const blank = n => tr(n, "");

    function clientBar() {
      const opts = P.clients().map(c => `<option value="${esc(c.id)}"${c.id === st.client ? " selected" : ""}>${esc(c.name)}</option>`).join("");
      return `<div class="st-bar"><b>Stress Test</b><label>Client <select data-st="client">${opts}</select></label>` +
        `<span class="st-live">● Live from Retirement Planner</span><span class="st-sp"></span>` +
        `<button type="button" data-st="refresh">Refresh from planner</button><button type="button" data-st="export">Export CSV</button></div>`;
    }
    function problem() {
      const list = (st.issues || []).slice(0, 4).map(i => `<li>${esc(i.message)}</li>`).join("");
      return `<div class="st-problem" role="alert"><b>This client's Retirement Planner plan is not complete yet.</b><ul>${list}</ul>` +
        `<button type="button" data-st="back">◀ Back to Planner</button></div>`;
    }

    function grid() {
      const R = st.result, b = R.base, s = R.settings, sum = R.summary;
      let h = `<tr><th class="st-rn"></th>${L.map(c => `<th class="st-cl">${c}</th>`).join("")}</tr>`;
      h += tr(1, td("STRESS TEST — HOW LONG DOES THE CORPUS LAST UNDER EVERY CONDITION?", "st-a st-ttl", { span: 9 }));
      h += tr(2, td("Row 6 (Base Case) is linked LIVE to the Retirement Planner for the selected client: corpus, monthly expense, emergency buffer, returns, inflation, other income, children's costs and lump sum. Change anything there and all 14 scenarios update automatically. Orange cells in rows 7-19 are the values that scenario deliberately overrides; edit the yellow cells in the STRESS SETTINGS block below to change how hard each test hits.", "st-a st-note", { span: 16 }));
      h += tr(3, td("COLOUR GUIDE →", "st-a st-key") + td("Linked to Planner", "st-lnk") + td("Overridden by scenario", "st-ovr") + td("You can edit", "st-edt") + td("") +
        td('<button type="button" class="st-nav" data-st="back">◀ Back to Planner</button>') + td("") + td('<button type="button" class="st-nav" data-st="yby">▶ Year-by-Year (base case)</button>'));
      h += blank(4);
      h += tr(5, HEAD.map((t, i) => td(esc(t), i ? "st-hd" : "st-a st-hd")).join(""));
      const tips = { B: "Planner: Total money available today", C: "Planner: Monthly household spending today", D: "Planner: Emergency reserve",
        F: "Planner: Other income streams running in year 1 (today's rupees)", G: "Planner: Annual portfolio return", H: "Planner: Emergency-reserve return", I: "Planner: Annual household inflation" };
      R.rows.forEach((r, i) => {
        const v = [r.name, inr(r.corpus), inr(r.monthly), inr(r.buffer), r.shock ? inr(r.shock) : "-", r.other ? inr(r.other) : "-", pct(r.roi, 2), pct(b.bufferRoi, 2), pct(r.infl, 2),
          inr(r.investable), inr(r.netNeed), r.never ? "Never runs out" : r.survival.toFixed(2) + " yrs", r.never ? "—" : r.runsAtAge.toFixed(1),
          r.never ? "never runs out" : MON[r.runsOn.m - 1] + "-" + r.runsOn.y, r.left == null ? "Runs out first" : inr(r.left), r.funded];
        h += tr(6 + i, v.map((t, k) => {
          const c = L[k]; let cls = k === 0 ? "st-a" : k < 15 && k !== 12 && k !== 13 ? "st-num" : "";
          if (i === 0 && tips[c]) cls += " st-lnk"; else if (r.ov.includes(c)) cls += " st-ovr";
          if (c === "L") cls += " st-surv";
          return td(esc(t), cls, { tip: i === 0 ? tips[c] : "" });
        }).join(""));
      });
      h += blank(20);
      h += tr(21, td("ACROSS ALL 14 SCENARIOS", "st-a st-sec", { span: 3 }));
      const yrs = x => x >= ST.MAXY ? "Never runs out" : x.toFixed(2) + " yrs";
      h += tr(22, td("Shortest survival (worst case)", "st-a") + td(yrs(sum.min), "st-num") + td(esc(sum.minName)));
      h += tr(23, td("Longest survival (best case)", "st-a") + td(yrs(sum.max), "st-num") + td(esc(sum.maxName)));
      h += tr(24, td("Average across scenarios", "st-a") + td(sum.avg.toFixed(2) + " yrs", "st-num") + td("Scenarios that never run out are counted as 70 years", "st-note"));
      h += tr(25, td(`Scenarios lasting the full ${sum.planYears}-year plan`, "st-a") + td(sum.fullPlan + " of 14", "st-num"));
      h += tr(26, td("Scenarios where money runs out (inside 70 yrs)", "st-a") + td(sum.runOut + " of 14", "st-num"));
      h += blank(27);
      h += tr(28, td("STRESS SETTINGS — how hard each scenario hits (yellow = edit)", "st-a st-sec", { span: 3 }));
      SETTING_ROWS.forEach((x, i) => {
        const [k, label, note, fmt] = x, val = fmt === "inr" ? Math.round(s[k]) : +(s[k] * 100).toFixed(2);
        h += tr(29 + i, td(esc(label), "st-a") + td(`<input class="st-in" data-set="${k}" data-fmt="${fmt}" inputmode="decimal" value="${val}" aria-label="${esc(label)}">${fmt === "inr" ? "" : "%"}`, "st-num st-edt") + td(esc(note), "st-note"));
      });
      for (let n = 40; n <= 43; n++) h += blank(n);
      h += tr(44, td("CALCULATION ENGINE — year-by-year money balance for each scenario (feeds the table above; do not edit)", "st-a st-eng", { span: 19 }));
      const eh = ["Year", "Your age (year-end)", "Kids: college + weddings (₹)", "Lump-sum income (₹)", "Lump-sum principal back (₹)"].concat(R.rows.map(r => r.name.split(" ")[0] + " Money at END of year (₹)"));
      h += tr(45, eh.map((t, i) => td(esc(t), i ? "st-hd" : "st-a st-hd")).join(""));
      R.engine.forEach(e => {
        h += tr(45 + e.year, td(e.year, "st-a st-num") + td(e.age, "st-num") + td(inr(e.kids), "st-num") + td(inr(e.lumpIncome), "st-num") + td(inr(e.lumpPrincipal), "st-num") +
          e.balances.map(v => td(inr(v), "st-num" + (v < 0 ? " st-neg" : ""))).join(""));
      });
      h += blank(116) + tr(117, td("NOTES", "st-a st-key"));
      NOTES.forEach((t, i) => { h += tr(118 + i, td(esc(t), "st-a st-note", { span: 16 })); });
      return `<div class="st-wrap"><table class="st-grid">${h}</table></div>`;
    }

    function render() {
      compute();
      host.innerHTML = `<section class="st-root" aria-label="Stress Test">${clientBar()}${st.result ? grid() : problem()}</section>`;
    }
    function csv() {
      const R = st.result; if (!R) return;
      const rows = [HEAD].concat(R.rows.map(r => [r.name, r.corpus, r.monthly, r.buffer, r.shock, r.other, r.roi, R.base.bufferRoi, r.infl, r.investable, r.netNeed,
        r.survival.toFixed(2), r.never ? "" : r.runsAtAge.toFixed(1), r.never ? "never runs out" : r.runsOn.y + "-" + r.runsOn.m, r.left == null ? "Runs out first" : Math.round(r.left), r.funded]));
      const text = rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(",")).join("\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = "stress-test.csv"; a.click();
    }
    host.addEventListener("click", e => {
      const t = e.target.closest("[data-st]"); if (!t) return;
      const k = t.getAttribute("data-st");
      if (k === "refresh") render(); else if (k === "back") P.onBack && P.onBack(); else if (k === "yby") P.onYearByYear && P.onYearByYear(); else if (k === "export") csv();
    });
    host.addEventListener("change", e => {
      const t = e.target;
      if (t.matches && t.matches("[data-st=client]")) { st.client = t.value; render(); return; }
      if (t.matches && t.matches("[data-set]")) {
        const raw = Number(String(t.value).replace(/[,₹\s]/g, "")), k = t.getAttribute("data-set");
        const next = Object.assign({}, st.result.settings, { [k]: t.getAttribute("data-fmt") === "inr" ? raw : raw / 100 });
        P.saveSettings(st.client, ST.cleanSettings(next)); render();
      }
    });
    render();
    return { refresh: render, state: st };
  }
  /* Retirement Planner > Reports: two sections, Summary (the planner's own report) and Stress Test.
     app.js renders the 'RP Reports' tab through rpReportsPage(); the Stress Test screen mounts as soon as its host is in the page. */
  const sub = () => (typeof UI !== "undefined" && UI.rps === "stress") ? "stress" : "summary";
  window.rpReportsPage = function () {
    const cur = sub(), tabs = [["summary", "Summary"], ["stress", "Stress Test"]];
    const nav = '<div class="st-subnav" role="tablist" aria-label="Retirement planner reports">' + tabs.map(t =>
      `<button type="button" role="tab" class="st-subtab" data-rps="${t[0]}" aria-selected="${cur === t[0]}">${t[1]}</button>`).join("") + "</div>";
    return nav + (cur === "stress" ? '<div class="st-host" data-st-host></div>' : (window.fhReportTab ? window.fhReportTab() : ""));
  };
  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-rps]");
    if (t && typeof UI !== "undefined" && typeof render === "function") { UI.rps = t.getAttribute("data-rps"); render(); }
  });
  const fill = () => { const h = document.querySelector("[data-st-host]"); if (h && !h.firstChild) mount(h); };
  new MutationObserver(fill).observe(document.documentElement, { childList: true, subtree: true });
  window.StressTestUI = { mount, appProvider };
})();
