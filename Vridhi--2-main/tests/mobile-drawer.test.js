#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const cssPath = path.join(ROOT, 'modules', 'app-shell', 'mobile-drawer.css');
const jsPath = path.join(ROOT, 'modules', 'app-shell', 'mobile-drawer.js');
const sideCssPath = path.join(ROOT, 'modules', 'nav-sidebar', 'nav-sidebar.css');
const sideJsPath = path.join(ROOT, 'modules', 'nav-sidebar', 'nav-sidebar.js');
const htmlPath = path.join(ROOT, 'index.html');

const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const sideCss = fs.readFileSync(sideCssPath, 'utf8');
const sideJs = fs.readFileSync(sideJsPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('  PASS:', name);
}

console.log('Running Vriddhi Mobile Drawer & Desktop Sidebar Navigation tests...');

/* -------------------------------------------------------------------------
   1. HTML & CSS Structural / Responsive Contract Checks
   ------------------------------------------------------------------------- */
test('index.html loads mobile-drawer and nav-sidebar assets in order after design-system.css', () => {
  const idxDs = html.indexOf('modules/theme/design-system.css');
  const idxCss = html.indexOf('modules/app-shell/mobile-drawer.css');
  const idxJs = html.indexOf('modules/app-shell/mobile-drawer.js');
  const idxSideCss = html.indexOf('modules/nav-sidebar/nav-sidebar.css');
  const idxSideJs = html.indexOf('modules/nav-sidebar/nav-sidebar.js');
  assert.ok(idxDs > -1 && idxCss > idxDs && idxJs > idxCss && idxSideCss > idxJs && idxSideJs > idxSideCss,
    'mobile-drawer and nav-sidebar assets must load after design-system.css');
});

