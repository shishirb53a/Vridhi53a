#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules', 'goal-planner-clients', 'goal-planner-clients.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appCore = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const keysPosition = appCore.indexOf('const GPP_KEYS=');
const retirementUI = html.indexOf('<script src="modules/retirement-planner/ui.js?v=151"></script>');
const moduleSourceTag = '<script src="modules/goal-planner-clients/goal-planner-clients.js?v=143"></script>';
const moduleTag = html.indexOf(moduleSourceTag);
const appCoreTag = html.indexOf('<script src="modules/app-core/app.js?v=165"></script>');
assert.ok(keysPosition >= 0 && appCoreTag >= 0 && retirementUI > appCoreTag && moduleTag > retirementUI, 'Profile module loads after its state keys and planner dependencies');
assert.strictEqual(html.indexOf(moduleSourceTag, moduleTag + moduleSourceTag.length), -1, 'Profile module is included only once');
assert.ok(!html.includes('Goal Planner clients (build 84):'), 'Profile manager logic is no longer inline');

const keys = ['members', 'start', 'end', 'ret', 'retP', 'hor', 'goal', 'link', 'grat', 'assets', 'policies'];
function snapshot(name, value, goal) {
  const data = {
    members: [{ id: 1, name, role: 'Self', age: 40 }],
    start: 2026,
    end: 2045,
    ret: 58,
    retP: 58,
    hor: 6,
    goal,
    link: false,
    grat: { basic: 0, svc: 0, rem: 0, cap: 0 },
    assets: [{ id: 1, name: 'Fund', cat: 'Equity', value, add: 0, ret: 0.06, type: 'fund' }],
    policies: []
  };
  return data;
}
const active = snapshot('Asha', 1000, 100000);
active.members.push({ id: 2, name: 'Bina', role: 'Spouse', age: 38 });
const other = snapshot('Bina', 2000, 200000);
const state = Object.assign({}, active, {
  gpp: {
    active: 'asha',
    profiles: {
      asha: { name: 'Asha', d: JSON.parse(JSON.stringify(active)), created: 1 },
      bina: { name: 'Bina', d: JSON.parse(JSON.stringify(other)), created: 2 }
    }
  }
});
const listeners = {};
const elements = {
  'gpp-n': { value: '', focus() {}, select() {} },
  'gpp-e': { textContent: '' },
  'gpp-drawer-overlay': { hidden: true, classList: { toggle() {}, remove() {} } },
  'gpp-sel': { focused: false, attributes: {}, focus() { this.focused = true; }, setAttribute(key, value) { this.attributes[key] = value; } }
};
const body = {
  appended: [],
  appendChild(element) { this.appended.push(element); elements[element.id] = element; }
};
const closeButton = { focus() { context.document.activeElement = this; } };
const drawerDialog = { focus() {}, querySelectorAll() { return [closeButton]; } };
const dialog = {
  innerHTML: '', className: '', open: false, listeners: {},
  addEventListener(name, callback) { this.listeners[name] = callback; },
  showModal() { this.open = true; },
  close() { this.open = false; if (this.listeners.close) this.listeners.close(); }
};
let renderCount = 0, saves = 0, confirmation, toastMessage;
const context = {
  window: null,
  S: state,
  UI: { tab: 'Dashboard', rv: null, q: 'filter', cat: 'Equity', sel: 4, rq: 'search', rsel: ['1'], rcl: ['Equity'] },
  GPP_KEYS: keys,
  ROLES: ['Self', 'Spouse', 'Child', 'Parent', 'Other'],
  DEF() {
    return {
      start: 2026, end: 2049, ret: 58, retP: 58, hor: 6, goal: 50000000,
      members: [{ age: 40 }], assets: []
    };
  },
  MB(id, name, role, age) { return { id, name, role, age }; },
  save() { saves++; if (context.window.gppSync) context.window.gppSync(); },
  render() { renderCount++; },
  calc(plan) { return { rows: [{ v: plan.assets.map(asset => asset.value) }] }; },
  ctx() {
    return { r0: { tot: context.S.assets[0].value }, rr: { tot: 250000, year: 2044 }, G: context.S.goal, yr: 18, tm: 120 };
  },
  cr(value) { return '₹ ' + value; },
  esc(value) { return String(value); },
  document: {
    addEventListener(name, callback) { listeners[name] = callback; },
    getElementById(id) { return elements[id] || null; },
    createElement(tagName) { return { tagName, id: '', innerHTML: '' }; },
    body,
    querySelector(selector) { return selector === '.gpp-close' ? closeButton : null; },
    querySelectorAll() { return []; },
    activeElement: null
  },
  dg: dialog,
  toast(message) { toastMessage = message; },
  confirmBox(message, callback) { confirmation = { message, callback }; },
  rvTog() { return '<div class="report-toggle"></div>'; },
  scrollTo() {},
  matchMedia() { return { matches: false }; },
  setTimeout(callback) { callback(); return 1; },
  clearTimeout() {},
  Date,
  JSON,
  Object,
  Array,
  String,
  Number,
  Math
};
elements['gpp-drawer'] = drawerDialog;
context.window = context;
vm.createContext(context);
vm.runInContext(source, context);

