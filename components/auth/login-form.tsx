"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";

import { clearSessionWindow, setSessionWindow } from "@/lib/auth/session";
import { getHomePathForRole, normalizeRole } from "@/lib/auth/roles";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { AppLogo } from "@/components/app-logo";

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
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();
      const role = normalizeRole(roleData?.role ?? data.user.user_metadata?.role);
      router.replace(getHomePathForRole(role));
      router.refresh();
    } catch (loginError) {
      clearSessionWindow();
      setError(
        loginError instanceof Error
          ? loginError.message
          : "No se pudo iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden border-lightGray/20 bg-white/96 text-brandBlack shadow-medium">
      {/* Yellow top accent bar */}
      <div className="h-1 w-full bg-brandYellow" />

      <CardContent className="space-y-5 p-7">
        <div className="flex items-start gap-4">
          <AppLogo />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mediumGray">
              Acceso interno
            </p>
            <h1 className="mt-1 font-heading text-2xl font-black leading-tight text-brandBlack">
              MAS SERVICIOS
            </h1>
            <p className="mt-1.5 text-sm text-mediumGray">
              Ingresá con tu usuario. La sesión dura 12 horas.
            </p>
          </div>
        </div>

        {notice ? (
          <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning/8 p-3.5 text-sm text-brandBlack">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>{notice}</p>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger/8 p-3.5 text-sm text-brandBlack">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p>{error}</p>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField label="Email" htmlFor="email" required>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@maservicios.com"
              required
            />
          </FormField>

          <FormField label="Contraseña" htmlFor="password" required>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </FormField>

          <Button
            className="w-full shadow-yellowGlow"
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              "Ingresar"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
