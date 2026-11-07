#!/usr/bin/env node
/* Unit tests for the Policies module core (modules/policy/policy-core.js). No install needed:  node tests/policy-core.test.js
   They check the schedule maths, financial-year placement, premiums, maturity, the "use in other modules" switches, the cleaning rules
   and that old-format policies are stored unchanged. */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const win = { document: { dispatchEvent() {} }, CustomEvent: function () {} }; win.window = win;
vm.createContext(win);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'modules', 'policy', 'policy-core.js'), 'utf8') + '\n;this.__S=function(v){S=v};', win);
win.esc = value => String(value);
const policyUI = fs.readFileSync(path.join(__dirname, '..', 'modules', 'policy', 'policy-ui.js'), 'utf8');
const shareStart = policyUI.indexOf('function shareClients(who, title) {');
const shareEnd = policyUI.indexOf('\n  function sharing()', shareStart);
assert.ok(shareStart >= 0 && shareEnd > shareStart, 'Policy sharing client renderer exists');
const shareClients = vm.runInContext('(' + policyUI.slice(shareStart, shareEnd) + ')', win);
vm.runInContext('var S={policies:[],start:2026,polFh:true,polGp:true};this.__setS=function(v){S=v};this.__getS=function(){return S}', win);
const V = win.VRPolicy; let n = 0;
win.V = V;
const t = (name, fn) => { try { fn(); n++; console.log('  ok  ', name); } catch (e) { console.log('  FAIL', name, '\n      ', e.message); process.exitCode = 1; } };
/* objects made inside the sandbox have another Object prototype, so compare them as JSON (which is what the app stores) */
const same = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
const mk = o => Object.assign({ id: 'a', name: 'Tata', amt: 94000, freq: 'yearly', start: '2027-04-01', yrs: 10, lump: 1000000 }, o);

