#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appCoreSource = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const source = fs.readFileSync(path.join(root, 'modules', 'family-management', 'family-management.js'), 'utf8');
const mainReady = html.indexOf('<script src="modules/app-core/app.js?v=165"></script>');
const familyTag = '<script src="modules/family-management/family-management.js?v=144"></script>';
const familyPosition = html.indexOf(familyTag);
assert.ok(mainReady >= 0 && familyPosition > mainReady &&
  familyPosition < html.indexOf('<script src="modules/help/help.js?v=143"></script>'),
'Family module loads synchronously after the core app and before the delayed first render');
assert.strictEqual(html.indexOf(familyTag, familyPosition + familyTag.length), -1,
  'Family module is included only once');
assert.ok(appCoreSource.includes('window.VRFamily.page(familyView())') &&
  appCoreSource.includes('window.VRFamily.openEditor(null,familyActions())') &&
  appCoreSource.includes('window.VRFamily.remove(+d.mx,familyActions())'),
'Core UI delegates family page, editor, and removal flows through the module interface');
assert.ok(!appCoreSource.includes('function famRows()') && !appCoreSource.includes('function fam()') &&
  !appCoreSource.includes('function mform('),
'Family renderers and editor are no longer inline');

const roles = ['Self', 'Spouse', 'Child', 'Parent', 'Other'];
const state = {
  members: [
    { id: 1, name: 'Alex', role: 'Self', age: 40, cls: 1, college: 4 },
    { id: 2, name: 'Casey', role: 'Child', age: 10, cls: 5, college: 4 }
  ]
};
const ui = { fq: '', frl: 'All', fk: 'role', fd: 1 };
let elements;
const context = {
  window: null,
  document: { getElementById(id) { return elements && elements[id] || null; } }
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'family-management.js' });

