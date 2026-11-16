#!/usr/bin/env node
'use strict';
/* Regression test: Retirement Planner > Reports > Year by Year behaves like Goal Planner > Annual Portfolio Projection:
   Maximize/Restore, a Columns dropdown whose choice is remembered per user, and a Retired tag on the retirement row. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'modules', 'retirement-planner', 'ui.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'modules', 'retirement-planner', 'year-by-year.css'), 'utf8');
const lines = src.split('\n');
const pick = re => { const l = lines.find(x => re.test(x)); assert.ok(l, re + ' exists in ui.js'); return l; };

/* hiding column groups: the "When" group (S.No, Year, Age) can never be hidden, order is kept */
const visible = new Function(pick(/^\s*const HZ_PIN =/) + ';' + pick(/^\s*const hzVisible =/) + ';return hzVisible;')();
const groups = ['When', 'Household living', 'Money out', 'Earning phase', 'Money coming in', 'End'].map(title => ({ title }));
assert.deepStrictEqual(visible(groups, []).map(g => g.title), groups.map(g => g.title), 'nothing hidden: every group shows');
assert.deepStrictEqual(visible(groups, ['Money coming in', 'Earning phase']).map(g => g.title), ['When', 'Household living', 'Money out', 'End'], 'hidden groups disappear, order kept');
assert.deepStrictEqual(visible(groups, groups.map(g => g.title)).map(g => g.title), ['When'], 'hiding everything still leaves Year and Age');
assert.deepStrictEqual(visible(groups, undefined).length, 6, 'no saved choice means all columns');

/* the choice is remembered per user, like the Holdings collapse state */
assert.ok(/const hzKey = \(\) => "vr-hz-hide" \+ \(typeof UK !== "undefined" && UK \? "-" \+ UK : ""\);/.test(src), 'saved per user');
assert.ok(!/^(fwt|fs-users)/.test('vr-hz-hide-qa'), 'key survives the sign-out wipe of fwt*/fs-users* data');
assert.ok(/localStorage\.setItem\(hzKey\(\), JSON\.stringify\(list\)\)/.test(src), 'every change is saved');

/* same report chrome as Annual Portfolio Projection */
assert.ok(src.includes('<div class="rph2" data-rpx><div class="rpt"><h2>Year-by-year plan</h2>'), 'Maximize/Restore host (data-rpx) on the report card');
assert.ok(src.includes('data-hzcb') && src.includes('class="msd-t">Columns<'), 'labelled Columns dropdown');
assert.ok(src.includes('class="msd-t">Phase<') && src.includes('id="hzp"'), 'Phase filter sits in the same labelled row');
assert.ok(src.includes('c.label === "Age at Year-End" && isRet(r)') && src.includes('<span class="rtg">Retired</span>'), 'Retired tag on the retirement row');
assert.ok(/hz-fr/.test(css) && /\.hz-t td>\.rtg/.test(css), 'styles for the filter row and tag');
console.log('Year by Year report has Maximize/Restore, a remembered Columns dropdown and the Retired tag');
