"use server";

import { cookies } from "next/headers";

import {
  createSessionWindow,
  isSessionExpired,
  parseSessionWindow,
  serializeSessionWindow,
  SESSION_WINDOW_COOKIE,
  SESSION_WINDOW_DURATION_MS,
  type SessionWindow
} from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SessionWindowResult =
  | { ok: true; sessionWindow: SessionWindow }
  | { ok: false; message: string };

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_WINDOW_DURATION_MS / 1000
  };
}

function expiredSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  };
}

function cookiesToMethods(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return {
    getAll() {
      return cookieStore.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value }));
    },
    setAll(cookiesToSet: { name: string; value: string; options: Record<string, string | number | boolean | Date> }[]) {
      cookiesToSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    }
  };
}

export async function startSessionWindowAction(): Promise<SessionWindowResult> {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookiesToMethods(cookieStore));
  if (!supabase) {
    return { ok: false, message: "Falta configurar Supabase." };
  }

  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user) {
    cookieStore.set(SESSION_WINDOW_COOKIE, "", expiredSessionCookieOptions());
    return { ok: false, message: "No se pudo validar la sesion." };
  }

  const sessionWindow = createSessionWindow(user.id);
  cookieStore.set(SESSION_WINDOW_COOKIE, serializeSessionWindow(sessionWindow), sessionCookieOptions());

  return { ok: true, sessionWindow };
}

export async function getSessionWindowAction(): Promise<SessionWindowResult> {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookiesToMethods(cookieStore));
  if (!supabase) {
    return { ok: false, message: "Falta configurar Supabase." };
  }

  const sessionWindow = parseSessionWindow(cookieStore.get(SESSION_WINDOW_COOKIE)?.value ?? null);
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user || !sessionWindow || sessionWindow.user_id !== user.id || isSessionExpired(sessionWindow)) {
    cookieStore.set(SESSION_WINDOW_COOKIE, "", expiredSessionCookieOptions());
    return { ok: false, message: "Sesion vencida." };
  }

  return { ok: true, sessionWindow };
}

export async function clearSessionWindowAction() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_WINDOW_COOKIE, "", expiredSessionCookieOptions());
}
