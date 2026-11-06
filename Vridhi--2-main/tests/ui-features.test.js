#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dashboardSource = fs.readFileSync(path.join(root, 'modules', 'dashboard-preferences', 'dashboard-preferences.js'), 'utf8');
const wizardSource = fs.readFileSync(path.join(root, 'modules', 'holding-form-wizard', 'wizard.js'), 'utf8');
const categorySource = fs.readFileSync(path.join(root, 'modules', 'categories', 'categories.js'), 'utf8');

const mainReady = html.indexOf('<script src="modules/app-core/app.js?v=165"></script>');
const mainCoreSource = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const dashboardTag = '<script src="modules/dashboard-preferences/dashboard-preferences.js?v=141"></script>';
const wizardTag = '<script src="modules/holding-form-wizard/wizard.js?v=140"></script>';
const categoryTag = '<script src="modules/categories/categories.js?v=140"></script>';
const dashboardPosition = html.indexOf(dashboardTag);
const wizardPosition = html.indexOf(wizardTag);
const categoryPosition = html.indexOf(categoryTag);
assert.ok(mainReady >= 0 && dashboardPosition > mainReady && wizardPosition > dashboardPosition &&
  mainCoreSource.includes('setTimeout(startApp,250);'),
  'Dashboard preferences and wizard load after app globals in their original order');
assert.ok(categoryPosition > html.indexOf('<script src="modules/reports/report-selection.js?v=139"></script>'),
  'Category management loads after the category and report dependencies');
for (const tag of [dashboardTag, wizardTag, categoryTag]) {
  const position = html.indexOf(tag);
  assert.ok(position >= 0 && html.indexOf(tag, position + tag.length) < 0, `${tag} is included only once`);
}
assert.ok(html.includes('modules/dashboard-preferences/dashboard-preferences.css?v=140'));
assert.ok(html.includes('modules/holding-form-wizard/wizard.css?v=140'));
assert.ok(html.includes('modules/categories/categories.css?v=140'));
assert.ok(!html.includes("var N=['Details','Contribution','Interest','Preview','Notes'];"), 'Investment wizard logic is no longer inline');
assert.ok(!html.includes("const DASH=[['hero','Summary header']"), 'Dashboard section ordering is no longer inline');
assert.ok(!html.includes('let names=[],editing=null,fromForm=false,created=null,pend=null;'), 'Category management is no longer inline');

function wizardNavigationTest() {
  const listeners = {};
  const tabs = [1, 2, 3, 4, 5].map(step => ({
    attributes: { 'data-wzs': String(step) },
    getAttribute(name) { return this.attributes[name]; },
    setAttribute(name, value) { this.attributes[name] = value; }
  }));
  const form = {
    step: '1',
    setAttribute(name, value) { if (name === 'data-wz') this.step = String(value); },
    getAttribute(name) { return name === 'data-wz' ? this.step : null; },
    querySelectorAll(selector) { return selector === '[data-wzs]' ? tabs : []; }
  };
  const document = {
    body: {},
    addEventListener(name, callback) { (listeners[name] ||= []).push(callback); },
    querySelector() { return null; }
  };
  const context = {
    document,
    MutationObserver: class { observe() {} },
    requestAnimationFrame(callback) { callback(); }
  };
  vm.createContext(context);
  vm.runInContext(wizardSource, context, { filename: 'wizard.js' });

  const next = {
    hasAttribute(name) { return name === 'data-wzn'; },
    closest(selector) { return selector === 'form' ? form : null; }
  };
  let prevented = false;
  listeners.click[0]({
    target: { closest(selector) { return selector === '[data-wzs],[data-wzb],[data-wzn]' ? next : null; } },
    preventDefault() { prevented = true; }
  });
  assert.strictEqual(form.step, '2', 'Next advances one wizard step');
  assert.strictEqual(tabs[1].attributes['aria-selected'], 'true', 'The active wizard tab is updated');
  assert.strictEqual(tabs[1].tabIndex, 0, 'The active wizard tab remains keyboard-focusable');
  assert.ok(prevented, 'Wizard navigation does not submit the form');
}

