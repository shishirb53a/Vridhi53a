#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'modules', 'landing', 'landing.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const i18nScript = html.indexOf('<script src="modules/i18n/i18n.js?v=132"></script>');
const landingScript = html.indexOf('<script src="modules/landing/landing.js?v=131"></script>');
const mainRenderer = html.indexOf('<script src="modules/app-core/app.js?v=165"></script>');
assert.ok(i18nScript >= 0 && landingScript > i18nScript && mainRenderer > landingScript, 'Landing module loads after localization and before the app renderer');
assert.ok(!html.includes('<script id="vw-landing">'), 'Landing component is no longer duplicated inline');

const window = {};
const context = { window };
vm.createContext(context);
vm.runInContext(source, context);

assert.strictEqual(typeof window.vrWelcome, 'function', 'Shared landing renderer remains exposed');
assert.ok(window.VRW_GOAL && window.VRW_RET, 'Both planners retain their welcome data');
for (const [plan, expectedTitle, expectedCta] of [
  [window.VRW_GOAL, 'Is your retirement on track?', 'Start Your Goal Plan'],
  [window.VRW_RET, 'Plan the retirement you want', 'Start Your Retirement Plan']
]) {
  const markup = window.vrWelcome(plan);
  assert.ok(markup.includes(expectedTitle), 'Landing renders the plan-specific title');
  assert.ok(markup.includes(expectedCta), 'Landing renders the plan-specific action');
  assert.ok(markup.includes('<svg') && markup.includes('<table'), 'Landing includes sample charts and projections');
  assert.ok(markup.includes('Forecasts are estimates, not financial advice.'), 'Landing retains the forecast disclaimer');
}
assert.ok(window.VRW_GOAL.cta.a.includes('id="add"'), 'Goal Planner start action keeps its existing add-holding hook');
assert.ok(window.VRW_RET.cta.a.includes('data-fh-open="status"'), 'Retirement Planner start action keeps its existing UI hook');
console.log('  ok   shared landing module renders both planner welcome screens');
