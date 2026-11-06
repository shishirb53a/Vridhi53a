#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appCore = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const mainReady = html.indexOf('<script src="modules/app-core/app.js?v=165"></script>');
const helpTag = '<script src="modules/help/help.js?v=143"></script>';
const settingsTag = '<script src="modules/settings/settings.js?v=143"></script>';
const helpPosition = html.indexOf(helpTag);
const settingsPosition = html.indexOf(settingsTag);

assert.ok(mainReady >= 0 && helpPosition > mainReady && settingsPosition > helpPosition,
  'Help and Settings modules load synchronously after core app initialization');
for (const tag of [helpTag, settingsTag]) {
  const position = html.indexOf(tag);
  assert.ok(position >= 0 && html.indexOf(tag, position + tag.length) < 0,
    `${tag} is included only once`);
}
assert.ok(appCore.includes('Help:()=>window.VRHelp.page(UI,esc,escn)'),
  'The Help tab uses the extracted page renderer');
assert.ok(appCore.includes("$('#hl').innerHTML=window.VRHelp.body(UI,escn)"),
  'Help search refreshes through the extracted body renderer');
assert.ok(html.includes('window.VRHelp.body=trw(window.VRHelp.body)'),
  'Help search results retain the existing translation wrapper');
assert.ok(appCore.includes('Settings:()=>window.VRSettings.render('),
  'The Settings tab uses the extracted renderer');
assert.ok(!html.includes('const HELP=[') && !html.includes("function helpBody(){") &&
  !html.includes('Settings:set') && !html.includes('Help:help'),
  'Help and Settings renderers are no longer inline');

const context = { window: null };
context.window = context;
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'modules', 'help', 'help.js'), 'utf8'),
  context,
  { filename: 'help.js' }
);
vm.runInContext(
  fs.readFileSync(path.join(root, 'modules', 'settings', 'settings.js'), 'utf8'),
  context,
  { filename: 'settings.js' }
);

const ui = { hq: '' };
const escape = value => String(value).replace(/[&<>"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[char]));
const help = context.VRHelp.page(ui, escape, escape);
assert.ok(help.includes('id="hq"') && help.includes('id="hl"'),
  'Help page includes its search input and results container');
assert.ok(help.includes('Quick start') && help.includes('PPF style'),
  'Help page preserves its topic content');
ui.hq = 'not-a-real-help-topic';
assert.ok(context.VRHelp.body(ui, escape).includes('No help topics match'),
  'Help search displays its no-results message');
ui.hq = 'PPF';
assert.ok(context.VRHelp.body(ui, escape).includes('PPF style'),
  'Help search filters topics case-insensitively');

const calls = [];
const settings = context.VRSettings.render({
  state: {
    start: 2026,
    end: 2040,
    members: [{ age: 40 }],
    theme: 'system',
    lang: 'en',
    cc: '#123456'
  },
  family: '<section id="family"></section>',
  languages: [['en', 'English']],
  reportColumns: () => { calls.push('columns'); return '<section id="columns"></section>'; },
  snapshots: () => { calls.push('snapshots'); return '<section id="snapshots"></section>'; },
  colourTheme: () => { calls.push('colour'); return '<section id="colour"></section>'; },
  appearance: () => { calls.push('appearance'); return '<section id="appearance"></section>'; }
});
assert.ok(settings.includes('id="family"') && settings.includes('id="st"') &&
  settings.includes('id="en"') && settings.includes('id="lsel"') &&
  settings.includes('id="ex"') && settings.includes('id="im"') &&
  settings.includes('id="rs"') && settings.includes('id="clr"'),
'Settings keeps its existing content and event-handler IDs');
assert.deepStrictEqual(calls, ['columns', 'snapshots', 'colour', 'appearance'],
  'Optional Settings sections render once in their original order');
assert.ok(settings.indexOf('id="columns"') < settings.indexOf('id="snapshots"') &&
  settings.indexOf('id="snapshots"') < settings.indexOf('id="colour"') &&
  settings.indexOf('id="colour"') < settings.indexOf('id="appearance"'),
'Settings sections preserve their original markup order');

console.log('Help and Settings extraction tests passed');
