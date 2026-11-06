
/* build 126: put the Vriddhi logo (copied from the page header) at the start of every pop-up title */
(function () {
  var src = document.querySelector(".brand .logo svg");
  function mk() { var s = document.createElement("span"); s.className = "logo dg-logo"; s.setAttribute("aria-hidden", "true"); if (src) s.appendChild(src.cloneNode(true)); return s; }
  function badge(root) { var h = root && root.querySelector("h2, .hw-h h3"); if (h && !h.querySelector(".dg-logo")) h.insertBefore(mk(), h.firstChild); }
  window.fhLogoBadge = badge;
  function watch(d) { if (d.__lg) return; d.__lg = 1; badge(d); new MutationObserver(function () { badge(d); }).observe(d, { childList: true, subtree: true }); }
  document.querySelectorAll("dialog").forEach(watch);
  new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1 && n.tagName === "DIALOG") watch(n); }); }); }).observe(document.body, { childList: true });
})();
