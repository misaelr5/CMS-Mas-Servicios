import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export const SESSION_WINDOW_COOKIE = "mas_servicios_session_window";
export const SESSION_WINDOW_STORAGE = "mas_servicios_session_window";
export const SESSION_WINDOW_DURATION_MS = 12 * 60 * 60 * 1000;

export type SessionWindow = {
  user_id: string;
  session_started_at: number;
  session_expires_at: number;
};

function serializeSessionWindow(window: SessionWindow) {
  return JSON.stringify(window);
}

export function parseSessionWindow(raw?: string | null): SessionWindow | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SessionWindow>;
    if (!parsed.user_id || !parsed.session_started_at || !parsed.session_expires_at) return null;

    return {
      user_id: parsed.user_id,
      session_started_at: parsed.session_started_at,
      session_expires_at: parsed.session_expires_at
    };
  } catch {
    return null;
  }
}

export function getSessionWindow() {
  if (typeof window === "undefined") return null;

  const fromStorage = parseSessionWindow(window.localStorage.getItem(SESSION_WINDOW_STORAGE));
  if (fromStorage) return fromStorage;

  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${SESSION_WINDOW_COOKIE}=`));

  const cookieValue = match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
  const fromCookie = parseSessionWindow(cookieValue);

  if (fromCookie) {
    window.localStorage.setItem(SESSION_WINDOW_STORAGE, serializeSessionWindow(fromCookie));
  }

  return fromCookie;
}

export function isSessionExpired(sessionWindow?: SessionWindow | null, now = Date.now()) {
  if (!sessionWindow) return true;
  return now >= sessionWindow.session_expires_at;
}

export function setSessionWindow(userId: string, sessionStartedAt = Date.now()) {
  const sessionWindow: SessionWindow = {
    user_id: userId,
    session_started_at: sessionStartedAt,
    session_expires_at: sessionStartedAt + SESSION_WINDOW_DURATION_MS
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_WINDOW_STORAGE, serializeSessionWindow(sessionWindow));
    document.cookie = [
      `${SESSION_WINDOW_COOKIE}=${encodeURIComponent(serializeSessionWindow(sessionWindow))}`,
      "path=/",
      `max-age=${SESSION_WINDOW_DURATION_MS / 1000}`,
      "SameSite=Lax"
    ].join("; ");
  }

  return sessionWindow;
}

export function clearSessionWindow() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(SESSION_WINDOW_STORAGE);
  document.cookie = `${SESSION_WINDOW_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export async function requireValidSession() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const sessionWindow = getSessionWindow();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user || !sessionWindow || sessionWindow.user_id !== user.id || isSessionExpired(sessionWindow)) {
    await supabase.auth.signOut();
    clearSessionWindow();
    return null;
  }

  return { user, sessionWindow };
}

