/* Goal Planner bottom bar: the right-hand Reports tab opens an upward menu of every report.
   app.js gpNav() calls window.rptMenu(active); if this file is missing it falls back to the plain tab.
   Choosing a report is handled by the data-rv click handler in modules/reports/monthly-projection.js. */
(function () {
  var FALLBACK = [['year', 'Annual Portfolio Projection'], ['month', 'Monthly Portfolio Projection'], ['int', 'Interest and income'],
    ['sav', 'Savings schedule'], ['ent', 'Holdings register'], ['hold', 'Holdings']];
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function current() {
    if (typeof UI === 'undefined') return 'year';
    return UI.tab === 'Holdings' ? 'hold' : UI.tab === 'Reports' ? (UI.rv || 'year') : '';
  }

  window.rptMenu = function (active) {
    var views = window.RV_VIEWS || FALLBACK, cur = current();
    var h = '<div class="rpm" data-rpm><button type="button" class="rpm-t" data-rpm-toggle aria-haspopup="menu" aria-expanded="false" aria-controls="rpm-menu"' +
      (active ? ' aria-current="page"' : '') + '><span aria-hidden="true">\ud83d\udcc4</span><span>Reports <i class="rpm-c" aria-hidden="true">\u25be</i></span></button>' +
      '<div class="rpm-m" id="rpm-menu" role="menu" aria-label="Reports" hidden><div class="rpm-h" role="presentation">Reports</div>';
    views.forEach(function (v) {
      var on = v[0] === cur;
      h += (v[0] === 'hold' ? '<div class="rpm-sep" role="separator"></div>' : '') +
        '<button type="button" role="menuitemradio" class="rpm-i" data-rv="' + esc(v[0]) + '" aria-checked="' + on + '"><span class="rpm-k" aria-hidden="true">' +
        (on ? '\u2713' : '') + '</span>' + esc(v[1]) + '</button>';
    });
    return h + '</div></div>';
  };

  function parts() { var w = document.querySelector('[data-rpm]'); return w && { t: w.querySelector('[data-rpm-toggle]'), m: w.querySelector('.rpm-m') }; }
  function setOpen(open, focus) {
    var p = parts(); if (!p) return;
    p.t.setAttribute('aria-expanded', String(open)); p.m.hidden = !open;
    if (open) { var f = p.m.querySelector('[aria-checked="true"]') || p.m.querySelector('[role="menuitemradio"]'); f && f.focus(); }
    else if (focus) p.t.focus();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-rpm-toggle]');
    if (t) { e.stopPropagation(); var p = parts(); setOpen(!!p && p.m.hidden); return; }
    if (e.target.closest && e.target.closest('[data-rpm]')) { setOpen(false); return; }
    setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    var p = parts(); if (!p || p.m.hidden) return;
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false, true); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var l = [].slice.call(p.m.querySelectorAll('[role="menuitemradio"]')), i = l.indexOf(document.activeElement);
      i = e.key === 'ArrowDown' ? (i + 1) % l.length : (i - 1 + l.length) % l.length; l[i].focus(); e.preventDefault();
    }
  }, true);
})();
