#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const adminSource = fs.readFileSync(path.join(root, 'modules', 'user-management', 'client-admin.js'), 'utf8');
const passwordSource = fs.readFileSync(path.join(root, 'modules', 'user-management', 'password-change.js'), 'utf8');
const adminTag = '<script src="modules/user-management/client-admin.js?v=150"></script>';
const passwordTag = '<script src="modules/user-management/password-change.js?v=140"></script>';
const adminPosition = html.indexOf(adminTag);
const passwordPosition = html.indexOf(passwordTag);
assert.ok(adminPosition >= 0 && passwordPosition > adminPosition, 'User management modules load synchronously in their original order');
assert.strictEqual(html.indexOf(adminTag, adminPosition + adminTag.length), -1, 'Client administration module is included only once');
assert.strictEqual(html.indexOf(passwordTag, passwordPosition + passwordTag.length), -1, 'Password module is included only once');
const header = html.slice(html.indexOf('<header class="hd">'), html.indexOf('</header>'));
assert.ok(!header.includes('id="vr-cp"') &&
  /<button[^>]*id="so"[^>]*aria-label="Sign out"[^>]*>\s*<svg[\s\S]*?aria-hidden="true"/.test(header),
'Header removes the Password button and keeps Sign out as an accessible icon-only button');
assert.ok(!html.includes("var st={users:null,err:'',msg:'',loading:false,show:false"), 'Client administration logic is no longer inline');
assert.ok(!html.includes("function $(i){return document.getElementById(i)}function v(i){var x=$(i);return x?x.value:''}"), 'Password-change logic is no longer inline');

