/* Modern Mobile & Tablet FinTech Navigation Controller (<= 960px) & Shared Route Model:
   - Compact single-row top bar trigger & quick Light/Dark mode toggle
   - Slide-out modal navigation drawer (~85-90% mobile width, adaptive tablet width)
   - 5-category single-open accordion hierarchy matching desktop sidebar (one section open at a time)
   - Compact brand header + stacked Available Funds corpus card
   - Clean 1-row footer (Help, Feedback, Sign out) with Contact details inside Feedback/Support modal
   - Focus trap, Escape, scrim tap, swipe-to-close, background scroll lock & Android back button */
(function () {
  "use strict";

  var SW = "1.75";
  function ic(size, body) {
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" fill="none" stroke="currentColor" stroke-width="' + SW +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      body + "</svg>";
  }

  var ICONS = {
    menu: ic(18, '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>'),
    close: ic(18, '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    chev: '<svg class="vr-acc-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>',
    sun: ic(18, '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
    moon: ic(18, '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
    dashboard: ic(18, '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    retire: ic(18, '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
    pulse: ic(18, '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'),
    policy: ic(18, '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'),
    sliders: ic(18, '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'),
    holdings: ic(18, '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>'),
    reports: ic(18, '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'),
    shield: ic(18, '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
    table: ic(18, '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>'),
    engine: ic(18, '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>'),
    edit: ic(18, '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    target: ic(18, '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>')
  };

  var openGroup = null;
  var drawerOpen = false;
  var lastFocused = null;
  var activeStTab = "overview";
  var activePolPage = "list";
  var activeSetTab = "plan";
  var hasHistoryEntry = false;
  var ignoringPop = 0;

  function canAccess(tab) {
    try {
      if (typeof canOpenSection === "function") return !!canOpenSection(tab);
    } catch (e) {}
    var navBtn = document.querySelector('#nav [data-t="' + tab + '"]');
    if (navBtn) return true;
    if (tab === "Settings") {
      var sw = document.getElementById("settings-menu-wrap");
      return !sw || !sw.hidden;
    }
    return true;
  }

  function allowData() {
    try {
      if (window.VR_PROD && window.VR_ACCESS && typeof canReadData === "function") {
        return !!canReadData();
      }
    } catch (e) {}
    return true;
  }

  function hasModule(tab) {
    if (Array.isArray(window.VRMODULES) && window.VRMODULES.some(function (m) { return m && m.tab === tab; })) return true;
    return !!document.querySelector('#nav [data-t="' + tab + '"]');
  }

  function allowUsers() {
    try {
      if (typeof canManageUsers === "function") return !!canManageUsers();
    } catch (e) {}
    return false;
  }

  function currentRoute() {
    var ui = null;
    try { if (typeof UI !== "undefined" && UI) ui = UI; } catch (e) {}
    var tab = ui ? ui.tab : "Dashboard";
    var rv = ui && ui.rv ? ui.rv : "year";
    var rp = window.RPUI || { tab: "status", rv: "clients" };

    var stBtn = document.querySelector('#m [data-st-tab][aria-selected="true"]');
    if (stBtn) activeStTab = stBtn.getAttribute("data-st-tab") || "overview";

    var polBtn = document.querySelector('#m [data-vpp][aria-current="page"], #m [data-vpp][aria-pressed="true"]');
    if (polBtn) activePolPage = polBtn.getAttribute("data-vpp") || "list";

    var setSel = document.querySelector('#m [data-stab][aria-selected="true"]');
    if (setSel) activeSetTab = setSel.getAttribute("data-stab") || "plan";

    if (tab === "Dashboard") {
      return { id: "gp:Dashboard", group: "goal", title: "Goal Planner \u00B7 Dashboard", crumbs: ["Goal Planner", "Dashboard"] };
    }
    if (tab === "Holdings") {
      return { id: "gp:Holdings", group: "goal", title: "Goal Planner \u00B7 Holdings", crumbs: ["Goal Planner", "Holdings"] };
    }
    if (tab === "Reports") {
      var rvLabels = {
        year: "Annual projection",
        month: "Monthly projection",
        int: "Interest & income",
        sav: "Savings schedule",
        ent: "Holdings register",
        vdate: "Value on date"
      };
      var rvKey = rvLabels[rv] ? rv : "year";
      return {
        id: "rv:" + rvKey,
        group: "goal",
        title: "Goal Planner \u00B7 " + rvLabels[rvKey],
        crumbs: ["Goal Planner", "Reports", rvLabels[rvKey]]
      };
    }
    if (tab === "Retirement planner" || tab === "RP Reports") {
      if (rp.tab === "report") {
        if (rp.rv === "yy") {
          return { id: "rp:yy", group: "retire", title: "Retirement Planner \u00B7 Year by year", crumbs: ["Retirement Planner", "Year by year"] };
        }
        return { id: "rp:clients", group: "retire", title: "Retirement Planner \u00B7 Clients", crumbs: ["Retirement Planner", "Clients"] };
      }
      return { id: "rp:status", group: "retire", title: "Retirement Planner \u00B7 Planner", crumbs: ["Retirement Planner", "Planner"] };
    }
    if (tab === "Stress Test") {
      var stTitles = { overview: "Summary", scenarios: "Scenarios", settings: "Stress settings", engine: "Engine & notes" };
      var stLbl = stTitles[activeStTab] || "Summary";
      return { id: "st:" + activeStTab, group: "stress", title: "Stress Test \u00B7 " + stLbl, crumbs: ["Stress Test", stLbl] };
    }
    if (tab === "Policies") {
      return activePolPage === "rep"
        ? { id: "pol:rep", group: "policy", title: "Policies \u00B7 Policy reports", crumbs: ["Policies", "Policy reports"] }
        : { id: "pol:list", group: "policy", title: "Policies \u00B7 My policies", crumbs: ["Policies", "My policies"] };
    }
    if (tab === "Settings") {
      var stLabels = { plan: "Plan", reports: "Reports", appearance: "Appearance", data: "Data & backup" };
      var k = stLabels[activeSetTab] ? activeSetTab : "plan";
      return { id: "set:" + k, group: "settings", title: "Settings \u00B7 " + stLabels[k], crumbs: ["Settings", stLabels[k]] };
    }
    if (tab === "Users") {
      return { id: "set:Users", group: "settings", title: "Settings \u00B7 Users", crumbs: ["Settings", "Users"] };
    }
    if (tab === "Help") {
      return { id: "set:Help", group: "settings", title: "Help & FAQ", crumbs: ["Settings", "Help & FAQ"] };
    }
    return { id: "gp:Dashboard", group: "goal", title: tab || "Vriddhi", crumbs: [tab || "Vriddhi"] };
  }

  function buildGroups() {
    var groups = [];
    var dataOk = allowData();

    if (dataOk && canAccess("Goal Planner")) {
      groups.push({
        id: "goal",
        label: "Goal Planner",
        icon: ICONS.dashboard,
        items: [
          { id: "gp:Dashboard", label: "Dashboard" },
          { id: "gp:Holdings", label: "Holdings" },
          { id: "rv:year", label: "Annual projection", subhead: "Reports" },
          { id: "rv:month", label: "Monthly projection" },
          { id: "rv:int", label: "Interest & income" },
          { id: "rv:sav", label: "Savings schedule" },
          { id: "rv:ent", label: "Holdings register" },
          { id: "rv:vdate", label: "Value on date" }
        ]
      });
    }

    if (dataOk && canAccess("Retirement planner")) {
      groups.push({
        id: "retire",
        label: "Retirement Planner",
        icon: ICONS.retire,
        items: [
          { id: "rp:status", label: "Planner" },
          { id: "rp:clients", label: "Clients" },
          { id: "rp:yy", label: "Year by year" }
        ]
      });
    }

    if (dataOk && hasModule("Stress Test") && canAccess("Stress Test")) {
      groups.push({
        id: "stress",
        label: "Stress Test",
        icon: ICONS.pulse,
        items: [
          { id: "st:overview", label: "Summary" },
          { id: "st:scenarios", label: "Scenarios" },
          { id: "st:settings", label: "Stress settings" },
          { id: "st:engine", label: "Engine & notes" }
        ]
      });
    }

    if (dataOk && hasModule("Policies") && canAccess("Policies")) {
      groups.push({
        id: "policy",
        label: "Policies",
        icon: ICONS.policy,
        items: [
          { id: "pol:list", label: "My policies" },
          { id: "pol:rep", label: "Policy reports" }
        ]
      });
    }

    var setItems = [];
    if (canAccess("Settings")) {
      setItems.push(
        { id: "set:plan", label: "Plan" },
        { id: "set:reports", label: "Reports" },
        { id: "set:appearance", label: "Appearance" },
        { id: "set:data", label: "Data & backup" },
        { id: "set:Help", label: "Help & FAQ" }
      );
    }
    if (allowUsers()) {
      setItems.push({ id: "set:Users", label: "Users" });
    }
    if (setItems.length) {
      groups.push({
        id: "settings",
        label: "Settings",
        icon: ICONS.sliders,
        items: setItems
      });
    }

    return groups;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function formatAmt(n) {
    try {
      if (typeof f === "function") return f(n);
      if (typeof cr === "function") return cr(n);
    } catch (e) {}
    var v = Math.round(Number(n) || 0);
    return "\u20B9 " + v.toLocaleString("en-IN");
  }

  function computeFundsSummary() {
    var totalVal = null;
    if (allowData()) {
      try {
        if (typeof S !== "undefined" && S && Array.isArray(S.assets)) {
          if (S.assets.length === 0) {
            totalVal = 0;
          } else if (typeof calc === "function") {
            var res = calc(S);
            if (res && res.rows && res.rows[0] && typeof res.rows[0].tot === "number") {
              totalVal = res.rows[0].tot;
            }
          }
          if (totalVal === null) {
            totalVal = S.assets.reduce(function (sum, a) {
              return sum + (Number(a && a.value) || 0);
            }, 0);
          }
        }
      } catch (e) {}
    }

    return {
      formatted: totalVal !== null ? formatAmt(totalVal) : "\u2014",
      interactive: allowData() && canAccess("Goal Planner")
    };
  }

  function isDarkNow() {
    var root = document.documentElement;
    var attr = root.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  function toggleThemeMode() {
    var next = isDarkNow() ? "light" : "dark";
    try {
      if (typeof S !== "undefined" && S) {
        S.theme = next;
        if (typeof save === "function") {
          var a = window.VR_ACCESS;
          var ro = window.VR_PROD && window.VRSB && (!a || a.error || (a.permissions || []).indexOf("write_data") < 0);
          if (!ro && !document.documentElement.classList.contains("lk")) save();
        }
      }
      localStorage.setItem("vr-theme-mode", next);
    } catch (e) {}
    try {
      if (typeof theme === "function") theme();
      else if (window.VRTheme && window.VRTheme.apply) window.VRTheme.apply();
      if (window.vrPro && window.vrPro.apply) window.vrPro.apply();
    } catch (e) {}
    syncThemeUI();
  }

  function syncThemeUI() {
    var dark = isDarkNow();
    var hBtn = document.getElementById("vr-mob-theme-btn");
    if (hBtn) {
      hBtn.innerHTML = dark ? ICONS.sun : ICONS.moon;
      hBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      hBtn.setAttribute("title", dark ? "Light mode" : "Dark mode");
    }
  }

  function isSignedIn() {
    var lg = document.getElementById("lg");
    if (lg && lg.classList.contains("on")) return false;
    var nav = document.getElementById("nav");
    return !!(nav && nav.children.length > 0);
  }

  function syncHeaderChrome() {
    var signedIn = isSignedIn();
    var mBtn = document.getElementById("vr-mob-menu-btn");
    var tBtn = document.getElementById("vr-mob-theme-btn");
    var sub = document.querySelector("header.hd .vr-mob-sub");
    if (mBtn) mBtn.hidden = !signedIn;
    if (tBtn) tBtn.hidden = !signedIn;
    if (sub) {
      var cur = currentRoute();
      sub.textContent = signedIn ? cur.title : "Plan \u00B7 Track \u00B7 Retire";
    }
    if (!signedIn && drawerOpen) closeDrawer(false);
  }

  function renderDrawerBody() {
    var body = document.getElementById("vr-drawer-body");
    if (!body) return;
    var cur = currentRoute();
    var groups = buildGroups();

    body.innerHTML = groups.map(function (g) {
      var hasActive = g.items.some(function (it) { return it.id === cur.id; });
      var isOpen = openGroup === g.id;
      var panelId = "vr-acc-panel-" + g.id;
      return '<section class="vr-acc-group' + (hasActive ? " has-active" : "") + (isOpen ? " is-open" : "") + '" data-vr-group="' + g.id + '">' +
        '<button type="button" class="vr-acc-trigger" aria-expanded="' + isOpen + '" aria-controls="' + panelId + '" data-vr-acc="' + g.id + '">' +
          '<span class="vr-acc-lead">' +
            '<span class="vr-acc-ic" aria-hidden="true">' + g.icon + "</span>" +
            '<span class="vr-acc-lbl">' + esc(g.label) + "</span>" +
          "</span>" +
          '<span class="vr-acc-trail" aria-hidden="true">' + ICONS.chev + "</span>" +
        "</button>" +
        '<div id="' + panelId + '" class="vr-acc-panel' + (isOpen ? " is-open" : "") + '" aria-hidden="' + (!isOpen) + '">' +
          '<div class="vr-acc-inner"><div class="vr-acc-list" role="group" aria-label="' + esc(g.label) + '">' +
            g.items.map(function (it) {
              var on = it.id === cur.id;
              var subhd = it.subhead ? '<div class="vr-acc-subhd">' + esc(it.subhead) + "</div>" : "";
              return subhd +
                '<button type="button" class="vr-nav-item" data-vr-nav="' + esc(it.id) + '"' + (on ? ' aria-current="page"' : "") + ">" +
                  '<span class="vr-nav-lbl">' + esc(it.label) + "</span>" +
                "</button>";
            }).join("") +
          "</div></div>" +
        "</div>" +
      "</section>";
    }).join("");

    var fundsBtn = document.getElementById("vr-drawer-funds");
    if (fundsBtn) {
      var summary = computeFundsSummary();
      fundsBtn.disabled = !summary.interactive;
      var vlEl = fundsBtn.querySelector(".vr-funds-val");
      if (vlEl) vlEl.textContent = summary.formatted;
    }

    var helpLink = document.getElementById("vr-drawer-help");
    if (helpLink) {
      if (cur.id === "set:Help") helpLink.setAttribute("aria-current", "page");
      else helpLink.removeAttribute("aria-current");
      helpLink.hidden = !canAccess("Settings");
    }

    syncThemeUI();
  }

  function applyAccordionState() {
    var body = document.getElementById("vr-drawer-body");
    if (!body) return;
    body.querySelectorAll("[data-vr-acc]").forEach(function (btn) {
      var gId = btn.getAttribute("data-vr-acc");
      var isOpen = openGroup === gId;
      btn.setAttribute("aria-expanded", String(isOpen));
      var grp = btn.closest && btn.closest(".vr-acc-group");
      if (grp) grp.classList.toggle("is-open", isOpen);
      var panel = document.getElementById("vr-acc-panel-" + gId);
      if (panel) {
        panel.classList.toggle("is-open", isOpen);
        panel.setAttribute("aria-hidden", String(!isOpen));
      }
    });
  }

  function openDrawer() {
    if (drawerOpen) return;
    var drawer = document.getElementById("vr-drawer");
    var backdrop = document.getElementById("vr-drawer-backdrop");
    var mBtn = document.getElementById("vr-mob-menu-btn");
    if (!drawer || !backdrop) return;
    lastFocused = document.activeElement;
    openGroup = currentRoute().group;
    renderDrawerBody();
    drawerOpen = true;
    document.documentElement.classList.add("vr-drawer-open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.setAttribute("aria-hidden", "false");
    if (mBtn) mBtn.setAttribute("aria-expanded", "true");

    try {
      if (window.history && typeof window.history.pushState === "function") {
        window.history.pushState({ vrDrawer: true }, "");
        hasHistoryEntry = true;
      }
    } catch (e) {}

    var targetFocus = drawer.querySelector('.vr-nav-item[aria-current="page"]') || document.getElementById("vr-drawer-close");
    if (targetFocus && targetFocus.focus) {
      setTimeout(function () { if (drawerOpen) targetFocus.focus(); }, 30);
    }
  }

  function closeDrawer(restoreFocus, fromPopState) {
    if (!drawerOpen) return;
    var drawer = document.getElementById("vr-drawer");
    var backdrop = document.getElementById("vr-drawer-backdrop");
    var mBtn = document.getElementById("vr-mob-menu-btn");
    drawerOpen = false;
    document.documentElement.classList.remove("vr-drawer-open");
    if (drawer) drawer.setAttribute("aria-hidden", "true");
    if (backdrop) backdrop.setAttribute("aria-hidden", "true");
    if (mBtn) mBtn.setAttribute("aria-expanded", "false");

    if (hasHistoryEntry) {
      hasHistoryEntry = false;
      if (!fromPopState && window.history && typeof window.history.back === "function") {
        try {
          ignoringPop++;
          window.history.back();
        } catch (e) {
          ignoringPop = Math.max(0, ignoringPop - 1);
        }
      }
    }

    if (restoreFocus !== false) {
      var ret = (mBtn && !mBtn.hidden) ? mBtn : lastFocused;
      if (ret && ret.focus) ret.focus();
    }
  }

  function navigateTo(targetId) {
    var parts = String(targetId || "").split(":");
    var kind = parts[0], val = parts[1];
    closeDrawer(false);
    try {
      if (kind === "gp") {
        /* Route from application state instead of simulating a click on a rendered tab.
           The target tab can be hidden/replaced during report rendering, which made
           sidebar navigation dependent on stale DOM elements. */
        if (["Dashboard", "Holdings", "Reports"].indexOf(val) < 0) return;
        if (typeof UI !== "undefined" && typeof render === "function") {
          UI.tab = val;
          render();
          if (window.scrollTo) window.scrollTo(0, 0);
          return;
        }
      }
      if (kind === "rv") {
        /* Report navigation is state-driven. Do not click a possibly hidden/stale
           [data-rv] control inside the Reports dock; render the requested view directly. */
        var reportViews = window.RV_VIEWS || [
          ["year"], ["month"], ["int"], ["sav"], ["ent"], ["vdate"], ["hold"]
        ];
        if (!reportViews.some(function (view) { return view && view[0] === val; })) return;
        if (typeof UI !== "undefined" && typeof render === "function") {
          if (val === "hold") {
            UI.tab = "Holdings";
          } else {
            UI.tab = "Reports";
            UI.rv = val;
            UI.sel = null;
            UI.rk = "a";
            UI.rd = 1;
            UI.rq = "";
            UI.msd = null;
          }
          render();
          if (window.scrollTo) window.scrollTo(0, 0);
          return;
        }
      }
      if (kind === "rp") {
        if (window.RPUI) {
          if (val === "status") { window.RPUI.tab = "status"; }
          else { window.RPUI.tab = "report"; window.RPUI.rv = val; }
        }
        var navRp = document.querySelector('#nav [data-t="Retirement planner"]');
        if (navRp) { navRp.click(); return; }
        if (typeof UI !== "undefined" && typeof render === "function") {
          UI.tab = "Retirement planner";
          render();
          if (window.scrollTo) window.scrollTo(0, 0);
          return;
        }
      }
      if (kind === "st") {
        activeStTab = val || "overview";
        if (window.StressTestUI && typeof window.StressTestUI.open === "function") {
          window.StressTestUI.open(activeStTab);
          if (window.scrollTo) window.scrollTo(0, 0);
          return;
        }
        var inSt = document.querySelector('#m [data-st-tab="' + activeStTab + '"]');
        if (inSt) { inSt.click(); return; }
        var navSt = document.querySelector('#nav [data-t="Stress Test"]');
        if (navSt) { navSt.click(); return; }
      }
      if (kind === "pol") {
        activePolPage = val || "list";
        if (window.VRPolicyUI && typeof window.VRPolicyUI.open === "function") {
          window.VRPolicyUI.open(activePolPage);
          if (window.scrollTo) window.scrollTo(0, 0);
          return;
        }
        var polBtn = document.querySelector('#m [data-vpp="' + activePolPage + '"]');
        if (polBtn) { polBtn.click(); return; }
        var navPol = document.querySelector('#nav [data-t="Policies"]');
        if (navPol) { navPol.click(); return; }
      }
      if (kind === "set") {
        if (["plan", "reports", "appearance", "data"].indexOf(val) >= 0) {
          activeSetTab = val;
          navigateTo("set:Settings");
          var stBtnNow = document.querySelector('#m [data-stab="' + val + '"]');
          if (stBtnNow) {
            stBtnNow.click();
          } else {
            setTimeout(function () {
              var stBtnLate = document.querySelector('#m [data-stab="' + val + '"]');
              if (stBtnLate) stBtnLate.click();
            }, 30);
          }
          return;
        }
        var setBtn = document.querySelector('#m [data-settab="' + val + '"]');
        if (setBtn) { setBtn.click(); return; }
        if (val === "Settings") {
          var sItem = document.querySelector('#settings-menu [data-settings-tab="Settings"]');
          if (sItem) { sItem.click(); return; }
        }
        if (typeof UI !== "undefined" && typeof render === "function") {
          UI.tab = val;
          render();
          if (window.scrollTo) window.scrollTo(0, 0);
          return;
        }
      }
    } catch (e) {}
  }

  function showSupportModal(kind) {
    closeDrawer(false);
    var dg = document.getElementById("dg");
    if (!dg || typeof dg.showModal !== "function") return;
    var whoEl = document.getElementById("who");
    var userTxt = (whoEl && whoEl.textContent) ? whoEl.textContent.trim() : "Adviser workspace";

    if (kind === "feedback") {
      dg.className = "";
      dg.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
          '<h2 style="margin:0">Feedback &amp; Support</h2>' +
          '<button type="button" id="vr-sup-x" class="tbs" aria-label="Close">' + ICONS.close + "</button>" +
        "</div>" +
        '<p class="mu">Signed in as <b>' + esc(userTxt) + "</b>. Share suggestions or reach our support desk.</p>" +
        '<form id="vr-fb-form" class="vr-sup-form">' +
          '<label class="fl"><span>Topic</span><select id="vr-fb-cat"><option>Navigation &amp; Usability</option><option>Reports &amp; Calculations</option><option>Feature Request</option><option>Bug Report</option></select></label>' +
          '<label class="fl"><span>Comments</span><textarea id="vr-fb-msg" rows="3" placeholder="Write your feedback..." required></textarea></label>' +
          '<div class="vr-sup-row"><div><div style="font-size:12px;color:var(--mu)">Support Desk</div><div style="font-weight:700;font-size:13px">support@vriddhi.app</div></div>' +
            '<button type="button" id="vr-copy-mail" class="tbs">Copy</button></div>' +
          '<div class="tb" style="justify-content:flex-end;margin-top:4px">' +
            '<button type="button" id="vr-sup-cn">Cancel</button>' +
            '<button type="submit" class="p">Submit Feedback</button>' +
          "</div>" +
        "</form>";
      dg.showModal();
      var xBtn = document.getElementById("vr-sup-x");
      var cnBtn = document.getElementById("vr-sup-cn");
      var cpy = document.getElementById("vr-copy-mail");
      var form = document.getElementById("vr-fb-form");
      if (xBtn) xBtn.onclick = function () { dg.close(); };
      if (cnBtn) cnBtn.onclick = function () { dg.close(); };
      if (cpy) {
        cpy.onclick = function () {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText("support@vriddhi.app");
            }
            if (typeof toast === "function") toast("Support email copied");
          } catch (e) {}
        };
      }
      if (form) {
        form.onsubmit = function (ev) {
          ev.preventDefault();
          var cat = (document.getElementById("vr-fb-cat") || {}).value || "General";
          var msg = ((document.getElementById("vr-fb-msg") || {}).value || "").trim();
          if (!msg) return;
          try {
            var list = JSON.parse(localStorage.getItem("vr-feedback-log") || "[]");
            list.push({ at: new Date().toISOString(), cat: cat, msg: msg.slice(0, 500) });
            localStorage.setItem("vr-feedback-log", JSON.stringify(list.slice(-20)));
          } catch (e) {}
          dg.close();
          try { if (typeof toast === "function") toast("Thank you for your feedback!"); } catch (e) {}
        };
      }
      return;
    }

    dg.className = "";
    dg.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">' +
        '<h2 style="margin:0">Contact &amp; Support</h2>' +
        '<button type="button" id="vr-sup-x" class="tbs" aria-label="Close">' + ICONS.close + "</button>" +
      "</div>" +
      '<p class="mu">Signed in as <b>' + esc(userTxt) + "</b>. Reach your adviser desk or administrator using the channels below.</p>" +
      '<div class="vr-sup-form">' +
        '<div class="vr-sup-row"><div><div style="font-size:12px;color:var(--mu)">Support Desk</div><div style="font-weight:700;font-size:13.5px">support@vriddhi.app</div></div>' +
          '<button type="button" id="vr-copy-mail" class="tbs">Copy</button></div>' +
        '<div class="vr-sup-row"><div><div style="font-size:12px;color:var(--mu)">Documentation</div><div style="font-weight:700;font-size:13.5px">In-app Help &amp; FAQ</div></div>' +
          '<button type="button" id="vr-go-help" class="tbs">Open Help</button></div>' +
      "</div>" +
      '<div class="tb" style="justify-content:flex-end;margin-top:12px">' +
        '<button type="button" id="vr-sup-cn" class="p">Done</button>' +
      "</div>";
    dg.showModal();
    var cx = document.getElementById("vr-sup-x");
    var ccn = document.getElementById("vr-sup-cn");
    var cpy2 = document.getElementById("vr-copy-mail");
    var gh = document.getElementById("vr-go-help");
    if (cx) cx.onclick = function () { dg.close(); };
    if (ccn) ccn.onclick = function () { dg.close(); };
    if (cpy2) {
      cpy2.onclick = function () {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("support@vriddhi.app");
          }
          if (typeof toast === "function") toast("Support email copied");
        } catch (e) {}
      };
    }
    if (gh) {
      gh.onclick = function () {
        dg.close();
        navigateTo("set:Help");
      };
    }
  }

  /* Replace emoji glyphs inside bottom .rp2-nav docks with uniform 18px stroke-width=1.75 SVG icons */
  function upgradeBottomNavIcons() {
    var navs = document.querySelectorAll("#m .rp2-nav");
    if (!navs.length) return;
    navs.forEach(function (nav) {
      nav.querySelectorAll("button").forEach(function (btn) {
        var sp = btn.querySelector("span[aria-hidden='true']");
        if (!sp || sp.getAttribute("data-vr-svg") === "1") return;
        var svg = null;
        if (btn.matches('[data-gptab="Dashboard"],[data-rp="tab:status"],[data-st-tab="overview"]')) svg = ICONS.dashboard;
        else if (btn.matches('[data-gptab="Holdings"]')) svg = ICONS.holdings;
        else if (btn.matches('[data-rpm-toggle],[data-gptab="Reports"],[data-rp="tab:report"],[data-vpp="rep"]')) svg = ICONS.reports;
        else if (btn.matches('[data-vpp="list"]')) svg = ICONS.shield;
        else if (btn.matches('[data-fh-open="status"]')) svg = ICONS.edit;
        else if (btn.matches('[data-fh-open="milestones"]')) svg = ICONS.target;
        else if (btn.matches('[data-st-tab="scenarios"]')) svg = ICONS.table;
        else if (btn.matches('[data-st-tab="settings"]')) svg = ICONS.sliders;
        else if (btn.matches('[data-st-tab="engine"]')) svg = ICONS.engine;
        if (svg) {
          sp.innerHTML = svg;
          sp.setAttribute("data-vr-svg", "1");
        }
      });
    });
  }

  function ensureShell() {
    var hdi = document.querySelector("header.hd .hdi");
    if (hdi && !document.getElementById("vr-mob-menu-btn")) {
      var mBtn = document.createElement("button");
      mBtn.type = "button";
      mBtn.id = "vr-mob-menu-btn";
      mBtn.className = "vr-mob-menu-btn";
      mBtn.setAttribute("aria-label", "Open navigation menu");
      mBtn.setAttribute("aria-expanded", "false");
      mBtn.setAttribute("aria-controls", "vr-drawer");
      mBtn.hidden = true;
      mBtn.innerHTML = ICONS.menu;
      hdi.insertBefore(mBtn, hdi.firstChild);

      var brandText = hdi.querySelector(".brand > div:not(.logo)");
      if (brandText && !brandText.querySelector(".vr-mob-sub")) {
        var sub = document.createElement("div");
        sub.className = "vr-mob-sub";
        sub.textContent = "Plan \u00B7 Track \u00B7 Retire";
        brandText.appendChild(sub);
      }

      var tBtn = document.createElement("button");
      tBtn.type = "button";
      tBtn.id = "vr-mob-theme-btn";
      tBtn.className = "vr-mob-theme-btn";
      tBtn.hidden = true;
      hdi.appendChild(tBtn);
    }

    if (!document.getElementById("vr-drawer-backdrop")) {
      var bd = document.createElement("div");
      bd.id = "vr-drawer-backdrop";
      bd.setAttribute("aria-hidden", "true");
      bd.addEventListener("touchmove", function (e) {
        if (drawerOpen && e.cancelable) e.preventDefault();
      }, { passive: false });
      document.body.appendChild(bd);
    }

    if (!document.getElementById("vr-drawer")) {
      var dr = document.createElement("aside");
      dr.id = "vr-drawer";
      dr.setAttribute("role", "dialog");
      dr.setAttribute("aria-modal", "true");
      dr.setAttribute("aria-labelledby", "vr-drawer-title");
      dr.setAttribute("aria-hidden", "true");
      dr.innerHTML =
        '<div class="vr-drawer-hd">' +
          '<div class="vr-drawer-top">' +
            '<div class="vr-drawer-brand">' +
              '<div class="vr-drawer-logo" aria-hidden="true">' +
                '<svg width="19" height="19" viewBox="3.5 2 27 27" fill="none" focusable="false">' +
                  '<rect x="5.5" y="20" width="4.6" height="7" rx="2.3" style="fill:var(--on,#fff);opacity:.55"/>' +
                  '<rect x="13.7" y="15" width="4.6" height="12" rx="2.3" style="fill:var(--on,#fff);opacity:.78"/>' +
                  '<rect x="21.9" y="11" width="4.6" height="16" rx="2.3" style="fill:var(--on,#fff);opacity:1"/>' +
                  '<path d="M24.2 9.6C23.6 6 25.6 3.6 29 3.2c.4 3.5-1.5 6-4.8 6.4z" style="fill:var(--on,#fff);opacity:1"/>' +
                  '<path d="M24.2 9.6C24.4 7 22.7 5.1 20 4.6c-.3 2.8 1.4 4.8 4.2 5z" style="fill:var(--on,#fff);opacity:.8"/>' +
                "</svg>" +
              "</div>" +
              '<div class="vr-drawer-meta">' +
                '<h2 id="vr-drawer-title" class="vr-drawer-title">Vriddhi</h2>' +
                '<span class="vr-drawer-sub">PLAN \u00B7 TRACK \u00B7 RETIRE</span>' +
              "</div>" +
            "</div>" +
            '<button type="button" id="vr-drawer-close" aria-label="Close navigation menu">' + ICONS.close + "</button>" +
          "</div>" +
          '<button type="button" id="vr-drawer-funds" class="vr-drawer-funds" data-vr-nav="gp:Holdings" aria-label="Available funds overview">' +
            '<span class="vr-funds-k">Available funds</span>' +
            '<span class="vr-funds-val">\u2014</span>' +
          "</button>" +
        "</div>" +
        '<nav id="vr-drawer-body" class="vr-drawer-body" aria-label="Primary navigation"></nav>' +
        '<div class="vr-drawer-ft">' +
          '<button type="button" id="vr-drawer-help" class="vr-drawer-link" data-vr-nav="set:Help">Help</button>' +
          '<button type="button" id="vr-drawer-feedback" class="vr-drawer-link" data-vr-action="feedback">Feedback</button>' +
          '<button type="button" id="vr-drawer-signout" class="vr-drawer-link is-danger">Sign out</button>' +
        "</div>";

      var swipeX = 0, swipeY = 0, swiping = false;
      dr.addEventListener("touchstart", function (e) {
        if (!drawerOpen || !e.touches || e.touches.length !== 1) return;
        swipeX = e.touches[0].clientX;
        swipeY = e.touches[0].clientY;
        swiping = true;
      }, { passive: true });
      dr.addEventListener("touchend", function (e) {
        if (!swiping || !drawerOpen || !e.changedTouches || !e.changedTouches.length) {
          swiping = false;
          return;
        }
        swiping = false;
        var dx = e.changedTouches[0].clientX - swipeX;
        var dy = e.changedTouches[0].clientY - swipeY;
        if (dx < -64 && Math.abs(dx) > Math.abs(dy) * 1.35) closeDrawer(true);
      }, { passive: true });

      document.body.appendChild(dr);
    }

    syncThemeUI();
    syncHeaderChrome();
    upgradeBottomNavIcons();
  }

  document.addEventListener("click", function (e) {
    var tgt = e.target && e.target.nodeType === 3 ? e.target.parentElement : e.target;
    if (!tgt || !tgt.closest) return;

    if (tgt.closest("#vr-mob-menu-btn")) {
      if (drawerOpen) closeDrawer(true);
      else openDrawer();
      return;
    }
    if (tgt.closest("#vr-drawer-close") || tgt.id === "vr-drawer-backdrop") {
      closeDrawer(true);
      return;
    }
    if (tgt.closest("#vr-mob-theme-btn")) {
      toggleThemeMode();
      return;
    }
    if (tgt.closest("#vr-drawer-signout")) {
      closeDrawer(false);
      var so = document.getElementById("so");
      if (so) so.click();
      return;
    }
    var actionBtn = tgt.closest("[data-vr-action]");
    if (actionBtn) {
      showSupportModal(actionBtn.getAttribute("data-vr-action"));
      return;
    }
    var acc = tgt.closest("[data-vr-acc]");
    if (acc) {
      e.preventDefault();
      var gId = acc.getAttribute("data-vr-acc");
      openGroup = (openGroup === gId) ? null : gId;
      applyAccordionState();
      return;
    }
    var navItem = tgt.closest("[data-vr-nav]");
    if (navItem) {
      if (navItem.disabled) return;
      navigateTo(navItem.getAttribute("data-vr-nav"));
    }
  });

  document.addEventListener("keydown", function (e) {
    if (!drawerOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeDrawer(true);
      return;
    }
    if (e.key === "Tab") {
      var drawer = document.getElementById("vr-drawer");
      if (!drawer) return;
      var focusables = Array.prototype.slice.call(
        drawer.querySelectorAll('button:not([disabled]):not([hidden]), [href], [tabindex]:not([tabindex="-1"])')
      ).filter(function (el) {
        var closedPanel = el.closest && el.closest(".vr-acc-panel:not(.is-open)");
        return !closedPanel;
      });
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, true);

  window.addEventListener("popstate", function () {
    if (ignoringPop > 0) {
      ignoringPop--;
      return;
    }
    if (drawerOpen) {
      closeDrawer(true, true);
    }
  });

  window.addEventListener("resize", function () {
    if (drawerOpen && window.innerWidth > 960) closeDrawer(false);
  });

  function initObservers() {
    ensureShell();
    var scheduled = false;
    function syncSoon() {
      if (scheduled) return;
      scheduled = true;
      var run = function () {
        scheduled = false;
        ensureShell();
        if (drawerOpen) renderDrawerBody();
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
      else setTimeout(run, 16);
    }

    var targets = [
      document.getElementById("nav"),
      document.getElementById("m"),
      document.getElementById("who"),
      document.getElementById("lg")
    ].filter(Boolean);
    if (typeof MutationObserver === "function") {
      var mo = new MutationObserver(syncSoon);
      targets.forEach(function (el) {
        mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class", "aria-selected", "aria-current", "aria-pressed"] });
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-uic"] });
    }
    document.addEventListener("vr:accesschange", syncSoon);
  }

  window.VRMobileDrawer = {
    open: openDrawer,
    close: closeDrawer,
    refresh: function () { ensureShell(); if (drawerOpen) renderDrawerBody(); },
    getGroups: buildGroups,
    getRoute: currentRoute,
    navigate: navigateTo,
    showSupport: showSupportModal
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initObservers);
  else initObservers();
})();