test('mobile-drawer.css and nav-sidebar.css have balanced braces', () => {
  assert.strictEqual((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length,
    'Unbalanced braces in mobile-drawer.css');
  assert.strictEqual((sideCss.match(/\{/g) || []).length, (sideCss.match(/\}/g) || []).length,
    'Unbalanced braces in nav-sidebar.css');
});

test('mobile-drawer.css separates desktop (>=961px), tablet (601-960px), mobile (<=600px), 320-360px, and landscape tiers', () => {
  assert.ok(css.includes('@media (max-width: 960px)'), 'Tablet/mobile breakpoint missing');
  assert.ok(css.includes('@media (max-width: 600px)'), 'Mobile phone breakpoint missing');
  assert.ok(css.includes('@media (max-width: 360px)'), 'Small phone 320-360px breakpoint missing');
  assert.ok(css.includes('@media (max-width: 960px) and (max-height: 520px)'), 'Landscape phone breakpoint missing');
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced motion media query missing');
  assert.ok(/#vr-mob-menu-btn,\s*#vr-mob-theme-btn,\s*\.vr-mob-sub,\s*#vr-drawer-backdrop,\s*#vr-drawer\s*\{\s*display:\s*none;\s*\}/.test(css),
    'Desktop layout must hide mobile drawer chrome');
  assert.ok(css.includes('width: clamp(276px, 87vw, 375px)'), 'Mobile drawer should use ~87% viewport width');
  assert.ok(css.includes('width: min(312px, 89vw)'), '320-360px drawer width should cap cleanly at ~89vw');
  assert.ok(css.includes('width: min(352px, 50vw)'), 'Tablet drawer should use adaptive width');
});

test('mobile-drawer.css and nav-sidebar.css match attached GUI specs (circular close, tinted headers, filled active bars, >=44px targets)', () => {
  assert.ok(css.includes('html.vr-drawer-open,\n  html.vr-drawer-open body {\n    overflow: hidden !important;'),
    'Background scroll lock missing');
  assert.ok(css.includes('min-height: 44px'), 'Touch targets >= 44px missing');
  assert.ok(css.includes('border-radius: 999px !important'), 'Circular close button missing');
  assert.ok(css.includes('.vr-acc-group.is-open > .vr-acc-trigger'), 'Tinted open section header missing');
  assert.ok(css.includes('.vr-nav-item[aria-current="page"] {\n    background: var(--ac) !important;\n    color: var(--ac2, #fff) !important;'),
    'Filled active item bar missing in mobile-drawer.css');

  assert.ok(sideCss.includes('@media (min-width: 961px)'), 'Desktop >=961px sidebar breakpoint missing');
  assert.ok(sideCss.includes('top: 0;\n    bottom: 0;\n    width: 256px;'), 'Full-height 256px desktop sidebar missing');
  assert.ok(sideCss.includes('.vr-side-grp.is-open > .vr-side-trg'), 'Desktop tinted open header missing');
  assert.ok(sideCss.includes('.vr-side-item[aria-current="page"] {\n    background: var(--ac);\n    color: var(--ac2, #fff);'),
    'Filled active item bar missing in nav-sidebar.css');
});

/* -------------------------------------------------------------------------
   2. Lightweight DOM + VM Harness for Behavioral Testing
   ------------------------------------------------------------------------- */
function makeHarness() {
  const listeners = new Map();
  const winListeners = new Map();
  const rootAttrs = { 'data-theme': 'light' };
  const rootClasses = new Set();

  function addListener(map, type, fn) {
    if (!map.has(type)) map.set(type, []);
    map.get(type).push(fn);
  }
  function dispatch(map, evt) {
    const arr = map.get(evt.type) || [];
    for (const fn of arr) fn(evt);
  }

  class MockElement {
    constructor(tag) {
      this.tagName = String(tag || 'div').toUpperCase();
      this.id = '';
      this.className = '';
      this.children = [];
      this.parentElement = null;
      this.attrs = {};
      this.hidden = false;
      this.disabled = false;
      this.value = '';
      this._text = '';
      this._innerHTML = '';
      this._listeners = {};
      this.style = {};
      this.classList = {
        add: (...cls) => {
          const cur = new Set(this.className.split(/\s+/).filter(Boolean));
          cls.forEach(c => cur.add(c));
          this.className = [...cur].join(' ');
        },
        remove: (...cls) => {
          const cur = new Set(this.className.split(/\s+/).filter(Boolean));
          cls.forEach(c => cur.delete(c));
          this.className = [...cur].join(' ');
        },
        toggle: (c, force) => {
          const has = this.classList.contains(c);
          const next = force === undefined ? !has : !!force;
          if (next) this.classList.add(c);
          else this.classList.remove(c);
          return next;
        },
        contains: (c) => this.className.split(/\s+/).filter(Boolean).includes(c)
      };
    }
    setAttribute(k, v) {
      const s = String(v);
      this.attrs[k] = s;
      if (k === 'id') this.id = s;
      if (k === 'class') this.className = s;
      if (k === 'hidden') this.hidden = true;
    }
    removeAttribute(k) {
      delete this.attrs[k];
      if (k === 'hidden') this.hidden = false;
    }
    getAttribute(k) {
      if (k === 'id' && this.id) return this.id;
      if (k === 'class' && this.className) return this.className;
      return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null;
    }
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
    }
    insertBefore(child, ref) {
      child.parentElement = this;
      const idx = ref ? this.children.indexOf(ref) : -1;
      if (idx >= 0) this.children.splice(idx, 0, child);
      else this.children.push(child);
      return child;
    }
    addEventListener(type, fn) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(fn);
    }
    focus() {
      doc.activeElement = this;
    }
    click() {
      if (typeof this.onclick === 'function') this.onclick({ target: this, preventDefault() {}, stopPropagation() {} });
      if (this._listeners.click) {
        for (const fn of this._listeners.click) fn({ target: this, preventDefault() {}, stopPropagation() {} });
      }
      let cur = this.parentElement;
      while (cur) {
        if (cur._listeners && cur._listeners.click) {
          for (const fn of cur._listeners.click) fn({ target: this, preventDefault() {}, stopPropagation() {} });
        }
        cur = cur.parentElement;
      }
      dispatch(listeners, {
        type: 'click',
        target: this,
        preventDefault() {},
        stopPropagation() {}
      });
    }
    matches(selList) {
      const sels = selList.split(',').map(s => s.trim()).filter(Boolean);
      return sels.some(sel => matchSimple(this, sel));
    }
    closest(selList) {
      let cur = this;
      while (cur) {
        if (cur.matches && cur.matches(selList)) return cur;
        cur = cur.parentElement;
      }
      return null;
    }
    querySelector(sel) {
      return this.querySelectorAll(sel)[0] || null;
    }
    querySelectorAll(selList) {
      const out = [];
      const walk = (el) => {
        for (const ch of el.children) {
          if (ch.matches(selList)) out.push(ch);
          walk(ch);
        }
      };
      walk(this);
      return out;
    }
    get textContent() {
      return this._text + this.children.map(c => c.textContent).join('');
    }
    set textContent(v) {
      this._text = String(v == null ? '' : v);
      this.children = [];
    }
    get innerHTML() {
      return this._innerHTML;
    }
    set innerHTML(val) {
      this._innerHTML = String(val || '');
      this.children = [];
      this._text = '';
      parseInto(this, this._innerHTML);
    }
  }

  function matchSinglePart(el, part) {
    if (!part) return true;
    let rest = part;
    const tagM = rest.match(/^([a-zA-Z0-9_-]+)/);
    if (tagM) {
      if (el.tagName.toLowerCase() !== tagM[1].toLowerCase()) return false;
      rest = rest.slice(tagM[0].length);
    }
    while (rest.length) {
      if (rest[0] === '#') {
        const m = rest.match(/^#([a-zA-Z0-9_-]+)/);
        if (!m || el.id !== m[1]) return false;
        rest = rest.slice(m[0].length);
      } else if (rest[0] === '.') {
        const m = rest.match(/^\.([a-zA-Z0-9_-]+)/);
        if (!m || !el.classList.contains(m[1])) return false;
        rest = rest.slice(m[0].length);
      } else if (rest[0] === '[') {
        const m = rest.match(/^\[([a-zA-Z0-9_-]+)(?:=["']([^"']*)["'])?\]/);
        if (!m) return false;
        const av = el.getAttribute(m[1]);
        if (m[2] !== undefined) {
          if (av !== m[2]) return false;
        } else {
          if (av === null && !(m[1] === 'hidden' && el.hidden)) return false;
        }
        rest = rest.slice(m[0].length);
      } else if (rest.startsWith(':not(')) {
        const end = rest.indexOf(')');
        const inner = rest.slice(5, end);
        if (matchSinglePart(el, inner)) return false;
        rest = rest.slice(end + 1);
      } else {
        return false;
      }
    }
    return true;
  }

  function matchSimple(el, sel) {
    const tokens = sel.trim().split(/\s+/);
    if (!matchSinglePart(el, tokens[tokens.length - 1])) return false;
    let cur = el.parentElement;
    for (let i = tokens.length - 2; i >= 0; i--) {
      if (tokens[i] === '>') {
        i--;
        if (!cur || !matchSinglePart(cur, tokens[i])) return false;
        cur = cur.parentElement;
        continue;
      }
      while (cur && !matchSinglePart(cur, tokens[i])) cur = cur.parentElement;
      if (!cur) return false;
      cur = cur.parentElement;
    }
    return true;
  }

  function parseAttrs(str, el) {
    const re = /([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let m;
    while ((m = re.exec(str))) {
      const k = m[1], v = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : ''));
      if (k === 'disabled') el.disabled = true;
      else if (k === 'hidden') el.hidden = true;
      else el.setAttribute(k, v);
    }
  }

  function parseInto(rootEl, htmlStr) {
    const stack = [rootEl];
    const tokenRe = /<(\/?)([a-zA-Z0-9-]+)([^>]*?)(\/?)>|([^<]+)/g;
    let m;
    while ((m = tokenRe.exec(htmlStr))) {
      const parent = stack[stack.length - 1];
      if (m[5] !== undefined) {
        const txt = m[5].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        parent._text += txt;
      } else if (m[1] === '/') {
        if (stack.length > 1) stack.pop();
      } else {
        const tag = m[2].toLowerCase();
        const el = new MockElement(tag);
        if (m[3]) parseAttrs(m[3], el);
        parent.appendChild(el);
        const selfClose = m[4] === '/' || ['input', 'line', 'circle', 'rect', 'polygon', 'polyline', 'path', 'br'].includes(tag);
        if (!selfClose && tag !== 'svg') {
          stack.push(el);
        } else if (tag === 'svg') {
          const closeIdx = htmlStr.indexOf('</svg>', tokenRe.lastIndex);
          if (closeIdx > -1) {
            el._innerHTML = htmlStr.slice(tokenRe.lastIndex, closeIdx);
            tokenRe.lastIndex = closeIdx + 6;
          }
        }
      }
    }
  }

  const body = new MockElement('body');
  body.innerHTML =
    '<div id="lg"></div>' +
    '<header class="hd"><div class="hdi">' +
      '<div class="brand"><div class="logo"></div><div><div class="wm">Vriddhi</div><div class="tg">Old</div></div></div>' +
      '<nav id="nav"><button data-t="Goal Planner">Goal</button><button data-t="Policies">Policies</button><button data-t="Stress Test">Stress Test</button></nav>' +
      '<div id="fhp"></div>' +
      '<span id="who">Aarav Adviser</span>' +
      '<div id="settings-menu-wrap"><div id="settings-menu"><button data-settings-tab="Settings">Settings</button></div></div>' +
      '<button id="so">Sign Out</button>' +
    '</div></header>' +
    '<main id="m">' +
      '<div class="rp2-nav">' +
        '<button data-gptab="Dashboard"><span aria-hidden="true">emoji</span><span>Summary</span></button>' +
        '<button data-gptab="Holdings"><span aria-hidden="true">emoji</span><span>View Holding</span></button>' +
        '<button data-vpp="list"><span aria-hidden="true">emoji</span><span>Policies</span></button>' +
        '<button data-vpp="rep"><span aria-hidden="true">emoji</span><span>Reports</span></button>' +
      '</div>' +
      '<button data-stab="plan">Plan</button>' +
      '<button data-stab="appearance">Appearance</button>' +
    '</main>' +
    '<dialog id="dg"></dialog>';

  const dgEl = body.querySelector('#dg');
  dgEl.showModal = function () { this.setAttribute('open', ''); this.open = true; };
  dgEl.close = function () { this.removeAttribute('open'); this.open = false; };

  const doc = {
    readyState: 'complete',
    body,
    activeElement: null,
    documentElement: {
      setAttribute: (k, v) => { rootAttrs[k] = String(v); },
      getAttribute: (k) => rootAttrs[k] || null,
      classList: {
        add: c => rootClasses.add(c),
        remove: c => rootClasses.delete(c),
        toggle: (c, force) => {
          const next = force === undefined ? !rootClasses.has(c) : !!force;
          if (next) rootClasses.add(c);
          else rootClasses.delete(c);
          return next;
        },
        contains: c => rootClasses.has(c)
      }
    },
    createElement: (t) => new MockElement(t),
    getElementById: (id) => body.querySelector('#' + id),
    querySelector: (sel) => body.querySelector(sel),
    querySelectorAll: (sel) => body.querySelectorAll(sel),
    addEventListener: (t, fn) => addListener(listeners, t, fn)
  };

  const calls = {
    rendered: [],
    policyOpened: [],
    stressOpened: [],
    settingsTabs: [],
    toasts: [],
    alerts: 0,
    pushedStates: [],
    historyBacks: 0,
    signedOut: 0,
    saved: 0,
    themed: 0,
    copied: []
  };

  body.querySelector('#so').onclick = () => { calls.signedOut++; };

  const store = new Map();
  const win = {
    innerWidth: 375,
    document: doc,
    history: {
      pushState: (s) => { calls.pushedStates.push(s); },
      back: () => { calls.historyBacks++; }
    },
    navigator: {
      clipboard: { writeText: (txt) => { calls.copied.push(txt); } }
    },
    localStorage: {
      getItem: (k) => store.has(k) ? store.get(k) : null,
      setItem: (k, v) => store.set(k, String(v))
    },
    VRMODULES: [{ tab: 'Policies' }, { tab: 'Stress Test' }],
    RPUI: { tab: 'status', rv: 'clients' },
    VRPolicyUI: { open: (p) => { calls.policyOpened.push(p); ctx.UI.tab = 'Policies'; } },
    StressTestUI: { open: (t) => { calls.stressOpened.push(t); ctx.UI.tab = 'Stress Test'; } },
    gppActiveName: () => 'Aarav Mehta',
    scrollTo: () => {},
    alert: () => { calls.alerts++; },
    addEventListener: (t, fn) => addListener(winListeners, t, fn)
  };

  const perms = {
    data: true,
    users: true,
    sections: {
      'Goal Planner': true,
      'Retirement planner': true,
      'Stress Test': true,
      'Policies': true,
      'Settings': true,
      'Users': true
    }
  };

  const ctx = {
    window: win,
    document: doc,
    localStorage: win.localStorage,
    navigator: win.navigator,
    UI: { tab: 'Dashboard', rv: 'year' },
    S: { theme: 'light', members: [{ name: 'Aarav Mehta' }], assets: [{ name: 'MF', value: 23200000 }] },
    VR_PROD: false,
    VR_ACCESS: null,
    calc: () => ({ rows: [{ tot: 23200000 }] }),
    f: (n) => '\u20B9 2,32,00,000',
    cr: (n) => '\u20B9 2.32 Cr',
    render: () => { calls.rendered.push({ tab: ctx.UI.tab, rv: ctx.UI.rv }); },
    save: () => { calls.saved++; },
    theme: () => {
      doc.documentElement.setAttribute('data-theme', ctx.S.theme);
      calls.themed++;
    },
    toast: (msg) => { calls.toasts.push(msg); },
    canOpenSection: (tab) => {
      if (tab === 'Dashboard' || tab === 'Holdings' || tab === 'Reports') return !!perms.sections['Goal Planner'];
      return perms.sections[tab] !== false;
    },
    canManageUsers: () => !!perms.users,
    canReadData: () => !!perms.data,
    console,
    setTimeout: (fn) => { fn(); return 1; },
    Date,
    JSON,
    Math,
    Array,
    Number,
    String
  };
  win.VR_PROD = ctx.VR_PROD;
  doc.addEventListener('click', (e) => {
    const t = e && e.target;
    const gp = t && t.closest && t.closest('[data-gptab]');
    if (gp) {
      ctx.UI.tab = gp.getAttribute('data-gptab');
      ctx.render();
    }
    const st = t && t.closest && t.closest('[data-stab]');
    if (st) {
      const val = st.getAttribute('data-stab');
      calls.settingsTabs.push(val);
      doc.querySelectorAll('[data-stab]').forEach(b => b.setAttribute('aria-selected', String(b === st)));
    }
    const sm = t && t.closest && t.closest('[data-settings-tab="Settings"]');
    if (sm) {
      ctx.UI.tab = 'Settings';
      ctx.render();
    }
  });
  vm.createContext(ctx);
  vm.runInContext(js, ctx);
  vm.runInContext(sideJs, ctx);

  return {
    doc,
    win,
    ctx,
    calls,
    perms,
    dispatchWin: (type) => dispatch(winListeners, { type }),
    dispatchKey: (key) => dispatch(listeners, { type: 'keydown', key, preventDefault() {}, stopPropagation() {} })
  };
}