t('yearly payouts + maturity lump sum: dates and counts', () => {
  const L = V.schedule(mk()), pay = L.filter(e => e.kind === 'payout'), lump = L.filter(e => e.kind === 'lump');
  assert.strictEqual(pay.length, 10); assert.strictEqual(pay[0].date, '2027-04-01'); assert.strictEqual(pay[9].date, '2036-04-01');
  assert.strictEqual(lump.length, 1); assert.strictEqual(lump[0].date, '2037-04-01'); assert.strictEqual(lump[0].amt, 1000000);
});
t('month-end start dates are clipped to the month length', () => {
  const L = V.schedule(mk({ freq: 'monthly', start: '2026-01-31', yrs: 1, lump: 0, amt: 100 }));
  same(L.slice(0, 3).map(e => e.date), ['2026-01-31', '2026-02-28', '2026-03-31']); assert.strictEqual(L.length, 12);
});
t('totals', () => { const T = V.totals(mk()); assert.strictEqual(T.pay, 940000); assert.strictEqual(T.lump, 1000000); assert.strictEqual(T.count, 10); });
t('maturity is start + duration; benefit and net use premiums when present', () => {
  const m = V.maturity(mk({ prem: { amt: 24000, freq: 'yearly', start: '2026-04-01', yrs: 5 } }));
  assert.strictEqual(m.date, '2037-04-01'); assert.strictEqual(m.amount, 1000000); assert.strictEqual(m.benefit, 1940000);
  assert.strictEqual(m.premiums, 120000); assert.strictEqual(m.net, 1820000); assert.strictEqual(m.hasPremium, true);
});
t('plan rows: row 1 (today) gets nothing; the financial year from 1 April sets the row', () => {
  const s = { start: 2026, polGp: true, policies: V.clean([mk()]) }, rows = Array.from({ length: 20 }, () => ({}));
  V.applyToRows(s, rows);
  assert.strictEqual(rows[0].pay, 0); assert.strictEqual(rows[1].pay, 0);          // row 2 = FY 2026-27
  assert.strictEqual(rows[2].pay, 94000);                                          // row 3 = FY 2027-28 holds 1 Apr 2027
  assert.strictEqual(rows[12].payL, 1000000);                                      // row 13 = FY 2037-38 holds the lump sum
  assert.strictEqual(rows.reduce((q, r) => q + r.pay, 0), 1940000);
});
t('payouts received by a row, and by calendar year', () => {
  const s = { start: 2026, polGp: true, policies: V.clean([mk()]) };
  assert.strictEqual(V.receivedBy(s, 1), 0); assert.strictEqual(V.receivedBy(s, 3), 94000); assert.strictEqual(V.receivedBy(s, 4), 188000);
  const y = V.receivedByYear(s, 4); same(y.m, { 2027: 94000, 2028: 94000 }); assert.strictEqual(y.first, '2027-04-01');
});
t('month payouts (0 = April)', () => {
  const s = { start: 2026, polGp: true, policies: V.clean([mk()]) };
  assert.strictEqual(V.monthPayout(s, 3, 0), 94000); assert.strictEqual(V.monthPayout(s, 3, 1), 0);
});
t('Goal Planner switch: nothing is passed on when off', () => {
  const s = { start: 2026, polGp: false, policies: V.clean([mk()]) }, rows = Array.from({ length: 20 }, () => ({}));
  V.applyToRows(s, rows); assert.ok(rows.every(r => r.pay === 0)); assert.strictEqual(V.receivedBy(s, 10), 0);
});
t('Retirement Planner streams: future calendar years only, and the switch', () => {
  win.__setS({ policies: V.clean([mk()]), polFh: true, polGp: true, start: 2026 });
  const st = win.__vrExtraStreams(2030); assert.strictEqual(st.length, 1); assert.strictEqual(st[0].fromY, 2031); assert.strictEqual(st[0].toY, 2037);
  assert.strictEqual(st[0].name, 'Policy: Tata'); assert.strictEqual(st[0].byYear[2037], 1000000);
  win.__getS().polFh = false; same(win.__vrExtraStreams(2030), []);
});
t('premium schedule: quarterly count, single premium, paid marks must match a real due date', () => {
  const q = V.premSchedule({ prem: { amt: 5000, freq: 'quarterly', start: '2026-01-01', yrs: 2 } });
  assert.strictEqual(q.length, 8); assert.strictEqual(q[1].date, '2026-04-01');
  assert.strictEqual(V.premSchedule({ prem: { amt: 90000, freq: 'single', start: '2026-05-10', yrs: 9 } }).length, 1);
  const c = V.clean([mk({ prem: { amt: 5000, freq: 'quarterly', start: '2026-01-01', yrs: 2 }, paid: { '2026-01-01': 1, '1999-01-01': 1, junk: 1 } })]);
  same(c[0].paid, { '2026-01-01': 1 });
});
t('premium totals: overdue and remaining', () => {
  const p = V.clean([mk({ prem: { amt: 1000, freq: 'monthly', start: '2020-01-01', yrs: 1 }, paid: { '2020-01-01': 1 } })])[0], T = V.premTotals(p);
  assert.strictEqual(T.count, 12); assert.strictEqual(T.total, 12000); assert.strictEqual(T.paid, 1000); assert.strictEqual(T.overdue, 11); assert.strictEqual(T.remaining, 11000);
});
t('status', () => {
  assert.strictEqual(V.status(mk(), '2020-01-01'), 'upcoming'); assert.strictEqual(V.status(mk(), '2030-01-01'), 'payout'); assert.strictEqual(V.status(mk(), '2040-01-01'), 'matured');
  assert.strictEqual(V.status(mk({ prem: { amt: 1, freq: 'yearly', start: '2020-01-01', yrs: 3 } }), '2025-01-01'), 'paying');
});
t('an old-format policy is stored unchanged (no new fields appear)', () => {
  const old = [{ id: 'a', name: 'Old', amt: 1000, freq: 'monthly', start: '2026-01-01', yrs: 2, lump: 5000, note: 'n' }];
  const c = V.clean(JSON.parse(JSON.stringify(old))); same(JSON.parse(JSON.stringify(c)), old);
});
t('cleaning is idempotent and rejects bad data', () => {
  const raw = [mk({ name: '  Tata   AIG ', note: 'x\r\ny' }), { name: '', amt: 5, start: '2026-01-01' }, { name: 'bad date', amt: 5, start: '2026-02-31' }, { name: 'nothing', amt: 0, lump: 0, start: '2026-01-01' }];
  const a = V.clean(raw), b = V.clean(JSON.parse(JSON.stringify(a)));
  assert.strictEqual(a.length, 1); assert.strictEqual(a[0].name, 'Tata AIG'); assert.strictEqual(a[0].note, 'x\ny'); same(a, b);
});
t('a premium-only policy (term plan) is allowed and borrows its dates from the premium', () => {
  const c = V.clean([{ name: 'Term', prem: { amt: 12000, freq: 'yearly', start: '2025-04-01', yrs: 20 } }]);
  assert.strictEqual(c.length, 1); assert.strictEqual(c[0].amt, 0); assert.strictEqual(c[0].start, '2025-04-01'); assert.strictEqual(c[0].yrs, 20);
  assert.strictEqual(V.schedule(c[0]).length, 0); assert.strictEqual(V.premSchedule(c[0]).length, 20);
});
t('LIC maturity benefits accept individually dated amounts and retain the independent premium term', () => {
  const benefits = [
    { date: '2028-11-21', amt: 75000 }, { date: '2029-11-21', amt: 30000 },
    { date: '2030-11-21', amt: 30000 }, { date: '2031-11-21', amt: 30000 },
    { date: '2032-11-21', amt: 30000 }, { date: '2033-11-21', amt: 150000 }
  ];
  const lic = V.clean([{ name: 'LIC', prem: { amt: 12000, freq: 'yearly', start: '2012-11-21', yrs: 17 }, maturities: benefits }])[0];
  const schedule = V.schedule(lic), total = V.totals(lic), maturity = V.maturity(lic);
  assert.strictEqual(V.premSchedule(lic).length, 17);
  assert.strictEqual(schedule.length, 6);
  same(schedule.map(e => [e.date, e.amt, e.kind]), benefits.map(e => [e.date, e.amt, 'maturity']));
  assert.strictEqual(total.pay, 0); assert.strictEqual(total.lump, 345000);
  assert.strictEqual(maturity.date, '2033-11-21'); assert.strictEqual(maturity.amount, 150000);
  assert.strictEqual(maturity.benefit, 345000); assert.strictEqual(maturity.net, 141000);
  const single = V.clean([{ name: 'Single maturity', start: '2028-11-21', maturities: [{ date: '2028-11-21', amt: 75000 }] }])[0];
  assert.strictEqual(V.maturity(single).date, '2028-11-21'); assert.strictEqual(V.maturity(single).amount, 75000);

  const state = { start: 2028, polGp: true, policies: [lic] }, rows = Array.from({ length: 8 }, () => ({}));
  V.applyToRows(state, rows);
  assert.strictEqual(rows[1].pay, 75000); assert.strictEqual(rows[1].payL, 75000);
  assert.strictEqual(rows[2].pay, 30000); assert.strictEqual(rows[6].pay, 150000);
  win.__setS(state);
  assert.strictEqual(V.events().filter(e => e.kind === 'maturity').length, 6);
  assert.strictEqual(V.byFinancialYear().find(r => r.fy === 2028).lump, 75000);
  assert.strictEqual(V.payoutMatrix().rows.find(r => r.year === 2028).vals.LIC, 75000);
});
t('at most 30 policies; ids stay unique', () => {
  const many = Array.from({ length: 40 }, (_, i) => mk({ id: 'same', name: 'P' + i })), c = V.clean(many);
  assert.strictEqual(c.length, 30); assert.strictEqual(new Set(c.map(x => x.id)).size, 30);
});
t('put / setPaid / remove change the plan', () => {
  win.__setS({ policies: [], polFh: true, polGp: true, start: 2026 });
  const r = V.put({ name: 'New', amt: 10, freq: 'yearly', start: '2027-01-01', yrs: 2, prem: { amt: 100, freq: 'yearly', start: '2026-01-01', yrs: 2 } }, null);
  assert.ok(r.ok && V.count() === 1);
  assert.ok(V.setPaid(0, '2026-01-01', true)); same(V.get(0).paid, { '2026-01-01': 1 });
  assert.ok(!V.setPaid(0, '2030-05-05', true)); assert.ok(V.setPaid(0, '2026-01-01', false)); assert.strictEqual(V.get(0).paid, undefined);
  assert.ok(V.remove(0) && V.count() === 0);
});
t('cleanState sets both switches on by default and keeps an explicit off', () => {
  const s = {}; V.cleanState({ policies: [mk()] }, s); assert.strictEqual(s.polFh, true); assert.strictEqual(s.polGp, true);
  V.cleanState({ policies: [], polFh: false, polGp: false }, s); assert.strictEqual(s.polFh, false); assert.strictEqual(s.polGp, false);
});
t('Policy clients keep policies separate and share only with selected planner clients', () => {
  const state = {
    policies: [], polGp: true, polFh: true, start: 2026,
    gpp: { active: 'goal-a', profiles: { 'goal-a': { name: 'Alice' }, 'goal-b': { name: 'Bob' } } },
    fhp: { active: 'ret-a', profiles: { 'ret-a': { name: 'Alice' }, 'ret-b': { name: 'Bob' } } }
  };
  V.cleanClients({ active: 'policy-a', profiles: {
    'policy-a': { name: 'Alice policies', policies: [mk()], share: { goal: ['goal-a'], retirement: ['ret-a'] }, enabled: { goal: true, retirement: true } },
    'policy-b': { name: 'Bob policies', policies: [mk({ id: 'b', name: 'Bob policy', amt: 2000 })], share: { goal: ['goal-b'], retirement: ['ret-b'] }, enabled: { goal: true, retirement: true } }
  } }, { polGp: true, polFh: true }, state);
  win.__setS(state);
  const rows = Array.from({ length: 20 }, () => ({}));
  V.applyToRows(state, rows);
  assert.strictEqual(rows[2].pay, 94000);
  assert.strictEqual(win.__vrExtraStreams(2030)[0].name, 'Policy: Tata');

  state.gpp.active = 'goal-b'; state.fhp.active = 'ret-b';
  const bobRows = Array.from({ length: 20 }, () => ({}));
  V.applyToRows(state, bobRows);
  assert.strictEqual(bobRows[2].pay, 2000);
  assert.strictEqual(win.__vrExtraStreams(2030)[0].name, 'Policy: Bob policy');

  assert.ok(V.selectClient('policy-a'));
  assert.strictEqual(V.list()[0].name, 'Tata');
  assert.ok(V.setClients('goal', ['goal-b', 'not-a-client']));
  assert.strictEqual(V.clients()[0].share.goal.length, 1);
  state.gpp.active = 'goal-a';
  const unshared = Array.from({ length: 20 }, () => ({}));
  V.applyToRows(state, unshared);
  assert.ok(unshared.every(r => !r.pay));
});
t('legacy Goal Planner policy records migrate to independent Policy clients', () => {
  const state = {
    policies: [], polGp: true, polFh: true,
    gpp: { active: 'alice', profiles: { alice: { name: 'Alice', d: { policies: V.clean([mk()]) } } } },
    fhp: { active: 'ret-alice', profiles: { 'ret-alice': { name: 'Alice' } } }
  };
  V.cleanClients(null, { policies: [], polGp: true, polFh: true }, state);
  assert.strictEqual(state.policies.length, 0);
  assert.strictEqual(state.polClients.profiles.alice.policies[0].name, 'Tata');
  same(state.polClients.profiles.alice.share, { goal: ['alice'], retirement: ['ret-alice'] });
});
t('new Policy clients start empty and switching isolates their policies', () => {
  win.__setS({ policies: [], polGp: true, polFh: true });
  assert.strictEqual(V.clients()[0].name, 'My policies');
  const added = V.addClient('  Alice   Smith  ');
  assert.ok(added.ok); assert.strictEqual(V.clients().find(c => c.active).name, 'Alice Smith');
  assert.ok(V.put(mk({ name: 'Alice policy' }), null).ok);
  assert.ok(V.selectClient('my-policies'));
  assert.strictEqual(V.count(), 0);
  assert.ok(V.selectClient(added.id));
  assert.strictEqual(V.count(), 1);
  assert.ok(V.renameClient(added.id, 'Alice S.').ok);
});
t('Policies sharing lists existing Goal and Retirement Planner clients', () => {
  win.__setS({
    polClients: { active: 'policy-a', profiles: { 'policy-a': {
      name: 'Policy client', policies: [], enabled: { goal: false, retirement: false },
      share: { goal: ['goal-a'], retirement: ['ret-a'] }
    } } },
    gpp: { active: 'goal-a', profiles: { 'goal-a': { name: 'Goal client' } } },
    fhp: { active: 'ret-a', profiles: { 'ret-a': { name: 'Retirement client' } } }
  });
  const goal = shareClients('goal', 'Goal Planner');
  const retirement = shareClients('retirement', 'Retirement Planner');
  assert.ok(goal.includes('Goal client') && goal.includes('value="goal-a"') && goal.includes(' checked'));
  assert.ok(!goal.includes(' hidden'), 'Goal Planner client choices remain visible while sharing is off');
  assert.ok(!goal.includes('No Goal Planner clients are available yet.'));
  assert.ok(retirement.includes('Retirement client') && retirement.includes('value="ret-a"') && retirement.includes(' checked'));
  assert.ok(!retirement.includes(' hidden'), 'Retirement Planner client choices remain visible while sharing is off');
  assert.ok(!retirement.includes('No Retirement Planner clients are available yet.'));
});
t('Policy client lists use planner APIs when client profiles are initialized lazily', () => {
  win.__setS({ gpp: null, fhp: null });
  win.gppClientList = () => [{ id: 'goal-a', name: 'Goal client' }];
  win.fhpClientList = () => [{ id: 'ret-a', name: 'Retirement client' }];
  assert.strictEqual(V.plannerClients('goal')[0].name, 'Goal client');
  assert.strictEqual(V.plannerClients('retirement')[0].name, 'Retirement client');
  delete win.gppClientList;
  delete win.fhpClientList;
});
console.log('\n' + n + ' checks passed' + (process.exitCode ? ' (some FAILED)' : ''));
