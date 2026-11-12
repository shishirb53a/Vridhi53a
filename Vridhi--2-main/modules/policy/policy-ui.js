/* =====================================================================================================================
   Vriddhi · POLICY MODULE · SCREENS        modules/policy/policy-ui.js

   The Policies section: its own navigation and two screens (Policies, Reports).
   It reads and changes policy data ONLY through window.VRPolicy (modules/policy/policy-core.js) and registers itself with
   the app through window.VRMODULES, so nothing else in the app needs to know how the Policies section works.
   ===================================================================================================================== */
(function () {
  'use strict';
  var V = window.VRPolicy, TAB = 'Policies';
  var PAGES = [['list', 'Policies', '\ud83d\udee1\ufe0f'], ['rep', 'Reports', '\ud83d\udcc4']];
  var ST = { page: 'list', q: '', grp: false, gc: {}, sf: 'all', rep: 'payout', rq: '', pk: {} };

  /* ---------- helpers ---------- */
  var $$ = function (id) { return document.getElementById(id); };
  var EN = function (v) { return typeof escn === 'function' ? escn(v) : esc(v); };
  var today = function () { return V.todayISO(); };
  var days = function (a, b) { var A = V.pDate(a), B = V.pDate(b); return A && B ? Math.round((Date.UTC(B.y, B.mo - 1, B.d) - Date.UTC(A.y, A.mo - 1, A.d)) / 864e5) : 0; };
  var plural = function (n, w, ws) { return n + ' ' + (n === 1 ? w : (ws || w + 's')); };
  var fl = function (k) { return V.FREQ_NAME[k] || k; };
  var ic = function (d) { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var addBtn = function () { return '<button type="button" class="p hp-add" id="padd" data-vp="add">' + ic('<path d="M12 5v14M5 12h14"/>') + '<span>Add policy</span></button>'; };
  var chip = function (s) { return '<span class="vp-chip ' + s + '">' + esc(V.STATUS[s] || s) + '</span>'; };
  var sorted = function () { return V.list().map(function (x, i) { return { x: x, i: i }; }).sort(function (a, b) { return a.x.start < b.x.start ? -1 : a.x.start > b.x.start ? 1 : a.i - b.i; }); };
  var csvq = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
  var toCsv = function (rows) { return rows.map(function (r) { return r.map(csvq).join(','); }).join('\n'); };
  /* a plain-English line describing the payouts of a policy */
  function line(x) {
    var T = V.totals(x), n = T.count, S0 = V.schedule(x), pay = S0.filter(function (e) { return e.kind === 'payout'; });
    var parts = [];
    if (x.amt > 0) parts.push(n + ' payout' + (n === 1 ? '' : 's') + ' of ' + f(x.amt) + ' (' + fl(x.freq).toLowerCase() + '), ' + V.fmtDate(x.start) + ' to ' + V.fmtDate(pay.length ? pay[pay.length - 1].date : x.start));
    if (x.lump > 0) parts.push((parts.length ? 'then a ' : 'A ') + 'lump sum of ' + f(x.lump));
    if (Array.isArray(x.maturities) && x.maturities.length) {
      var benefits = x.maturities.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }), first = benefits[0], last = benefits[benefits.length - 1], total = benefits.reduce(function (sum, m) { return sum + m.amt; }, 0);
      parts.push(x.maturities.length + ' scheduled maturity benefit' + (x.maturities.length === 1 ? '' : 's') + ' totaling ' + f(total) + ', ' + V.fmtDate(first.date) + ' to ' + V.fmtDate(last.date));
    }
    return parts.join(', ');
  }
  function premLine(x) {
    var q = x.prem; if (!q) return '';
    return q.freq === 'single' ? 'A single premium of ' + f(q.amt) + ' on ' + V.fmtDate(q.start)
      : f(q.amt) + ' ' + fl(q.freq).toLowerCase() + ' for ' + plural(q.yrs, 'year') + ' from ' + V.fmtDate(q.start);
  }
  function kpi(k, v, s, cls) { return '<div class="vp-kpi ' + (cls || '') + '"><div class="vp-k">' + esc(k) + '</div><div class="vp-v">' + v + '</div><div class="vp-s">' + s + '</div></div>'; }
  function head(title, sub, extra) { return '<div class="rph"><div><h1>' + esc(title) + '</h1><p class="vp-sub">' + sub + '</p></div><div class="rpr">' + (extra || '') + '</div></div>'; }
  function empty() {
    return '<div class="vp-card vp-empty"><h2>No policies yet</h2><p class="mu">Keep every insurance policy in one place: its premiums, its payouts and its maturity. Other parts of the app use this data only if you allow it.</p>' + addBtn() + '</div>';
  }
  /* the two switches that decide which other modules may use the policy data */
  function shareClients(who, title) {
    var p = V.clients().filter(function (c) { return c.active; })[0], selected = p && p.share && p.share[who] || [];
    var clients = V.plannerClients(who), key = who === 'goal' ? 'goal' : 'retirement';
    return '<div class="vp-share-clients"><b>' + title + ' clients</b>'
      + (clients.length ? clients.map(function (c) {
        return '<label><input type="checkbox" data-vpclient="' + key + '" value="' + esc(c.id) + '"' + (selected.indexOf(c.id) >= 0 ? ' checked' : '') + '><span>' + esc(c.name) + '</span></label>';
      }).join('') : '<p class="mu">No ' + title + ' clients are available yet.</p>') + '</div>';
  }
  function sharing() {
    var p = V.clients().filter(function (c) { return c.active; })[0], sh = p && p.share || {};
    var col = function (who, title, what) {
      var n = (sh[who] || []).length, all = V.plannerClients(who).length, open = !!ST.pk[who];
      return '<div class="vp-pl"><label class="vp-tg"><input type="checkbox" data-vpset="' + who + '" ' + (V.usedBy(who) ? 'checked' : '') + '><span class="vp-tx"><b>' + title + '</b><small>' + what + '</small></span></label>'
        + '<div class="vp-pr"><span class="vp-cnt">' + n + ' of ' + plural(all, 'client') + ' selected</span><button type="button" class="tbs" data-vp="pick" data-w="' + who + '" aria-expanded="' + open + '">' + (open ? 'Hide clients' : 'Choose clients') + '</button></div>'
        + (open ? '<div class="vp-picks">' + shareClients(who, title) + '</div>' : '') + '</div>';
    };
    return '<section class="vp-card" id="vp-share" aria-label="Use policy data in other modules"><div class="vp-shh"><h2>Use policy data in other modules</h2><p>Other modules read your policies only when you allow it here. Premiums are never passed on.</p></div>'
      + '<div class="vp-shg">' + col('goal', 'Goal Planner', 'Adds payouts to the Annual and Monthly Portfolio Projection reports.')
      + col('retirement', 'Retirement Planner', 'Counts future payouts as fixed income, which lowers the money you need today.') + '</div></section>';
  }

  /* ---------- shell: top bar, bottom navigation, page router ---------- */
  function bar() {
    return '<div class="seg gpb vp-bar" role="group" aria-label="Policy sections">' + PAGES.map(function (p) {
      return '<button type="button" data-vpp="' + p[0] + '" aria-pressed="' + (ST.page === p[0]) + '">' + p[1] + '</button>'; }).join('') + '</div>';
  }
  function nav() {
    return '<div class="rp2-nav vp-nav" role="navigation" aria-label="Policies">' + PAGES.map(function (p) {
      return '<button type="button" data-vpp="' + p[0] + '"' + (ST.page === p[0] ? ' aria-current="page"' : '') + '><span aria-hidden="true">' + p[2] + '</span><span>' + p[1] + '</span></button>'; }).join('') + '</div>';
  }
  function clientBar() {
    var L = V.clients(), active = L.filter(function (c) { return c.active; })[0], n = V.list().length, nm = active ? active.name : '';
    var ini = nm.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('') || 'P';
    return '<div class="vp-top"><span class="vp-av" aria-hidden="true">' + esc(ini) + '</span><div class="vp-who"><span class="vp-eb">Policy plan prepared for</span><div class="vp-wr"><label for="vp-client" class="vp-sr">Policy client</label><select id="vp-client" aria-label="Policy client">'
      + L.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.active ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('')
      + '</select><details class="vp-more vp-cm"><summary aria-label="Client options">\u22ef</summary><div class="vp-menu"><button type="button" data-vpc="add">Add client</button>' + (active ? '<button type="button" data-vpc="rename">Rename</button>' : '') + '</div></details></div></div>'
      + '<span class="vp-sp"></span><span class="vp-meta">' + plural(n, 'policy', 'policies') + '</span></div>';
  }
  function body() {
    switch (ST.page) {
      case 'rep': return pRep(); default: return pList();
    }
  }
  function page() { return '<div id="vp-pg">' + clientBar() + body() + '</div>'; }
  function refresh() { var el = $$('vp-pg'); if (el) el.innerHTML = clientBar() + body(); else render(); }
  function go(p) { ST.page = p; render(); window.scrollTo(0, 0); }

  /* ---------- POLICIES (management) ---------- */
  function pList() {
    var P = sorted(), t = today(), q = ST.q.trim().toLowerCase(), out = '';
    if (!P.length) return head('Policies', 'Add the insurance policies you hold.', '') + empty() + sharing();
    var cnt = {}; P.forEach(function (o) { var k = V.status(o.x, t); cnt[k] = (cnt[k] || 0) + 1; });
    if (ST.sf !== 'all' && !cnt[ST.sf]) ST.sf = 'all';
    var L = P.filter(function (o) {
      if (ST.sf !== 'all' && V.status(o.x, t) !== ST.sf) return false;
      return !q || [o.x.name, o.x.insurer, o.x.no, o.x.note].join(' ').toLowerCase().indexOf(q) > -1;
    });
    var lab = { paying: 'Paying', payout: 'Payout', upcoming: 'Upcoming', matured: 'Matured' };
    var chips = [['all', 'All', P.length]].concat(Object.keys(V.STATUS).filter(function (k) { return cnt[k]; }).map(function (k) { return [k, lab[k] || V.STATUS[k], cnt[k]]; }));
    var s = V.summary(), np = s.nextPayout, nm = s.nextMaturity, hasP = s.premTotal > 0;
    var box = function (ico, cls, k, v, sub) { return '<div class="vp-st3"><span class="vp-si ' + cls + '" aria-hidden="true">' + ic(ico) + '</span><div><span class="vp-k2">' + k + '</span><b>' + v + '</b><small>' + sub + '</small></div></div>'; };
    var stats = '<div class="vp-stats">'
      + box('<path d="M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7l12-3v3M16 14h2"/>', 'po', 'Total back', f(s.payRegular + s.payLump), f(s.payRegular) + ' payouts + ' + f(s.payLump) + ' maturity')
      + box('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>', 'pm', 'Premium per year', hasP ? f(s.annualPremium) : '\u2014', hasP ? 'Paid ' + f(s.premPaid) + ' of ' + f(s.premTotal) : 'No premiums tracked')
      + box('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', 'po', 'Next payout', np ? V.fmtDate(np.date) : '\u2014', np ? f(np.amt) + ' expected' : 'Nothing scheduled')
      + box('<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>', 'mt', 'Next maturity', nm ? V.fmtDate(nm.date) : '\u2014', nm ? EN(nm.name) + (nm.amount > 0 ? ' \u00b7 ' + f(nm.amount) : '') : 'No upcoming maturity') + '</div>';
    var tools = '<div class="vp-tools"><input type="search" id="vp-q" placeholder="Search" aria-label="Search policies" value="' + esc(ST.q) + '"><div class="vp-chips" role="group" aria-label="Filter by status">'
      + chips.map(function (c) { return '<button type="button" class="vp-chipb" data-vp="sf" data-v="' + c[0] + '" aria-pressed="' + (ST.sf === c[0]) + '">' + c[1] + ' <small>' + c[2] + '</small></button>'; }).join('') + '</div></div>';
    var S0 = V.summary(), hd = head('Policies', plural(P.length, 'policy', 'policies') + ' \u00b7 ' + f(S0.payRegular) + ' regular payouts' + (S0.payLump ? ' + ' + f(S0.payLump) + ' maturity' : ''), addBtn());
    return hd + stats + tools + '<div id="vp-list">' + listBody(L, P.length) + '</div>' + sharing();
  }
  function listBody(L, all) {
    if (!L.length) return '<div class="card"><div class="em">No policy matches. Clear the search or the status filter.</div></div>';
    var t = today();
    var tot = function (o) { var T = V.totals(o.x); return T.pay + T.lump; };
    var key = function (o) { return o.x.amt > 0 ? o.x.freq : 'none'; };
    var grouped = function (fn, kind) {
      if (!ST.grp) return L.map(fn);
      var gs = [], ix = {}; L.forEach(function (o) { var c = key(o); if (!(c in ix)) { ix[c] = gs.length; gs.push({ c: c, a: [] }); } gs[ix[c]].a.push(o); });
      var tc = L.reduce(function (a, o) { return a + tot(o); }, 0) || 1, sum = function (g) { return g.a.reduce(function (a, o) { return a + tot(o); }, 0); };
      gs.sort(function (a, b) { return sum(b) - sum(a); });
      var out = [];
      gs.forEach(function (g) {
        var cl = !!ST.gc[g.c], n = g.a.length, name = g.c === 'none' ? 'No regular payouts' : fl(g.c);
        var lab = '<button type="button" class="gtg" data-vp="gtog" data-g="' + esc(g.c) + '" aria-expanded="' + !cl + '"><span class="gar" aria-hidden="true">' + (cl ? '\u25b8' : '\u25be') + '</span><span class="pill" style="--c:#7c3aed">' + esc(name) + '</span><small>' + n + ' polic' + (n === 1 ? 'y' : 'ies') + ' \u00b7 ' + (sum(g) / tc * 100).toFixed(1) + '%</small></button>';
        out.push(kind === 't' ? '<tr class="gh" style="--c:#7c3aed"><td colspan="6">' + lab + '</td><td class="vp-r"><b>' + f(sum(g)) + '</b></td></tr>' : '<div class="hgh" style="--c:#7c3aed">' + lab + '<b>' + f(sum(g)) + '</b></div>');
        if (!cl) g.a.forEach(function (o) { out.push(fn(o)); });
      });
      return out;
    };
    /* one card per policy: status, total, a Pay -> Get -> Mature timeline, one main button and a menu */
    var dn = function (d) { var q = V.pDate(d); return q ? Date.UTC(q.y, q.mo - 1, q.d) / 864e5 : null; };
    var dy = function (d, n) { var q = V.pDate(d); return q ? Date.UTC(q.y + n, q.mo - 1, q.d) / 864e5 : null; };
    var yr = function (d) { return String(d).slice(0, 4); };
    var timeline = function (x, m) {
      var q = x.prem, pS = q ? dn(q.start) : null, pE = q ? (q.freq === 'single' ? pS : dy(q.start, q.yrs)) : null;
      var aS = x.amt > 0 ? dn(x.start) : null, aE = x.amt > 0 ? dy(x.start, x.yrs) : null, mD = m ? dn(m.date) : null;
      var pts = [pS, pE, aS, aE, mD].filter(function (v) { return v != null; }); if (!pts.length) return '';
      var lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), sp = hi - lo || 1;
      var seg = function (a, b, c) { return a == null ? '' : '<i class="' + c + '" style="left:' + ((a - lo) / sp * 100).toFixed(2) + '%;width:' + Math.max((b - a) / sp * 100, 1.5).toFixed(2) + '%"></i>'; };
      var lb = function (c, t, d) { return '<span title="' + esc(V.fmtDate(d)) + '"><i class="vp-dot ' + c + '" aria-hidden="true"></i>' + t + ' ' + yr(d) + '</span>'; };
      return '<div><div class="vp-tl" role="img" aria-label="Timeline of ' + esc(x.name) + ': pay, get, mature">' + seg(pS, pE, 'pm') + seg(aS, aE, 'po') + (mD != null ? seg(mD, mD, 'mt') : '') + '</div>'
        + '<div class="vp-tll">' + (q ? lb('pm', 'Pay', q.start) : '') + (aS != null ? lb('po', 'Get', x.start) : '') + (m ? lb('mt', x.lump > 0 ? 'Mature' : 'End', m.date) : '') + '</div></div>';
    };
    var STW = { paying: 'Paying premium', payout: 'Payout phase', upcoming: 'Not started', matured: 'Matured' };
    var rowB = function (o) {
      var x = o.x, T = V.totals(x), m = V.maturity(x), st = V.status(x, t), i = o.i, nmx = esc(x.name), q = x.prem, dash = '\u2014';
      var b = function (act, label, cls) { return '<button type="button"' + (cls ? ' class="' + cls + '"' : '') + ' data-vp="' + act + '" data-i="' + i + '">' + label + '</button>'; };
      var main = x.amt > 0 || x.lump > 0 || (x.maturities && x.maturities.length) || !q ? 'sched' : 'premsch';
      var fld = function (cls, k, v, sub) { return '<div class="vp-fl ' + cls + '"><span>' + k + '</span><b>' + v + '</b><small>' + sub + '</small></div>'; };
      var prem = q ? fld('pm', 'Premium', f(q.amt) + ' \u00b7 ' + (q.freq === 'single' ? 'single' : fl(q.freq).toLowerCase()), q.freq === 'single' ? 'On ' + V.fmtDate(q.start) : plural(q.yrs, 'year') + ' from ' + V.fmtDate(q.start)) : fld('pm', 'Premium', dash, 'Not tracked');
      var pay = x.amt > 0 ? fld('po', 'Payout', f(x.amt) + ' \u00b7 ' + fl(x.freq).toLowerCase(), plural(T.count, 'payout') + ' from ' + V.fmtDate(x.start)) : fld('po', 'Payout', dash, 'None scheduled');
      var mat = T.lump > 0 && m ? fld('mt', 'Maturity', f(T.lump), plural((x.maturities || []).length + (x.lump > 0 ? 1 : 0), 'benefit') + ' through ' + V.fmtDate(m.date)) : fld('mt', 'Maturity', dash, m ? 'Ends ' + V.fmtDate(m.date) : 'No maturity');
      var foot = m && m.hasPremium ? 'Net after premiums <b>' + f(m.net) + '</b>' : plural(T.count, 'payout') + ' scheduled';
      return '<article class="vp-pc"><div class="vp-pc-h"><div class="vp-pn"><h3>' + EN(x.name) + '</h3><div class="vp-sub2"><span class="vp-sttx ' + st + '">' + esc(STW[st] || V.STATUS[st]) + '</span>'
        + (x.insurer || x.no ? '<span class="mu">' + EN([x.insurer, x.no && ('No. ' + x.no)].filter(Boolean).join(' \u00b7 ')) + '</span>' : '') + '</div></div>'
        + '<div class="vv"><span>Total back</span><b>' + f(T.pay + T.lump) + '</b></div></div>' + timeline(x, m)
        + '<div class="vp-fields">' + prem + pay + mat + '</div>'
        + '<div class="vp-foot"><span class="mu">' + foot + '</span><div class="vp-fa"><button type="button" class="tbs" data-vp="' + main + '" data-i="' + i + '" aria-label="Schedule of ' + nmx + '">' + ic('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>') + 'Schedule</button>'
        + '<details class="vp-more"><summary aria-label="More actions for ' + nmx + '">\u22ef</summary><div class="vp-menu">'
        + (main === 'sched' && q ? b('premsch', 'Premiums') : '') + (main === 'premsch' ? b('sched', 'Payouts') : '') + b('edit', 'Edit') + b('del', 'Delete', 'd') + '</div></details></div></div></article>';
    };
    return '<div class="vp-cards" id="pol">' + grouped(rowB, 'c').join('') + '</div>';  }

  /* ---------- premium status helpers (used by the premium schedule dialog on the Policies page) ---------- */
  var PSL = { paid: 'Paid', overdue: 'Overdue', soon: 'Due soon', upcoming: 'Upcoming' };
  function pstat(e, t) { return e.paid ? 'paid' : e.date < t ? 'overdue' : days(t, e.date) <= 30 ? 'soon' : 'upcoming'; }

  /* ---------- REPORTS ---------- */
  var REPS = [['payout', 'Policy Payout Details'], ['fy', 'Premiums & Payouts by Year'], ['mat', 'Maturity Report'], ['sum', 'Policy Summary']];
  function pRep() {
    var csvBtn = '<button type="button" class="p hp-add" id="csv" data-vp="csv">Export CSV</button>';
    var top = head('Policy reports', 'Reports built from your policy data. Export any of them as CSV.', V.count() ? csvBtn : '');
    if (!V.count()) return top + empty();
    var search = ST.rep === 'payout' ? '<div class="vp-tools"><input id="vp-rq" type="search" placeholder="Search year or policy\u2026" aria-label="Search policy payout report" value="' + esc(ST.rq) + '"></div>' : '';
    return top + '<div class="vp-pills" role="group" aria-label="Report type">' + REPS.map(function (k) { return '<button type="button" data-vp="rtype" data-t="' + k[0] + '" aria-pressed="' + (ST.rep === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div>'
      + '<div class="vp-card"><div class="vp-h"><h2>' + esc(REPS.filter(function (k) { return k[0] === ST.rep; })[0][1]) + '</h2></div>' + search + '<div id="vpr">' + repHtml() + '</div></div>';
  }
  function repHtml() {
    var t = today();
    if (ST.rep === 'payout') {
      var M = V.payoutMatrix(), names = M.names, q = ST.rq.trim().toLowerCase(), fmt = function (v) { return v ? f(v) : ''; };
      if (!names.length) return '<div class="em">No policies added yet. Add a policy in the Policies section to see its scheduled payouts here.</div>';
      var L = M.rows.filter(function (r) { return !q || String(r.year).indexOf(q) > -1 || names.some(function (n) { return n.toLowerCase().indexOf(q) > -1 || String(r.vals[n]).indexOf(q) > -1; }); });
      if (!L.length) return '<div class="em">No years match your search.</div>';
      return '<div class="mu" style="margin:0 0 8px">Annual policy payouts by calendar year. Blank cells mean no payout is scheduled for that policy in that year.</div><div class="vp-tw" tabindex="0" role="region" aria-label="Policy payouts by year report"><table class="vp-t" aria-label="Policy payouts by year"><thead><tr><th>Year</th>' + names.map(function (n) { return '<th>' + EN(n) + '</th>'; }).join('') + '<th>Total</th></tr></thead><tbody>'
        + L.map(function (r) { return '<tr><td><b>' + r.year + '</b></td>' + names.map(function (n) { return '<td class="nw">' + fmt(r.vals[n]) + '</td>'; }).join('') + '<td class="nw"><b>' + fmt(r.total) + '</b></td></tr>'; }).join('') + '</tbody></table></div>';
    }
    if (ST.rep === 'fy') {
      var R = V.byFinancialYear(), tt = { d: 0, p: 0, a: 0, l: 0, n: 0 };
      R.forEach(function (r) { tt.d += r.premDue; tt.p += r.premPaid; tt.a += r.payout; tt.l += r.lump; tt.n += r.net; });
      return '<div class="vp-tw" tabindex="0" role="region" aria-label="Premiums and payouts by financial year report"><table class="vp-t" aria-label="Premiums and payouts by financial year"><tr><th>Financial year</th><th class="vp-r">Premiums due</th><th class="vp-r">Premiums paid</th><th class="vp-r">Regular payouts</th><th class="vp-r">Maturity</th><th class="vp-r">Net (payouts \u2212 premiums)</th></tr>'
        + R.map(function (r) { return '<tr><td class="nw"><b>' + r.label + '</b></td><td class="vp-r nw">' + (r.premDue ? f(r.premDue) : '') + '</td><td class="vp-r nw">' + (r.premPaid ? f(r.premPaid) : '') + '</td><td class="vp-r nw">' + (r.payout ? f(r.payout) : '') + '</td><td class="vp-r nw">' + (r.lump ? f(r.lump) : '') + '</td><td class="vp-r nw"><b>' + f(r.net) + '</b></td></tr>'; }).join('')
        + '<tr class="t"><td>Total</td><td class="vp-r">' + f(tt.d) + '</td><td class="vp-r">' + f(tt.p) + '</td><td class="vp-r">' + f(tt.a) + '</td><td class="vp-r">' + f(tt.l) + '</td><td class="vp-r">' + f(tt.n) + '</td></tr></table></div>';
    }
    var P = sorted();
    if (ST.rep === 'mat') {
      return '<div class="vp-tw" tabindex="0" role="region" aria-label="Maturity report table"><table class="vp-t" aria-label="Maturity report"><tr><th>Policy</th><th>Insurer</th><th>Maturity date</th><th class="vp-r">Maturity amount</th><th class="vp-r">Regular payouts</th><th class="vp-r">Total benefit</th><th class="vp-r">Premiums</th><th class="vp-r">Net gain</th></tr>'
        + P.map(function (o) { var m = V.maturity(o.x); return m ? '<tr><td><b>' + EN(o.x.name) + '</b></td><td>' + EN(o.x.insurer || '') + '</td><td class="nw">' + V.fmtDate(m.date) + '</td><td class="vp-r nw">' + (m.amount ? f(m.amount) : '') + '</td><td class="vp-r nw">' + (m.payouts ? f(m.payouts) : '') + '</td><td class="vp-r nw"><b>' + f(m.benefit) + '</b></td><td class="vp-r nw">' + (m.hasPremium ? f(m.premiums) : '') + '</td><td class="vp-r nw">' + (m.hasPremium ? f(m.net) : '') + '</td></tr>' : ''; }).join('') + '</table></div>';
    }
    return '<div class="vp-tw vp-fit" tabindex="0" role="region" aria-label="Policy summary report table"><table class="vp-t vp-sumt" aria-label="Policy summary"><tr><th>Policy</th><th>Insurer</th><th>Policy no.</th><th class="vp-r">Sum assured</th><th>Status</th><th>Premium</th><th>Payout</th><th>Maturity</th><th class="vp-r">Premiums paid</th><th class="vp-r">Total expected</th></tr>'
      + P.map(function (o) { var x = o.x, T = V.totals(x), m = V.maturity(x), pt = V.premTotals(x); return '<tr><td data-label="Policy"><b>' + EN(x.name) + '</b></td><td data-label="Insurer">' + EN(x.insurer || '') + '</td><td data-label="Policy no.">' + EN(x.no || '') + '</td><td class="vp-r nw" data-label="Sum assured">' + (x.sa ? f(x.sa) : '') + '</td><td data-label="Status">' + chip(V.status(x, t)) + '</td><td data-label="Premium">' + esc(premLine(x)) + '</td><td data-label="Payout">' + esc(x.amt > 0 ? f(x.amt) + ' ' + fl(x.freq).toLowerCase() : '') + '</td><td class="nw" data-label="Maturity">' + (m ? V.fmtDate(m.date) : '') + '</td><td class="vp-r nw" data-label="Premiums paid">' + (pt.count ? f(pt.paid) : '') + '</td><td class="vp-r nw" data-label="Total expected"><b>' + f(T.pay + T.lump) + '</b></td></tr>'; }).join('') + '</table></div>';
  }
  function repCsv() {
    var t = today();
    if (ST.rep === 'payout') {
      var M = V.payoutMatrix(), names = M.names;
      if (!names.length) return toCsv([['Year', 'Total']]);
      return toCsv([['Year'].concat(names, ['Total'])].concat(M.rows.map(function (r) { return [r.year].concat(names.map(function (n) { return r.vals[n] || ''; }), [r.total || '']); })));
    }
    if (ST.rep === 'fy') return toCsv([['Financial year', 'Premiums due', 'Premiums paid', 'Regular payouts', 'Maturity', 'Net']].concat(V.byFinancialYear().map(function (r) { return [r.label, r.premDue, r.premPaid, r.payout, r.lump, r.net]; })));
    var P = sorted();
    if (ST.rep === 'mat') return toCsv([['Policy', 'Insurer', 'Maturity date', 'Maturity amount', 'Regular payouts', 'Total benefit', 'Premiums', 'Net gain']].concat(P.map(function (o) { var m = V.maturity(o.x); return m ? [o.x.name, o.x.insurer || '', m.date, m.amount, m.payouts, m.benefit, m.hasPremium ? m.premiums : '', m.hasPremium ? m.net : ''] : null; }).filter(Boolean)));
    return toCsv([['Policy', 'Insurer', 'Policy no.', 'Sum assured', 'Status', 'Premium', 'Payout', 'Maturity date', 'Premiums paid', 'Total expected']].concat(P.map(function (o) { var x = o.x, T = V.totals(x), m = V.maturity(x), pt = V.premTotals(x); return [x.name, x.insurer || '', x.no || '', x.sa || '', V.STATUS[V.status(x, t)], premLine(x), x.amt > 0 ? x.amt + ' ' + fl(x.freq).toLowerCase() : '', m ? m.date : '', pt.count ? pt.paid : '', T.pay + T.lump]; })));
  }

  /* ---------- add / edit form ---------- */
  function form(i) {
    var isNew = i == null, P = V.list();
    if (isNew && P.length >= V.MAX) { toast('Maximum ' + V.MAX + ' policies. Delete one to add another.'); return; }
    var x = isNew ? { name: '', insurer: '', no: '', sa: '', note: '', amt: '', freq: 'yearly', start: today(), yrs: 10, lump: '', prem: null } : P[i];
    var q = x.prem || { amt: '', freq: 'yearly', start: today(), yrs: 10 };
    var hf = function (id, l, v, ex, help) { return '<div class="hf1"><label for="' + id + '">' + l + '</label><input id="' + id + '" type="number" inputmode="decimal" value="' + esc(v == null ? '' : v) + '" ' + (ex || '') + '><small class="hh">' + (help || '') + '</small></div>'; };
    var tx = function (id, l, v, ph, max) { return '<div class="hf1"><label for="' + id + '">' + l + '</label><input id="' + id + '" type="text" maxlength="' + max + '" value="' + esc(v || '') + '" placeholder="' + esc(ph) + '"></div>'; };
    var fopts = function (sel, single) { return V.FREQ.concat(single ? [['single', 'Single premium']] : []).map(function (k) { return '<option value="' + k[0] + '"' + (sel === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join(''); };
    var maturityRows = function (items) {
      items = items && items.length ? items : [{ date: '', amt: '' }];
      return items.map(function (m, k) { return '<div class="vp-maturity-row"><label><span>Date</span><input id="pmat-date-' + k + '" class="vp-md" type="date" value="' + esc(m.date || '') + '" min="1990-01-01" max="2200-12-31" aria-label="Maturity benefit date ' + (k + 1) + '"></label>'
        + '<label><span>Amount (\u20b9)</span><input id="pmat-amount-' + k + '" class="vp-ma" type="number" inputmode="decimal" min="0.01" max="1000000000000" step="any" value="' + esc(m.amt == null ? '' : m.amt) + '" aria-label="Maturity benefit amount ' + (k + 1) + '"></label>'
        + '<button type="button" class="tbs vp-maturity-remove" data-vpmat="remove" data-i="' + k + '" aria-label="Remove maturity benefit ' + (k + 1) + '">Remove</button></div>'; }).join('');
    };
    open('<form id="pfm" novalidate><h2>' + (isNew ? 'Add' : 'Edit') + ' Policy</h2>' + (!isNew && x.ca && typeof stampTxt === 'function' ? '<div class="tsx">' + esc(stampTxt(x)) + '</div>' : '')
      + '<div class="vp-tabs" role="tablist" aria-label="Policy form sections">'
      + ['1. Details', '2. Premium', '3. Payout', '4. Maturity', '5. Preview'].map(function (t, k) { return '<button type="button" role="tab" class="vp-tab" data-vptab="' + k + '" aria-selected="' + (k === 0) + '">' + t + '</button>'; }).join('') + '</div>'
      + '<section class="hs" data-vpt="0"><h3>Policy Details</h3><div class="hg">' + tx('pn', 'Policy name', x.name, 'e.g. Tata AIG money-back', 40).replace('<input ', '<input required ') + tx('pins', 'Insurer (optional)', x.insurer, 'e.g. LIC, HDFC Life', 60) + tx('pno', 'Policy number (optional)', x.no, 'Policy number', 40) + hf('psa', 'Sum assured (\u20b9, optional)', x.sa, 'min=0 step=any', 'The cover amount.') + tx('pnt', 'Note (optional)', x.note, 'Payout account, nominee\u2026', 200) + '</div></section>'
      + '<section class="hs" data-vpt="1"><h3>Premium <small>optional, to track what you pay</small></h3><div class="hg">' + hf('pma', 'Premium amount (\u20b9 each time)', q.amt, 'min=0 step=any', 'Leave empty if you do not want to track premiums.')
      + '<div class="hf1"><label for="pmf">Frequency</label><select id="pmf">' + fopts(q.freq, true) + '</select></div><div class="hf1"><label for="pms">First premium date</label><input id="pms" type="date" value="' + esc(q.start) + '" min="1990-01-01" max="2200-12-31"></div>' + hf('pmy', 'Premium paying term (years)', q.yrs, 'min=1 max=60 step=1', 'How many years premiums are paid.') + '</div></section>'
      + '<section class="hs" data-vpt="2"><h3>Payout <small>optional, money the policy pays you</small></h3><div class="hg">' + hf('pa', 'Payout amount (\u20b9 each time)', x.amt, 'min=0 step=any', 'Amount received at every payout.')
      + '<div class="hf1"><label for="pf">Frequency</label><select id="pf">' + fopts(x.freq, false) + '</select></div><div class="hf1"><label for="ps">First payout date</label><input id="ps" type="date" value="' + esc(x.start) + '" min="1990-01-01" max="2200-12-31"><small class="hh">Later payouts follow the frequency from this date.</small></div>' + hf('py', 'Duration (years)', x.yrs, 'min=1 max=60 step=1', 'How many years the regular payouts run.') + '</div></section>'
      + '<section class="hs" data-vpt="3"><h3>Maturity benefits <small>for LIC and other policies</small></h3><p class="mu">Add each benefit with its payment date and amount. Leave rows blank when there are no scheduled benefits.</p><div id="pmats">' + maturityRows(x.maturities) + '</div><button type="button" class="tbs" id="pmat-add">Add maturity benefit</button><div class="hg" style="margin-top:14px">' + hf('pl', 'Additional lump sum (\u20b9, optional)', x.lump, 'min=0 step=any', 'One lump sum one period after the regular payout term. Use the schedule above for dated or multiple maturity benefits.') + '</div></section>'
      + '<div id="pp" class="pvbox" data-vpt="4" aria-live="polite"></div><div id="pe" class="er" role="alert"></div><div class="tb"><button type="button" id="pcn">Cancel</button><button type="button" class="p" id="pnx">Next</button><button class="p">Save Policy</button></div></form>');
    dg.classList.remove('vp-sch'); dg.classList.add('hf');
    var g = $$, val = function () {
      return { name: g('pn').value.replace(/\s+/g, ' ').trim(), insurer: g('pins').value.trim(), no: g('pno').value.trim(), sa: +g('psa').value || 0, note: g('pnt').value.trim(),
               ma: +g('pma').value || 0, mf: g('pmf').value, ms: g('pms').value, my: Math.round(+g('pmy').value), amt: +g('pa').value || 0, freq: g('pf').value, start: g('ps').value, yrs: Math.round(+g('py').value), lump: +g('pl').value || 0,
               maturities: Array.prototype.map.call(document.querySelectorAll('#pmats .vp-maturity-row'), function (row) { return { date: row.querySelector('.vp-md').value, amt: +row.querySelector('.vp-ma').value || 0 }; }) };
    };
    var err = function (v) {
      if (!v.name) return ['pn', 'Enter a policy name.'];
      if (!(v.sa >= 0) || v.sa > 1e13) return ['psa', 'Sum assured must be 0 or more.'];
      if (!(v.ma >= 0) || v.ma > 1e10) return ['pma', 'Premium amount must be between 0 and 1,00,00,00,000.'];
      if (v.ma > 0) { if (!V.pDate(v.ms)) return ['pms', 'Enter a valid first premium date (year 1990 to 2200).']; if (v.mf !== 'single' && !(v.my >= 1 && v.my <= 60)) return ['pmy', 'Premium paying term must be a whole number from 1 to 60 years.']; }
      if (!(v.amt >= 0) || v.amt > 1e10) return ['pa', 'Payout amount must be between 0 and 1,00,00,00,000.'];
      if (!(v.lump >= 0) || v.lump > 1e12) return ['pl', 'Lump sum must be 0 or more.'];
      if (v.amt > 0 || v.lump > 0) { if (!V.pDate(v.start)) return ['ps', 'Enter a valid first payout date (year 1990 to 2200).']; if (!(v.yrs >= 1 && v.yrs <= 60)) return ['py', 'Duration must be a whole number from 1 to 60 years.']; }
      var scheduled = v.maturities.filter(function (m) { return m.date || m.amt; });
      if (scheduled.length > 60) return ['pmat-add', 'You can add up to 60 maturity benefits.'];
      for (var k = 0; k < v.maturities.length; k++) {
        var m = v.maturities[k]; if (!m.date && !m.amt) continue;
        if (!V.pDate(m.date)) return ['pmat-date-' + k, 'Enter a valid date for every maturity benefit.'];
        if (!(m.amt > 0) || m.amt > 1e12) return ['pmat-amount-' + k, 'Each maturity benefit amount must be greater than 0 and no more than 1,00,00,00,00,000.'];
      }
      if (!(v.ma > 0 || v.amt > 0 || v.lump > 0 || scheduled.length > 0)) return ['pma', 'Enter a premium, a payout amount or a maturity benefit.'];
      return null;
    };
    /* what is stored: a policy with no payout takes its dates from the premium plan */
    var raw = function (v) {
      var prem = v.ma > 0 ? { amt: v.ma, freq: v.mf, start: v.ms, yrs: v.mf === 'single' ? 1 : v.my } : null, pays = v.amt > 0 || v.lump > 0;
      var maturities = v.maturities.filter(function (m) { return m.date || m.amt; });
      return { name: v.name, insurer: v.insurer, no: v.no, sa: v.sa, note: v.note, prem: prem, amt: pays ? v.amt : 0, lump: pays ? v.lump : 0, maturities: maturities, freq: pays ? v.freq : 'yearly', start: pays ? v.start : (prem ? prem.start : (maturities.length ? maturities[0].date : v.start)), yrs: pays ? v.yrs : (prem ? prem.yrs : 1) };
    };
    var pv = function () {
      var v = val(), e = err(v), b = g('pp'); if (e) { b.innerHTML = ''; return; }
      var r = raw(v), T = V.totals(r), m = V.maturity(r), out = [];
      if (r.prem) out.push('Premium: ' + esc(premLine(r)) + ' \u00b7 ' + f(V.premTotals(r).total) + ' in all');
      if (r.amt > 0 || r.lump > 0 || r.maturities.length) out.push(esc(line(r)));
      if (m) out.push('Matures on ' + V.fmtDate(m.date));
      out.push('<span class="mu">Total expected: ' + f(T.pay + T.lump) + '</span>');
      b.innerHTML = '<b>Preview</b><br>' + out.join('<br>');
    };
    var TABOF = { pn: 0, pins: 0, pno: 0, psa: 0, pnt: 0, pma: 1, pmf: 1, pms: 1, pmy: 1, pa: 2, pf: 2, ps: 2, py: 2, pl: 3 }, cur = 0;
    function showTab(k) {
      cur = k; Array.prototype.forEach.call(document.querySelectorAll('#pfm [data-vpt]'), function (el) { el.hidden = +el.dataset.vpt !== k; });
      Array.prototype.forEach.call(document.querySelectorAll('#pfm [data-vptab]'), function (b) { b.setAttribute('aria-selected', +b.dataset.vptab === k); });
      g('pnx').hidden = k === 4; if (k === 4) pv();
    }
    Array.prototype.forEach.call(document.querySelectorAll('#pfm [data-vptab]'), function (b) { b.onclick = function () { showTab(+b.dataset.vptab); }; });
    g('pnx').onclick = function () { showTab(Math.min(4, cur + 1)); };
    showTab(0);
    pv(); g('pcn').onclick = function () { dg.close(); }; g('pn').focus();
    ['pn', 'pins', 'pno', 'psa', 'pma', 'pmf', 'pms', 'pmy', 'pa', 'pf', 'ps', 'py', 'pl'].forEach(function (id) { g(id).addEventListener('input', pv); g(id).addEventListener('change', pv); });
    g('pmats').addEventListener('input', pv); g('pmats').addEventListener('change', pv);
    g('pmat-add').onclick = function () {
      var v = val(); if (v.maturities.length >= 60) { g('pe').textContent = 'You can add up to 60 maturity benefits.'; return; }
      v.maturities.push({ date: '', amt: '' }); g('pmats').innerHTML = maturityRows(v.maturities); g('pe').textContent = ''; pv();
    };
    g('pmats').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-vpmat="remove"]'); if (!b) return;
      var v = val(); v.maturities.splice(+b.dataset.i, 1); g('pmats').innerHTML = maturityRows(v.maturities); g('pe').textContent = ''; pv();
    });
    g('pmf').addEventListener('change', function () { g('pmy').disabled = g('pmf').value === 'single'; }); g('pmy').disabled = g('pmf').value === 'single';
    g('pfm').addEventListener('submit', function (ev) {
      ev.preventDefault(); var v = val(), e = err(v); if (e) { g('pe').textContent = e[1]; showTab(e[0].indexOf('pmat-') === 0 ? 3 : (TABOF[e[0]] || 0)); g(e[0]).focus(); return; }
      var r = V.put(raw(v), isNew ? null : i); if (!r.ok) { g('pe').textContent = r.error; return; }
      dg.close(); refresh(); toast(isNew ? 'Policy added' : 'Policy updated');
    });
  }

  /* ---------- schedule dialogs ---------- */
  function sched(i) {
    var x = V.get(i); if (!x) return;
    var L = V.schedule(x), t = today(), T = V.totals(x);
    open('<div class="pol-sch"><h2>' + EN(x.name) + ' \u00b7 payout schedule</h2><p class="mu">' + esc(line(x) || 'No payouts: this policy only has premiums.') + '</p><div class="rsum" style="margin:10px 0"><div><span class="mu">Regular payouts</span><b>' + f(T.pay) + '</b></div><div><span class="mu">Maturity lump sum</span><b>' + f(T.lump) + '</b></div><div><span class="mu">Total expected</span><b>' + f(T.pay + T.lump) + '</b></div></div>'
      + '<div class="tw"><table class="vp-t" aria-label="Payout schedule"><tr><th>#</th><th>Date</th><th>Financial year</th><th>Type</th><th>Amount</th><th>Status</th></tr>' + L.map(function (e) { return '<tr><td>' + e.n + '</td><td class="nw">' + V.fmtDate(e.date) + '</td><td class="nw">' + V.fyLabel(Math.floor((e.ix - 3) / 12)) + '</td><td>' + (e.kind === 'maturity' ? 'Maturity benefit' : e.kind === 'lump' ? 'Maturity lump sum' : 'Payout') + '</td><td class="nw"><b>' + f(e.amt) + '</b></td><td>' + (e.date <= t ? 'Received' : 'Upcoming') + '</td></tr>'; }).join('') + '</table></div><div class="tb"><button type="button" class="p" id="psc">Close</button></div></div>');
    dg.classList.add('hf', 'vp-sch'); $$('psc').onclick = function () { dg.close(); };
  }
  function premBody(i) {
    var x = V.get(i); if (!x || !x.prem) return '<p class="mu">This policy has no premium plan.</p>';
    var L = V.premSchedule(x), t = today(), T = V.premTotals(x);
    return '<p class="mu">' + esc(premLine(x)) + '</p><div class="rsum" style="margin:10px 0"><div><span class="mu">Total premiums</span><b>' + f(T.total) + '</b></div><div><span class="mu">Paid</span><b>' + f(T.paid) + '</b></div><div><span class="mu">Remaining</span><b>' + f(T.remaining) + '</b></div></div>'
      + (T.overdue ? '<div class="vp-alert"><b>' + plural(T.overdue, 'premium') + ' overdue</b><button type="button" data-vp="paidall" data-i="' + i + '">Mark due as paid</button></div>' : '')
      + '<div class="tw"><table class="vp-t" aria-label="Premium schedule"><tr><th>#</th><th>Due date</th><th>Financial year</th><th>Amount</th><th>Status</th><th></th></tr>' + L.map(function (e) {
          var paid = !!(x.paid && x.paid[e.date]), st = pstat({ paid: paid, date: e.date }, t);
          return '<tr><td>' + e.n + '</td><td class="nw">' + V.fmtDate(e.date) + '</td><td class="nw">' + V.fyLabel(Math.floor((e.ix - 3) / 12)) + '</td><td class="nw"><b>' + f(e.amt) + '</b></td><td><span class="vp-chip ' + st + '">' + PSL[st] + '</span></td><td class="nw"><button type="button" class="tbs" data-vp="paid" data-i="' + i + '" data-d="' + e.date + '" data-v="' + (paid ? 0 : 1) + '">' + (paid ? 'Undo' : 'Mark paid') + '</button></td></tr>'; }).join('') + '</table></div>';
  }
  function premsch(i) {
    var x = V.get(i); if (!x) return;
    open('<div class="pol-sch" data-pi="' + i + '"><h2>' + EN(x.name) + ' \u00b7 premiums</h2><div id="vp-psd">' + premBody(i) + '</div><div class="tb"><button type="button" class="p" id="psc">Close</button></div></div>');
    dg.classList.add('hf', 'vp-sch'); $$('psc').onclick = function () { dg.close(); };
  }
  function redrawPremDlg() { var w = $$('vp-psd'), h = w && w.closest('[data-pi]'); if (w && h && dg.open) w.innerHTML = premBody(+h.dataset.pi); }

  /* ---------- behaviour ---------- */
  function clientForm(mode) {
    var active = V.clients().filter(function (c) { return c.active; })[0], name = mode === 'rename' && active ? active.name : '';
    open('<form id="vpc-form" novalidate data-mode="' + mode + '"><h2>' + (mode === 'rename' ? 'Rename policy client' : 'Add policy client') + '</h2>'
      + '<p class="mu">' + (mode === 'rename' ? 'Change the name shown in the Policy client list.' : 'Create a separate policy portfolio for this client.') + '</p>'
      + '<label for="vpc-name">Client name</label><input id="vpc-name" type="text" maxlength="30" autocomplete="off" value="' + esc(name) + '" placeholder="e.g. Meera">'
      + '<div class="er" id="vpc-err" role="alert"></div><div class="tb"><button type="button" id="vpc-cancel">Cancel</button><button type="submit" class="p">' + (mode === 'rename' ? 'Save name' : 'Add client') + '</button></div></form>');
    dg.classList.remove('hf', 'vp-sch');
    $$('vpc-cancel').onclick = function () { dg.close(); };
    $$('vpc-name').focus(); $$('vpc-name').select();
  }
  document.addEventListener('submit', function (e) {
    var form = e.target && e.target.id === 'vpc-form' ? e.target : null; if (!form) return;
    e.preventDefault();
    var active = V.clients().filter(function (c) { return c.active; })[0];
    var result = form.dataset.mode === 'rename' && active ? V.renameClient(active.id, $$('vpc-name').value) : V.addClient($$('vpc-name').value);
    if (!result.ok) { $$('vpc-err').textContent = result.error; return; }
    dg.close(); refresh();
  });
  function listRefresh() { var el = $$('vp-list'); if (!el) return; var t = today(), q = ST.q.trim().toLowerCase(), P = sorted(); el.innerHTML = listBody(P.filter(function (o) { return (ST.sf === 'all' || V.status(o.x, t) === ST.sf) && (!q || [o.x.name, o.x.insurer, o.x.no, o.x.note].join(' ').toLowerCase().indexOf(q) > -1); }), P.length); }
  function act(a, b) {
    var i = b.dataset.i != null ? +b.dataset.i : null;
    switch (a) {
      case 'add': form(null); break;
      case 'edit': form(i); break;
      case 'sched': sched(i); break;
      case 'premsch': premsch(i); break;
      case 'del': { var x = V.get(i); if (!x) return; confirmBox('Delete policy \u201c' + x.name + '\u201d? Its premiums, payouts and maturity will be removed from every report and forecast.', function () { var u = undoer(); V.remove(i); refresh(); toast('Policy deleted', u); }); break; }
      case 'grp': ST.grp = !ST.grp; refresh(); break;
      case 'sf': ST.sf = b.dataset.v; refresh(); break;
      case 'pick': ST.pk[b.dataset.w] = !ST.pk[b.dataset.w]; refresh(); break;
      case 'gtog': ST.gc[b.dataset.g] = !ST.gc[b.dataset.g]; listRefresh(); { var nb = document.querySelector('[data-vp="gtog"][data-g="' + b.dataset.g + '"]'); if (nb) nb.focus(); } break;
      case 'paid': if (V.setPaid(i, b.dataset.d, b.dataset.v === '1')) { refresh(); redrawPremDlg(); } break;
      case 'paidall': { var n = V.markPaidUpTo(i, today()); toast(n ? plural(n, 'premium') + ' marked as paid' : 'Nothing to mark'); refresh(); redrawPremDlg(); break; }
      case 'rtype': ST.rep = b.dataset.t; refresh(); break;
      case 'csv': text(REPS.filter(function (k) { return k[0] === ST.rep; })[0][1] + ' CSV', repCsv()); break;
    }
  }
  document.addEventListener('click', function (e) {
    Array.prototype.forEach.call(document.querySelectorAll('.vp-more[open]'), function (d) { if (!d.contains(e.target)) d.open = false; });
    var b = e.target.closest && e.target.closest('[data-vp],[data-vpp],[data-vpc]'); if (!b) return;
    var mn = b.closest && b.closest('.vp-more'); if (mn) mn.open = false;
    if (b.dataset.vpc) { clientForm(b.dataset.vpc); return; }
    if (b.dataset.vpp) { if (typeof UI !== 'undefined' && UI.tab === TAB) go(b.dataset.vpp); return; }
    act(b.dataset.vp, b);
  });
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t || !t.id) return;
    if (t.id === 'vp-q') { ST.q = t.value; listRefresh(); }
    else if (t.id === 'vp-rq') { ST.rq = t.value; var el = $$('vpr'); if (el) el.innerHTML = repHtml(); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t) return;
    if (t.dataset && t.dataset.vpset) { V.setUsedBy(t.dataset.vpset, t.checked); toast((t.dataset.vpset === 'goal' ? 'Goal Planner' : 'Retirement Planner') + (t.checked ? ' now uses your policy data' : ' no longer uses your policy data')); render(); return; }
    if (t.id === 'vp-client') { if (V.selectClient(t.value)) render(); return; }
    if (t.dataset && t.dataset.vpclient) {
      var selected = Array.from(document.querySelectorAll('[data-vpclient="' + t.dataset.vpclient + '"]:checked')).map(function (x) { return x.value; });
      V.setClients(t.dataset.vpclient, selected); render(); return;
    }
  });

  /* register with the app: it adds the Policies tab, and shows our bar, page and bottom navigation on it */
  window.VRMODULES = (window.VRMODULES || []).concat([{ tab: TAB, label: 'Policies', bar: bar, page: page, nav: nav }]);
  window.VRPolicyUI = { open: function (p) { if (p) ST.page = p; UI.tab = TAB; render(); window.scrollTo(0, 0); } };
})();