test('builds the 5 accordion categories matching the GUI mockups with zero duplicate route IDs', () => {
  const h = makeHarness();
  const groups = h.win.VRMobileDrawer.getGroups();
  assert.deepStrictEqual(
    Array.from(groups, g => g.label),
    ['Goal Planner', 'Retirement Planner', 'Stress Test', 'Policies', 'Settings']
  );

  const ids = [];
  for (const g of groups) {
    for (const it of g.items) ids.push(it.id);
  }
  assert.strictEqual(new Set(ids).size, ids.length, 'Every route ID across all 5 groups must be unique');
  assert.ok(ids.includes('pol:list') && ids.includes('pol:rep'), 'Policies and Policy reports must both exist');
  assert.ok(ids.includes('set:plan') && ids.includes('set:appearance') && ids.includes('set:Help'),
    'Settings items must include Plan, Appearance, and Help & FAQ');

  h.win.VRMobileDrawer.open();
  const subhd = h.doc.querySelector('#vr-drawer .vr-acc-subhd');
  assert.ok(subhd && subhd.textContent === 'Reports', 'Goal Planner mobile drawer renders Reports subheader');
});

test('mobile drawer keeps categories collapsed except active category and switches single-open without navigating', () => {
  const h = makeHarness();
  h.ctx.UI.tab = 'Reports';
  h.ctx.UI.rv = 'vdate';

  h.win.VRMobileDrawer.open();
  assert.ok(h.doc.documentElement.classList.contains('vr-drawer-open'), 'Scroll-lock class added on open');

  const triggers = h.doc.querySelectorAll('[data-vr-acc]');
  const openIds = triggers.filter(b => b.getAttribute('aria-expanded') === 'true').map(b => b.getAttribute('data-vr-acc'));
  assert.deepStrictEqual(openIds, ['goal'], 'Only the active category (goal) opens by default');

  const currentBtns = h.doc.querySelectorAll('.vr-nav-item[aria-current="page"]');
  assert.strictEqual(currentBtns.length, 1);
  assert.strictEqual(currentBtns[0].getAttribute('data-vr-nav'), 'rv:vdate');

  const navBefore = h.calls.rendered.length;
  h.doc.querySelector('[data-vr-acc="retire"]').click();
  const openAfter = h.doc.querySelectorAll('[data-vr-acc]')
    .filter(b => b.getAttribute('aria-expanded') === 'true')
    .map(b => b.getAttribute('data-vr-acc'));
  assert.deepStrictEqual(openAfter, ['retire'], 'Expanding another category collapses the previous one');
  assert.strictEqual(h.calls.rendered.length, navBefore, 'Clicking accordion header must not navigate');

  h.doc.querySelector('[data-vr-acc="retire"]').click();
  const openNone = h.doc.querySelectorAll('[data-vr-acc]').filter(b => b.getAttribute('aria-expanded') === 'true');
  assert.strictEqual(openNone.length, 0, 'Clicking open category collapses it');
});