const escape = value => String(value).replace(/[&<>"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[char]));
const familyContext = {
  state,
  ui,
  roles,
  escape,
  escapeName: escape,
  stage(member, year) { return 'Stage ' + (member.cls + year - 1); }
};

const page = context.VRFamily.page(familyContext);
assert.ok(page.includes('id="fq"') && page.includes('id="frf"') &&
  page.includes('id="fsf"') && page.includes('id="fadd"'),
'Family page retains search, relationship filter, sorting, and add controls');
assert.ok(page.includes('Education stage now') && page.includes('data-me="0"') &&
  page.includes('data-mx="1"') && page.includes('Stage 5'),
'Family page renders member details, stage, and edit/delete actions');
assert.ok(context.VRFamily.page(Object.assign({}, familyContext, { state: { members: [] } }))
  .includes('Add your first person') &&
  context.VRFamily.page(Object.assign({}, familyContext, { state: { members: [] } })).includes('id="fadd"'),
'An empty family page keeps the existing add-member action available');

context.VRFamily.setSearch(ui, 'case');
assert.ok(context.VRFamily.rows(familyContext).includes('Casey') &&
  !context.VRFamily.rows(familyContext).includes('Alex'),
'Family search filters names without case sensitivity');
context.VRFamily.setFilter(ui, 'frf', 'Child');
assert.ok(context.VRFamily.rows(familyContext).includes('Casey') &&
  !context.VRFamily.rows(familyContext).includes('Alex'),
'Relationship filter limits the rendered members');
context.VRFamily.setFilter(ui, 'fsf', 'age');
ui.fk = 'role';
ui.fd = -1;
context.VRFamily.sort(ui, 'age');
assert.strictEqual(ui.fd, 1, 'Selecting a new sort key starts in ascending order');
context.VRFamily.sort(ui, 'age');
assert.strictEqual(ui.fd, -1, 'Selecting the active sort key reverses the order');
context.VRFamily.toggleSort(ui);
assert.strictEqual(ui.fd, 1, 'Sort direction control toggles the active direction');
context.VRFamily.setSearch(ui, 'missing');
assert.ok(context.VRFamily.rows(familyContext).includes('No family members match'),
'Empty search results retain their explanatory message');

let dialogMarkup, saved = 0, rendered = 0, closed = 0, messages = [], preparedSelf = [];
function makeElement(value) {
  return {
    value: value || '',
    hidden: false,
    textContent: '',
    focus() { this.focused = true; }
  };
}
function openDialog(markup) {
  dialogMarkup = markup;
  elements = {};
  ['mn', 'mr', 'ma', 'mc', 'mg', 'mk', 'fe', 'fm', 'cn'].forEach(id => {
    elements[id] = makeElement(id === 'mr' ? 'Child' : '');
  });
}
const editContext = {
  state,
  roles,
  makeMember(id, name, role, age, cls, college) { return { id, name, role, age, cls, college }; },
  field(id, label, value, type, extra) {
    return '<p><label for="' + id + '">' + label + '</label><input id="' + id +
      '" type="' + type + '" value="' + value + '" ' + extra + '></p>';
  },
  openDialog,
  closeDialog() { closed++; },
  translate(value) { return value; },
  save() { saved++; },
  render() { rendered++; },
  toast(...args) { messages.push(args); },
  prepareSave(isSelf) { preparedSelf.push(isSelf); return isSelf ? 'Age updated' : ''; },
  escapeName: escape,
  confirm(message, callback) { this.confirmation = { message, callback }; },
  undo() { return 'undo token'; }
};
const familyModule = context.VRFamily;
familyModule.openEditor(null, editContext);
assert.ok(dialogMarkup.includes('Add family member') && dialogMarkup.includes('id="mk"'),
'Add form preserves the child-specific inputs');
elements.mn.value = 'New child';
elements.ma.value = '8';
elements.mc.value = '4';
elements.mg.value = '3';
let prevented = false;
elements.fm.onsubmit({ preventDefault() { prevented = true; } });
assert.ok(prevented, 'Family form does not submit through the browser');
assert.deepStrictEqual(state.members[2], {
  id: state.members[2].id,
  name: 'New child',
  role: 'Child',
  age: 8,
  cls: 4,
  college: 3
}, 'Valid child details are added to app state');
assert.strictEqual(saved, 1, 'Successful add persists state');
assert.strictEqual(rendered, 1, 'Successful add rerenders the app');
assert.strictEqual(closed, 1, 'Successful add closes the dialog');
assert.deepStrictEqual(messages[0], ['Member added'], 'Successful add reports completion');

familyModule.openEditor(0, editContext);
assert.ok(dialogMarkup.includes('id="mr" disabled'), 'The primary member relationship remains fixed');
elements.mn.value = 'Updated self';
elements.ma.value = '41';
elements.fm.onsubmit({ preventDefault() {} });
assert.deepStrictEqual(preparedSelf, [false, true], 'Save preparation receives whether the primary member changed');
assert.deepStrictEqual(messages[1], ['Age updated'], 'Primary-member save reports the app-provided age adjustment');
assert.strictEqual(state.members[0].name, 'Updated self', 'Valid edit updates the selected member');

familyModule.openEditor(2, editContext);
elements.mn.value = '';
elements.ma.value = '8';
elements.mc.value = '4';
elements.mg.value = '3';
elements.fm.onsubmit({ preventDefault() {} });
assert.ok(elements.fe.textContent.includes('Name is required') && saved === 2,
'Invalid edits show validation errors without saving');

familyModule.remove(0, editContext);
assert.strictEqual(editContext.confirmation, undefined, 'Primary member cannot be removed');
familyModule.remove(1, editContext);
assert.ok(editContext.confirmation.message.includes('Casey'), 'Member removal requires confirmation');
editContext.confirmation.callback();
assert.strictEqual(state.members.some(member => member.name === 'Casey'), false,
'Confirmed removal deletes the selected member');
assert.deepStrictEqual(messages[2], ['Member removed', 'undo token'],
'Removal reports completion and preserves undo support');
assert.strictEqual(saved, 3, 'Confirmed removal persists state');
assert.strictEqual(rendered, 3, 'Confirmed removal rerenders the app');

const beforeMax = dialogMarkup;
state.members = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1, name: 'Member ' + index, role: index ? 'Other' : 'Self',
  age: 30, cls: 1, college: 4
}));
familyModule.openEditor(null, editContext);
assert.strictEqual(dialogMarkup, beforeMax, 'Member limit prevents opening an add form');
assert.deepStrictEqual(messages[3], ['Maximum 12 family members'],
'Member limit is explicitly reported');

console.log('Family management module preserves rendering, validation, and member actions');
