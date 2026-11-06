#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const login = fs.readFileSync(path.join(root, 'modules/auth/login.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'modules/auth/login.css'), 'utf8');
const artwork = fs.readFileSync(path.join(root, 'modules/auth/family-story.svg'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8');

const cssTag = '<link rel="stylesheet" href="modules/auth/login.css?v=151">';
const scriptTag = '<script src="modules/auth/login.js?v=151"></script>';
assert.ok(html.includes(cssTag), 'Login presentation stylesheet is loaded');
assert.ok(html.includes(scriptTag), 'Login presentation module is loaded');
assert.ok(workflow.includes('login.css?v=${build_number}') &&
  workflow.includes('login.js?v=${build_number}'),
  'Pages builds update login assets to the generated cache version');
assert.ok(html.indexOf(cssTag) > html.indexOf('modules/app-shell/enterprise.css'),
  'Login styles override the shared enterprise login layout');
assert.ok(html.indexOf(scriptTag) > html.indexOf('modules/theme/professional-themes.js'),
  'Login module runs after the sign-in form exists');
assert.ok(!html.includes('f.querySelector(".lbrand")'),
  'Login layout is no longer assembled by inline code');
assert.ok(html.includes('id="lgf"') && html.includes('id="lu"') && html.includes('id="lp"'),
  'Existing sign-in form and credential fields remain in the page');
assert.ok(login.includes('aria-pressed="false"') &&
  login.includes('aria-controls="vr-story-visual"') &&
  login.includes("animation.pause()") && login.includes("animation.play()"),
  'The optional story animation has an accessible play and pause control');
assert.ok(login.includes('aria-label="Story sound, on"') &&
  login.includes('new AudioContext()') && login.includes('playTone(audioContext') &&
  login.includes("audioContext.resume()") && login.includes("audioContext.suspend()"),
  'The story has user-controlled, generated sound with pause and resume support');
assert.ok(login.includes('aria-label="Girl voice narration, on"') &&
  login.includes('new window.SpeechSynthesisUtterance(line.text)') &&
  login.includes('function preferredVoice()') &&
  login.includes('/^en-IN/i.test(voice.lang)&&female.test(voice.name)') &&
  login.includes('utterance.pitch=1.12') &&
  login.includes('stopNarration(true)') &&
  login.includes('speechSynthesis.cancel()'),
  'The story provides a separately controlled feminine-voice narration that pauses with playback');
assert.ok(login.includes('family-story.svg?v=\'+(window.VR_BUILD_NO||150)') &&
  login.includes('young woman, a child and an older woman'),
  'The story uses the original three-generation illustration');
assert.ok(styles.includes('@media (max-width: 760px)') &&
  styles.includes('@media (max-width: 420px)'),
  'Login layout adapts to tablet and phone screens');
assert.ok(artwork.startsWith('<svg') && artwork.includes('viewBox="0 0 720 500"'),
  'Family artwork is a self-contained SVG asset');

console.log('  ok   login presentation preserves sign-in and provides responsive family story');
