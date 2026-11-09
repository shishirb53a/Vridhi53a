#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const app = read('modules/app-core/app.js');
const auth = read('modules/auth/auth.js');
const ui = read('modules/ai-agent/agent.js');
const edge = read('supabase/functions/vriddhi-agent/index.ts');
const config = read('config.js');

assert.ok(html.includes('modules/ai-agent/agent.css') &&
  html.includes('modules/ai-agent/agent.js'), 'The AI chat UI and styles load from the app shell');
assert.ok(app.includes('window.VR_AI_PLAN=function()') &&
  app.includes('currentValue:x.value') &&
  app.includes('returnRatePct:x.ret*100'), 'The active plan is exposed as a compact read-only snapshot');
assert.ok(ui.includes("access.permissions.includes('read_data')") &&
  ui.includes('window.VR_AI_PLAN()') &&
  ui.includes('window.VRSB.askAgent(question, plan)'),
'The chat requires read_data and sends only the active plan snapshot and question');
assert.ok(auth.includes("C.aiFunction||'vriddhi-agent'") &&
  auth.includes('Authorization:\'Bearer \'+s.at'), 'The Edge Function request uses the signed-in access token');
assert.ok(config.includes('aiFunction: "vriddhi-agent"'), 'The AI function name is configurable');
for (const tool of ['get_plan_overview', 'list_holdings', 'project_holding', 'retirement_gap']) {
  assert.ok(edge.includes(`name: "${tool}"`), `The ${tool} calculation tool is registered`);
}
assert.ok(edge.includes('admin.auth.getUser(bearer[1])') &&
  edge.includes('.eq("permission_key", "read_data")') &&
  edge.includes('You do not have permission to read plan data.'),
'The Edge Function independently verifies the token and read_data permission');
assert.ok(edge.includes('ANTHROPIC_API_KEY') &&
  edge.includes('anthropic-version') &&
  edge.includes('function futureValue('), 'The provider key stays server-side and projections are calculated in code');
assert.ok(!edge.includes('.insert(') && !edge.includes('.update(') && !edge.includes('.delete('),
  'The AI Edge Function has no database write operations');

console.log('AI chat, read permission gates, calculation tools, and no-write boundary are wired');
