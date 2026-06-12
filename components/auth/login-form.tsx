"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { clearSessionWindow, setSessionWindow } from "@/lib/auth/session";
import { getHomePathForRole, normalizeRole } from "@/lib/auth/roles";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error("Falta configurar Supabase.");
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw signInError;
      }

      if (!data.user) {
        throw new Error("No se pudo iniciar sesión.");
      }

      setSessionWindow(data.user.id);
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
      const role = normalizeRole(roleData?.role ?? data.user.user_metadata?.role);
      router.replace(getHomePathForRole(role));
      router.refresh();
    } catch (loginError) {
      clearSessionWindow();
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-brandYellow/30 bg-white/96 text-brandBlack shadow-medium">
      <CardContent className="space-y-5 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mediumGray">Acceso interno</p>
          <h1 className="mt-2 font-heading text-3xl font-black">MAS SERVICIOS</h1>
          <p className="mt-3 text-sm text-mediumGray">
            Ingresá con tu usuario interno. La sesión queda abierta por 12 horas.
          </p>
        </div>

        {notice ? (
          <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-brandBlack">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>{notice}</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-brandBlack">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-brandBlack" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@maservicios.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-brandBlack" htmlFor="password">
              Contraseña
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button className="w-full shadow-yellowGlow" disabled={loading} type="submit">
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
