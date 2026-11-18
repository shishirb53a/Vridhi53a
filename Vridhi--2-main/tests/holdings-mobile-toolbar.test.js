#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'modules', 'holdings', 'holdings.css'), 'utf8');
const holdingsPage = app.slice(app.indexOf('function hold(){'), app.indexOf('function rep(){'));

assert.ok(html.includes('modules/app-core/app.js?v=173') &&
  html.includes('modules/holdings/holdings.css?v=158'),
  'Updated app and mobile toolbar styles use refreshed cache versions');
assert.ok(holdingsPage.includes('aria-label="More holding tools"') &&
  holdingsPage.includes('id="mcat" class="hp-cat" aria-label="Manage categories"') &&
  holdingsPage.includes('aria-label="Import CSV"') &&
  holdingsPage.includes('aria-label="Export CSV"'),
  'Icon-only mobile toolbar controls retain accessible names');
assert.ok(styles.includes('.hp-more.open{display:grid}') &&
  styles.includes('html body .hp-card .hp-more .hp-sort,html body .hp-card .hp-more .hp-portfolio-actions{display:contents}') &&
  styles.includes('html body .hp-card .hp-more button span.hp-lbl,html body .hp-card .hp-more button.hp-cat span{display:none!important}'),
  'Mobile tools use a compact icon grid without visible button labels');
