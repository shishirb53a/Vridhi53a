#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules', 'ui-pagination', 'ui-pagination.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appCore = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const mainRenderer = appCore.indexOf('function render(){');
const moduleScript = html.indexOf('<script src="modules/ui-pagination/ui-pagination.js?v=135"></script>');
const appCoreTag = html.indexOf('<script src="modules/app-core/app.js?v=165"></script>');
assert.ok(mainRenderer >= 0 && appCoreTag >= 0 && moduleScript > appCoreTag, 'Pagination module loads after app rendering globals');
assert.ok(!html.includes("var PGS='auto'"), 'Pagination logic is no longer duplicated inline');

const listeners = {};
const removedSelectors = [];
const m = {
  querySelectorAll(selector) {
    removedSelectors.push(selector);
    return [];
  }
};
const document = {
  documentElement: { dataset: {}, scrollHeight: 800 },
  addEventListener(name, callback) { listeners[name] = callback; },
  querySelector(selector) {
    if (selector === 'nav button[aria-current=page]') return { textContent: 'Dashboard' };
    return null;
  },
  getElementById(id) { return id === 'm' ? m : null; }
};
const observers = [];
let storedPageSize;
class MutationObserver {
  constructor(callback) { this.callback = callback; observers.push(this); }
  observe() {}
  takeRecords() { return []; }
}
const context = {
  document,
  window: {},
  UI: { tab: 'Dashboard' },
  SET: [],
  localStorage: { getItem() { return 'auto'; }, setItem(key, value) { storedPageSize = [key, value]; } },
  MutationObserver,
  addEventListener(name, callback) { listeners['window:' + name] = callback; },
  requestAnimationFrame(callback) { callback(); return 1; },
  cancelAnimationFrame() {},
  innerHeight: 700
};
vm.createContext(context);
vm.runInContext(source, context);

assert.strictEqual(document.documentElement.dataset.vt, 'Dashboard', 'Startup records the visible screen for responsive styles');
assert.ok(listeners.click && listeners.input && listeners.change, 'Pagination and filter event handlers are registered');
assert.ok(listeners['window:resize'], 'Screen fitting responds to viewport changes');
assert.strictEqual(observers.length, 1, 'Dynamic content changes are observed');
assert.ok(removedSelectors.includes('.vpg') && removedSelectors.includes('.vsub'), 'Startup clears stale pager and section controls');
listeners.change({ target: { dataset: { pgs: '25' }, value: '25' } });
assert.deepStrictEqual(storedPageSize, ['fwt2-pgs', '25'], 'Page-size changes persist the selected setting');

console.log('  ok   section sizing and pagination module initializes and wires its UI events');