function categorySyncTest() {
  const CATS0 = ['Equity', 'Other'];
  const CATS = CATS0.slice();
  const CC = {};
  const S = { cats: [{ n: 'Real estate', c: '#abcdef' }], hide: ['Cash'], assets: [] };
  const context = {
    window: null,
    S,
    CATS0,
    CATS,
    CC,
    cleanCats(value) { return Array.isArray(value) ? value : []; },
    cleanHide(value) { return Array.isArray(value) ? value : []; },
    applyCats(categories, hidden) {
      CATS.splice(0, CATS.length, 'Equity', ...categories.map(category => category.n), 'Other');
      CATS.splice(CATS.indexOf('Other'), 0, ...hidden);
    },
    document: { addEventListener() {} }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(categorySource, context, { filename: 'categories.js' });

  assert.deepStrictEqual(Array.from(CATS), ['Equity', 'Real estate', 'Cash', 'Other'],
    'Category synchronization updates the category list with restored categories');
  assert.strictEqual(CC['Real estate'], '#abcdef', 'Custom category colors are synchronized');
  assert.strictEqual(typeof context.window.syncCats, 'function', 'The existing category sync interface remains available');
}

function dashboardPreferenceTest() {
  const listeners = {};
  const rootElement = { dataset: {} };
  const stored = new Map();
  stored.set('fwt3-order', JSON.stringify(['alloc', 'hero', 'status', 'plan', 'insights']));
  const styles = [];
  const document = {
    body: { dataset: {} },
    documentElement: rootElement,
    head: { appendChild() {} },
    createElement() { const style = { textContent: '' }; styles.push(style); return style; },
    addEventListener(name, callback, capture) { (listeners[name] ||= []).push({ callback, capture }); },
    getElementById() { return null; }
  };
  let renders = 0, allocationRefreshes = 0;
  const context = {
    document,
    window: null,
    UI: { tab: 'Dashboard', ab: 'now' },
    S: {},
    PALS: [],
    localStorage: {
      getItem(key) { return stored.get(key) || null; },
      setItem(key, value) { stored.set(key, value); }
    },
    MutationObserver: class { observe() {} },
    render() { renders++; },
    theme() {},
    save() {},
    toast() {},
    dupd() { allocationRefreshes++; }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(dashboardSource, context, { filename: 'dashboard-preferences.js' });

  assert.ok(context.lookUI().includes('data-ui="uth"') &&
    context.lookUI().includes('data-ui="utl"') &&
    context.lookUI().includes('data-ui="utc"'),
  'Appearance controls include configurable row and column table lines');
  const orderStyle = styles.find(style => style.textContent.includes('#dsh>[data-sec="alloc"],#dsh #d2>[data-sec="alloc"]{order:0}'));
  assert.ok(orderStyle && orderStyle.textContent.indexOf('alloc"]{order:0}') < orderStyle.textContent.indexOf('hero"]{order:1}'),
    'Saved dashboard section order is applied through its stylesheet');
  const change = listeners.change.find(listener => listener.capture);
  change.callback({ target: { id: 'u_uth', dataset: { ui: 'uth' }, value: 'ocean' }, stopPropagation() {} });
  assert.strictEqual(rootElement.dataset.uth, 'ocean', 'Appearance changes apply to the root data attributes');
  change.callback({ target: { id: 'u_utc', dataset: { ui: 'utc' }, value: 'off' }, stopPropagation() {} });
  assert.strictEqual(rootElement.dataset.utc, 'off', 'Column line preference applies to the root data attributes');
  const allocation = listeners.click[0];
  allocation.callback({
    target: {
      closest(selector) {
        return selector === '[data-ab]' ? { dataset: { ab: 'ret' } } : null;
      }
    }
  });
  assert.strictEqual(context.UI.ab, 'ret', 'Dashboard allocation controls update the selected view');
  assert.strictEqual(allocationRefreshes, 1, 'Dashboard allocation changes refresh the visualization');
  assert.ok(typeof context.window.render === 'function' && renders === 0, 'Preference module preserves the app render interface');
}

wizardNavigationTest();
categorySyncTest();
dashboardPreferenceTest();
console.log('  ok   extracted investment wizard, categories, and dashboard preferences retain their interfaces');