test('navigates accurately across Reports, Policies, Stress Test, and Settings sub-tabs and auto-closes drawer', () => {
  const h = makeHarness();
  h.win.VRMobileDrawer.open();

  h.doc.querySelector('[data-vr-nav="pol:rep"]').click();
  assert.deepStrictEqual(Array.from(h.calls.policyOpened), ['rep'], 'Policy Reports navigates via VRPolicyUI.open("rep")');
  assert.ok(!h.doc.documentElement.classList.contains('vr-drawer-open'), 'Drawer auto-closes on navigation');

  h.win.VRMobileDrawer.open();
  h.doc.querySelector('[data-vr-nav="st:scenarios"]').click();
  assert.deepStrictEqual(Array.from(h.calls.stressOpened), ['scenarios'], 'Stress Scenarios routes cleanly');
  assert.ok(!h.doc.documentElement.classList.contains('vr-drawer-open'), 'Drawer auto-closes after Stress Test route');

  h.win.VRMobileDrawer.open();
  h.doc.querySelector('[data-vr-nav="set:appearance"]').click();
  assert.strictEqual(h.ctx.UI.tab, 'Settings');
  assert.ok(h.calls.settingsTabs.includes('appearance'), 'Settings > Appearance selects data-stab="appearance"');
});

test('displays stacked Available funds card in drawer header and routes to Holdings when tapped', () => {
  const h = makeHarness();
  h.win.VRMobileDrawer.open();
  const fundsBtn = h.doc.getElementById('vr-drawer-funds');
  assert.ok(fundsBtn, 'Available funds card exists in drawer header');
  assert.strictEqual(fundsBtn.querySelector('.vr-funds-k').textContent, 'Available funds');
  assert.strictEqual(fundsBtn.querySelector('.vr-funds-val').textContent, '\u20B9 2,32,00,000');

  fundsBtn.click();
  assert.strictEqual(h.ctx.UI.tab, 'Holdings');
  assert.ok(!h.doc.documentElement.classList.contains('vr-drawer-open'));
});

