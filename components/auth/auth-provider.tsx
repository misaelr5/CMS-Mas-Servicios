"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { clearSessionWindowAction, getSessionWindowAction, startSessionWindowAction } from "@/app/actions/auth";
import { isSessionExpired, type SessionWindow } from "@/lib/auth/session";
import { normalizeRole, type Role } from "@/lib/auth/roles";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthState =
  | {
      status: "loading";
      userId: null;
      email: null;
      fullName: null;
      role: Role;
      sessionWindow: SessionWindow | null;
      logout: () => Promise<void>;
    }
  | {
      status: "authenticated";
      userId: string;
      email: string | null;
      fullName: string | null;
      role: Role;
      sessionWindow: SessionWindow;
      logout: () => Promise<void>;
    }
  | {
      status: "unauthenticated";
      userId: null;
      email: null;
      fullName: null;
      role: Role;
      sessionWindow: null;
      logout: () => Promise<void>;
    };

const AuthContext = createContext<AuthState | null>(null);

async function loadAuthState() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const sessionWindowResult = await getSessionWindowAction();
  const sessionWindow = sessionWindowResult.ok ? sessionWindowResult.sessionWindow : null;

  if (!user || !sessionWindow || sessionWindow.user_id !== user.id || isSessionExpired(sessionWindow)) {
    await supabase.auth.signOut();
    await clearSessionWindowAction();
    return null;
  }

  let profile: { full_name?: string | null; email?: string | null } | null = null;
  let roleRow: { role?: string | null } | null = null;

  try {
    const [{ data: profileData }, { data: roleData }] = await Promise.all([
      supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()
    ]);

    profile = profileData as { full_name?: string | null; email?: string | null } | null;
    roleRow = roleData as { role?: string | null } | null;
  } catch {
    profile = null;
    roleRow = null;
  }

  const role = normalizeRole(roleRow?.role ?? user.user_metadata?.role);

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? null,
    role,
    sessionWindow
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [state, setState] = useState<AuthState>({
    status: "loading",
    userId: null,
    email: null,
    fullName: null,
    role: "viewer",
    sessionWindow: null,
    logout: async () => undefined
  });

  useEffect(() => {
    let active = true;

    const logout = async () => {
      if (!supabase) {
        await clearSessionWindowAction();
        router.replace("/login");
        return;
      }

      await supabase.auth.signOut();
      await clearSessionWindowAction();
      router.replace("/login");
    };

    const sync = async () => {
      if (!active) return;

      setState((current) =>
        current.status === "authenticated"
          ? {
              status: "authenticated",
              userId: current.userId,
              email: current.email,
              fullName: current.fullName,
              role: current.role,
              sessionWindow: current.sessionWindow,
              logout
            }
          : {
              status: "loading",
              userId: null,
              email: null,
              fullName: null,
              role: current.role,
              sessionWindow: current.sessionWindow,
              logout
            }
      );

      const nextState = await loadAuthState();
      if (!active) return;

      if (!nextState) {
        setState({
          status: "unauthenticated",
          userId: null,
          email: null,
          fullName: null,
          role: "viewer",
          sessionWindow: null,
          logout
        });
        if (pathname !== "/login") {
          router.replace("/login?reason=session_expired");
        }
        return;
      }

      setState({
        status: "authenticated",
        userId: nextState.userId,
        email: nextState.email,
        fullName: nextState.fullName,
        role: nextState.role,
        sessionWindow: nextState.sessionWindow,
        logout
      });
    };

    void sync();

    if (!supabase) {
      return () => {
        active = false;
      };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        void clearSessionWindowAction();
        setState({
          status: "unauthenticated",
          userId: null,
          email: null,
          fullName: null,
          role: "viewer",
          sessionWindow: null,
          logout
        });
        if (pathname !== "/login") {
          router.replace("/login");
        }
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        void startSessionWindowAction().then(() => sync());
      }

      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void sync();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
