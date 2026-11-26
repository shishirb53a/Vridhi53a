/* Desktop sidebar (wider than 960px): the same five accordion sections as the mobile drawer.
   It reads VRMobileDrawer.getGroups / getRoute and calls VRMobileDrawer.navigate, so every
   item opens the same existing screen as before. The old top nav stays in the DOM (hidden by CSS)
   because other code clicks its buttons. */
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

  var CHEV = '<svg class="vr-side-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>';

  function ensure() {
    if (side) return side;
    side = document.createElement("aside");
    side.id = "vr-side";
    side.setAttribute("aria-label", "Sections");
    side.hidden = true;
    side.innerHTML = '<nav class="vr-side-nav" aria-label="Sections"></nav>';
    document.body.appendChild(side);
    side.addEventListener("click", onClick);
    return side;
  }

  function render() {
    var a = api();
    if (!a || typeof a.getGroups !== "function") return;
    ensure();
    var on = signedIn();
    side.hidden = !on;
    document.documentElement.classList.toggle("vr-side-on", on);
    if (!on) return;

    var cur = a.getRoute();
    var groups = a.getGroups();
    if (cur.group !== lastGroup) { openId = cur.group; lastGroup = cur.group; }
    if (openId && !groups.some(function (g) { return g.id === openId; })) openId = null;

    var nav = side.querySelector(".vr-side-nav");
    nav.innerHTML = groups.map(function (g) {
      var isOpen = openId === g.id;
      var hasActive = g.items.some(function (it) { return it.id === cur.id; });
      var panel = "vr-side-pnl-" + g.id;
      return '<section class="vr-side-grp' + (hasActive ? " has-active" : "") + '">' +
        '<button type="button" class="vr-side-trg" aria-expanded="' + isOpen + '" aria-controls="' + panel + '" data-side-acc="' + esc(g.id) + '">' +
          '<span class="vr-side-ic" aria-hidden="true">' + g.icon + "</span>" +
          '<span class="vr-side-lbl">' + esc(g.label) + "</span>" + CHEV +
        "</button>" +
        '<div id="' + panel + '" class="vr-side-pnl"' + (isOpen ? "" : " hidden") + ">" +
          g.items.map(function (it) {
            return '<button type="button" class="vr-side-item" data-side-nav="' + esc(it.id) + '"' +
              (it.id === cur.id ? ' aria-current="page"' : "") + ">" + esc(it.label) + "</button>";
          }).join("") +
        "</div>" +
      "</section>";
    }).join("");
  }

  function scheduleRender() {
    if (scheduled) return;
    scheduled = true;
    var run = function () { scheduled = false; render(); };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else setTimeout(run, 16);
  }

  function onClick(e) {
    var acc = e.target.closest && e.target.closest("[data-side-acc]");
    if (acc) {
      var id = acc.getAttribute("data-side-acc");
      openId = openId === id ? null : id;
      render();
      var again = side.querySelector('[data-side-acc="' + id + '"]');
      if (again) again.focus();
      return;
    }
    var item = e.target.closest && e.target.closest("[data-side-nav]");
    if (item && api()) {
      api().navigate(item.getAttribute("data-side-nav"));
      scheduleRender();
    }
  }

  function setHeaderHeight() {
    var hd = document.querySelector("header.hd");
    var h = hd ? Math.round(hd.getBoundingClientRect().height) : 64;
    document.documentElement.style.setProperty("--vr-hd-h", h + "px");
  }

  function init() {
    ensure();
    setHeaderHeight();
    render();
    window.addEventListener("resize", setHeaderHeight);
    if (typeof ResizeObserver === "function") {
      var hd = document.querySelector("header.hd");
      if (hd) new ResizeObserver(setHeaderHeight).observe(hd);
    }
    if (typeof MutationObserver === "function") {
      var mo = new MutationObserver(scheduleRender);
      ["nav", "m", "who", "lg"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) mo.observe(el, { childList: true, subtree: true, attributes: true,
          attributeFilter: ["hidden", "class", "aria-selected", "aria-current", "aria-pressed"] });
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
