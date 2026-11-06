
/* build 112: wrap every amount like "Rs 40.00 L" or "Rs 1.40 Cr" in a no-wrap span so the unit never drops to the next line. Text itself is unchanged. */
(function () {
  var RX = /(\u20b9\s?-?\d[\d,]*(?:\.\d+)?) (L|Cr)(?![A-Za-z])/g, SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|SELECT|TITLE|NOSCRIPT)$/;
  var busy = false, queued = false, obs;
  function fix(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, hits = [];
    while ((n = w.nextNode())) {
      var pe = n.parentElement; if (!pe || SKIP.test(pe.tagName) || pe.closest(".nb")) continue;
      RX.lastIndex = 0; if (RX.test(n.nodeValue)) hits.push(n);
    }
    hits.forEach(function (tn) {
      var s = tn.nodeValue, f = document.createDocumentFragment(), last = 0, m; RX.lastIndex = 0;
      while ((m = RX.exec(s))) {
        if (m.index > last) f.appendChild(document.createTextNode(s.slice(last, m.index)));
        var sp = document.createElement("span"); sp.className = "nb"; sp.textContent = m[0]; f.appendChild(sp); last = m.index + m[0].length;
      }
      if (last < s.length) f.appendChild(document.createTextNode(s.slice(last)));
      var par = tn.parentNode, ds = par && par.nodeType === 1 ? getComputedStyle(par).display : "";
      if (/flex|grid/.test(ds)) { var wr = document.createElement("span"); wr.appendChild(f); f = wr; }   // a flex/grid parent would drop the spaces around separate pieces
      if (par) par.replaceChild(f, tn);
    });
  }
  function run() {
    queued = false; if (busy || !document.body) return; busy = true;
    try { if (obs) obs.disconnect(); fix(document.body); } catch (e) {}
    busy = false; watch();
  }
  function watch() { if (!obs) obs = new MutationObserver(function () { if (!queued) { queued = true; (window.requestAnimationFrame || setTimeout)(run, 30); } }); obs.observe(document.body, { childList: true, subtree: true, characterData: true }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
