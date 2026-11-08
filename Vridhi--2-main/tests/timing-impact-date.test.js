#!/usr/bin/env node
'use strict';
/* Regression test: Goal Planner Dashboard dates (Timing impact, Goal realization, Retirement Date)
   must sit on the engine's calendar (1 April of the plan start year) and must not depend on today's date. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'modules', 'app-core', 'app.js'), 'utf8');
const line = src.split('\n').find(l => l.startsWith('const dt='));
assert.ok(line, 'dt() date helper exists in app core');
assert.ok(!/setMonth\(/.test(line) && !/new Date\(\)/.test(line),
  'dt() no longer starts from today or uses setMonth (which overflows on the 29th-31st)');

const make = start => new Function('S', 'DLC', line + '; return dt;')({ start }, () => 'en-GB');
const RealDate = Date;
const clocks = ['2026-04-01T06:30:00Z', '2026-11-07T06:30:00Z', '2027-03-20T06:30:00Z', '2026-12-31T06:30:00Z', '2027-01-31T06:30:00Z'];

for (const c of clocks) {
  global.Date = class extends RealDate {
    constructor(...a) { if (a.length === 0) super(c); else super(...a); }
    static now() { return new RealDate(c).getTime(); }
  };
  try {
    const dt = make(2026);
    assert.strictEqual(dt(0), '1 Apr 2026', 'month 0 is the plan balance date (clock ' + c + ')');
    assert.strictEqual(dt(83), '1 Mar 2033', 'goal 83 months out is 1 Mar 2033 (clock ' + c + ')');
    assert.strictEqual(dt(108), '1 Apr 2035', 'retirement 9 years out is 1 Apr 2035, the row the report marks Retired (clock ' + c + ')');
    assert.strictEqual(make(2024)(36), '1 Apr 2027', 'an older plan is dated from its own start year');
    assert.strictEqual(make(2028)(24), '1 Apr 2030', 'a future plan is dated from its own start year');
  } finally { global.Date = RealDate; }
}
console.log('Dashboard dates are anchored to 1 April of the start year and independent of today');

/* "Years left" under Retirement Date must be measured from today to the 1 April retirement date, not the raw age difference. */
const ln = src.split('\n').find(l => l.startsWith('const yrsLeft='));
assert.ok(ln, 'yrsLeft() helper exists');
const left = (start, yr, clock) => {
  global.Date = class extends RealDate {
    constructor(...a) { if (a.length === 0) super(clock); else super(...a); }
    static now() { return new RealDate(clock).getTime(); }
  };
  try { return new Function('S', ln + '; return yrsLeft;')({ start })({ yr }); } finally { global.Date = RealDate; }
};
assert.strictEqual(left(2026, 5, '2026-11-07T06:30:00Z'), '4.4 years left', '1 Apr 2031 seen on 7 Nov 2026 is 4 years 4 months 25 days (4.4 years) away, not 5 and not 4.3');
assert.strictEqual(left(2026, 5, '2026-11-08T06:30:00Z'), '4.4 years left', '8 Nov 2026 to 1 Apr 2031 is 1605 days = 4.39 years');
assert.strictEqual(left(2026, 5, '2026-04-01T06:30:00Z'), '5 years left', 'on the plan balance date it is exactly 5 years');
assert.strictEqual(left(2026, 5, '2027-03-20T06:30:00Z'), '4 years left', 'it counts down as time passes');
assert.strictEqual(left(2026, 6, '2027-04-01T06:30:00Z'), '5 years left');
assert.strictEqual(left(2026, 2, '2027-04-01T06:30:00Z'), '1 year left', 'singular wording kept');
assert.strictEqual(left(2026, 1, '2027-04-01T06:30:00Z'), 'Retirement date reached', 'never negative');
console.log('Years left is measured from today to the 1 April retirement date');
