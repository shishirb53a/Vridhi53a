/* Desktop full-height sidebar (>= 961px): shares the 5 accordion sections, routes, and RBAC
   filtering with VRMobileDrawer (getGroups / getRoute / navigate). Renders top brand header,
   single-open accordion menu with REPORTS subheader, bottom advisor footer (Help · Sign out),
   and top-bar breadcrumb alongside #fhp client switcher. */
(function () {
  "use strict";

  var side = null;
  var openId = null;
  var lastGroup = null;
  var scheduled = false;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function api() { return window.VRMobileDrawer; }

  function signedIn() {
    var lg = document.getElementById("lg");
    if (lg && lg.classList.contains("on")) return false;
    var nav = document.getElementById("nav");
    return !!(nav && nav.children.length > 0);
  }

  var CHEV = '<svg class="vr-side-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>';

  var LOGO_SVG =
    '<svg width="19" height="19" viewBox="3.5 2 27 27" fill="none" focusable="false">' +
      '<rect x="5.5" y="20" width="4.6" height="7" rx="2.3" style="fill:var(--on,#fff);opacity:.55"/>' +
      '<rect x="13.7" y="15" width="4.6" height="12" rx="2.3" style="fill:var(--on,#fff);opacity:.78"/>' +
      '<rect x="21.9" y="11" width="4.6" height="16" rx="2.3" style="fill:var(--on,#fff);opacity:1"/>' +
      '<path d="M24.2 9.6C23.6 6 25.6 3.6 29 3.2c.4 3.5-1.5 6-4.8 6.4z" style="fill:var(--on,#fff);opacity:1"/>' +
      '<path d="M24.2 9.6C24.4 7 22.7 5.1 20 4.6c-.3 2.8 1.4 4.8 4.2 5z" style="fill:var(--on,#fff);opacity:.8"/>' +
    "</svg>";

  function ensure() {
    if (!side) {
      side = document.createElement("aside");
      side.id = "vr-side";
      side.setAttribute("aria-label", "Sections");
      side.hidden = true;
      side.innerHTML =
        '<div class="vr-side-hd">' +
          '<div class="vr-side-logo" aria-hidden="true">' + LOGO_SVG + "</div>" +
          '<div class="vr-side-meta">' +
            '<div class="vr-side-title">Vriddhi</div>' +
            '<div class="vr-side-sub">PLAN \u00B7 TRACK \u00B7 RETIRE</div>' +
          "</div>" +
        "</div>" +
        '<nav class="vr-side-nav" aria-label="Sections"></nav>' +
        '<div class="vr-side-ft">' +
          '<div class="vr-side-av" aria-hidden="true">A</div>' +
          '<div class="vr-side-user">' +
            '<div class="vr-side-who" id="vr-side-who">Advisor</div>' +
            '<div class="vr-side-links">' +
              '<button type="button" class="vr-side-ft-link" id="vr-side-help" data-side-nav="set:Help">Help</button>' +
              '<span aria-hidden="true">\u00B7</span>' +
              '<button type="button" class="vr-side-ft-link" id="vr-side-so">Sign out</button>' +
            "</div>" +
          "</div>" +
        "</div>";
      document.body.appendChild(side);
      side.addEventListener("click", onClick);
    }

    var hdi = document.querySelector("header.hd .hdi");
    if (hdi && !document.getElementById("vr-side-bc")) {
      var bc = document.createElement("div");
      bc.id = "vr-side-bc";
      bc.className = "vr-side-bc";
      bc.setAttribute("aria-label", "Breadcrumb");
      hdi.insertBefore(bc, hdi.firstChild);
    }

    return side;
  }

  function renderBreadcrumb(cur) {
    var bc = document.getElementById("vr-side-bc");
    if (!bc) return;
    var parts = Array.isArray(cur && cur.crumbs) && cur.crumbs.length
      ? cur.crumbs
      : [cur && cur.title ? cur.title : "Vriddhi"];
    var bcHtml = parts.map(function (seg, idx) {
      var isLast = idx === parts.length - 1;
      return (idx > 0 ? '<span aria-hidden="true">&rsaquo;</span>' : "") +
        (isLast ? "<b>" + esc(seg) + "</b>" : "<span>" + esc(seg) + "</span>");
    }).join("");
    if (bc.__html !== bcHtml) { bc.__html = bcHtml; bc.innerHTML = bcHtml; }
  }

  function renderFooterUser() {
    var whoEl = document.getElementById("who");
    var nameTxt = (whoEl && !whoEl.hidden && whoEl.textContent) ? whoEl.textContent.trim() : "Advisor";
    var whoOut = document.getElementById("vr-side-who");
    var avOut = side ? side.querySelector(".vr-side-av") : null;
    var avTxt = (nameTxt.charAt(0) || "A").toUpperCase();
    if (whoOut && whoOut.textContent !== nameTxt) whoOut.textContent = nameTxt;
    if (avOut && avOut.textContent !== avTxt) avOut.textContent = avTxt;
  }

  function render() {
    var a = api();
    if (!a || typeof a.getGroups !== "function") return;
    ensure();
    var on = signedIn();
    if (side.hidden !== !on) side.hidden = !on;
    document.documentElement.classList.toggle("vr-side-on", on);
    if (!on) return;

    var cur = a.getRoute();
    var groups = a.getGroups();
    if (cur.group !== lastGroup) { openId = cur.group; lastGroup = cur.group; }
    if (openId && !groups.some(function (g) { return g.id === openId; })) openId = null;

    var nav = side.querySelector(".vr-side-nav");
    var navHtml = groups.map(function (g) {
      var isOpen = openId === g.id;
      var hasActive = g.items.some(function (it) { return it.id === cur.id; });
      var panel = "vr-side-pnl-" + g.id;
      return '<section class="vr-side-grp' + (hasActive ? " has-active" : "") + (isOpen ? " is-open" : "") + '">' +
        '<button type="button" class="vr-side-trg" aria-expanded="' + isOpen + '" aria-controls="' + panel + '" data-side-acc="' + esc(g.id) + '">' +
          '<span class="vr-side-ic" aria-hidden="true">' + g.icon + "</span>" +
          '<span class="vr-side-lbl">' + esc(g.label) + "</span>" + CHEV +
        "</button>" +
        '<div id="' + panel + '" class="vr-side-pnl"' + (isOpen ? "" : " hidden") + ">" +
          g.items.map(function (it) {
            var subhd = it.subhead ? '<div class="vr-side-subhd">' + esc(it.subhead) + "</div>" : "";
            return subhd +
              '<button type="button" class="vr-side-item" data-side-nav="' + esc(it.id) + '"' +
                (it.id === cur.id ? ' aria-current="page"' : "") + ">" + esc(it.label) + "</button>";
          }).join("") +
        "</div>" +
      "</section>";
    }).join("");
    /* Skip identical markup: replacing the buttons every frame detaches them between mousedown and
       mouseup, so the browser never fires "click" and the menu looks dead. */
    if (nav.__html !== navHtml) { nav.__html = navHtml; nav.innerHTML = navHtml; }

    renderFooterUser();
    renderBreadcrumb(cur);
  }

  function scheduleRender() {
    if (scheduled) return;
    scheduled = true;
    var run = function () { scheduled = false; render(); };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else setTimeout(run, 16);
  }

  function onClick(e) {
    var tgt = e.target && e.target.nodeType === 3 ? e.target.parentElement : e.target;
    if (!tgt || !tgt.closest) return;

    if (tgt.closest("#vr-side-so")) {
      var so = document.getElementById("so");
      if (so) so.click();
      return;
    }
    var acc = tgt.closest("[data-side-acc]");
    if (acc) {
      var id = acc.getAttribute("data-side-acc");
      openId = openId === id ? null : id;
      render();
      var again = side.querySelector('[data-side-acc="' + id + '"]');
      if (again) again.focus();
      return;
    }
    var item = tgt.closest("[data-side-nav]");
    if (item && api()) {
      api().navigate(item.getAttribute("data-side-nav"));
      scheduleRender();
    }
  }

  function init() {
    ensure();
    render();
    if (typeof MutationObserver === "function") {
      var mo = new MutationObserver(scheduleRender);
      ["nav", "m", "who", "lg"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) mo.observe(el, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["hidden", "class", "aria-selected", "aria-current", "aria-pressed"]
        });
      });
    }
    document.addEventListener("vr:accesschange", scheduleRender);
  }

  window.VRNavSidebar = {
    refresh: render
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
