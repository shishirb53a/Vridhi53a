#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'modules/auth/login.css'), 'utf8');
const loginStart = html.indexOf('<div id="lg"');
const loginEnd = html.indexOf('<header class="hd">', loginStart);
assert.ok(loginStart >= 0 && loginEnd > loginStart, 'Login page markup exists');
const loginPage = html.slice(loginStart, loginEnd);

assert.ok(html.includes('href="modules/auth/login.css?v=152"'),
  'Login presentation stylesheet is loaded');
assert.ok(!html.includes('modules/auth/login.js'),
  'No story or voice script is loaded on the login page');
assert.ok(loginPage.includes('id="lgf"') &&
  loginPage.includes('id="lu"') &&
  loginPage.includes('id="lp"') &&
  loginPage.includes('id="lgt">Sign in</h1>') &&
  loginPage.includes('>Sign in</button>'),
  'The sign-in form and credential fields remain available');
assert.ok(!/<(?:img|svg)\b/i.test(loginPage) &&
  !/family-story|vr-story|voice|narration/i.test(loginPage),
  'The login page contains no artwork, story controls, or voice narration');
assert.ok(styles.includes('flex-direction: column') &&
  styles.includes('width: min(420px, 100%)') &&
  styles.includes('@media (max-width: 420px)'),
  'Sign-in card is single-column and responsive');
assert.ok(!fs.existsSync(path.join(root, 'modules/auth/family-story.svg')) &&
  !fs.existsSync(path.join(root, 'modules/auth/login.js')),
  'Removed story artwork and login story script are not present');

console.log('  ok   login page contains only the responsive sign-in form');
