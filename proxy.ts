import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { SESSION_WINDOW_COOKIE, isSessionExpired, parseSessionWindow } from "@/lib/auth/session";
import { canAccessPath, getHomePathForRole, normalizeRole } from "@/lib/auth/roles";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const protectedPath = /^\/(dashboard|bolsas|cajas|reporte-diario|gastos|cierres|exportaciones|usuarios|configuracion)(?:\/.*)?$/;

function buildSupabaseClient(request: NextRequest, response: NextResponse) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value }));
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
    },
    cookieOptions: {
      path: "/"
    }
  });
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("reason", "session_expired");
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!protectedPath.test(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = buildSupabaseClient(request, response);
  if (!supabase) {
    return redirectToLogin(request);
  }

  const sessionWindow = parseSessionWindow(request.cookies.get(SESSION_WINDOW_COOKIE)?.value ?? null);
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user || !sessionWindow || sessionWindow.user_id !== user.id || isSessionExpired(sessionWindow)) {
    const redirectResponse = redirectToLogin(request);
    redirectResponse.cookies.delete(SESSION_WINDOW_COOKIE);
    return redirectResponse;
  }

  const admin = getSupabaseAdminClient();
  if (admin) {
    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const role = normalizeRole((roleData as { role?: string | null } | null)?.role ?? user.user_metadata?.role);
    if (!canAccessPath(role, pathname)) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = getHomePathForRole(role);
      homeUrl.search = "";
      return NextResponse.redirect(homeUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|login|api).*)"]
};