test('handles Android back button (popstate), scrim tap, Escape, and desktop resize (>960px)', () => {
  const h = makeHarness();

  h.win.VRMobileDrawer.open();
  assert.strictEqual(h.calls.pushedStates.length, 1, 'Opening drawer pushes history state');
  h.dispatchWin('popstate');
  assert.ok(!h.doc.documentElement.classList.contains('vr-drawer-open'), 'popstate closes drawer cleanly');

  h.win.VRMobileDrawer.open();
  h.doc.getElementById('vr-drawer-backdrop').click();
  assert.ok(!h.doc.documentElement.classList.contains('vr-drawer-open'), 'Backdrop tap closes drawer');

  h.win.VRMobileDrawer.open();
  h.dispatchKey('Escape');
  assert.ok(!h.doc.documentElement.classList.contains('vr-drawer-open'), 'Escape closes drawer');

  h.win.VRMobileDrawer.open();
  h.win.innerWidth = 820;
  h.dispatchWin('resize');
  assert.ok(h.doc.documentElement.classList.contains('vr-drawer-open'), 'Drawer remains open at tablet width 820px');
  h.win.innerWidth = 1024;
  h.dispatchWin('resize');
  assert.ok(!h.doc.documentElement.classList.contains('vr-drawer-open'), 'Drawer closes on resize to desktop >=961px');
});

