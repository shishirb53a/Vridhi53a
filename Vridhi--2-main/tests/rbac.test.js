#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const schema = fs.readFileSync(path.join(root, 'supabase', 'schema.sql'), 'utf8');
const edge = fs.readFileSync(path.join(root, 'supabase', 'functions', 'manage-users', 'index.ts'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'modules', 'auth', 'auth.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'modules', 'app-core', 'app.js'), 'utf8');
const users = fs.readFileSync(path.join(root, 'modules', 'user-management', 'client-admin.js'), 'utf8');

for (const name of ['Super Admin', 'Admin', 'Financial Adviser', 'Client / Individual User', 'Read-Only User']) {
  assert.ok(schema.includes(`'${name}'`), `The default role ${name} is seeded`);
}
assert.ok(schema.includes("case when a.user_id is not null then 'financial_adviser' else 'client' end"),
  'Existing adviser accounts and individual accounts are migrated to compatible defaults');
assert.ok(schema.includes("public.has_app_permission('write_data')"),
  'Database write policies consult the assigned role permissions');
assert.ok(schema.includes("public.has_app_permission('read_data')"),
  'Database read policies consult the assigned role permissions');
for (const permission of ['access_goal_planner', 'access_retirement_planner', 'access_policies', 'access_settings']) {
  assert.ok(schema.includes(`('${permission}',`), `The ${permission} permission is registered`);
  assert.ok(schema.includes(`'financial_adviser', '${permission}'`) &&
    schema.includes(`'client', '${permission}'`) &&
    schema.includes(`'read_only', '${permission}'`),
  `Existing adviser, client, and read-only roles retain access to ${permission}`);
}
assert.ok(schema.includes('create trigger keep_super_admin_assigned') &&
  schema.includes('grant execute on function public.save_app_role(text, text, text, text[], boolean) to service_role'),
  'Super Admin retention and custom-role updates are enforced atomically in PostgreSQL');
assert.ok(schema.includes('revoke all on public.app_permissions, public.app_roles, public.app_role_permissions,'),
  'Authenticated clients cannot directly edit roles or assignments');

assert.ok(edge.includes('admin.auth.getUser(bearer[1])'), 'The Edge Function verifies the caller token');
assert.ok(edge.includes('caller.permissions.has("manage_users")'), 'User changes require server-verified permission');
assert.ok(edge.includes('caller.permissions.has("manage_roles")'), 'Role management requires server-verified permission');
assert.ok(edge.includes('role.permissions.every((permission) => caller.permissions.has(permission))'),
  'Role assignments cannot grant permissions the administrator does not have');
assert.ok(edge.includes('At least one Super Admin must remain assigned.'),
  'The final Super Admin cannot be removed or demoted');
assert.ok(edge.includes('admin.rpc("save_app_role"'), 'Custom role metadata and permissions are saved transactionally');
assert.ok(edge.includes('function roleSaveFailure(') &&
  edge.includes('error.code === "PGRST202"') &&
  edge.includes('Run the latest supabase/schema.sql, then redeploy the manage-users Edge Function.') &&
  edge.includes('Check the manage-users Edge Function logs for the database error.'),
  'Custom-role save failures identify a missing database function and log other database errors');
assert.ok(!edge.includes('from("advisers")'), 'The legacy adviser table is not the authorization source');

assert.ok(auth.includes('usersCall({action:\'context\'})'), 'The app loads its role from the protected Edge Function');
assert.ok(app.includes("includes('write_data')"), 'The app prevents read-only changes from persisting locally');
assert.ok(app.includes('canManageUsers()'), 'The Users screen is hidden from unauthorized user types');
assert.ok(app.includes('function sectionPermission(tab)') &&
  app.includes('function accessibleTabs()') &&
  app.includes("if(!allowed.includes(UI.tab))"),
  'Top-level sections are permission-gated in navigation and direct tab rendering');
assert.ok(users.includes("action:'assign'") && users.includes("'create_role'"),
  'The Users screen supports role assignment and custom role creation');

console.log('RBAC roles, database policies, privileged actions, and UI gates are wired');