assert.strictEqual(context.UI.rv, 'year', 'The removed Clients page is not the initial Reports view');
assert.strictEqual(typeof context.gppSync, 'function', 'Profile state sync remains exposed');
const headerMarkup = context.gppBarHTML(true);
const drawerMarkup = elements['gpp-drawer-portal'].innerHTML;
assert.ok(headerMarkup.includes('data-gpp-drawer-trigger') &&
  !headerMarkup.includes('role="dialog"') &&
  drawerMarkup.includes('role="dialog"') &&
  drawerMarkup.includes('Asha') && drawerMarkup.includes('Bina'),
'Accessible client drawer is mounted outside the filtered header');
assert.ok(drawerMarkup.includes('role="progressbar"') &&
  drawerMarkup.includes('data-gpp="switch:asha"') &&
  drawerMarkup.includes('aria-describedby="gpp-delete-reason-asha"') &&
  drawerMarkup.includes("You can't delete the active client"),
'Client cards retain progress, switch controls, and a reason for disabled active-client deletion');
context.gppBarHTML(true);
assert.strictEqual(body.appended.length, 1, 'Drawer portal is reused across header rerenders');
assert.ok(context.gppHeroInner().includes('Asha'), 'Goal Planner hero reflects the active profile');
assert.strictEqual(context.gppHoldingList().length, 2, 'Read-only holdings summary includes every profile');
assert.strictEqual(context.gppHoldingList()[1].items[0].val, 2000, 'Holdings summary uses each profile plan');
listeners.click({
  target: { closest(selector) { return selector === '[data-gpp-drawer-trigger]' ? elements['gpp-sel'] : null; } }
});
assert.strictEqual(elements['gpp-drawer-overlay'].hidden, false, 'Header client chip opens the drawer');
assert.strictEqual(elements['gpp-sel'].attributes['aria-expanded'], 'true', 'Header chip reflects drawer state');
assert.strictEqual(context.document.activeElement, closeButton, 'Opening moves focus into the drawer');
listeners.keydown({ key: 'Escape', target: { closest() { return null; } }, preventDefault() {} });
assert.strictEqual(elements['gpp-drawer-overlay'].hidden, true, 'Escape closes the drawer');
assert.strictEqual(elements['gpp-sel'].focused, true, 'Closing returns focus to the header client chip');
function selectProfile(id) {
  listeners.click({
    target: {
      id: '',
      closest(selector) {
        return selector === '[data-gpp]' ? { dataset: { gpp: 'switch:' + id } } : null;
      }
    }
  });
}

state.goal = 123456;
selectProfile('bina');
assert.strictEqual(state.gpp.active, 'bina', 'Selecting a client changes the active profile');
assert.strictEqual(state.members[0].name, 'Bina', 'Selecting a client loads its planning data into app state');
assert.strictEqual(state.goal, 200000, 'Switching profiles loads the selected profile goal');
assert.strictEqual(state.gpp.profiles.asha.d.goal, 123456, 'Switching saves the previous active profile first');
assert.strictEqual(context.UI.rq, '', 'Switching profiles clears report search state');
assert.strictEqual(context.UI.rsel, undefined, 'Switching profiles clears holding selection state');
assert.strictEqual(toastMessage, 'Switched to Bina', 'Switching reports the active client');
assert.ok(renderCount > 0 && saves > 0, 'Profile switching saves and rerenders the app');

