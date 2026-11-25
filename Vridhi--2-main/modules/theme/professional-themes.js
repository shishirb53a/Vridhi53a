/* Enterprise Theme Engine — 6 institutional wealth-management themes with calibrated
   Light & Dark surface palettes, automatic legacy theme migration, and full compatibility
   with custom Accent Colour, Table Colour, and Display/Advanced Appearance settings. */
(function () {
  var T = [
    [
      "obsidian",
      "Sovereign Slate",
      "Refined navy-slate clarity for institutional wealth",
      {
        bg: "#f4f6f9", card: "#ffffff", tx: "#0c1524", mu: "#4b586e", bd: "#dce3ec",
        hd: "#ffffff", hl: "#eef3fa", hl2: "#f8fafd", hv: "#f0f4fa", ok: "#0f766e", er: "#b91c1c"
      },
      {
        bg: "#090e18", card: "#111827", tx: "#f0f4fa", mu: "#96a4ba", bd: "#222e42",
        hd: "#0e1524", hl: "#182338", hl2: "#141d2e", hv: "#1a2438", ok: "#34d399", er: "#f87171"
      }
    ],
    [
      "emerald",
      "Institutional Emerald",
      "Deep botanical emerald with calm mineral neutrals",
      {
        bg: "#f3f7f5", card: "#ffffff", tx: "#0d1f18", mu: "#466055", bd: "#d7e3dd",
        hd: "#ffffff", hl: "#e9f4ef", hl2: "#f5faf7", hv: "#eef6f2", ok: "#0c6b4d", er: "#b91c1c"
      },
      {
        bg: "#08120e", card: "#101d17", tx: "#ebf5f0", mu: "#8faea0", bd: "#21362c",
        hd: "#0c1712", hl: "#152920", hl2: "#12221b", hv: "#182d23", ok: "#34d399", er: "#f87171"
      }
    ],
    [
      "zurich",
      "Swiss Limestone",
      "Warm archival limestone with burnished bronze",
      {
        bg: "#f6f4f0", card: "#fdfcfa", tx: "#1c1917", mu: "#57534e", bd: "#e4dfd6",
        hd: "#fdfcfa", hl: "#f4ece0", hl2: "#faf7f2", hv: "#f4f0e8", ok: "#15803d", er: "#b91c1c"
      },
      {
        bg: "#12100e", card: "#1b1815", tx: "#f5f2ec", mu: "#a8a095", bd: "#302a24",
        hd: "#161310", hl: "#262018", hl2: "#201c17", hv: "#27221c", ok: "#4ade80", er: "#f87171"
      }
    ],
    [
      "meridian",
      "Meridian Cobalt",
      "Precision cool slate with crisp cobalt accents",
      {
        bg: "#f5f7fb", card: "#ffffff", tx: "#0f172a", mu: "#475569", bd: "#dfe6f2",
        hd: "#ffffff", hl: "#ebf1fe", hl2: "#f7f9ff", hv: "#eff4fc", ok: "#0f766e", er: "#dc2626"
      },
      {
        bg: "#0a0f1c", card: "#121929", tx: "#f1f5f9", mu: "#94a3b8", bd: "#243047",
        hd: "#0e1424", hl: "#192542", hl2: "#141e36", hv: "#1b2640", ok: "#34d399", er: "#f87171"
      }
    ],
    [
      "platinum",
      "Platinum Carbon",
      "Architectural monochrome slate that lets numbers lead",
      {
        bg: "#f3f4f6", card: "#ffffff", tx: "#111827", mu: "#4b5563", bd: "#dfe2e8",
        hd: "#ffffff", hl: "#eceef2", hl2: "#f8f9fa", hv: "#eff1f5", ok: "#15803d", er: "#b91c1c"
      },
      {
        bg: "#0c0e12", card: "#15181e", tx: "#f3f4f6", mu: "#9ca3af", bd: "#272c36",
        hd: "#111419", hl: "#1e222b", hl2: "#191c24", hv: "#202530", ok: "#4ade80", er: "#f87171"
      }
    ],
    [
      "bordeaux",
      "Imperial Burgundy",
      "Heritage claret accent on soft alabaster surfaces",
      {
        bg: "#f7f5f6", card: "#ffffff", tx: "#1c1318", mu: "#5c4b53", bd: "#e5dce0",
        hd: "#ffffff", hl: "#f6eaee", hl2: "#fbf6f8", hv: "#f5eef1", ok: "#0f766e", er: "#b91c1c"
      },
      {
        bg: "#130d10", card: "#1d1519", tx: "#f7f1f3", mu: "#b09ca5", bd: "#36262e",
        hd: "#181014", hl: "#2b1b22", hl2: "#23181d", hv: "#2c1e25", ok: "#34d399", er: "#f87171"
      }
    ]
  ];

  var K = "vr-pro";
  var DEFAULT_THEME = "obsidian";
  var r = document.documentElement;
  var used = {};
  var LG = {
    obsidian: ["#0b1b33", "#16355c"],
    emerald: ["#08271d", "#114a37"],
    zurich: ["#231a10", "#4a3519"],
    meridian: ["#0f1f4d", "#1d4ed8"],
    platinum: ["#0f1217", "#262c36"],
    bordeaux: ["#2d0d18", "#5e1730"]
  };
  /* Automatic migration for any previously saved legacy theme keys */
  var AL = {
    "default": "obsidian",
    ledger: "obsidian",
    boardroom: "obsidian",
    contrast: "obsidian",
    forest: "emerald",
    bank: "zurich",
    evergreen: "zurich",
    graphite: "platinum",
    mono: "platinum",
    minimal: "platinum"
  };

  function valid(k) {
    return T.some(function (z) { return z[0] === k; });
  }
  function resolve(raw) {
    var mapped = AL[raw] || raw;
    return valid(mapped) ? mapped : DEFAULT_THEME;
  }
  function get() {
    var v = DEFAULT_THEME;
    try { v = localStorage.getItem(K) || DEFAULT_THEME; } catch (e) {}
    return resolve(v);
  }
  function dark() {
    var a = r.getAttribute("data-theme");
    return a === "dark" || (!a && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function sp(n, v) {
    r.style.setProperty(n, v);
    if (document.body) document.body.style.setProperty(n, v);
  }
  function rp(n) {
    r.style.removeProperty(n);
    if (document.body) document.body.style.removeProperty(n);
  }
  function apply() {
    Object.keys(used).forEach(function (k) { rp("--" + k); });
    used = {};
    var k = get();
    var x = T.filter(function (z) { return z[0] === k; })[0] || T[0];
    r.removeAttribute("data-minimal-theme");
    r.setAttribute("data-pro-theme", x[0]);
    var v = dark() ? x[4] : x[3];
    if (v) {
      Object.keys(v).forEach(function (n) {
        sp("--" + n, v[n]);
        used[n] = 1;
      });
    }
    var g = LG[x[0]];
    if (g) {
      sp("--lg1", g[0]);
      sp("--lg2", g[1]);
      used.lg1 = 1;
      used.lg2 = 1;
    }
  }
  function pick(el) {
    var k = resolve(el.getAttribute("data-pro"));
    try { localStorage.setItem(K, k); } catch (e) {}
    apply();
    document.querySelectorAll(".pro-i").forEach(function (n) {
      n.setAttribute("aria-checked", String(n.getAttribute("data-pro") === k));
    });
  }

  window.vrPro = {
    T: T,
    get: get,
    set: function (k) {
      var next = resolve(k);
      try { localStorage.setItem(K, next); } catch (e) {}
      apply();
      document.querySelectorAll(".pro-i").forEach(function (n) {
        n.setAttribute("aria-checked", String(n.getAttribute("data-pro") === next));
      });
    }
  };

  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest(".pro-i");
    if (el) pick(el);
  });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("pro-i")) {
      e.preventDefault();
      pick(e.target);
    }
  });
  try { new MutationObserver(apply).observe(r, { attributes: true, attributeFilter: ["data-theme"] }); } catch (e) {}
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", apply); } catch (e) {}
  apply();
})();