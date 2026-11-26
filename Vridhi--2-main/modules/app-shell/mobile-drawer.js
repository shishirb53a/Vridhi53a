/* Modern Mobile FinTech UI Controller:
   - Mobile header drawer trigger & quick Light/Dark toggle (<= 720px)
   - Slide-out modal navigation drawer with focus trap, Escape, scrim & smooth animation
   - Accordion-based menu hierarchy filtered by RBAC permissions
   - Uniform stroke-width=1.75 SVG icons across drawer & fixed bottom action bars */
(function () {
  "use strict";

  var SW = '1.75';
  function ic(size, body) {
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" fill="none" stroke="currentColor" stroke-width="' + SW +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      body + '</svg>';
  }

  var ICONS = {
    menu: ic(20, '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>'),
    close: ic(20, '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    chev: '<svg class="vr-acc-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>',
    sun: ic(18, '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
    moon: ic(18, '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
    signout: ic(18, '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'),
    goalGroup: ic(20, '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>'),
    retireGroup: ic(20, '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
    policyGroup: ic(20, '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'),
    accountGroup: ic(20, '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.79 1 1.44 1.07H21a2 2 0 1 1 0 4h-.09c-.65.07-1.18.47-1.51 1Z"/>'),
    summary: ic(18, '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    holdings: ic(18, '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>'),
    barChart: ic(18, '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>'),
    calendar: ic(18, '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    percent: ic(18, '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>'),
    layers: ic(18, '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/>'),
    list: ic(18, '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),
    clock: ic(18, '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>'),
    users: ic(18, '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    pulse: ic(18, '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'),
    table: ic(18, '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>'),
    sliders: ic(18, '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'),
    engine: ic(18, '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>'),
    shield: ic(18, '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
    help: ic(18, '<circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
    file: ic(18, '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'),
    edit: ic(18, '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    target: ic(18, '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>')
  };

  var expandedGroups = {};
  var drawerOpen = false;
  var lastFocused = null;
  var activeStTab = "overview";

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

    if (tab === "Dashboard") return { id: "gp:Dashboard", group: "goal", title: "Goal Planner · Summary" };
    if (tab === "Holdings") return { id: "gp:Holdings", group: "goal", title: "Goal Planner · Holdings" };
    if (tab === "Reports") {
      var rvTitles = {
        year: "Annual Projection",
        month: "Monthly Projection",
        int: "Interest & Income",
        sav: "Savings Schedule",
        ent: "Holdings Register",
        vdate: "Value on Date"
      };
      return { id: "rv:" + rv, group: "goal", title: "Reports · " + (rvTitles[rv] || "Reports") };
    }
    if (tab === "Retirement planner" || tab === "RP Reports") {
      if (rp.tab === "report") {
        if (rp.rv === "yy") return { id: "rp:yy", group: "retire", title: "Retirement · Year-by-Year" };
        return { id: "rp:clients", group: "retire", title: "Retirement · Client Plans" };
      }
      return { id: "rp:status", group: "retire", title: "Retirement Planner" };
    }
    if (tab === "Stress Test") {
      var stTitles = {
        overview: "Overview",
        scenarios: "Scenarios Report",
        settings: "Stress Settings",
        engine: "Engine & Notes"
      };
      return { id: "st:" + activeStTab, group: "retire", title: "Stress Test · " + (stTitles[activeStTab] || "Overview") };
    }
    if (tab === "Policies") return { id: "tab:Policies", group: "policy", title: "Insurance Policies" };
    if (tab === "Settings") return { id: "set:Settings", group: "account", title: "Settings" };
    if (tab === "Help") return { id: "set:Help", group: "account", title: "Help & Guide" };
    if (tab === "Users") return { id: "set:Users", group: "account", title: "User Management" };
    return { id: "gp:Dashboard", group: "goal", title: tab || "Vriddhi" };
  }

  function buildGroups() {
    var groups = [];
    if (canAccess("Goal Planner")) {
      groups.push({
        id: "goal",
        label: "Goal Planner",
        icon: ICONS.goalGroup,
        items: [
          { id: "gp:Dashboard", label: "Summary", icon: ICONS.summary },
          { id: "gp:Holdings", label: "Portfolio Holdings", icon: ICONS.holdings },
          { id: "rv:year", label: "Annual Projection", icon: ICONS.barChart },
          { id: "rv:month", label: "Monthly Projection", icon: ICONS.calendar },
          { id: "rv:int", label: "Interest & Income", icon: ICONS.percent },
          { id: "rv:sav", label: "Savings Schedule", icon: ICONS.layers },
          { id: "rv:ent", label: "Holdings Register", icon: ICONS.list },
          { id: "rv:vdate", label: "Value on Date", icon: ICONS.clock }
        ]
      });
    }
    if (canAccess("Retirement planner")) {
      var retItems = [
        { id: "rp:status", label: "Retirement Summary", icon: ICONS.summary },
        { id: "rp:clients", label: "Client Plans", icon: ICONS.users },
        { id: "rp:yy", label: "Year-by-Year Cashflow", icon: ICONS.pulse }
      ];
      if (hasModule("Stress Test") && canAccess("Stress Test")) {
        retItems.push(
          { id: "st:overview", label: "Stress Test Overview", icon: ICONS.pulse },
          { id: "st:scenarios", label: "Stress Scenarios Report", icon: ICONS.table },
          { id: "st:settings", label: "Stress Settings", icon: ICONS.sliders },
          { id: "st:engine", label: "Engine & Notes", icon: ICONS.engine }
        );
      }
      groups.push({
        id: "retire",
        label: "Retirement & Stress",
        icon: ICONS.retireGroup,
        items: retItems
      });
    }
    if (hasModule("Policies") && canAccess("Policies")) {
      groups.push({
        id: "policy",
        label: "Protection",
        icon: ICONS.policyGroup,
        items: [
          { id: "tab:Policies", label: "Insurance Policies", icon: ICONS.shield }
        ]
      });
    }
    var accItems = [];
    if (canAccess("Settings")) {
      accItems.push(
        { id: "set:Settings", label: "Settings & Appearance", icon: ICONS.sliders },
        { id: "set:Help", label: "Help & Guide", icon: ICONS.help }
      );
    }
    if (allowUsers()) {
      accItems.push({ id: "set:Users", label: "User Management", icon: ICONS.users });
    }
    if (accItems.length) {
      groups.push({
        id: "account",
        label: "Account & Preferences",
        icon: ICONS.accountGroup,
        items: accItems
      });
    }
    return groups;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
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
    var dBtn = document.getElementById("vr-drawer-theme");
    if (dBtn) {
      dBtn.innerHTML = (dark ? ICONS.sun : ICONS.moon) + "<span>" + (dark ? "Light Mode" : "Dark Mode") + "</span>";
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
      sub.textContent = signedIn ? cur.title : "Plan · Track · Retire";
    }
    if (!signedIn && drawerOpen) closeDrawer(false);
  }

  function renderDrawerBody() {
    var body = document.getElementById("vr-drawer-body");
    if (!body) return;
    var cur = currentRoute();
    var groups = buildGroups();
    if (expandedGroups[cur.group] === undefined) expandedGroups[cur.group] = true;

    body.innerHTML = groups.map(function (g) {
      var hasActive = g.items.some(function (it) { return it.id === cur.id; });
      var isOpen = expandedGroups[g.id] !== undefined ? !!expandedGroups[g.id] : hasActive;
      var panelId = "vr-acc-panel-" + g.id;
      return '<section class="vr-acc-group' + (hasActive ? " has-active" : "") + '" data-vr-group="' + g.id + '">' +
        '<button type="button" class="vr-acc-trigger" aria-expanded="' + isOpen + '" aria-controls="' + panelId + '" data-vr-acc="' + g.id + '">' +
          '<span class="vr-acc-lead">' +
            '<span class="vr-acc-ic" aria-hidden="true">' + g.icon + '</span>' +
            '<span class="vr-acc-lbl">' + esc(g.label) + '</span>' +
          '</span>' +
          '<span class="vr-acc-trail" aria-hidden="true">' +
            '<span class="vr-acc-dot"></span>' +
            ICONS.chev +
          '</span>' +
        '</button>' +
        '<div id="' + panelId + '" class="vr-acc-panel' + (isOpen ? " is-open" : "") + '" aria-hidden="' + (!isOpen) + '">' +
          '<div class="vr-acc-inner"><div class="vr-acc-list" role="group" aria-label="' + esc(g.label) + '">' +
            g.items.map(function (it) {
              var on = it.id === cur.id;
              return '<button type="button" class="vr-nav-item" data-vr-nav="' + esc(it.id) + '"' + (on ? ' aria-current="page"' : "") + '>' +
                '<span class="vr-nav-item-lead">' +
                  '<span class="vr-nav-ic" aria-hidden="true">' + it.icon + '</span>' +
                  '<span class="vr-nav-lbl">' + esc(it.label) + '</span>' +
                '</span>' +
                '<span class="vr-nav-check" aria-hidden="true"></span>' +
              '</button>';
            }).join("") +
          '</div></div>' +
        '</div>' +
      '</section>';
    }).join("");

    var whoEl = document.getElementById("who");
    var userEl = document.getElementById("vr-drawer-user");
    if (userEl) {
      var whoTxt = whoEl && !whoEl.hidden ? (whoEl.textContent || "").trim() : "";
      userEl.textContent = whoTxt || "Wealth & Retirement Workspace";
    }
    syncThemeUI();
  }

  function openDrawer() {
    if (drawerOpen) return;
    var drawer = document.getElementById("vr-drawer");
    var backdrop = document.getElementById("vr-drawer-backdrop");
    var mBtn = document.getElementById("vr-mob-menu-btn");
    if (!drawer || !backdrop) return;
    lastFocused = document.activeElement;
    var cur = currentRoute();
    expandedGroups[cur.group] = true;
    renderDrawerBody();
    drawerOpen = true;
    document.documentElement.classList.add("vr-drawer-open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.setAttribute("aria-hidden", "false");
    if (mBtn) mBtn.setAttribute("aria-expanded", "true");
    var targetFocus = drawer.querySelector('.vr-nav-item[aria-current="page"]') || document.getElementById("vr-drawer-close");
    if (targetFocus && targetFocus.focus) {
      setTimeout(function () { if (drawerOpen) targetFocus.focus(); }, 30);
    }
  }

  function closeDrawer(restoreFocus) {
    if (!drawerOpen) return;
    var drawer = document.getElementById("vr-drawer");
    var backdrop = document.getElementById("vr-drawer-backdrop");
    var mBtn = document.getElementById("vr-mob-menu-btn");
    drawerOpen = false;
    document.documentElement.classList.remove("vr-drawer-open");
    if (drawer) drawer.setAttribute("aria-hidden", "true");
    if (backdrop) backdrop.setAttribute("aria-hidden", "true");
    if (mBtn) mBtn.setAttribute("aria-expanded", "false");
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
        var gpBtn = document.querySelector('#m [data-gptab="' + val + '"]');
        if (gpBtn) { gpBtn.click(); return; }
        if (typeof UI !== "undefined" && typeof render === "function") {
          UI.tab = val;
          render();
          window.scrollTo(0, 0);
          return;
        }
      }
      if (kind === "rv") {
        var rvBtn = document.querySelector('#m [data-rv="' + val + '"]');
        if (rvBtn) { rvBtn.click(); return; }
        if (typeof UI !== "undefined" && typeof render === "function") {
          UI.tab = "Reports";
          UI.rv = val;
          UI.sel = null;
          UI.rk = "a";
          UI.rd = 1;
          UI.rq = "";
          render();
          window.scrollTo(0, 0);
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
          window.scrollTo(0, 0);
          return;
        }
      }
      if (kind === "st") {
        activeStTab = val || "overview";
        var inSt = document.querySelector('#m [data-st-tab="' + activeStTab + '"]');
        if (inSt) { inSt.click(); return; }
        if (window.StressTestUI && typeof window.StressTestUI.open === "function") {
          window.StressTestUI.open(activeStTab);
          window.scrollTo(0, 0);
          return;
        }
        var navSt = document.querySelector('#nav [data-t="Stress Test"]');
        if (navSt) { navSt.click(); return; }
      }
      if (kind === "tab") {
        var navTab = document.querySelector('#nav [data-t="' + val + '"]');
        if (navTab) { navTab.click(); return; }
        if (typeof UI !== "undefined" && typeof render === "function") {
          UI.tab = val;
          render();
          window.scrollTo(0, 0);
          return;
        }
      }
      if (kind === "set") {
        var setBtn = document.querySelector('#m [data-settab="' + val + '"]');
        if (setBtn) { setBtn.click(); return; }
        if (val === "Settings") {
          var sItem = document.querySelector('#settings-menu [data-settings-tab="Settings"]');
          if (sItem) { sItem.click(); return; }
        }
        if (typeof UI !== "undefined" && typeof render === "function") {
          UI.tab = val;
          render();
          window.scrollTo(0, 0);
          return;
        }
      }
    } catch (e) {}
  }

  /* Replace raw emoji glyphs inside bottom .rp2-nav docks with uniform 18px stroke-width=1.75 SVG icons */
  function upgradeBottomNavIcons() {
    var navs = document.querySelectorAll("#m .rp2-nav");
    if (!navs.length) return;
    navs.forEach(function (nav) {
      nav.querySelectorAll("button").forEach(function (btn) {
        var sp = btn.querySelector("span[aria-hidden='true']");
        if (!sp || sp.getAttribute("data-vr-svg") === "1") return;
        var svg = null;
        if (btn.matches('[data-gptab="Dashboard"],[data-rp="tab:status"],[data-st-tab="overview"]')) svg = ICONS.summary;
        else if (btn.matches('[data-gptab="Holdings"]')) svg = ICONS.holdings;
        else if (btn.matches('[data-rpm-toggle],[data-gptab="Reports"],[data-rp="tab:report"]')) svg = ICONS.file;
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
        sub.textContent = "Plan · Track · Retire";
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
          '<div class="vr-drawer-brand">' +
            '<div class="vr-drawer-logo" aria-hidden="true">' +
              '<svg width="20" height="20" viewBox="3.5 2 27 27" fill="none" focusable="false">' +
                '<rect x="5.5" y="20" width="4.6" height="7" rx="2.3" style="fill:var(--on,#fff);opacity:.55"/>' +
                '<rect x="13.7" y="15" width="4.6" height="12" rx="2.3" style="fill:var(--on,#fff);opacity:.78"/>' +
                '<rect x="21.9" y="11" width="4.6" height="16" rx="2.3" style="fill:var(--on,#fff);opacity:1"/>' +
                '<path d="M24.2 9.6C23.6 6 25.6 3.6 29 3.2c.4 3.5-1.5 6-4.8 6.4z" style="fill:var(--on,#fff);opacity:1"/>' +
                '<path d="M24.2 9.6C24.4 7 22.7 5.1 20 4.6c-.3 2.8 1.4 4.8 4.2 5z" style="fill:var(--on,#fff);opacity:.8"/>' +
              '</svg>' +
            '</div>' +
            '<div class="vr-drawer-meta">' +
              '<h2 id="vr-drawer-title" class="vr-drawer-title">Vriddhi</h2>' +
              '<span id="vr-drawer-user" class="vr-drawer-user">Wealth &amp; Retirement</span>' +
            '</div>' +
          '</div>' +
          '<button type="button" id="vr-drawer-close" aria-label="Close navigation menu">' + ICONS.close + '</button>' +
        '</div>' +
        '<nav id="vr-drawer-body" class="vr-drawer-body" aria-label="Primary navigation"></nav>' +
        '<div class="vr-drawer-ft">' +
          '<button type="button" id="vr-drawer-theme" class="vr-drawer-ft-btn"></button>' +
          '<button type="button" id="vr-drawer-signout" class="vr-drawer-ft-btn is-danger">' + ICONS.signout + '<span>Sign Out</span></button>' +
        '</div>';
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
    if (tgt.closest("#vr-mob-theme-btn") || tgt.closest("#vr-drawer-theme")) {
      toggleThemeMode();
      return;
    }
    if (tgt.closest("#vr-drawer-signout")) {
      closeDrawer(false);
      var so = document.getElementById("so");
      if (so) so.click();
      return;
    }
    var acc = tgt.closest("[data-vr-acc]");
    if (acc) {
      var gId = acc.getAttribute("data-vr-acc");
      var wasOpen = acc.getAttribute("aria-expanded") === "true";
      var nextOpen = !wasOpen;
      expandedGroups[gId] = nextOpen;
      acc.setAttribute("aria-expanded", String(nextOpen));
      var panel = document.getElementById("vr-acc-panel-" + gId);
      if (panel) {
        panel.classList.toggle("is-open", nextOpen);
        panel.setAttribute("aria-hidden", String(!nextOpen));
      }
      return;
    }
    var navItem = tgt.closest("[data-vr-nav]");
    if (navItem) {
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

  window.addEventListener("resize", function () {
    if (drawerOpen && window.innerWidth > 720) closeDrawer(false);
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
        mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class", "aria-selected"] });
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-uic"] });
    }
    document.addEventListener("vr:accesschange", syncSoon);
  }

  window.VRMobileDrawer = {
    open: openDrawer,
    close: closeDrawer,
    refresh: function () { ensureShell(); if (drawerOpen) renderDrawerBody(); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initObservers);
  else initObservers();
})();
