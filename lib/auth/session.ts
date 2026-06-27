export const SESSION_WINDOW_COOKIE = "mas_servicios_session_window";
export const SESSION_WINDOW_DURATION_MS = 12 * 60 * 60 * 1000;

export type SessionWindow = {
  user_id: string;
  session_started_at: number;
  session_expires_at: number;
};

export function serializeSessionWindow(window: SessionWindow) {
  return JSON.stringify(window);
}

export function createSessionWindow(userId: string, sessionStartedAt = Date.now()): SessionWindow {
  return {
    user_id: userId,
    session_started_at: sessionStartedAt,
    session_expires_at: sessionStartedAt + SESSION_WINDOW_DURATION_MS
  };
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
    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<SessionWindow>;
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
}

export function isSessionExpired(sessionWindow?: SessionWindow | null, now = Date.now()) {
  if (!sessionWindow) return true;
  return now >= sessionWindow.session_expires_at;
}