test('mobile drawer 1-row footer (Help, Feedback, Sign out) and top-bar theme toggle work without window.alert', () => {
  const h = makeHarness();
  assert.ok(h.doc.getElementById('vr-drawer-help'));
  assert.ok(h.doc.getElementById('vr-drawer-feedback'));
  assert.ok(h.doc.getElementById('vr-drawer-signout'));

  // Feedback & Support modal
  h.win.VRMobileDrawer.open();
  h.doc.getElementById('vr-drawer-feedback').click();
  const dg = h.doc.getElementById('dg');
  assert.strictEqual(dg.open, true, 'Feedback opens inside #dg dialog');
  h.doc.getElementById('vr-copy-mail').click();
  assert.deepStrictEqual(Array.from(h.calls.copied), ['support@vriddhi.app']);
  h.doc.getElementById('vr-fb-msg').value = 'Matches mockup well';
  dg.querySelector('#vr-fb-form').onsubmit({ preventDefault() {} });
  assert.strictEqual(dg.open, false);
  assert.ok(h.calls.toasts.some(t => /feedback/i.test(t)), 'Feedback shows toast');

  // Footer Help & Sign out
  h.win.VRMobileDrawer.open();
  h.doc.getElementById('vr-drawer-help').click();
  assert.strictEqual(h.ctx.UI.tab, 'Help');

  h.win.VRMobileDrawer.open();
  h.doc.getElementById('vr-drawer-signout').click();
  assert.strictEqual(h.calls.signedOut, 1);

  // Quick header theme toggle
  h.doc.getElementById('vr-mob-theme-btn').click();
  assert.strictEqual(h.doc.documentElement.getAttribute('data-theme'), 'dark');
  assert.strictEqual(h.calls.alerts, 0, 'Must never call window.alert');
});

