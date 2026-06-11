import { allowedRolesForPath, normalizeRole, type Role } from "@/lib/auth/roles";
import { createSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import { isSessionExpired, parseSessionWindow, type SessionWindow, SESSION_WINDOW_COOKIE } from "@/lib/auth/session";

export type AuthContext = {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: Role;
  sessionWindow: SessionWindow;
};

export type CookieStoreLike = {
  getAll(): { name: string; value: string }[];
  get(name: string): { value: string } | undefined;
};

function cookiesToMethods(cookieStore: CookieStoreLike) {
  return {
    getAll() {
      return cookieStore.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value }));
    },
    setAll() {
      return undefined;
    }
  };
}

export async function getServerSessionWindow(cookieStore: CookieStoreLike | Promise<CookieStoreLike>) {
  const resolvedCookieStore = await cookieStore;
  const raw = resolvedCookieStore.get(SESSION_WINDOW_COOKIE)?.value ?? null;
  return parseSessionWindow(raw);
}

export async function getServerAuthContext(cookieStore: CookieStoreLike | Promise<CookieStoreLike>) {
  const resolvedCookieStore = await cookieStore;
  const supabase = createSupabaseServerClient(cookiesToMethods(resolvedCookieStore));
  if (!supabase) return null;

  const sessionWindow = await getServerSessionWindow(resolvedCookieStore);
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user || !sessionWindow || sessionWindow.user_id !== user.id || isSessionExpired(sessionWindow)) {
    return null;
  }

  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  let profile: { full_name?: string | null; email?: string | null } | null = null;
  let roleRows: { role?: string | null } | null = null;

  try {
    const [{ data: profileData }, { data: roleData }] = await Promise.all([
      admin
        .from("profiles")
        .select("full_name,email")
        .eq("id", user.id)
        .maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()
    ]);

    profile = profileData as { full_name?: string | null; email?: string | null } | null;
    roleRows = roleData as { role?: string | null } | null;
  } catch {
    profile = null;
    roleRows = null;
  }

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? null,
    role: normalizeRole(roleRows?.role ?? user.user_metadata?.role),
    sessionWindow
  } satisfies AuthContext;
}

export async function getServerRoleForUser(userId: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) return "viewer" as Role;

  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  const roleRow = data as { role?: string | null } | null;
  return normalizeRole(roleRow?.role);
}

export function canAccessRoute(role: Role, pathname: string) {
  return allowedRolesForPath(pathname).includes(role);
}
