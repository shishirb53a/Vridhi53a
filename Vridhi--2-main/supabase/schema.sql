-- Vriddhi production database (Supabase / PostgreSQL)
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create table if not exists public.app_docs (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  path       text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, path)
);

-- Row Level Security: a signed-in user can only touch their own rows.
alter table public.app_docs enable row level security;

drop policy if exists "own rows: read"   on public.app_docs;
drop policy if exists "own rows: insert" on public.app_docs;
drop policy if exists "own rows: update" on public.app_docs;
drop policy if exists "own rows: delete" on public.app_docs;

-- No access at all for the anonymous (not signed in) role.
revoke all on public.app_docs from anon;
grant select, insert, update, delete on public.app_docs to authenticated;

-- ---------------------------------------------------------------------------
-- Advisers (who may manage client logins from the Users tab). Safe to re-run.
create table if not exists public.advisers (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.advisers enable row level security;
drop policy if exists "own adviser row: read" on public.advisers;
create policy "own adviser row: read" on public.advisers for select to authenticated using (auth.uid() = user_id);
-- A login can only check whether IT is an adviser. Nobody can add advisers through the app.
revoke all on public.advisers from anon, authenticated;
grant select on public.advisers to authenticated;

-- ---------------------------------------------------------------------------
-- Database-backed RBAC. Run this schema again to migrate existing logins.
create table if not exists public.app_permissions (
  permission_key text primary key,
  description    text not null
);

create table if not exists public.app_roles (
  role_id     text primary key,
  name        text not null unique,
  description text not null default '',
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.app_role_permissions (
  role_id       text not null references public.app_roles (role_id) on delete cascade,
  permission_key text not null references public.app_permissions (permission_key) on delete cascade,
  primary key (role_id, permission_key)
);

create table if not exists public.app_user_roles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role_id     text not null references public.app_roles (role_id) on delete restrict,
  assigned_by uuid references auth.users (id) on delete set null,
  assigned_at timestamptz not null default now()
);
create index if not exists app_user_roles_role_id on public.app_user_roles (role_id);

create or replace function public.keep_super_admin_assigned()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.role_id = 'super_admin' and
     (tg_op = 'DELETE' or new.role_id <> 'super_admin') then
    perform pg_advisory_xact_lock(hashtext('vriddhi:super_admin_assignment'));
    if not exists (
      select 1 from public.app_user_roles
      where role_id = 'super_admin' and user_id <> old.user_id
    ) then
      raise exception 'At least one Super Admin must remain assigned.'
        using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists keep_super_admin_assigned on public.app_user_roles;
create trigger keep_super_admin_assigned
  before update of role_id or delete on public.app_user_roles
  for each row execute function public.keep_super_admin_assigned();

insert into public.app_permissions (permission_key, description) values
  ('read_data', 'View application data'),
  ('write_data', 'Create and change application data'),
  ('manage_users', 'Create, update and remove user accounts'),
  ('assign_roles', 'Assign roles to user accounts'),
  ('manage_roles', 'Create and manage custom user types'),
  ('manage_system_roles', 'Assign and manage Super Admin accounts'),
  ('access_goal_planner', 'Open the Goal Planner section'),
  ('access_retirement_planner', 'Open the Retirement Planner section'),
  ('access_policies', 'Open the Policies section'),
  ('access_settings', 'Open the Settings section')
on conflict (permission_key) do update set description = excluded.description;

insert into public.app_roles (role_id, name, description, is_system) values
  ('super_admin', 'Super Admin', 'Full access, including Super Admin assignments and custom user types.', true),
  ('admin', 'Admin', 'Manage users, custom user types and application data.', true),
  ('financial_adviser', 'Financial Adviser', 'Manage client accounts and application data.', true),
  ('client', 'Client / Individual User', 'Manage a private application workspace.', true),
  ('read_only', 'Read-Only User', 'View application data without changing it.', true)
on conflict (role_id) do update
set name = excluded.name, description = excluded.description, is_system = true;

insert into public.app_role_permissions (role_id, permission_key)
select 'super_admin', permission_key from public.app_permissions
on conflict do nothing;

insert into public.app_role_permissions (role_id, permission_key) values
  ('admin', 'read_data'), ('admin', 'write_data'), ('admin', 'manage_users'),
  ('admin', 'assign_roles'), ('admin', 'manage_roles'),
  ('admin', 'access_goal_planner'), ('admin', 'access_retirement_planner'),
  ('admin', 'access_policies'), ('admin', 'access_settings'),
  ('financial_adviser', 'read_data'), ('financial_adviser', 'write_data'),
  ('financial_adviser', 'manage_users'), ('financial_adviser', 'assign_roles'),
  ('financial_adviser', 'access_goal_planner'), ('financial_adviser', 'access_retirement_planner'),
  ('financial_adviser', 'access_policies'), ('financial_adviser', 'access_settings'),
  ('client', 'read_data'), ('client', 'write_data'),
  ('client', 'access_goal_planner'), ('client', 'access_retirement_planner'),
  ('client', 'access_policies'), ('client', 'access_settings'),
  ('read_only', 'read_data'),
  ('read_only', 'access_goal_planner'), ('read_only', 'access_retirement_planner'),
  ('read_only', 'access_policies'), ('read_only', 'access_settings')
on conflict do nothing;

-- Existing adviser accounts retain their user-management access. Every other
-- existing login receives the standard individual-client role.
insert into public.app_user_roles (user_id, role_id)
select u.id, case when a.user_id is not null then 'financial_adviser' else 'client' end
from auth.users u
left join public.advisers a on a.user_id = u.id
on conflict (user_id) do nothing;
update public.app_user_roles ur set role_id = 'financial_adviser', assigned_at = now()
where exists (select 1 from public.advisers a where a.user_id = ur.user_id)
  and ur.role_id = 'client';

create or replace function public.save_app_role(
  p_role_id text,
  p_name text,
  p_description text,
  p_permissions text[],
  p_create boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_role_id is null or p_role_id !~ '^[a-z][a-z0-9_]{2,39}$' or
     p_name is null or length(trim(p_name)) not between 1 and 60 or
     length(coalesce(p_description, '')) > 240 then
    raise exception 'Invalid user type details.' using errcode = '22023';
  end if;
  if p_role_id in ('super_admin', 'admin', 'financial_adviser', 'client', 'read_only') then
    raise exception 'Built-in user types cannot be changed.' using errcode = '42501';
  end if;
  if p_create then
    insert into public.app_roles (role_id, name, description, is_system)
    values (p_role_id, trim(p_name), coalesce(p_description, ''), false);
  else
    update public.app_roles set name = trim(p_name), description = coalesce(p_description, ''),
      updated_at = now()
    where role_id = p_role_id and not is_system;
    if not found then raise exception 'Custom user type not found.' using errcode = 'P0002'; end if;
  end if;
  delete from public.app_role_permissions where role_id = p_role_id;
  insert into public.app_role_permissions (role_id, permission_key)
  select p_role_id, permission_key
  from (select distinct unnest(coalesce(p_permissions, '{}'::text[])) as permission_key) requested;
end;
$$;
revoke all on function public.save_app_role(text, text, text, text[], boolean) from public, anon, authenticated;
grant execute on function public.save_app_role(text, text, text, text[], boolean) to service_role;

create or replace function public.has_app_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.app_user_roles ur
    join public.app_role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = auth.uid()
      and rp.permission_key = required_permission
  );
$$;
revoke all on function public.has_app_permission(text) from public, anon;
grant execute on function public.has_app_permission(text) to authenticated;

alter table public.app_permissions enable row level security;
alter table public.app_roles enable row level security;
alter table public.app_role_permissions enable row level security;
alter table public.app_user_roles enable row level security;
drop policy if exists "authenticated can read permissions" on public.app_permissions;
create policy "authenticated can read permissions" on public.app_permissions
  for select to authenticated using (true);
drop policy if exists "authenticated can read roles" on public.app_roles;
create policy "authenticated can read roles" on public.app_roles
  for select to authenticated using (true);
drop policy if exists "authenticated can read role permissions" on public.app_role_permissions;
create policy "authenticated can read role permissions" on public.app_role_permissions
  for select to authenticated using (true);
drop policy if exists "own user role: read" on public.app_user_roles;
create policy "own user role: read" on public.app_user_roles
  for select to authenticated using (auth.uid() = user_id);

revoke all on public.app_permissions, public.app_roles, public.app_role_permissions,
  public.app_user_roles from anon, authenticated;
grant select on public.app_permissions, public.app_roles, public.app_role_permissions,
  public.app_user_roles to authenticated;

-- After migration, assign the initial Super Admin using the project owner's
-- email in the Supabase SQL editor:
-- update public.app_user_roles ur set role_id = 'super_admin', assigned_at = now()
-- from auth.users u where ur.user_id = u.id and lower(u.email) = lower('you@example.com');

-- Role checks apply to direct REST requests as well as writes made by the app.
drop policy if exists "own rows: read" on public.app_docs;
drop policy if exists "own rows: insert" on public.app_docs;
drop policy if exists "own rows: update" on public.app_docs;
drop policy if exists "own rows: delete" on public.app_docs;
create policy "own rows: read" on public.app_docs for select to authenticated
  using (auth.uid() = user_id and public.has_app_permission('read_data'));
create policy "own rows: insert" on public.app_docs for insert to authenticated
  with check (auth.uid() = user_id and public.has_app_permission('write_data'));
create policy "own rows: update" on public.app_docs for update to authenticated
  using (auth.uid() = user_id and public.has_app_permission('write_data'))
  with check (auth.uid() = user_id and public.has_app_permission('write_data'));
create policy "own rows: delete" on public.app_docs for delete to authenticated
  using (auth.uid() = user_id and public.has_app_permission('write_data'));

-- ---------------------------------------------------------------------------
-- Holding snapshots: dated copies of a login's holdings, searchable by date. Safe to re-run.
create table if not exists public.vr_holding_snapshots (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users (id) on delete cascade,
  label          text        not null default '',
  note           text        not null default '',
  plan           text        not null default '',
  holdings_count integer     not null default 0,
  total_value    numeric     not null default 0,
  data           jsonb       not null check (jsonb_typeof(data) = 'object'),
  created_at     timestamptz not null default now()
);
create index if not exists vr_holding_snapshots_user_created on public.vr_holding_snapshots (user_id, created_at desc);

alter table public.vr_holding_snapshots enable row level security;

-- No access for the anonymous role. Snapshots cannot be edited, only added or deleted.
revoke all on public.vr_holding_snapshots from anon;
grant select, insert, delete on public.vr_holding_snapshots to authenticated;

drop policy if exists "own snapshots: read" on public.vr_holding_snapshots;
drop policy if exists "own snapshots: insert" on public.vr_holding_snapshots;
drop policy if exists "own snapshots: delete" on public.vr_holding_snapshots;
create policy "own snapshots: read" on public.vr_holding_snapshots for select to authenticated
  using (auth.uid() = user_id and public.has_app_permission('read_data'));
create policy "own snapshots: insert" on public.vr_holding_snapshots for insert to authenticated
  with check (auth.uid() = user_id and public.has_app_permission('write_data'));
create policy "own snapshots: delete" on public.vr_holding_snapshots for delete to authenticated
  using (auth.uid() = user_id and public.has_app_permission('write_data'));
