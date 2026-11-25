(function () {
  var app = null;
  var WHITE = '#ffffff';
  var BLACK = '#000000';
  var THEMES = [
    { k: 'obsidian', n: 'Sovereign Slate', c: '#0f2a4a', d: 'Refined navy-slate clarity for institutional wealth.' },
    { k: 'emerald', n: 'Institutional Emerald', c: '#0c543e', d: 'Deep botanical emerald with calm mineral neutrals.' },
    { k: 'zurich', n: 'Swiss Limestone', c: '#7c4d12', d: 'Warm archival limestone with burnished bronze.' },
    { k: 'meridian', n: 'Meridian Cobalt', c: '#1d4ed8', d: 'Precision cool slate with crisp cobalt accents.' },
    { k: 'platinum', n: 'Platinum Carbon', c: '#1f2937', d: 'Architectural monochrome slate that lets numbers lead.' },
    { k: 'bordeaux', n: 'Imperial Burgundy', c: '#7f1d3a', d: 'Heritage claret accent on soft alabaster surfaces.' }
  ];

  function channels(color) {
    color = color.replace('#', '');
    return [0, 2, 4].map(function (index) { return parseInt(color.substr(index, 2), 16); });
  }
  function hex(values) {
    return '#' + values.map(function (value) {
      return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');
    }).join('');
  }
  function mix(a, b, amount) {
    var left = channels(a), right = channels(b);
    return hex(left.map(function (value, index) { return value + (right[index] - value) * amount; }));
  }
  function luminance(color) {
    var rgb = channels(color).map(function (value) {
      value /= 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  function contrast(color) { return 1.05 / (luminance(color) + 0.05); }
  var MODE_KEY = 'vr-theme-mode';
  var CC_KEY = 'vr-accent-cc';
  function readStore(key) {
    try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; } catch (e) { return null; }
  }
  function writeStore(key, value) {
    try {
      if (typeof localStorage === 'undefined') return;
      if (value == null || value === '') localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {}
  }
  function proAccent() {
    var k = readStore('vr-pro');
    if (window.vrPro && typeof window.vrPro.get === 'function') {
      try { k = window.vrPro.get(); } catch (e) {}
    }
    if (k) {
      var match = THEMES.filter(function (item) { return item.k === k; })[0];
      if (match) return match.c;
    }
    return THEMES[0].c;
  }
  function state() { return app ? app.getState() : null; }
  function brand() {
    var current = state();
    var color = current && current.cc ? String(current.cc).toLowerCase() : null;
    if (color && /^#[0-9a-f]{6}$/.test(color)) return color;
    var saved = readStore(CC_KEY);
    if (saved && /^#[0-9a-f]{6}$/i.test(saved)) return saved.toLowerCase();
    return proAccent();
  }
  function contrastAgainst(color) {
    return Math.max(contrast(color), (luminance(color) + 0.05) / 0.05);
  }
  function applyColor() {
    var root = document.documentElement;
    if (!root || !root.style) return;
    var current = state();
    if (current && current.cc && /^#[0-9a-f]{6}$/i.test(String(current.cc))) {
      writeStore(CC_KEY, String(current.cc).toLowerCase());
    }
    var modeAttr = root.dataset && root.dataset.theme;
    var dark = modeAttr === 'dark' ||
      (!modeAttr && window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    var color = dark ? mix(brand(), WHITE, 0.28) : brand();
    var accessible = color, attempts = 0;
    while (contrast(accessible) < 4.5 && attempts++ < 30) accessible = mix(accessible, BLACK, 0.08);
    var on = (luminance(color) + 0.05) / 0.05 >= 1.05 / (luminance(color) + 0.05)
      ? '#111111' : '#ffffff';
    var values = {
      '--brand': color,
      '--on': on,
      '--acb': accessible,
      '--b1': mix(accessible, BLACK, 0.72),
      '--b2': accessible,
      '--thc': mix(accessible, BLACK, 0.2),
      '--sun': mix(color, WHITE, 0.45),
      '--sk1': mix(accessible, BLACK, 0.72),
      '--sk2': accessible,
      '--sk3': mix(color, WHITE, 0.3),
      '--h1': mix(accessible, BLACK, 0.12),
      '--h2': mix(accessible, BLACK, 0.3),
      '--h3': mix(accessible, BLACK, 0.55),
      '--pth': mix(color, WHITE, 0.8),
      '--shd': mix(accessible, BLACK, 0.85)
    };
    Object.keys(values).forEach(function (key) { root.style.setProperty(key, values[key]); });
  }
  function applyModeValue(mode) {
    var root = document.documentElement;
    if (!root) return;
    if (mode === 'light' || mode === 'dark') {
      root.dataset.theme = mode;
      writeStore(MODE_KEY, mode);
    } else {
      root.removeAttribute('data-theme');
      writeStore(MODE_KEY, 'system');
    }
  }
  function applyTheme() {
    var current = state();
    if (!current) {
      var savedMode = readStore(MODE_KEY);
      if (savedMode === 'light' || savedMode === 'dark') document.documentElement.dataset.theme = savedMode;
      else if (savedMode === 'system') document.documentElement.removeAttribute('data-theme');
      applyColor();
      return;
    }
    document.documentElement.dataset.pal = current.palette || 'yellow';
    applyModeValue(current.theme || 'system');
    if (current.cc && /^#[0-9a-f]{6}$/i.test(String(current.cc))) writeStore(CC_KEY, String(current.cc).toLowerCase());
    applyColor();
  }
  function picker() {
    var selected = brand();
    return '<div class="thm" role="radiogroup" aria-label="Colour theme">' +
      THEMES.map(function (item) {
        var active = selected === item.c;
        return '<button type="button" class="thc' + (active ? ' on' : '') +
          '" role="radio" aria-checked="' + active + '" data-cc="' + item.c +
          '" style="--tc:' + item.c + '"><span class="thp" aria-hidden="true">' +
          '<i class="thh"><b></b><b></b></i><i class="thb"><u></u><u></u><u></u></i>' +
          '<i class="thf"><em></em></i></span><span class="thn">' + item.n +
          (active ? '<em class="tho">Selected</em>' : '') + '</span><span class="thd">' +
          item.d + '</span><span class="thr">Text contrast ' + contrast(item.c).toFixed(1) +
          ':1 · AA+</span></button>';
      }).join('') + '</div>';
  }
  function configure(api) {
    app = api;
    var current = state();
    if (current) {
      var savedMode = readStore(MODE_KEY);
      if ((!current.theme || current.theme === 'system') && (savedMode === 'light' || savedMode === 'dark')) {
        current.theme = savedMode;
      }
      var savedCC = readStore(CC_KEY);
      if (!current.cc && savedCC && /^#[0-9a-f]{6}$/i.test(savedCC)) {
        current.cc = savedCC.toLowerCase();
      }
    }
    applyTheme();
    if (window.matchMedia) {
      var query = window.matchMedia('(prefers-color-scheme: dark)');
      if (query && typeof query.addEventListener === 'function') {
        query.addEventListener('change', applyColor);
      }
    }
  }

  window.THEMES = THEMES;
  window.brandOf = brand;
  window.applyCC = applyColor;
  window.ccUI = picker;
  window.VRTheme = { configure: configure, apply: applyTheme };
  /* Hydrate theme tokens immediately so the sign-in screen reflects the active theme before login */
  applyTheme();
  try {
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(applyColor).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-pro-theme']
      });
    }
  } catch (e) {}
  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('[data-cc],[data-hc]');
    if (!button || button.disabled || !app) return;
    var current = state();
    if (button.dataset.hc) {
      current.hc = !current.hc;
      if (current.hc && current.cc && contrastAgainst(current.cc) < 7) current.cc = null;
    } else {
      var color = button.dataset.cc;
      current.cc = color === 'auto' ? null : color;
      writeStore(CC_KEY, current.cc || '');
      var selected = THEMES.filter(function (item) { return item.c === color; })[0];
      if (selected) app.toast(selected.n + ' theme applied');
    }
    app.save();
    applyTheme();
    app.render();
  });
})();
