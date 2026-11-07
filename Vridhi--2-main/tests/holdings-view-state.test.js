#!/usr/bin/env node
'use strict';
/* Regression test: View Holding "Collapse all / Expand all" (and single category) state must survive logout/login.
   Login and logout reload the page, which recreates the in-memory UI object, so the state has to be persisted. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'modules', 'app-core', 'app.js'), 'utf8');
const lines = src.split('\n');
const pick = start => { const l = lines.find(x => x.startsWith(start)); assert.ok(l, start + ' exists in app core'); return l; };
const gck = pick('const GCK='), load = pick('function gcLoad'), save = pick('function gcSave');

const env = (user, store) => {
  const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const UI = { gc: {} };
  return new Function('UK', 'UI', 'localStorage', gck + ';' + load + ';' + save + ';return {GCK,gcLoad,gcSave,UI};')(user, UI, localStorage);
};

const store = {};
let a = env('qa', store);
a.UI.gc = { Equity: true, Retirement: true, Cash: false };      // user collapsed two categories, expanded one
a.gcSave();
let b = env('qa', store);                                        // same user logs in again (page reloaded)
assert.deepStrictEqual(b.gcLoad(), { Equity: true, Retirement: true }, 'collapsed categories come back after login');
a.UI.gc = {}; a.gcSave();                                        // Expand all
assert.deepStrictEqual(env('qa', store).gcLoad(), {}, 'Expand all is remembered too');
a.UI.gc = { Equity: true }; a.gcSave();
assert.deepStrictEqual(env('other', store).gcLoad(), {}, 'a different login does not inherit another user\'s state');
assert.ok(/^vr-gc/.test(b.GCK) && !/^(fwt|fs-users)/.test(b.GCK), 'key survives the sign-out wipe of fwt*/fs-users* data');
store['vr-gc-bad'] = '{not json'; assert.deepStrictEqual(env('bad', store).gcLoad(), {}, 'corrupt saved value is ignored');
store['vr-gc-arr'] = '[1,2]';     assert.deepStrictEqual(env('arr', store).gcLoad(), {}, 'non-object saved value is ignored');

/* wiring: restored before the first render (so the Expand/Collapse buttons are drawn on first paint) and saved on every toggle */
assert.ok(src.includes('UI.gc=gcLoad();try{UI.g=localStorage.getItem(\'vr-grp\')!==\'0\'}'), 'state is initialised at startup');
assert.ok(/UI\.gc\[k\]=!UI\.gc\[k\]\}\s*gcSave\(\);/.test(src), 'every category toggle and Expand/Collapse all is saved');
console.log('Holdings collapse/expand state survives logout and login');