test('desktop sidebar renders 5 sections, REPORTS subheader, breadcrumb, single-open accordion, and Help · Sign out footer', () => {
  const h = makeHarness();
  h.ctx.UI.tab = 'Reports';
  h.ctx.UI.rv = 'year';
  h.win.VRNavSidebar.refresh();

  assert.ok(h.doc.documentElement.classList.contains('vr-side-on'), 'Desktop sidebar enabled when signed in');
  const side = h.doc.getElementById('vr-side');
  assert.ok(side && !side.hidden, 'Sidebar rendered and visible');

  // Breadcrumb matches mockup: Goal Planner › Reports › Annual projection
  const bc = h.doc.getElementById('vr-side-bc');
  assert.ok(bc && bc.textContent.includes('Goal Planner') && bc.textContent.includes('Reports') && bc.textContent.includes('Annual projection'),
    'Desktop breadcrumb renders active hierarchy');

  // Subheader REPORTS inside Goal Planner
  const subhd = side.querySelector('.vr-side-subhd');
  assert.ok(subhd && subhd.textContent === 'Reports', 'Desktop Goal Planner renders Reports subheader');

  // Single open section (goal) & filled active bar
  const openTrgs = side.querySelectorAll('[data-side-acc]').filter(b => b.getAttribute('aria-expanded') === 'true');
  assert.strictEqual(openTrgs.length, 1);
  assert.strictEqual(openTrgs[0].getAttribute('data-side-acc'), 'goal');
  const curItem = side.querySelector('.vr-side-item[aria-current="page"]');
  assert.ok(curItem && curItem.getAttribute('data-side-nav') === 'rv:year');

  // Toggle Stress Test accordion without navigating
  const rendersBefore = h.calls.rendered.length;
  side.querySelector('[data-side-acc="stress"]').click();
  const openNow = side.querySelectorAll('[data-side-acc]')
    .filter(b => b.getAttribute('aria-expanded') === 'true')
    .map(b => b.getAttribute('data-side-acc'));
  assert.deepStrictEqual(openNow, ['stress'], 'Desktop accordion opens one section at a time');
  assert.strictEqual(h.calls.rendered.length, rendersBefore, 'Accordion click does not navigate');

  // Sidebar footer Advisor name, Help, and Sign out
  assert.strictEqual(h.doc.getElementById('vr-side-who').textContent, 'Aarav Adviser');
  assert.strictEqual(side.querySelector('.vr-side-av').textContent, 'A');
  h.doc.getElementById('vr-side-help').click();
  assert.strictEqual(h.ctx.UI.tab, 'Help');
  h.doc.getElementById('vr-side-so').click();
  assert.strictEqual(h.calls.signedOut, 1);

  // Login dialog hides sidebar
  h.doc.getElementById('lg').classList.add('on');
  h.win.VRNavSidebar.refresh();
  assert.ok(!h.doc.documentElement.classList.contains('vr-side-on'), 'Sidebar disabled on sign-in page');
});

test('enforces RBAC permissions on shared accordion groups and replaces bottom dock emoji icons', () => {
  const h = makeHarness();
  h.perms.sections['Policies'] = false;
  h.perms.sections['Retirement planner'] = false;
  h.perms.sections['Stress Test'] = false;
  h.perms.users = false;

  const restricted = h.win.VRMobileDrawer.getGroups().map(g => g.id);
  assert.ok(!restricted.includes('policy'), 'Policies hidden when denied');
  assert.ok(!restricted.includes('retire'), 'Retirement Planner hidden when denied');
  assert.ok(!restricted.includes('stress'), 'Stress Test hidden when denied');
  assert.ok(!h.win.VRMobileDrawer.getGroups().find(g => g.id === 'settings').items.some(i => i.id === 'set:Users'),
    'Users hidden without manage_users');

  const spans = h.doc.querySelectorAll('#m .rp2-nav button > span[data-vr-svg="1"]');
  assert.strictEqual(spans.length, 4, 'All 4 bottom nav buttons (including Policies) get SVG icons');
  spans.forEach(sp => {
    assert.ok(sp._innerHTML.includes('stroke-width="1.75"'), 'Icon uses uniform stroke-width=1.75');
  });
});

console.log(`All ${passed} navigation tests passed.`);
