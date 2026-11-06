// Vriddhi: authenticated user and role administration.
// The service-role key remains on Supabase; role checks are performed here and in database RLS.
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const MIN_PW = 8, MAX_PW = 72;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLE_ID_RE = /^[a-z][a-z0-9_]{2,39}$/;
const SYSTEM_ROLE_IDS = new Set(["super_admin", "admin", "financial_adviser", "client", "read_only"]);

type AdminClient = ReturnType<typeof createClient>;
type RoleInfo = { role_id: string; name: string; description: string; is_system: boolean; permissions: string[] };
type Caller = { id: string; permissions: Set<string>; role: RoleInfo };

function send(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
const fail = (status: number, error: string) => send(status, { error });

function roleSaveFailure(error: { code?: string; message?: string }, action: string): Response {
  console.error(`Could not ${action} user type:`, error);
  if (error.code === "PGRST202" || error.code === "42883") {
    return fail(500, "The user-type database function is missing or outdated. Run the latest supabase/schema.sql, then redeploy the manage-users Edge Function.");
  }
  if (error.code === "23505") return fail(409, "A user type with that name or identifier already exists.");
  return fail(500, "Supabase could not save this user type. Check the manage-users Edge Function logs for the database error.");
}

async function roleInfo(admin: AdminClient, roleId: string): Promise<RoleInfo | null> {
  const { data: role, error } = await admin.from("app_roles")
    .select("role_id,name,description,is_system").eq("role_id", roleId).maybeSingle();
  if (error) throw new Error("Could not load role definitions.");
  if (!role) return null;
  const { data: rows, error: permissionError } = await admin.from("app_role_permissions")
    .select("permission_key").eq("role_id", roleId);
  if (permissionError) throw new Error("Could not load role permissions.");
  return { ...role, permissions: (rows || []).map((row: { permission_key: string }) => row.permission_key) };
}

async function callerInfo(admin: AdminClient, id: string): Promise<Caller | null> {
  const { data: assignment, error } = await admin.from("app_user_roles")
    .select("role_id").eq("user_id", id).maybeSingle();
  if (error) throw new Error("Role lookup failed. Run the latest supabase/schema.sql.");
  if (!assignment) return null;
  const role = await roleInfo(admin, assignment.role_id);
  return role ? { id, role, permissions: new Set(role.permissions) } : null;
}

function canAssign(caller: Caller, role: RoleInfo): boolean {
  if (role.role_id === "super_admin" && !caller.permissions.has("manage_system_roles")) return false;
  return role.permissions.every((permission) => caller.permissions.has(permission));
}

function minimumPasswordLength(role: RoleInfo): number {
  return role.permissions.includes("manage_users") ? 14 : MIN_PW;
}

async function checkPassword(password: unknown, minimum = MIN_PW): Promise<string | null> {
  if (typeof password !== "string" || password.length < minimum || password.length > MAX_PW) {
    return `Password must be ${minimum} to ${MAX_PW} characters.`;
  }
  if (new TextEncoder().encode(password).length > MAX_PW) return `Password must be at most ${MAX_PW} bytes.`;
  return null;
}

async function ensureNotLastSuperAdmin(admin: AdminClient, userId: string, nextRoleId: string) {
  if (nextRoleId === "super_admin") return true;
  const current = await callerInfo(admin, userId);
  if (current?.role.role_id !== "super_admin") return true;
  const { count, error } = await admin.from("app_user_roles")
    .select("user_id", { count: "exact", head: true }).eq("role_id", "super_admin");
  if (error) throw new Error("Could not verify Super Admin accounts.");
  return (count || 0) > 1;
}

export async function handle(req: Request, admin: AdminClient): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return fail(405, "Method not allowed.");

  const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.get("Authorization") || "");
  if (!bearer) return fail(401, "Not signed in.");
  const { data: who, error: whoError } = await admin.auth.getUser(bearer[1]);
  if (whoError || !who?.user) return fail(401, "Not signed in.");
  const me = who.user.id;

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail(400, "Bad request.");
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(400, "Bad request.");
  }

  try {
    const caller = await callerInfo(admin, me);
    if (!caller) return fail(403, "No role is assigned to this account. Contact your Super Admin.");
    const action = String(body.action || "");

    if (action === "context") {
      return send(200, {
        user_id: caller.id,
        role_id: caller.role.role_id,
        role_name: caller.role.name,
        permissions: [...caller.permissions],
      });
    }

    if (action === "list") {
      if (!caller.permissions.has("manage_users")) return fail(403, "You cannot manage users.");
      const { data: roleRows, error: rolesError } = await admin.from("app_roles")
        .select("role_id,name,description,is_system").order("name");
      if (rolesError) return fail(500, "Could not list user types.");
      const loadedRoles = await Promise.all((roleRows || []).map(async (role: Omit<RoleInfo, "permissions">) => {
        const info = await roleInfo(admin, role.role_id);
        return info;
      }));
      const roles = loadedRoles.filter((role: RoleInfo | null): role is RoleInfo => !!role);
      const { data: assignments, error: assignmentsError } = await admin.from("app_user_roles")
        .select("user_id,role_id");
      if (assignmentsError) return fail(500, "Could not list user roles.");
      let permissions: { permission_key: string; description: string }[] | undefined;
      if (caller.permissions.has("manage_roles")) {
        const { data, error } = await admin.from("app_permissions")
          .select("permission_key,description").order("permission_key");
        if (error) return fail(500, "Could not list role permissions.");
        permissions = data || [];
      }
      const assigned = new Map<string, string>();
      (assignments || []).forEach((row: { user_id: string; role_id: string }) =>
        assigned.set(row.user_id, row.role_id));
      const users: unknown[] = [];
      for (let page = 1; ; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) return fail(500, "Could not list users.");
        const pageUsers = data?.users || [];
        for (const user of pageUsers) {
          const roleId = assigned.get(user.id) || "client";
          const role = roles.find((item) => item.role_id === roleId);
          users.push({
            id: user.id,
            email: user.email || "",
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at || null,
            role_id: roleId,
            role_name: role?.name || "Unassigned",
            manageable: !!role && canAssign(caller, role),
          });
        }
        if (pageUsers.length < 200) break;
      }
      return send(200, {
        users,
        roles: roles.filter((role) => canAssign(caller, role)),
        all_roles: caller.permissions.has("manage_roles")
          ? roles.filter((role) => canAssign(caller, role))
          : undefined,
        permissions,
      });
    }

    if (action === "create" || action === "reset" || action === "delete" || action === "assign") {
      if (!caller.permissions.has("manage_users")) return fail(403, "You cannot manage users.");
      if (action === "create") {
        const email = String(body.email || "").trim().toLowerCase();
        if (!EMAIL_RE.test(email) || email.length > 254) return fail(400, "Enter a valid email address.");
        const roleId = typeof body.role_id === "string" ? body.role_id : "client";
        const role = await roleInfo(admin, roleId);
        if (!role || !canAssign(caller, role)) return fail(403, "You cannot assign that user type.");
        const passwordError = await checkPassword(body.password, minimumPasswordLength(role));
        if (passwordError) return fail(400, passwordError);
        const { data, error } = await admin.auth.admin.createUser({
          email, password: body.password as string, email_confirm: true,
        });
        if (error || !data.user) {
          const duplicate = /already|registered|exists/i.test(error?.message || "");
          return fail(duplicate ? 409 : 400, duplicate ? "A login with this email already exists." : "Could not create the login.");
        }
        const { error: assignmentError } = await admin.from("app_user_roles").insert({
          user_id: data.user.id, role_id: roleId, assigned_by: me,
        });
        if (assignmentError) {
          const { error: cleanupError } = await admin.auth.admin.deleteUser(data.user.id);
          if (cleanupError) return fail(500, "The account was created but its role could not be saved or rolled back. Contact your Super Admin.");
          return fail(500, "Could not assign the selected user type; the new account was removed.");
        }
        return send(200, { id: data.user.id, email: data.user.email, role_id: roleId });
      }

      const id = String(body.id || "");
      if (!UUID_RE.test(id)) return fail(400, "Bad request.");
      if (id === me) return fail(400, "You cannot change your own account here.");
      const target = await callerInfo(admin, id);
      if (!target) return fail(404, "User not found or has no assigned role.");
      if (!canAssign(caller, target.role)) return fail(403, "You cannot manage this account.");

      if (action === "assign") {
        if (!caller.permissions.has("assign_roles")) return fail(403, "You cannot assign user types.");
        const roleId = String(body.role_id || "");
        const nextRole = await roleInfo(admin, roleId);
        if (!nextRole || !canAssign(caller, nextRole)) return fail(403, "You cannot assign that user type.");
        if (!await ensureNotLastSuperAdmin(admin, id, roleId)) {
          return fail(409, "At least one Super Admin must remain assigned.");
        }
        const { error } = await admin.from("app_user_roles").update({
          role_id: roleId, assigned_by: me, assigned_at: new Date().toISOString(),
        }).eq("user_id", id);
        if (error) return fail(500, "Could not assign the user type.");
        return send(200, { ok: true });
      }
      if (action === "reset") {
        const passwordError = await checkPassword(body.password, minimumPasswordLength(target.role));
        if (passwordError) return fail(400, passwordError);
        const { error } = await admin.auth.admin.updateUserById(id, { password: body.password as string });
        if (error) return fail(400, "Could not reset the password.");
        return send(200, { ok: true });
      }
      if (target.role.role_id === "super_admin" && !await ensureNotLastSuperAdmin(admin, id, "")) {
        return fail(409, "At least one Super Admin must remain assigned.");
      }
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return fail(400, "Could not remove the login.");
      return send(200, { ok: true });
    }

    if (action === "create_role" || action === "update_role" || action === "delete_role") {
      if (!caller.permissions.has("manage_roles")) return fail(403, "You cannot manage user types.");
      const roleId = String(body.role_id || "");
      if (action === "create_role") {
        const name = String(body.name || "").trim();
        const description = String(body.description || "").trim();
        const permissions = Array.isArray(body.permissions) ? [...new Set(body.permissions)] : [];
        if (!name || name.length > 60 || description.length > 240) return fail(400, "Enter a valid user type name and description.");
        if (!ROLE_ID_RE.test(roleId) || SYSTEM_ROLE_IDS.has(roleId)) return fail(400, "Choose a valid custom role identifier.");
        const { data: known, error: permissionError } = await admin.from("app_permissions").select("permission_key");
        if (permissionError) return fail(500, "Could not validate user-type permissions.");
        const knownPermissions = new Set((known || []).map((item: { permission_key: string }) => item.permission_key));
        if (permissions.some((item: unknown) => typeof item !== "string" || !knownPermissions.has(item)) ||
            permissions.some((item: string) => !caller.permissions.has(item))) {
          return fail(403, "A custom user type cannot receive permissions you do not have.");
        }
        const { error } = await admin.rpc("save_app_role", {
          p_role_id: roleId, p_name: name, p_description: description,
          p_permissions: permissions, p_create: true,
        });
        if (error) return roleSaveFailure(error, "create");
        return send(200, { ok: true, role_id: roleId });
      }
      const role = await roleInfo(admin, roleId);
      if (!role) return fail(404, "User type not found.");
      if (role.is_system) return fail(403, "Built-in user types cannot be changed.");
      if (!canAssign(caller, role)) return fail(403, "You cannot manage this user type.");
      if (action === "delete_role") {
        if (role.is_system) return fail(403, "Built-in user types cannot be deleted.");
        const { count, error } = await admin.from("app_user_roles")
          .select("user_id", { count: "exact", head: true }).eq("role_id", roleId);
        if (error) return fail(500, "Could not check whether the user type is assigned.");
        if ((count || 0) > 0) return fail(409, "Reassign users before deleting this user type.");
        const { error: deleteError } = await admin.from("app_roles").delete().eq("role_id", roleId);
        if (deleteError) return fail(500, "Could not delete the user type.");
        return send(200, { ok: true });
      }
      const name = String(body.name || "").trim();
      const description = String(body.description || "").trim();
      const permissions = Array.isArray(body.permissions) ? [...new Set(body.permissions)] : [];
      if (!name || name.length > 60 || description.length > 240) return fail(400, "Enter a valid user type name and description.");
      if (permissions.some((permission: unknown) =>
        typeof permission !== "string" || !caller.permissions.has(permission))) {
        return fail(403, "A user type cannot receive permissions you do not have.");
      }
      const { data: known, error: permissionError } = await admin.from("app_permissions").select("permission_key");
      if (permissionError) return fail(500, "Could not validate user-type permissions.");
      const knownPermissions = new Set((known || []).map((item: { permission_key: string }) => item.permission_key));
      if (permissions.some((permission: string) => !knownPermissions.has(permission))) return fail(400, "Unknown permission.");
      const { error: updateError } = await admin.rpc("save_app_role", {
        p_role_id: roleId, p_name: name, p_description: description,
        p_permissions: permissions, p_create: false,
      });
      if (updateError) return roleSaveFailure(updateError, "update");
      return send(200, { ok: true });
    }

    return fail(400, "Unknown action.");
  } catch (error) {
    console.error("User administration failed:", error);
    return fail(500, error instanceof Error ? error.message : "User administration failed.");
  }
}

if (import.meta.main !== false && typeof Deno !== "undefined" && Deno.serve) {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  Deno.serve((req: Request) => handle(req, admin));
}
