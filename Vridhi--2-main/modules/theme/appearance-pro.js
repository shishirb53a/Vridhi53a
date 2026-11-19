/* Simplified Appearance: one place, four choices (Theme, Mode, Density, Text size); everything else sits under "Advanced".
   Also adds a single light/dark toggle to the header. Depends on: professional-themes.js (vrPro), theme.js (THEMES, brandOf),
   dashboard-preferences.js (vrLookSet / vrUISet) and the app globals S, save, theme, render, toast. */
(function () {
  var PRE = [
    { k: 'forest', n: 'Forest green', d: 'Calm, premium green', cc: '#14392b', l: ['#f4f7f3', '#ffffff', '#dce7df', '#14392b'], x: ['#101b15', '#19271e', '#2c4033', '#8bc5a5'] },
    { k: 'bank', n: 'Private bank', d: 'Warm ivory and green', cc: '#2f6b52', l: ['#f6f3ec', '#fffefb', '#e6dfd0', '#2f6b52'], x: ['#16130f', '#201c16', '#352f25', '#7fcfa8'] },
    { k: 'graphite', n: 'Graphite', d: 'Charcoal with gold', cc: '#3b4252', l: ['#eef0f4', '#ffffff', '#dde1e8', '#3b4252'], x: ['#0f1319', '#171c24', '#2a313d', '#c9a24b'] },
    { k: 'minimal', n: 'Minimal', d: 'Flat monochrome without shadows or gradients', cc: '#111111', l: ['#ffffff', '#ffffff', '#888888', '#111111'], x: ['#000000', '#000000', '#888888', '#ffffff'] }
  ];
  var MODES = [['light', 'Light'], ['system', 'System'], ['dark', 'Dark']];
  var DENS = [['cosy', 'Comfortable'], ['compact', 'Compact']];
  var SIZES = [['s', 'A\u2212'], ['m', 'A'], ['l', 'A+'], ['xl', 'A++']];
  var OLD = window.lookUI, d = document, root = d.documentElement;

  function dark() { var a = root.getAttribute('data-theme'); return a === 'dark' || (!a && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  function seg(label, attr, opts, on, note) {
    return '<div class="ap-l">' + label + '</div><div class="seg ap-seg" role="group" aria-label="' + label + '">' +
      opts.map(function (o) { return '<button type="button" ' + attr + '="' + o[0] + '" aria-pressed="' + (o[0] === on) + '">' + o[1] + '</button>'; }).join('') +
      '</div>' + (note ? '<p class="mu ap-n">' + note + '</p>' : '');
  }
  function cards() {
    var cur = window.vrPro ? window.vrPro.get() : 'forest', dk = dark();
    return '<div class="ap-th" role="radiogroup" aria-label="Theme">' + PRE.map(function (p) {
      var c = dk ? p.x : p.l, on = p.k === cur;
      return '<button type="button" class="ap-c" role="radio" aria-checked="' + on + '" data-ap-theme="' + p.k + '"><span class="ap-pv" style="background:' + c[0] +
        '"><i style="background:' + c[1] + ';border:1px solid ' + c[2] + '"></i><b style="background:' + c[3] + '"></b></span><span class="ap-nm">' + p.n +
        (on ? '<em>Selected</em>' : '') + '</span><span class="ap-ds">' + p.d + '</span></button>';
    }).join('') + '</div>';
  }
  var SW = [['#14392b', 'Forest'], ['#2f6b52', 'Sage'], ['#1e3a5f', 'Navy'], ['#2563eb', 'Blue'], ['#4f46e5', 'Indigo'],
    ['#7c3aed', 'Purple'], ['#be185d', 'Rose'], ['#c2410c', 'Orange'], ['#a16207', 'Amber'], ['#3b4252', 'Graphite']];
  function accent() {
    var cur = (window.brandOf ? window.brandOf() : '#14392b').toLowerCase();
    return '<div class="ap-l">Accent colour</div><div class="ap-sw" role="radiogroup" aria-label="Accent colour">' + SW.map(function (s) {
      return '<button type="button" class="ap-s" role="radio" aria-checked="' + (s[0] === cur) + '" aria-label="' + s[1] + '" title="' + s[1] + '" data-ap-cc="' + s[0] + '" style="--sw:' + s[0] + '"></button>';
    }).join('') + '<label class="ap-cu" title="Pick any colour"><input type="color" id="ap-cc" value="' + cur + '" aria-label="Custom accent colour"><span>Custom</span><code id="ap-cc-v">' + cur + '</code></label></div>' +
      '<p class="mu ap-n">Changes buttons, highlights and charts. Text colour is adjusted automatically so it stays readable.' + (root.hasAttribute('data-minimal-theme') ? ' The Minimal theme is monochrome, so pick another theme to see your colour.' : '') + '</p>';
  }
  window.apUI = function () {
    var ds = root.dataset, dens = ds.dens === 'compact' ? 'compact' : 'cosy', size = ds.size || 'm', mode = (window.S && S.theme) || 'system';
    return '<div class="ap"><div class="ap-l">Theme</div>' + cards() + accent() + seg('Mode', 'data-ap-mode', MODES, mode) +
      seg('Density', 'data-ap-dens', DENS, dens, 'Compact tightens table rows to show more data per screen.') + seg('Text size', 'data-ap-size', SIZES, size) +
      '<details class="ap-adv"><summary>Advanced: font, corners, table lines, stripes, icons</summary>' + (OLD ? OLD() : '') + '</details>' +
      '<div class="ap-ft"><span class="mu">Changes apply instantly.</span><button type="button" data-ap-reset="1">Reset to default</button></div></div>';
  };
  function setCC(hex, final) {
    S.cc = String(hex).toLowerCase();
    if (final) commit('Accent colour applied'); else { try { theme(); } catch (x) { } }
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

  function commit(msg) { try { save(); theme(); render(); } catch (e) { } reopen(); if (msg && window.toast) toast(msg); }
  d.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-ap-theme],[data-ap-mode],[data-ap-dens],[data-ap-size],[data-ap-reset],#ap-mode');
    if (!t) return;
    if (t.id === 'ap-mode') { S.theme = dark() ? 'light' : 'dark'; try { save(); theme(); } catch (x) { } paint(); return; }
    if (t.dataset.apTheme) {
      var p = PRE.filter(function (x) { return x.k === t.dataset.apTheme; })[0];
      if (!p) return; window.vrPro.set(p.k); S.cc = p.cc; commit(p.n + ' theme applied'); return;
    }
    if (t.dataset.apMode) { S.theme = t.dataset.apMode; commit(); return; }
    if (t.dataset.apDens) { var v = t.dataset.apDens; window.vrLookSet('dens', v); window.vrUISet('utd', v === 'compact' ? 'compact' : 'normal'); commit(); return; }
    if (t.dataset.apSize) { window.vrLookSet('size', t.dataset.apSize); commit(); return; }
    if (t.dataset.apReset) {
      window.vrPro.set('forest'); S.cc = PRE[0].cc; S.theme = 'system';
      if (window.vrLookReset) window.vrLookReset(); if (window.vrUIReset) window.vrUIReset();
      commit('Appearance reset'); return;
    }
  });

  /* one light/dark toggle in the header (replaces the floating Look menu) */
  var SUN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  function paint() {
    var b = d.getElementById('ap-mode'); if (!b) return;
    var dk = dark(); b.innerHTML = dk ? SUN : MOON;
    b.setAttribute('aria-label', dk ? 'Switch to light mode' : 'Switch to dark mode'); b.title = b.getAttribute('aria-label');
  }
  function mount() {
    var so = d.getElementById('so'); if (!so || d.getElementById('ap-mode')) return;
    var b = d.createElement('button'); b.type = 'button'; b.id = 'ap-mode'; b.className = 'ap-mode';
    so.parentNode.insertBefore(b, so); paint();
  }
  mount();
  var r0 = window.render; if (typeof r0 === 'function') window.render = function () { var r = r0.apply(this, arguments); mount(); paint(); return r; };
  try { new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { }
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paint); } catch (e) { }
})();
