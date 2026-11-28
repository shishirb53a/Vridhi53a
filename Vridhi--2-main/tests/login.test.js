#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'modules/auth/login.css'), 'utf8');
const loginStart = html.indexOf('<body><div id="lg"');
const loginEnd = html.indexOf('<header class="hd">', loginStart);
assert.ok(loginStart >= 0 && loginEnd > loginStart, 'Login page markup exists');
const loginPage = html.slice(loginStart, loginEnd);

assert.ok(html.includes('href="modules/auth/login.css?v=153"'),
  'Current login presentation stylesheet is loaded');
assert.ok(!html.includes('modules/auth/login.js'),
  'No story or voice script is loaded on the login page');
assert.ok(loginPage.includes('id="lgf"') &&
  loginPage.includes('id="lu"') &&
  loginPage.includes('id="lp"') &&
  loginPage.includes('id="lgt">Sign in to your account</h1>') &&
  loginPage.includes('>Sign in</button>'),
  'The accessible sign-in form and credential fields remain available');
assert.ok(!/<(?:img|svg)\b/i.test(loginPage) &&
  !/family-story|vr-story|voice|narration|class="lgc"/i.test(loginPage),
  'The login page has no promotional artwork, feature list, or narration');
assert.ok(loginPage.includes('aria-label="Email"') &&
  loginPage.includes('aria-label="Password"') &&
  loginPage.includes('aria-live="polite"'),
  'Credential fields and authentication errors have accessible labels');
assert.ok(styles.includes('width: min(420px, 100%)') &&
  styles.includes('@media (max-width: 480px)') &&
  styles.includes('prefers-reduced-motion') &&
  styles.includes(':focus-visible'),
  'Sign-in card is responsive, keyboard accessible and motion-aware');
assert.ok(styles.includes('#205b43') && styles.includes('font-weight: 400'),
  'Login presentation uses the forest-green accent and restrained typography');

const apJs = fs.readFileSync(path.join(root, 'modules/theme/appearance-pro.js'), 'utf8');
assert.ok(!apJs.includes('lg-thbar') && !apJs.includes('lg-thmode') && !apJs.includes('data-lg-theme') && !styles.includes('lg-thbar'),
  'Login screen does not mount the floating theme or mode switcher');

console.log('  ok   login page uses the minimal responsive sign-in presentation');
