/* Annual Portfolio Projection: friendlier table helpers.
   The table, its columns, the Asset class / Holding / Columns menus, Search, Sort, Freeze and the sort arrow are NOT changed.
   This only adds: a one-line summary, quick column views, Every year / Every 5 years, Jump to retirement,
   colour-coded column groups, plain-language column hints, a Today tag and a hover highlight for the column under the pointer. */
(function () {
  'use strict';
  var KEY = 'vr-annual-helpers', st = { cols: 'all', years: 1 };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || '{}'); if (saved.cols === 'hold' || saved.cols === 'inc') st.cols = saved.cols; if (saved.years === 5) st.years = 5; } catch (e) { /* storage may be unavailable */ }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } }

  /* column group of a header key: y = year/age, h = holdings, i = income, b = balance and change */
  var GROUP = { a: 'y', year: 'y', age: 'y', tot: 'b', roi: 'b', add: 'b', chg: 'b', int: 'i', mi: 'i', pay: 'i', ti: 'i' };
  function groupOf(key) { return /^v\d+$/.test(key) ? 'h' : GROUP[key] || 'y'; }
  var HINTS = {
    age: 'Your age and your children’s ages in that year',
    int: 'Interest and income your holdings are expected to earn during the year',
    mi: 'Yearly income divided by 12',
    pay: 'Money paid out by your insurance policies in the year',
    ti: 'Yearly income plus policy payouts',
    tot: 'Total value of all your holdings at the end of the year',
    roi: 'Average yearly return across all your holdings',
    add: 'Money you add to your holdings during the year',
    chg: 'How much the total changed compared with the previous year'
  };
  function hintOf(key) { return /^v\d+$/.test(key) ? 'Value of this holding on 1 April, in ₹ lakh' : HINTS[key] || ''; }
  /* Every 5 years keeps Today, every 5th year, the retirement row and the row you clicked */
  function keepRow(year, isToday, isRetired, isSelected, years) {
    return years !== 5 || isToday || isRetired || isSelected || year % 5 === 0;
  }

  function onAnnualPage() {
    var h = document.querySelector('#m .rph2[data-rpx] h2');
    return !!h && /^Annual Portfolio Projection/.test(h.textContent.trim());
  }
  function money(n) { return typeof cr === 'function' ? cr(n) : '₹ ' + Math.round(n).toLocaleString('en-IN'); }
  function summaryHTML() {
    try {
      if (typeof calc !== 'function' || typeof S === 'undefined') return '';
      var D = calc(S), sum = function (r) { return r.v.reduce(function (a, b) { return a + b; }, 0); };
      var first = D.rows[0], ret = D.rows[D.ri];
      if (!first || !ret) return '';
      return '<span>Today <b>' + money(sum(first)) + '</b></span><span>→ At retirement (1 Apr ' + ret.year + ') <b>' + money(sum(ret)) + '</b></span>'
        + '<span>' + (sum(ret) / sum(first)).toFixed(1) + '× today</span><span class="vr-sn">Whole portfolio · retirement row is highlighted · hover a column to highlight it</span>';
    } catch (e) { return ''; }
  }
  function barHTML() {
    return '<div class="vr-aph" role="group" aria-label="Table helpers"><div class="vr-sum">' + summaryHTML() + '</div><div class="vr-ctl">'
      + '<div class="vr-seg" role="group" aria-label="Columns shown"><button type="button" data-aph-cols="all">All columns</button><button type="button" data-aph-cols="hold">Holdings only</button><button type="button" data-aph-cols="inc">Income only</button></div>'
      + '<div class="vr-seg" role="group" aria-label="Rows shown"><button type="button" data-aph-years="1">Every year</button><button type="button" data-aph-years="5">Every 5 years</button></div>'
      + '<button type="button" class="vr-jump" data-aph-jump>↧ Jump to retirement</button>'
      + '<span class="vr-leg" aria-hidden="true"><i class="g-y"></i>Year <i class="g-h"></i>Holdings (₹ L) <i class="g-i"></i>Income <i class="g-b"></i>Balance &amp; change</span></div></div>';
  }

  /* one-time decoration of a rendered table (the Columns feature has already removed / reordered columns when data-rc is set) */
  function decorate(t) {
    var head = t.rows[0]; if (!head) return;
    var keys = Array.prototype.map.call(head.cells, function (c) { var b = c.querySelector('button[data-rk]'); return b ? b.dataset.rk : ''; });
    t.dataset.aph = '1';
    keys.forEach(function (k, i) {
      var g = groupOf(k), tip = hintOf(k);
      Array.prototype.forEach.call(t.rows, function (r, ri) {
        var c = r.cells[i]; if (!c || r.cells.length !== keys.length) return;
        c.classList.add('vr-g-' + g, 'vr-k-' + k.replace(/\d+$/, k[0] === 'v' ? 'x' : ''));
        if (i > 0 && groupOf(keys[i - 1]) !== g) c.classList.add('vr-gs');
        if (ri === 0 && tip) { c.title = tip; var s = document.createElement('span'); s.className = 'vr-i'; s.setAttribute('aria-hidden', 'true'); s.textContent = 'ⓘ'; c.appendChild(s); }
      });
    });
    var yi = keys.indexOf('year'); t.dataset.aphYear = String(yi);
    var first = firstYear(t);     /* Today = the earliest year in the table (the row for the start of the plan) */
    Array.prototype.forEach.call(t.querySelectorAll('tr[data-r]'), function (r) {
      if (yi >= 0 && r.cells[yi] && yearOf(r.cells[yi]) === first && !r.cells[yi].querySelector('.vr-tdy')) r.cells[yi].insertAdjacentHTML('beforeend', '<span class="vr-tdy">Today</span>');
    });
  }
  function yearOf(cell) { var m = /\b(\d{4})\b/.exec(cell.textContent); return m ? +m[1] : 0; }
  function firstYear(t) {
    var yi = +t.dataset.aphYear, y = 0;
    Array.prototype.forEach.call(t.querySelectorAll('tr[data-r]'), function (r) { var v = yi >= 0 && r.cells[yi] ? yearOf(r.cells[yi]) : 0; if (v && (!y || v < y)) y = v; });
    return y;
  }
  function applyView(t) {
    t.classList.toggle('vr-view-hold', st.cols === 'hold');
    t.classList.toggle('vr-view-inc', st.cols === 'inc');
    var yi = +t.dataset.aphYear;
    var first = firstYear(t);
    Array.prototype.forEach.call(t.querySelectorAll('tr[data-r]:not(.t)'), function (r) {
      var year = yi >= 0 && r.cells[yi] ? yearOf(r.cells[yi]) : 0;
      var keep = !year || keepRow(year, year === first, !!r.querySelector('.rtg'), r.getAttribute('aria-selected') === 'true', st.years);
      r.classList.toggle('vr-skip', !keep);
    });
  }
  function syncBar(bar, t) {
    if (!bar) return;
    var root = document.getElementById('m') || bar;
    Array.prototype.forEach.call(root.querySelectorAll('[data-aph-cols]'), function (b) { b.classList.toggle('on', b.dataset.aphCols === st.cols); b.setAttribute('aria-pressed', String(b.dataset.aphCols === st.cols)); });
    Array.prototype.forEach.call(root.querySelectorAll('[data-aph-years]'), function (b) { b.classList.toggle('on', +b.dataset.aphYears === st.years); b.setAttribute('aria-pressed', String(+b.dataset.aphYears === st.years)); });
    var ctl = bar.querySelector('.vr-ctl'); if (ctl) ctl.hidden = !(t && t.getClientRects().length);     /* phones show year cards instead of the table: keep the summary, drop the table controls */
  }

  var obs = null, timer = 0;
  function work() {
    if (obs) obs.disconnect();
    try {
      var rr = document.getElementById('rr'), m = document.getElementById('m');
      if (!m || !rr || !onAnnualPage()) return;
      var customBar = m.querySelector('.ap-controls');
      var bar = rr.previousElementSibling;
      if (customBar && customBar.querySelector('[data-aph-cols]')) {
        bar = customBar;
      } else if (!bar || !bar.classList || !bar.classList.contains('vr-aph')) {
        rr.insertAdjacentHTML('beforebegin', barHTML());
        bar = rr.previousElementSibling;
      }
      var t = rr.querySelector(':scope > table.rt');
      if (t && t.dataset.rc && !t.dataset.aph) decorate(t);
      if (t && t.dataset.aph) applyView(t);
      syncBar(bar, t);
      if (typeof window.vrSyncAnnualProjection === 'function') window.vrSyncAnnualProjection();
    } finally {
      var mm = document.getElementById('m'); if (mm && obs) obs.observe(mm, { childList: true, subtree: true });
    }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(work, 30); }   /* after the Columns feature has finished with the new table */

  var hotTable = null, hotIndex = -1;
  function clearHot() { if (hotTable) Array.prototype.forEach.call(hotTable.querySelectorAll('.vr-col'), function (c) { c.classList.remove('vr-col'); }); hotTable = null; hotIndex = -1; }

  function start() {
    if (typeof MutationObserver === 'undefined') return;
    obs = new MutationObserver(schedule);
    var m = document.getElementById('m'); if (m) obs.observe(m, { childList: true, subtree: true });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-aph-cols],[data-aph-years],[data-aph-jump]'); if (!b) return;
      if (b.dataset.aphCols) st.cols = b.dataset.aphCols;
      else if (b.dataset.aphYears) st.years = +b.dataset.aphYears === 5 ? 5 : 1;
      else {
        var rr = document.getElementById('rr'), tag = rr && rr.querySelector('table.rt tr[data-r] .rtg'), row = tag && tag.closest('tr');
        if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      persist(); work();
    });
    document.addEventListener('mouseover', function (e) {
      var td = e.target.closest && e.target.closest('table.rt[data-aph] td'); if (!td) { clearHot(); return; }
      var t = td.closest('table'), i = td.cellIndex; if (t === hotTable && i === hotIndex) return;
      clearHot(); hotTable = t; hotIndex = i;
      Array.prototype.forEach.call(t.rows, function (r) { var c = r.cells[i]; if (c) c.classList.add('vr-col'); });
    });
    window.addEventListener('resize', schedule);
    schedule();
  }
  window.VRAnnualHelpers = { groupOf: groupOf, hintOf: hintOf, keepRow: keepRow };
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start(); }
})();
