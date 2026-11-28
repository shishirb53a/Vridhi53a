
/* build 112: wrap every amount like "Rs 40.00 L" or "Rs 1.40 Cr" in a no-wrap span so the unit never drops to the next line. Text itself is unchanged. */
(function () {
  var RX = /(\u20b9\s?-?\d[\d,]*(?:\.\d+)?) (L|Cr)(?![A-Za-z])/g, SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|SELECT|TITLE|NOSCRIPT)$/;
  var PLAIN_PAR = /^(TD|TH|TR|P|B|STRONG|EM|SMALL|SPAN|LI|DD|DT|H1|H2|H3|H4|A|TIME|LABEL|CAPTION|I|U|CODE)$/;
  var SKIP_CONT = '#vr-side,#vr-drawer,#vr-drawer-backdrop,#vr-side-bc,#toast,#vr-pdf-frame,.nb';
  var busy = false, queued = false, obs, pendingRoots = [];
  function fix(root, flexCache) {
    if (!root || (root.nodeType === 1 && ((root.matches && root.matches(SKIP_CONT)) || (root.closest && root.closest(SKIP_CONT))))) return;
    if (root.nodeType === 3) {
      var p0 = root.parentElement;
      if (!p0 || SKIP.test(p0.tagName) || (p0.closest && p0.closest(SKIP_CONT))) return;
      RX.lastIndex = 0;
      if (!RX.test(root.nodeValue)) return;
      wrapNodes([root], flexCache);
      return;
    }
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, hits = [];
    while ((n = w.nextNode())) {
      var pe = n.parentElement; if (!pe || SKIP.test(pe.tagName) || (pe.closest && pe.closest(SKIP_CONT))) continue;
      var nv = n.nodeValue; if (!nv || nv.indexOf('\u20b9') < 0) continue;
      RX.lastIndex = 0; if (RX.test(nv)) hits.push(n);
    }
    if (hits.length) wrapNodes(hits, flexCache);
  }
  function wrapNodes(hits, flexCache) {
    hits.forEach(function (tn) {
      var s = tn.nodeValue, f = document.createDocumentFragment(), last = 0, m; RX.lastIndex = 0;
      while ((m = RX.exec(s))) {
        if (m.index > last) f.appendChild(document.createTextNode(s.slice(last, m.index)));
        var sp = document.createElement("span"); sp.className = "nb"; sp.textContent = m[0]; f.appendChild(sp); last = m.index + m[0].length;
      }
      if (last < s.length) f.appendChild(document.createTextNode(s.slice(last)));
      var par = tn.parentNode, isFlex = false;
      if (par && par.nodeType === 1 && !PLAIN_PAR.test(par.tagName)) {
        if (flexCache.has(par)) isFlex = flexCache.get(par);
        else {
          var ds = getComputedStyle(par).display;
          isFlex = /flex|grid/.test(ds);
          flexCache.set(par, isFlex);
        }
      }
      if (isFlex) { var wr = document.createElement("span"); wr.appendChild(f); f = wr; }   // a flex/grid parent would drop the spaces around separate pieces
      if (par) par.replaceChild(f, tn);
    });
  }
  function run() {
    queued = false; if (busy || !document.body) return; busy = true;
    var roots = pendingRoots.length ? pendingRoots.splice(0, pendingRoots.length) : [document.body];
    try {
      if (obs) obs.disconnect();
      var flexCache = typeof WeakMap === "function" ? new WeakMap() : { has: function () { return false; }, set: function () {} };
      if (roots.indexOf(document.body) >= 0) {
        fix(document.body, flexCache);
      } else {
        for (var i = 0; i < roots.length; i++) {
          var r = roots[i];
          if (r && r.isConnected !== false && document.body.contains(r.nodeType === 3 ? r.parentNode : r)) {
            fix(r, flexCache);
          }
        }
      }
    } catch (e) {}
    if (obs && obs.takeRecords) obs.takeRecords();
    busy = false; watch();
  }
  function watch() {
    if (!obs) obs = new MutationObserver(function (recs) {
      if (busy) return;
      for (var i = 0; i < recs.length; i++) {
        var rec = recs[i];
        if (rec.type === "characterData") {
          var t = rec.target, tp = t && t.parentElement;
          if (!tp || SKIP.test(tp.tagName) || (tp.closest && tp.closest(SKIP_CONT))) continue;
          if (t.nodeValue && t.nodeValue.indexOf('\u20b9') >= 0 && pendingRoots.indexOf(t) < 0) pendingRoots.push(t);
        } else if (rec.addedNodes && rec.addedNodes.length) {
          for (var j = 0; j < rec.addedNodes.length; j++) {
            var nd = rec.addedNodes[j];
            if (nd.nodeType === 1) {
              if ((nd.matches && nd.matches(SKIP_CONT)) || (nd.closest && nd.closest(SKIP_CONT))) continue;
              if (pendingRoots.indexOf(nd) < 0) pendingRoots.push(nd);
            } else if (nd.nodeType === 3 && nd.nodeValue && nd.nodeValue.indexOf('\u20b9') >= 0) {
              var np = rec.target;
              if (np && (!np.closest || !np.closest(SKIP_CONT)) && pendingRoots.indexOf(nd) < 0) pendingRoots.push(nd);
            }
          }
        }
      }
      if (pendingRoots.length && !queued) { queued = true; (window.requestAnimationFrame || setTimeout)(run, 30); }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
