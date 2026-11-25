/* Enterprise Appearance Controls: Theme, Accent colour, Mode, Density, Text size, plus Advanced settings.
   Maintains the header Light/Dark toggle and full compatibility with vrPro, VRTheme, dashboard-preferences,
   Table Colour customisation, and app globals S, save, theme, render, toast. */
(function () {
  var PRE = [
    {
      k: 'obsidian',
      n: 'Sovereign Slate',
      d: 'Refined navy-slate clarity for institutional wealth',
      cc: '#0f2a4a',
      l: ['#f4f6f9', '#ffffff', '#dce3ec', '#0f2a4a', '#eef3fa'],
      x: ['#090e18', '#111827', '#222e42', '#60a5fa', '#182338']
    },
    {
      k: 'emerald',
      n: 'Institutional Emerald',
      d: 'Deep botanical emerald with calm mineral neutrals',
      cc: '#0c543e',
      l: ['#f3f7f5', '#ffffff', '#d7e3dd', '#0c543e', '#e9f4ef'],
      x: ['#08120e', '#101d17', '#21362c', '#34d399', '#152920']
    },
    {
      k: 'zurich',
      n: 'Swiss Limestone',
      d: 'Warm archival limestone with burnished bronze',
      cc: '#7c4d12',
      l: ['#f6f4f0', '#fdfcfa', '#e4dfd6', '#7c4d12', '#f4ece0'],
      x: ['#12100e', '#1b1815', '#302a24', '#e0a952', '#262018']
    },
    {
      k: 'meridian',
      n: 'Meridian Cobalt',
      d: 'Precision cool slate with crisp cobalt accents',
      cc: '#1d4ed8',
      l: ['#f5f7fb', '#ffffff', '#dfe6f2', '#1d4ed8', '#ebf1fe'],
      x: ['#0a0f1c', '#121929', '#243047', '#60a5fa', '#192542']
    },
    {
      k: 'platinum',
      n: 'Platinum Carbon',
      d: 'Architectural monochrome slate that lets numbers lead',
      cc: '#1f2937',
      l: ['#f3f4f6', '#ffffff', '#dfe2e8', '#1f2937', '#eceef2'],
      x: ['#0c0e12', '#15181e', '#272c36', '#d1d5db', '#1e222b']
    },
    {
      k: 'bordeaux',
      n: 'Imperial Burgundy',
      d: 'Heritage claret accent on soft alabaster surfaces',
      cc: '#7f1d3a',
      l: ['#f7f5f6', '#ffffff', '#e5dce0', '#7f1d3a', '#f6eaee'],
      x: ['#130d10', '#1d1519', '#36262e', '#f47296', '#2b1b22']
    }
  ];
  var MODES = [['light', 'Light'], ['system', 'System'], ['dark', 'Dark']];
  var DENS = [['cosy', 'Comfortable'], ['compact', 'Compact']];
  var SIZES = [['s', 'A\u2212'], ['m', 'A'], ['l', 'A+'], ['xl', 'A++']];
  var OLD = window.lookUI, d = document, root = d.documentElement;

  function dark() {
    var a = root.getAttribute('data-theme');
    return a === 'dark' || (!a && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  var CHK = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';
  function sec(title, desc, body) {
    return '<section class="ap-sec"><header class="ap-sh"><h3>' + title + '</h3>' + (desc ? '<p>' + desc + '</p>' : '') + '</header>' + body + '</section>';
  }
  function seg(label, attr, opts, on, note) {
    return '<div class="ap-row"><div class="ap-rl"><b>' + label + '</b>' + (note ? '<span>' + note + '</span>' : '') + '</div><div class="seg ap-seg" role="group" aria-label="' + label + '">' +
      opts.map(function (o) { return '<button type="button" ' + attr + '="' + o[0] + '" aria-pressed="' + (o[0] === on) + '">' + o[1] + '</button>'; }).join('') + '</div></div>';
  }
  function cards() {
    var cur = window.vrPro ? window.vrPro.get() : 'obsidian', dk = dark();
    return '<div class="ap-th" role="radiogroup" aria-label="Theme">' + PRE.map(function (p) {
      var c = dk ? p.x : p.l, on = p.k === cur;
      return '<button type="button" class="ap-c" role="radio" aria-checked="' + on + '" data-ap-theme="' + p.k + '">' +
        '<span class="ap-pv" style="background:' + c[0] + ';border-color:' + c[2] + '">' +
          '<i class="ap-pb" style="background:' + c[1] + ';border-bottom:1px solid ' + c[2] + '">' +
            '<em class="ap-pb-dot" style="background:' + c[3] + '"></em>' +
            '<em class="ap-pb-line" style="background:' + c[2] + '"></em>' +
          '</i>' +
          '<span class="ap-pm">' +
            '<b style="background:' + c[4] + ';border-color:' + c[2] + '"><s style="background:' + c[3] + '"></s></b>' +
            '<b style="background:' + c[1] + ';border-color:' + c[2] + '"><u style="background:' + c[3] + '"></u><u class="ap-u2" style="background:' + c[2] + '"></u></b>' +
          '</span>' +
        '</span>' +
        '<span class="ap-nm">' + p.n + '</span>' +
        '<span class="ap-ds">' + p.d + '</span>' +
        '<span class="ap-ck" aria-hidden="true">' + CHK + '</span>' +
        (on ? '<span class="ap-sr">Selected</span>' : '') +
      '</button>';
    }).join('') + '</div>';
  }
  var SW = [
    ['#0f2a4a', 'Sovereign Navy'],
    ['#0c543e', 'Institutional Emerald'],
    ['#7c4d12', 'Burnished Bronze'],
    ['#1d4ed8', 'Meridian Cobalt'],
    ['#1f2937', 'Platinum Carbon'],
    ['#7f1d3a', 'Imperial Burgundy'],
    ['#0f766e', 'Deep Teal'],
    ['#4338ca', 'Royal Indigo'],
    ['#5b21b6', 'Amethyst'],
    ['#9a3412', 'Terracotta']
  ];
  function safeHex(v, fb) {
    var s = String(v || '').trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(s) ? s : (fb || '#0f2a4a');
  }
  function accent() {
    var cur = safeHex(window.brandOf ? window.brandOf() : '#0f2a4a', '#0f2a4a'), pre = SW.some(function (s) { return s[0] === cur; });
    return '<div class="ap-sw" role="radiogroup" aria-label="Accent colour">' + SW.map(function (s) {
      return '<button type="button" class="ap-s" role="radio" aria-checked="' + (s[0] === cur) + '" aria-label="' + s[1] + '" title="' + s[1] + '" data-ap-cc="' + s[0] + '" style="--sw:' + s[0] + '">' + CHK + '</button>';
    }).join('') + '<label class="ap-cu' + (pre ? '' : ' on') + '" title="Pick any colour"><input type="color" id="ap-cc" value="' + cur + '" aria-label="Custom accent colour"><span>Custom</span><code id="ap-cc-v">' + cur + '</code></label></div>' +
      '<p class="ap-note">Changes buttons, highlights and charts across every view and report. Text contrast adjusts automatically for light and dark modes.</p>';
  }
  window.apUI = function () {
    var ds = root.dataset, dens = ds.dens === 'compact' ? 'compact' : 'cosy', size = ds.size || 'm', mode = (window.S && S.theme) || 'system';
    return '<div class="ap">' +
      sec('Enterprise Themes', 'Curated institutional palettes calibrated for light and dark modes. Pairs seamlessly with custom accent and table colours.', cards()) +
      sec('Accent colour', 'Pick an institutional preset or choose any custom hex colour.', accent()) +
      sec('Display', 'How the workspace looks and how much financial data fits on screen.',
        '<div class="ap-rows">' + seg('Mode', 'data-ap-mode', MODES, mode, 'Light, dark, or follow your device') +
        seg('Density', 'data-ap-dens', DENS, dens, 'Compact tightens table rows to show more data per screen') +
        seg('Text size', 'data-ap-size', SIZES, size, 'Scales text across the app') + '</div>') +
      '<details class="ap-adv"><summary>Advanced: font, corners, table colour, table lines, stripes, icons</summary>' + (OLD ? OLD() : '') + '</details>' +
      '<div class="ap-ft"><span class="mu">Changes apply instantly across all modules and reports.</span><button type="button" data-ap-reset="1">Reset to default</button></div></div>';
  };
  function savePref(k, v) {
    try {
      if (v == null || v === '') localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) {}
  }
  function setCC(hex, final) {
    var valid = safeHex(hex, '');
    if (!valid) return;
    if (window.S) S.cc = valid;
    savePref('vr-accent-cc', valid);
    if (final) commit('Accent colour applied'); else { try { theme(); } catch (x) { if (window.applyCC) window.applyCC(); } }
  }
  d.addEventListener('input', function (e) {
    if (e.target.id !== 'ap-cc') return;
    var v = d.getElementById('ap-cc-v'); if (v) v.textContent = e.target.value; setCC(e.target.value, false);
  });
  d.addEventListener('change', function (e) { if (e.target.id === 'ap-cc') setCC(e.target.value, true); });
  d.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-ap-cc]'); if (b) setCC(b.dataset.apCc, true); });
  /* keep the Advanced fold open across re-renders */
  d.addEventListener('toggle', function (e) { if (e.target.classList && e.target.classList.contains('ap-adv')) window.__apOpen = e.target.open; }, true);
  function reopen() { var a = d.querySelector('.ap-adv'); if (a && window.__apOpen) a.open = true; }

  function commit(msg) { try { save(); theme(); if (window.vrTableColor) window.vrTableColor.apply(); render(); } catch (e) { try { if (window.VRTheme) window.VRTheme.apply(); } catch (x) {} } reopen(); paintLoginBar(); if (msg && window.toast) toast(msg); }
  function applyModeToggle() {
    var next = dark() ? 'light' : 'dark';
    savePref('vr-theme-mode', next);
    if (window.S) S.theme = next;
    root.setAttribute('data-theme', next);
    try {
      if (typeof save === 'function' && window.S && !root.classList.contains('lk')) save();
      if (typeof theme === 'function') theme();
      else if (window.VRTheme) window.VRTheme.apply();
      if (window.vrTableColor) window.vrTableColor.apply();
    } catch (x) {}
    paint();
    paintLoginBar();
  }
  function applyThemePick(key, quiet) {
    var p = PRE.filter(function (x) { return x.k === key; })[0];
    if (!p) return;
    if (window.vrPro) window.vrPro.set(p.k);
    savePref('vr-accent-cc', p.cc);
    if (window.S) S.cc = p.cc;
    if (quiet || root.classList.contains('lk')) {
      try {
        if (typeof theme === 'function') theme();
        else if (window.VRTheme) window.VRTheme.apply();
        if (window.vrTableColor) window.vrTableColor.apply();
      } catch (x) {}
      paintLoginBar();
      return;
    }
    commit(p.n + ' theme applied');
  }
  d.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-ap-theme],[data-ap-mode],[data-ap-dens],[data-ap-size],[data-ap-reset],#ap-mode,[data-lg-theme],#lg-thmode');
    if (!t) return;
    if (t.id === 'ap-mode' || t.id === 'lg-thmode') { applyModeToggle(); return; }
    if (t.dataset.lgTheme) { applyThemePick(t.dataset.lgTheme, true); return; }
    if (t.dataset.apTheme) { applyThemePick(t.dataset.apTheme, false); return; }
    if (t.dataset.apMode) {
      savePref('vr-theme-mode', t.dataset.apMode);
      if (window.S) S.theme = t.dataset.apMode;
      commit();
      return;
    }
    if (t.dataset.apDens) { var v = t.dataset.apDens; window.vrLookSet('dens', v); window.vrUISet('utd', v === 'compact' ? 'compact' : 'normal'); commit(); return; }
    if (t.dataset.apSize) { window.vrLookSet('size', t.dataset.apSize); commit(); return; }
    if (t.dataset.apReset) {
      window.vrPro.set('obsidian');
      savePref('vr-accent-cc', PRE[0].cc);
      savePref('vr-theme-mode', 'system');
      if (window.S) { S.cc = PRE[0].cc; S.theme = 'system'; }
      if (window.vrLookReset) window.vrLookReset(); if (window.vrUIReset) window.vrUIReset();
      commit('Appearance reset'); return;
    }
  });

  /* one light/dark toggle in the header */
  var SUN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  function paint() {
    var b = d.getElementById('ap-mode'); if (!b) return;
    var dk = dark(); b.innerHTML = dk ? SUN : MOON;
    b.setAttribute('aria-label', dk ? 'Switch to light mode' : 'Switch to dark mode'); b.title = b.getAttribute('aria-label');
  }
  function paintLoginBar() {
    var bar = d.getElementById('lg-thbar'); if (!bar) return;
    var cur = window.vrPro ? window.vrPro.get() : 'obsidian', dk = dark();
    bar.querySelectorAll('[data-lg-theme]').forEach(function (btn) {
      var p = PRE.filter(function (x) { return x.k === btn.dataset.lgTheme; })[0];
      btn.setAttribute('aria-checked', String(btn.dataset.lgTheme === cur));
      if (p) btn.style.setProperty('--sw', dk ? p.x[3] : p.l[3]);
    });
    var mb = d.getElementById('lg-thmode');
    if (mb) {
      mb.innerHTML = dk ? SUN : MOON;
      var lbl = dk ? 'Switch to light mode' : 'Switch to dark mode';
      mb.setAttribute('aria-label', lbl);
      mb.title = lbl;
    }
  }
  function mountLoginBar() {
    var lg = d.getElementById('lg'); if (!lg || d.getElementById('lg-thbar')) return;
    var bar = d.createElement('div');
    bar.id = 'lg-thbar';
    bar.className = 'lg-thbar';
    var dots = d.createElement('div');
    dots.className = 'lg-thdots';
    dots.setAttribute('role', 'radiogroup');
    dots.setAttribute('aria-label', 'Theme');
    PRE.forEach(function (p) {
      var b = d.createElement('button');
      b.type = 'button';
      b.className = 'lg-thdot';
      b.setAttribute('role', 'radio');
      b.dataset.lgTheme = p.k;
      b.title = p.n;
      b.setAttribute('aria-label', p.n + ' theme');
      dots.appendChild(b);
    });
    var sep = d.createElement('span');
    sep.className = 'lg-thsep';
    sep.setAttribute('aria-hidden', 'true');
    var mb = d.createElement('button');
    mb.type = 'button';
    mb.id = 'lg-thmode';
    mb.className = 'lg-thmode';
    bar.append(dots, sep, mb);
    lg.insertBefore(bar, lg.firstChild);
    paintLoginBar();
  }
  function mount() {
    var so = d.getElementById('so'); if (!so || d.getElementById('ap-mode')) return;
    var b = d.createElement('button'); b.type = 'button'; b.id = 'ap-mode'; b.className = 'ap-mode';
    so.parentNode.insertBefore(b, so); paint();
  }
  mount();
  mountLoginBar();
  var r0 = window.render; if (typeof r0 === 'function') window.render = function () { var r = r0.apply(this, arguments); mount(); mountLoginBar(); paint(); paintLoginBar(); return r; };
  try { new MutationObserver(function () { paint(); paintLoginBar(); }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-pro-theme'] }); } catch (e) {}
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { paint(); paintLoginBar(); }); } catch (e) {}
})();