listeners.click({
  target: {
    id: '',
    closest(selector) {
      return selector === '[data-gpp]' ? { dataset: { gpp: 'dup:bina' } } : null;
    }
  }
});
const copies = Object.keys(state.gpp.profiles).filter(id => state.gpp.profiles[id].name === 'Bina (copy)');
assert.strictEqual(copies.length, 1, 'Duplicate action creates a uniquely named profile');
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(state.gpp.profiles[copies[0]].d)),
  JSON.parse(JSON.stringify(state.gpp.profiles.bina.d)),
  'Duplicate action copies the complete profile plan'
);

listeners.click({
  target: {
    id: '',
    closest(selector) {
      return selector === '[data-gpp]' ? { dataset: { gpp: 'del:' + copies[0] } } : null;
    }
  }
});
assert.ok(confirmation && confirmation.message.includes('Bina (copy)'), 'Delete action requests confirmation');
confirmation.callback();
assert.ok(!state.gpp.profiles[copies[0]], 'Confirmed deletion removes the selected profile');

selectProfile('asha');
assert.strictEqual(state.gpp.active, 'asha', 'Drawer client action selects the saved profile');
assert.ok(elements['gpp-drawer-portal'].innerHTML.includes('aria-labelledby="gpp-drawer-title"') &&
  elements['gpp-drawer-portal'].innerHTML.includes('data-gpp="add"') &&
  elements['gpp-drawer-portal'].innerHTML.includes('data-gpp="dup:asha"') &&
  elements['gpp-drawer-portal'].innerHTML.includes('data-gpp="ren:asha"'),
'Drawer exposes add, duplicate, and rename controls');
assert.ok(context.gppReportTitle('Annual Portfolio Projection').includes('Annual Portfolio Projection · Asha'),
  'Report title includes the active client');
listeners.click({
  target: { closest(selector) { return selector === '[data-gpp]' ? { dataset: { gpp: 'ren:asha' } } : null; } }
});
assert.ok(dialog.open && dialog.innerHTML.includes('Rename'), 'Rename action reuses the existing naming dialog');
elements['gpp-n'].value = 'Asha renamed';
listeners.submit({ target: { id: 'gpp-f', dataset: { mode: 'ren', id: 'asha' } }, preventDefault() {} });
assert.strictEqual(state.gpp.profiles.asha.name, 'Asha renamed', 'Renaming updates the existing client profile');

function clickAddFromDrawer() {
  listeners.click({
  target: {
    id: '',
    closest(selector) {
      return selector === '[data-gpp]' ? { dataset: { gpp: 'add' } } : null;
    }
  }
  });
}
clickAddFromDrawer();
assert.ok(dialog.open && dialog.innerHTML.includes('Add client'), 'Add action reuses the existing add-client dialog');
listeners.click({ target: { id: 'gpp-x', closest() { return null; } } });
assert.strictEqual(state.gpp.active, 'asha', 'Cancelling add leaves the previously selected profile active');
assert.strictEqual(elements['gpp-sel'].focused, true, 'Cancelling restores focus to the header client chip');
clickAddFromDrawer();
elements['gpp-n'].value = 'Cora';
listeners.submit({ target: { id: 'gpp-f', dataset: { mode: 'add' } }, preventDefault() {} });
assert.strictEqual(state.gpp.profiles[state.gpp.active].name, 'Cora', 'Saving adds and activates the new profile');
assert.strictEqual(toastMessage, 'Cora added', 'Saving confirms the new person');
assert.strictEqual(elements['gpp-sel'].focused, true, 'Closing the add dialog restores focus to the header chip');
while (Object.keys(state.gpp.profiles).length < 12) {
  const index = Object.keys(state.gpp.profiles).length;
  state.gpp.profiles['person-' + index] = {
    name: 'Person ' + index,
    d: JSON.parse(JSON.stringify(state.gpp.profiles[state.gpp.active].d)),
    created: index
  };
}
context.gppBarHTML(true);
assert.ok(elements['gpp-drawer-portal'].innerHTML.includes('data-gpp="add"') &&
  elements['gpp-drawer-portal'].innerHTML.includes('data-gpp-search') &&
  !elements['gpp-drawer-portal'].innerHTML.includes('data-gpp="add" disabled'),
'Search appears with more than five clients and Add-client stays enabled at the limit');
clickAddFromDrawer();
assert.strictEqual(toastMessage, 'Maximum 12 family members', 'Using add at the limit shows the existing maximum toast');
assert.strictEqual(dialog.open, false, 'Maximum toast does not open a futile add dialog');

console.log('  ok   Goal Planner client profiles preserve switching, snapshots, duplicate, and delete behavior');
