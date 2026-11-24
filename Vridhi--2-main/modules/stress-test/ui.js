/* Stress Test · screen (UI only). All maths lives in window.StressTest (engine.js).
   Desktop Executive layout: top action bar, 70-year trajectory fan chart + 5 resilience KPIs,
   14 scenarios matrix (grouped columns + row filter + mobile cards) beside sticky Stress Settings,
   then the 70-year calculation engine (with filtered curve overlay) and methodology notes.
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
  /* column groups: [key, heading, override letter (the Excel column), cell renderer] */
  const GROUPS = [
    ["chg", "What changes", [["monthly", "Monthly expense", "C"], ["roi", "Investment return", "G"], ["infl", "Inflation", "I"], ["shock", "One-time shock", "E"], ["other", "Other income p.a.", "F"]]],
    ["res", "Result", [["surv", "Survival", "L"], ["age", "Runs out at age", "M"], ["on", "Runs out on", "N"], ["left", "Money left at end of plan", "O"], ["funded", "Full years funded", "P"]]],
    ["st", "Starting position", [["corpus", "Corpus", "B"], ["buffer", "Emergency buffer", "D"], ["invest", "Investable", "J"], ["need", "Net need p.a.", "K"], ["bufRoi", "Buffer return", "H"]]]];
  const LINKED = { corpus: 1, monthly: 1, buffer: 1, other: 1, roi: 1, bufRoi: 1, infl: 1 };

  function mount(host, provider) {
    const P = provider || appProvider();
    const st = { client: P.activeId(), result: null, issues: null, cols: { chg: true, res: true, st: false }, filter: "all", rowFilter: "all", open: {}, dirty: false };

    function compute() {
      const b = ST.fromPlanner(P.inputs(st.client));
      st.issues = b.ok ? null : b.issues;
      st.result = b.ok ? ST.run(b, P.settings(st.client)) : null;
      st.dirty = false;
    }
    const sec = (t, n, extra) => `<div class="st-tile${extra ? " " + extra : ""}"><small>${esc(t)}</small><b>${esc(n[0])}</b><span>${esc(n[1])}</span></div>`;

    function bar() {
      const opts = P.clients().map(c => `<option value="${esc(c.id)}"${c.id === st.client ? " selected" : ""}>${esc(c.name)}</option>`).join("");
      return `<div class="st-bar"><h1>Stress Test</h1><label>Client <select data-st="client">${opts}</select></label><span class="st-live">Live from Retirement Planner</span><span class="st-sp"></span>` +
        `<button type="button" class="st-link" data-st="back">◀ Back to Planner</button><button type="button" class="st-link" data-st="yby">▶ Year-by-Year (base case)</button>` +
        `<button type="button" class="st-btn" data-st="refresh">Refresh from planner</button><button type="button" class="st-btn p" data-st="export">Export CSV</button></div>`;
    }
    function problem() {
      const list = (st.issues || []).slice(0, 4).map(i => `<li>${esc(i.message)}</li>`).join("");
      return `<div class="st-problem" role="alert"><b>This client’s Retirement Planner plan is not complete yet.</b><ul>${list}</ul><button type="button" class="st-btn" data-st="back">◀ Back to Planner</button></div>`;
    }
    function fanChart(R, includeBear) {
      const W = 720, H = 220, L = 66, Rpad = 20, T = 18, B = 28;
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
        </div>
      </section>`;
    }
    function cell(r, i, c, R) {
      const base = r.no === 1, ov = r.ov.includes(c[2]);
      let cls = base && LINKED[c[0]] ? "l" : ""; if (ov) cls = "o";
      const tip = base && LINKED[c[0]] ? ` title="${esc(TIPS[c[0]] || "Linked to the Retirement Planner")}"` : "";
      const b = R.base; let t;
      switch (c[0]) {
        case "monthly": t = inr(r.monthly); break; case "roi": t = pct(r.roi); break; case "infl": t = pct(r.infl); break;
        case "shock": t = r.shock ? inr(r.shock) : "–"; break; case "other": t = r.other ? inr(r.other) : "–"; break;
        case "surv": {
          const ok = r.survival >= b.planYears, w = Math.min(100, r.survival / ST.MAXY * 100), pm = b.planYears / ST.MAXY * 100;
          t = `<div class="st-sv"><span class="st-ch ${ok ? "ok" : "bad"}">${ok ? "Covers plan" : "Falls short"}</span><b>${yrs(r.survival)}</b><span class="st-mb" aria-hidden="true"><i style="width:${w}%;background:${ok ? "var(--ok,#167d68)" : "var(--er,#c92a2a)"}"></i><u style="left:${pm}%"></u></span></div>`; break;
        }
        case "age": t = r.never ? "—" : r.runsAtAge.toFixed(1); break;
        case "on": t = r.never ? "never runs out" : MON[r.runsOn.m - 1] + "-" + r.runsOn.y; break;
        case "left": t = r.left == null ? "Runs out first" : inr(r.left); break; case "funded": t = r.funded; break;
        case "corpus": t = inr(r.corpus); break; case "buffer": t = inr(r.buffer); break; case "invest": t = inr(r.investable); break;
        case "need": t = inr(r.netNeed); break; default: t = pct(b.bufferRoi);
      }
      return `<td class="${cls}"${tip}>${t}</td>`;
    }
    function table(R) {
      const on = GROUPS.filter(g => st.cols[g[0]]);
      const rows = R.rows.map((r, i) => { r.no = i + 1; return r; }).filter(r => {
        if (st.rowFilter === "short") return r.survival < R.base.planYears;
        if (st.rowFilter === "ok") return r.survival >= R.base.planYears;
        return true;
      });
      const head = `<thead><tr><th rowspan="2">Scenario</th>${on.map(g => `<th class="g" colspan="${g[2].length}">${g[1]}</th>`).join("")}</tr><tr>${on.map(g => g[2].map(c => `<th>${c[1]}</th>`).join("")).join("")}</tr></thead>`;
      const body = rows.length
        ? rows.map((r, i) => `<tr><td>${esc(r.name)}</td>${on.map(g => g[2].map(c => cell(r, i, c, R)).join("")).join("")}</tr>`).join("")
        : `<tr><td colspan="20" class="st-empty">No scenarios match this filter.</td></tr>`;
      const chips = GROUPS.map(g => `<label><input type="checkbox" data-g="${g[0]}"${st.cols[g[0]] ? " checked" : ""}>${g[1]}</label>`).join("");
      const rFilter = `<div class="st-seg" role="group" aria-label="Filter scenarios">` +
        [["all", "All 14"], ["short", "Falls short"], ["ok", "Covers plan"]].map(([k, lbl]) => `<button type="button" data-st-rf="${k}" aria-pressed="${st.rowFilter === k}">${lbl}</button>`).join("") +
        `</div>`;
      const mobCards = rows.map(r => {
        const ok = r.survival >= R.base.planYears, w = Math.min(100, r.survival / ST.MAXY * 100);
        return `<article class="st-mcard"><div class="st-mhead"><strong>${esc(r.name)}</strong><span class="st-ch ${ok ? "ok" : "bad"}">${ok ? "Covers plan" : "Falls short"}</span></div>` +
          `<div class="st-msurv"><b>${yrs(r.survival)}</b><span class="st-mb" aria-hidden="true"><i style="width:${w}%;background:${ok ? "var(--ok,#167d68)" : "var(--er,#c92a2a)"}"></i></span></div>` +
          `<div class="st-mkv"><span>Monthly expense</span><b>${inr(r.monthly)}</b><span>Return / Inflation</span><b>${pct(r.roi)} / ${pct(r.infl)}</b><span>Money left at end</span><b>${r.left == null ? "Runs out first" : inr(r.left)}</b></div></article>`;
      }).join("");
      return `<div class="st-card"><div class="st-chead"><div><h2>How long does the corpus last under each condition?</h2>` +
        `<p class="st-note">Scenario 1 is linked live to this client’s Retirement Planner. Change anything there and all 14 rows update. Hover a grey cell to see where it comes from.</p></div>${rFilter}</div>` +
        `<div class="st-tb"><div class="st-chips"><b>Columns</b>${chips}</div><span class="st-sp"></span><div class="st-key"><span><i class="l"></i>Linked to planner</span><span><i class="o"></i>Changed by this scenario</span><span><i class="e"></i>You can edit</span></div></div>` +
        `<div class="st-wrap"><table class="st-t">${head}<tbody>${body}</tbody></table></div>` +
        `<div class="st-mcards">${mobCards}</div></div>`;
    }
    function settings(R) {
      const s = R.settings;
      const fields = SETTINGS.map(g => `<div class="st-sg"><h3>${g[0]}</h3>` + g[1].map(f => {
        const k = f[0], v = f[3] === "r" ? Math.round(s[k]).toLocaleString("en-IN") : +(s[k] * 100).toFixed(2);
        return `<div class="st-f"><label for="st-${k}">${esc(f[1])}<small>${esc(f[2])}${f[3] === "p" ? " · %" : ""}</small></label><input id="st-${k}" data-set="${k}" data-fmt="${f[3]}" inputmode="decimal" value="${v}"></div>`;
      }).join("") + `</div>`).join("");
      return `<aside class="st-card st-set" aria-label="Stress settings"><h2>Stress settings</h2><p class="st-note">How hard each test hits. Yellow boxes are editable and saved for this client.</p>${fields}` +
        `<div class="st-acts"><button type="button" class="st-btn p" data-st="apply" disabled>Apply</button><button type="button" class="st-btn" data-st="reset">Reset to defaults</button></div></aside>`;
    }
    function engine(R) {
      let idx = R.rows.map((r, i) => i);
      if (st.filter === "out") idx = idx.filter(i => !R.rows[i].never); else if (st.filter === "base") idx = [0];
      const head = `<thead><tr><th>Year</th><th>Your age</th><th>Kids: college + weddings</th><th>Lump-sum income</th><th>Lump-sum principal back</th>${idx.map(i => `<th title="${esc(R.rows[i].name)}">S${i + 1}</th>`).join("")}</tr></thead>`;
      const body = R.engine.map(e => `<tr><td>${e.year}</td><td>${e.age}</td><td>${inr(e.kids)}</td><td>${inr(e.lumpIncome)}</td><td>${inr(e.lumpPrincipal)}</td>${idx.map(i => `<td class="${e.balances[i] < 0 ? "neg" : ""}">${inr(e.balances[i])}</td>`).join("")}</tr>`).join("");
      const f = [["all", "All 14 scenarios"], ["out", "Only scenarios that run out"], ["base", "Base case only"]].map(o => `<option value="${o[0]}"${st.filter === o[0] ? " selected" : ""}>${o[1]}</option>`).join("");
      return `<details class="st-d" data-open="engine"${st.open.engine ? " open" : ""}><summary>Year-by-year money balance for each scenario (calculation engine, 70 years)</summary>` +
        `<div class="st-tb"><label>Show <select data-st="filter">${f}</select></label><span class="st-note">Negative balance = the money has run out. S1 to S14 are the scenarios above, in order.</span></div>` +
        `<div class="st-wrap st-short"><table class="st-t">${head}<tbody>${body}</tbody></table></div></details>`;
    }
    const notes = () => `<details class="st-d" data-open="notes"${st.open.notes ? " open" : ""}><summary>Notes: how the numbers are worked out</summary><ul>${NOTES.map(n => `<li>${esc(n)}</li>`).join("")}</ul></details>`;

    function render() {
      compute();
      const R = st.result;
      host.innerHTML = `<section class="st-root" aria-label="Stress Test">${bar()}${R ? hero(R) + `<div class="st-main">${table(R)}${settings(R)}</div>` + engine(R) + notes() : problem()}</section>`;
    }
    function csv() {
      const R = st.result; if (!R) return;
      const H = ["Scenario", "Corpus", "Monthly expense", "Emergency buffer", "One-time shock", "Other income p.a.", "Investment return", "Buffer return", "Inflation", "Investable", "Net need p.a.", "Survival (yrs)", "Runs out at age", "Runs out on", "Money left at end of plan", "Full years funded"];
      const rows = [H].concat(R.rows.map(r => [r.name, r.corpus, r.monthly, r.buffer, r.shock, r.other, r.roi, R.base.bufferRoi, r.infl, r.investable, r.netNeed,
        r.survival.toFixed(2), r.never ? "" : r.runsAtAge.toFixed(1), r.never ? "never runs out" : r.runsOn.y + "-" + r.runsOn.m, r.left == null ? "Runs out first" : Math.round(r.left), r.funded]));
      const text = rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(",")).join("\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = "stress-test.csv"; a.click();
    }
    function readSettings() {
      const o = {};
      host.querySelectorAll("[data-set]").forEach(i => {
        const txt = String(i.value).replace(/[,₹\s]/g, ""), n = Number(txt);
        if (txt === "" || !Number.isFinite(n)) return;          // blank or not a number: keep the previous value
        o[i.dataset.set] = i.dataset.fmt === "r" ? n : n / 100;
      });
      return ST.cleanSettings(Object.assign({}, st.result.settings, o));
    }
    host.addEventListener("click", e => {
      const rf = e.target.closest("[data-st-rf]");
      if (rf) { st.rowFilter = rf.getAttribute("data-st-rf"); render(); return; }
      const t = e.target.closest("[data-st]"); if (!t) return;
      const k = t.getAttribute("data-st");
      if (k === "refresh") render(); else if (k === "back") P.onBack && P.onBack(); else if (k === "yby") P.onYearByYear && P.onYearByYear();
      else if (k === "export") csv();
      else if (k === "apply") { P.saveSettings(st.client, readSettings()); render(); }
      else if (k === "reset") { P.saveSettings(st.client, ST.defaultSettings()); render(); }
    });
    host.addEventListener("change", e => {
      const t = e.target;
      if (t.matches("[data-st=client]")) { st.client = t.value; render(); }
      else if (t.matches("[data-st=filter]")) { st.filter = t.value; render(); }
      else if (t.matches("[data-g]")) { st.cols[t.dataset.g] = t.checked; render(); }
    });
    host.addEventListener("input", e => {
      if (!e.target.matches("[data-set]")) return;
      e.target.classList.add("dirty");
      e.target.classList.add("chg");
      const a = host.querySelector("[data-st=apply]"); if (a) a.disabled = false;
    });
    host.addEventListener("keydown", e => {
      if (e.key === "Enter" && e.target.matches && e.target.matches("[data-set]")) { e.preventDefault(); P.saveSettings(st.client, readSettings()); render(); }
    });
    host.addEventListener("toggle", e => { const d = e.target; if (d.dataset && d.dataset.open) st.open[d.dataset.open] = d.open; }, true);
    render();
    return { refresh: render, state: st };
  }

  /* Retirement Planner > Reports > Stress Test: fhPage() (retirement-planner/ui.js) renders a host element; mount the screen as soon as it is in the page. */
  const fill = () => { const h = document.querySelector("[data-st-host]"); if (h && !h.firstChild) mount(h); };
  new MutationObserver(fill).observe(document.documentElement, { childList: true, subtree: true });
  window.StressTestUI = { mount, appProvider };
})();
