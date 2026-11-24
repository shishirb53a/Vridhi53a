#!/usr/bin/env node
'use strict';
/* Renders the screen in jsdom and checks the grid keeps the Excel layout. Prints SKIP when jsdom is not installed. */
const path = require('path'), fs = require('fs'), assert = require('assert');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('stress-test-ui: SKIP (jsdom not installed)'); process.exit(0); }
const root = path.join(__dirname, '..');
const dom = new JSDOM('<div id="h"></div>', { runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
for (const f of ['retirement-planner/engine.js', 'stress-test/engine.js', 'stress-test/ui.js']) w.eval(fs.readFileSync(path.join(root, 'modules', f), 'utf8'));
const FH = w.FreedomHorizon;
const inp = Object.assign(FH.defaults(), { age: 48, children: 0, until: 74, corpus: 30000000, roi: 8.05, preOn: '0', houseFund: 14000000, buffer: 1500000, bufferRoi: 6, monthly: 112000, houseInflation: 4, reduceAge: 60, reducePercent: 0, incomeOn: '0', lumpCount: '0' });
let saved = null;
const provider = { clients: () => [{ id: 'a', name: 'Shishir' }], activeId: () => 'a', inputs: () => inp, settings: () => saved, saveSettings: (id, s) => { saved = s; } };
const h = w.document.getElementById('h');
w.StressTestUI.mount(h, provider);
const rows = h.querySelectorAll('tr'), rn = Array.from(rows).map(r => (r.querySelector('.st-rn') || {}).textContent);
assert.strictEqual(rn[1], '1'); assert.ok(rn.includes('123') && rn.includes('115') && rn.includes('45'), 'rows keep the Excel numbering');
assert.strictEqual(h.querySelectorAll('tr')[0].querySelectorAll('th').length, 20, 'columns A-S plus the row-number column');
const row6 = Array.from(rows).find(r => (r.querySelector('.st-rn') || {}).textContent === '6');
assert.ok(row6.textContent.includes('1. Base Case') && row6.textContent.includes('51.39 yrs'), 'base case row shows the survival');
assert.strictEqual(h.querySelectorAll('[data-set]').length, 11, 'nine settings plus the two return settings are editable');
const inpEl = h.querySelector('[data-set=conservative]'); inpEl.value = '5'; inpEl.dispatchEvent(new w.Event('change', { bubbles: true }));
assert.ok(Math.abs(saved.conservative - 0.05) < 1e-9, 'edited setting is saved for the client');
console.log('stress-test-ui: all checks passed');
