#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'modules', 'app-shell', 'ux-final.css'), 'utf8');
const clientStyles = fs.readFileSync(path.join(root, 'modules', 'goal-planner-clients', 'client-compare.css'), 'utf8');

assert.ok(html.includes('modules/app-shell/ux-final.css?v=154'),
  'The mobile client-switcher stylesheet uses a refreshed cache version');
assert.ok(styles.includes('"nav nav nav nav" "client client client client"'),
  'The mobile header reserves a full-width row for the client switcher');
assert.ok(styles.includes('#fhp:not(:has(.gpp-client-trigger))') &&
  styles.includes('#fhp:has(.gpp-client-trigger){grid-area:client'),
  'Only the Goal Planner client switcher is exposed in the mobile header');
assert.ok(styles.includes('#fhp .gpp-client-trigger{flex:1 1 auto;width:100%'),
  'The Goal Planner client switcher fills the available mobile width');
assert.ok(clientStyles.includes('grid-template-columns:minmax(0,1fr) minmax(0,1fr)') &&
  clientStyles.includes('td.num{text-align:left;white-space:normal;overflow-wrap:anywhere}'),
  'Mobile client cards can shrink and wrap long plan values');
assert.ok(clientStyles.includes('gpp-drawer-wide{position:fixed;inset:0;display:flex;flex-direction:column;box-sizing:border-box') &&
  clientStyles.includes('height:100dvh') &&
  clientStyles.includes('env(safe-area-inset-top,0px)'),
  'The full-screen client page fits the viewport and respects mobile safe areas');
