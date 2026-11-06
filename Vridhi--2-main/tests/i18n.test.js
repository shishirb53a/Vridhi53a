#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules', 'i18n', 'i18n.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const moduleScript = html.indexOf('<script src="modules/i18n/i18n.js?v=132"></script>');
const mainRenderer = html.indexOf('<script src="modules/app-core/app.js?v=165"></script>');
assert.ok(moduleScript >= 0 && mainRenderer > moduleScript, 'Localization loads before the main app renderer');
assert.ok(!html.includes('i18n: English text is the key'), 'Localization code is no longer duplicated inline');

class Element {
  constructor() { this.inserted = ''; }
  insertAdjacentHTML(position, value) { this.inserted = value; }
}
Object.defineProperty(Element.prototype, 'innerHTML', {
  configurable: true,
  get() { return this.value || ''; },
  set(value) { this.value = value; }
});

const context = { Element, S: { lang: 'hi' }, document: {}, window: {} };
vm.createContext(context);
vm.runInContext(source, context);

assert.strictEqual(vm.runInContext("LANGS.map(x => x[0]).join(',')", context), 'en,hi', 'Available languages remain exposed');
assert.strictEqual(vm.runInContext("tr('Goal Planner')", context), 'लक्ष्य योजनाकार', 'Hindi dictionary translations remain available');
assert.strictEqual(vm.runInContext("tr('Modules')", context), 'मॉड्यूल', 'Navigation dropdown labels remain translated');
assert.strictEqual(vm.runInContext("tr('Dashboard')", context), 'डैशबोर्ड', 'Common UI labels remain translated');
assert.strictEqual(vm.runInContext("tr('Add client')", context), 'क्लाइंट जोड़ें', 'New client action is translated');
assert.strictEqual(vm.runInContext("tr('Search clients')", context), 'क्लाइंट खोजें', 'Client search is translated');
assert.strictEqual(vm.runInContext("tr('Annual')", context), 'वार्षिक', 'Report tab labels are translated');
assert.strictEqual(vm.runInContext("tr('Priya added')", context), 'Priya जोड़ा गया', 'Person-added toast remains translated');

const element = new Element();
element.innerHTML = '<button>Goal Planner</button>';
assert.strictEqual(element.innerHTML, '<button>लक्ष्य योजनाकार</button>', 'innerHTML hook translates newly rendered markup');
element.insertAdjacentHTML('beforeend', '<span>Dashboard</span>');
assert.strictEqual(element.inserted, '<span>डैशबोर्ड</span>', 'insertAdjacentHTML hook translates appended markup');
console.log('  ok   localization module preserves dictionary and HTML translation hooks');
