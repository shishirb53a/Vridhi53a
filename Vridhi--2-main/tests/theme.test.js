#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appCoreSource = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const moduleSource = fs.readFileSync(path.join(root, 'modules', 'theme', 'theme.js'), 'utf8');
const themeTag = '<script src="modules/theme/theme.js?v=144"></script>';
const themePosition = html.indexOf(themeTag);
const coreReady = html.indexOf('<script src="modules/app-core/app.js?v=165"></script>');
const dashboardPosition = html.indexOf('<script src="modules/dashboard-preferences/dashboard-preferences.js?v=141"></script>');
assert.ok(coreReady >= 0 && themePosition > coreReady && dashboardPosition > themePosition,
  'Theme module loads after app callbacks exist and before appearance preferences');
assert.strictEqual(html.indexOf(themeTag, themePosition + themeTag.length), -1,
  'Theme module is included only once');
assert.ok(html.includes('window.VRTheme.configure({getState:()=>S,save:save,render:render,toast:toast})') &&
  appCoreSource.includes('function theme(){window.VRTheme.apply()}'),
'The app supplies state and lifecycle callbacks through the theme module interface');
assert.ok(!html.includes('const THEMES=[') && !html.includes('window.applyCC=function()') &&
  !html.includes('window.ccUI=function()'),
'Theme data, color application, and picker rendering are no longer inline');

const listeners = {};
const styles = {};
const rootElement = {
  dataset: { theme: 'light' },
  style: { setProperty(name, value) { styles[name] = value; } },
  removeAttribute(name) { delete this.dataset[name.replace('data-', '')]; }
};
let mediaChange;
const context = {
  window: null,
  document: {
    documentElement: rootElement,
    addEventListener(name, callback) { listeners[name] = callback; }
  },
  matchMedia() {
    return {
      matches: false,
      addEventListener(name, callback) { if (name === 'change') mediaChange = callback; }
    };
  }
};
context.window = context;
context.window.matchMedia = context.matchMedia;
vm.createContext(context);
vm.runInContext(moduleSource, context, { filename: 'theme.js' });

let state = { cc: null, hc: false, palette: 'yellow', theme: 'light' };
let saves = 0, renders = 0, toasts = [];
context.VRTheme.configure({
  getState() { return state; },
  save() { saves++; },
  render() { renders++; },
  toast(message) { toasts.push(message); }
});
context.VRTheme.apply();
assert.strictEqual(context.brandOf(), '#1e3a8a', 'Unset brand uses Ocean Navy');
assert.ok(context.ccUI().includes('role="radiogroup"') &&
  context.ccUI().includes('Text contrast') && context.ccUI().includes('aria-checked="true"'),
'Colour picker retains its accessible selected-state and contrast details');
assert.strictEqual(typeof mediaChange, 'function', 'System color-scheme changes refresh theme colors');
assert.strictEqual(rootElement.dataset.pal, 'yellow', 'Page theme applies the selected palette attribute');
assert.strictEqual(styles['--brand'], '#1e3a8a', 'Page theme applies the selected brand color');

state.cc = '#00ff00';
assert.strictEqual(context.brandOf(), '#065f46', 'Custom colors map to the nearest supported theme');
state.cc = '#777777';
assert.strictEqual(context.brandOf(), '#334155', 'Low-chroma custom colors map to Graphite');
state.cc = '#1e3a8a';
state.theme = 'system';
context.VRTheme.apply();
assert.ok(!Object.prototype.hasOwnProperty.call(rootElement.dataset, 'theme'),
  'System appearance removes the explicit theme attribute');
state.theme = 'dark';
context.VRTheme.apply();
assert.strictEqual(rootElement.dataset.theme, 'dark', 'Dark appearance sets the dark theme attribute');
assert.notStrictEqual(styles['--brand'], '#1e3a8a', 'Dark appearance adjusts the selected brand');

function click(dataset, disabled) {
  listeners.click({
    target: { closest() { return { dataset, disabled: !!disabled }; } }
  });
}
state.cc = '#777777';
state.hc = false;
click({ hc: 'toggle' });
assert.strictEqual(state.hc, true, 'High-contrast toggle updates app state');
assert.strictEqual(state.cc, null, 'High contrast clears an insufficient custom color');
assert.strictEqual(saves, 1, 'High-contrast change persists app state');
assert.strictEqual(renders, 1, 'High-contrast change rerenders the app');

click({ cc: '#065f46' });
assert.strictEqual(state.cc, '#065f46', 'Theme selection stores the selected color');
assert.strictEqual(saves, 2, 'Theme selection persists app state');
assert.strictEqual(renders, 2, 'Theme selection rerenders the app');
assert.deepStrictEqual(toasts, ['Emerald theme applied'], 'Named theme selection shows confirmation');
assert.strictEqual(context.brandOf(), '#065f46', 'Selected theme is reflected by brand lookup');

const previous = { cc: state.cc, saves, renders, toastCount: toasts.length };
click({ cc: '#881337' }, true);
assert.deepStrictEqual(
  { cc: state.cc, saves, renders, toastCount: toasts.length },
  previous,
  'Disabled theme choices do not mutate state or trigger app callbacks'
);
mediaChange();
assert.ok(styles['--brand'], 'System color-scheme event reapplies theme variables');

console.log('Theme module preserves color selection, contrast, and appearance behavior');
