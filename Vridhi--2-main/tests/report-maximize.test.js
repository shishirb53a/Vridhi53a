#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules', 'report-maximize', 'report-maximize.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const landingStyles = fs.readFileSync(path.join(root, 'modules', 'landing', 'landing.css'), 'utf8');
const moduleScript = html.indexOf('<script src="modules/report-maximize/report-maximize.js?v=136"></script>');
const reportMarkup = html.indexOf('<script id="vr-rep-max">');
const bodyEnd = html.indexOf('</body>');
assert.ok(moduleScript >= 0 && bodyEnd > moduleScript, 'Report maximize module loads before the document ends');
assert.ok(reportMarkup < 0, 'Report maximize logic is no longer duplicated inline');
assert.ok(landingStyles.includes('#rp-max') && landingStyles.includes('#fh-max') && landingStyles.includes('#hy-max'), 'Existing maximize controls remain styled');
assert.ok(source.includes("m.querySelector('[data-rpx]')"), 'Report maximize control targets the report card header');

const listeners = {};
const stored = new Map([['vr-rep-max', '0']]);
let rafCallback;
const rpr = {
  children: [],
  appendChild(button) { this.children.push(button); },
  contains(button) { return this.children.includes(button); }
};
const mainClasses = {};
const main = {
  classList: { toggle(name, value) { mainClasses[name] = value; }, remove(name) { delete mainClasses[name]; }, contains(name) { return !!mainClasses[name]; } },
  querySelector(selector) { return selector === '[data-rpx]' ? rpr : null; },
  style: { getPropertyValue() { return ''; }, setProperty() {} }
};
class MutationObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
}
const document = {
  body: {},
  addEventListener(name, callback) { listeners[name] = callback; },
  createElement() {
    return {
      dataset: {},
      setAttribute() {},
      className: '',
      id: '',
      type: '',
      innerHTML: ''
    };
  },
  getElementById(id) { return id === 'm' ? main : rpr.children.find(button => button.id === id) || null; },
  querySelector() { return null; }
};
const context = {
  document,
  MutationObserver,
  localStorage: {
    getItem(key) { return stored.get(key) || null; },
    setItem(key, value) { stored.set(key, value); }
  },
  getComputedStyle() { return { backgroundColor: 'rgb(255, 255, 255)' }; },
  requestAnimationFrame(callback) { rafCallback = callback; return 1; }
};
vm.createContext(context);
vm.runInContext(source, context);

assert.ok(listeners.click && listeners.keydown && listeners.close, 'Maximize controls retain click, Escape, and dialog-close handling');
assert.strictEqual(typeof rafCallback, 'function', 'Initial report synchronization is queued');
assert.strictEqual(stored.get('vr-rep-max'), '0', 'Existing maximize preference is read without being overwritten on startup');
rafCallback();
assert.strictEqual(rpr.children.length, 1, 'Goal Planner report card header receives a maximize control');
assert.strictEqual(rpr.children[0].id, 'rp-max', 'The control is inserted beside the Copy as CSV icon in the report card');
assert.strictEqual(mainClasses['vr-rmax'], false, 'The Goal Planner report view starts restored when its preference is off');

let prevented = false, stopped = false;
const button = { id: 'rp-max' };
listeners.click({
  target: { closest: selector => selector.includes(button.id) ? button : null },
  preventDefault() { prevented = true; },
  stopPropagation() { stopped = true; }
});
assert.ok(prevented && stopped, 'Maximize click is handled without triggering surrounding controls');
assert.strictEqual(stored.get('vr-rep-max'), '1', 'Click toggles and persists the shared maximize preference');
assert.strictEqual(mainClasses['vr-rmax'], true, 'Goal Planner report view maximizes from its card header control');
assert.strictEqual(rpr.children.length, 1, 'Toggling keeps a single maximize control in the card header');

console.log('  ok   report maximize module preserves preference and event handling');