function clickListenerTest() {
  const listeners = {};
  const inputs = {
    'vr-um-em': { value: '' },
    'vr-um-pw': { value: '' },
    'vr-um-rp': { value: '', focus() {} },
    'vr-um-role': { value: 'client' },
    'vr-role-name': { value: '' },
    'vr-role-id': { value: '' },
    'vr-role-description': { value: '' }
  };
  let permissionChecks = [
    { key: 'read_data', checked: true },
    { key: 'access_policies', checked: true }
  ];
  const host = {
    set innerHTML(value) { this.html = value; permissionChecks.forEach(check => { check.checked = false; }); },
    get innerHTML() { return this.html || ''; }
  };
  const actions = [];
  let users = [{ id: 'client-1', email: 'client@example.com', role_id: 'client', role_name: 'Client / Individual User', manageable: true, created_at: '2026-01-01' }];
  let roles = [
    { role_id: 'client', name: 'Client / Individual User', permissions: ['read_data'] },
    { role_id: 'read_only', name: 'Read-Only User', permissions: ['read_data'] }
  ];
  const context = {
    window: null,
    document: {
      addEventListener(name, callback) { listeners[name] = callback; },
      getElementById(id) { return id === 'vr-um' ? host : inputs[id] || null; },
      querySelector(selector) { return selector.includes('data-role-user') ? { value: 'read_only' } : null; },
      querySelectorAll() { return permissionChecks.filter(check => check.checked).map(check => ({ getAttribute() { return check.key; } })); }
    },
    VRSB: {
      async isAdviser() { return true; },
      async users(request) {
        actions.push(request);
        if (request.action === 'list') return {
          users,
          roles,
          all_roles: roles,
          permissions: [{ permission_key: 'read_data', description: 'View application data' }]
        };
        if (request.action === 'create') {
          users = users.concat({ id: 'client-2', email: request.email, role_id: request.role_id, role_name: 'Client / Individual User', manageable: true });
        }
        if (request.action === 'create_role') roles = roles.concat({
          role_id: request.role_id, name: request.name, description: request.description,
          permissions: request.permissions
        });
        if (request.action === 'assign') users = users.map(user => user.id === request.id
          ? Object.assign({}, user, { role_id: request.role_id, role_name: 'Read-Only User' }) : user);
        if (request.action === 'delete') users = users.filter(user => user.id !== request.id);
        return {};
      }
    },
    VR_ACCESS: { permissions: ['manage_users', 'assign_roles', 'manage_roles', 'read_data'], user_id: 'admin-1' },
    VR_ADV: true,
    Date,
    setTimeout(callback) { context.load = callback; return 1; },
    confirm() { return true; }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(adminSource, context, { filename: 'client-admin.js' });

  assert.ok(context.usersTab().includes('Users and roles'), 'Users tab renders role-aware account administration');
  return context.load().then(async () => {
    assert.ok(host.innerHTML.includes('client@example.com'), 'Loading lists client logins');
    const click = async (action, data = {}) => listeners.click({
      target: {
        closest(selector) {
          return selector === '[data-um]' ? { dataset: Object.assign({ um: action }, data) } : null;
        }
      }
    });

    await click('add');
    inputs['vr-um-em'].value = ' New.Client@example.com ';
    inputs['vr-um-pw'].value = 'short';
    await click('create');
    assert.ok(host.innerHTML.includes('Password must be 8 to 72 characters for this user type.'), 'Create validates temporary password length');
    inputs['vr-um-pw'].value = 'temporary9';
    await click('create');
    const createAction = actions.find(action => action.action === 'create');
    assert.ok(createAction && createAction.email === 'new.client@example.com' && createAction.password === 'temporary9' && createAction.role_id === 'client',
      'Create normalizes email and submits the selected user type');

    await click('role-new');
    inputs['vr-role-name'].value = 'Read-Only';
    inputs['vr-role-id'].value = 'read_only_custom';
    inputs['vr-role-description'].value = 'View only';
    permissionChecks.forEach(check => { check.checked = true; });
    await click('role-create');
    const roleAction = actions.find(action => action.action === 'create_role');
    assert.ok(roleAction && roleAction.role_id === 'read_only_custom' &&
      roleAction.permissions.includes('read_data') && roleAction.permissions.includes('access_policies'),
      'Role creation captures checked permissions before rerendering the form');

    await click('role-edit', { role: 'read_only_custom' });
    permissionChecks.forEach(check => { check.checked = check.key === 'access_policies'; });
    await click('role-update');
    const updateAction = actions.find(action => action.action === 'update_role');
    assert.ok(updateAction && updateAction.role_id === 'read_only_custom' &&
      updateAction.permissions.length === 1 && updateAction.permissions[0] === 'access_policies',
      'Role editing submits only the checked permissions captured before rerendering');

    await click('assign', { id: 'client-1' });
    assert.ok(actions.some(action => action.action === 'assign' && action.id === 'client-1' && action.role_id === 'read_only'),
      'Authorized administrators can assign a user type to an account');

    await click('reset', { id: 'client-1' });
    inputs['vr-um-rp'].value = 'resetpass9';
    await click('rsave', { id: 'client-1' });
    assert.ok(actions.some(action => action.action === 'reset' && action.id === 'client-1' && action.password === 'resetpass9'), 'Reset saves the selected client password');

    await click('del', { id: 'client-1', email: 'client@example.com' });
    assert.ok(actions.some(action => action.action === 'delete' && action.id === 'client-1'), 'Remove deletes the confirmed client');
  });
}

function passwordChangeTest() {
  const listeners = {};
  const fields = {};
  let modal = null, changed = null, completed = false;
  function field(id) {
    if (!fields[id]) fields[id] = { value: '', textContent: '', type: '', disabled: false, listeners: {}, addEventListener(name, callback) { this.listeners[name] = callback; }, focus() {}, select() {} };
    return fields[id];
  }
  const box = {
    set innerHTML(value) {
      this.html = value;
      if (value.includes('Password changed')) field('vr-cpd');
    }
  };
  const context = {
    window: null,
    document: {
      addEventListener(name, callback) { listeners[name] = callback; },
      removeEventListener() {},
      getElementById(id) { return id === 'vr-cpm' ? modal : field(id); },
      createElement() {
        return {
          set id(value) { this._id = value; modal = this; },
          get id() { return this._id; },
          set innerHTML(value) { this.html = value; },
          addEventListener() {},
          remove() { modal = null; }
        };
      },
      body: { appendChild() {} },
      querySelector() { return box; }
    },
    VRSB: {
      async isAdviser() { return true; },
      async changePassword(current, next) { changed = { current, next }; }
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(passwordSource, context, { filename: 'password-change.js' });
  const open = listeners.click({
    target: { closest(selector) { return selector === '#vr-cp' ? {} : null; } }
  });
  return Promise.resolve(open).then(() => new Promise(resolve => setImmediate(resolve))).then(async () => {
    assert.ok(modal && modal.html.includes('Use 14 or more characters.'), 'Adviser password dialog uses the adviser length rule');
    field('vr-cp0').value = 'current-password';
    field('vr-cp1').value = 'short';
    field('vr-cp2').value = 'short';
    await field('vr-cpv').listeners.click();
    assert.ok(field('vr-cpe').textContent.includes('at least 14'), 'Password change validates adviser password length');

    field('vr-cp1').value = 'a-new-adviser-password';
    field('vr-cp2').value = 'a-new-adviser-password';
    await field('vr-cpv').listeners.click();
    assert.deepStrictEqual(changed, {
      current: 'current-password',
      next: 'a-new-adviser-password'
    }, 'Password change submits current and new passwords');
    assert.ok(box.html.includes('Password changed'), 'Successful password change shows confirmation');
    field('vr-cpd').listeners.click();
    completed = modal === null;
    assert.ok(completed, 'Done closes the password dialog');
  });
}

clickListenerTest()
  .then(passwordChangeTest)
  .then(() =>   console.log('  ok   user management preserves account/password flows and assigns database roles'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
