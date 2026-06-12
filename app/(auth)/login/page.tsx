import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppLogo } from "@/components/app-logo";
import { LoginForm } from "@/components/auth/login-form";
import { EmptyState } from "@/components/empty-state";
import { getHomePathForRole } from "@/lib/auth/roles";
import { getServerAuthContext } from "@/lib/auth/server";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ reason?: string }>;
}) {
  const auth = await getServerAuthContext(cookies());
  if (auth) {
    redirect(getHomePathForRole(auth.role));
  }

  const params = (await searchParams) ?? {};
  const notice = params.reason === "session_expired" ? "Tu sesión venció. Volvé a iniciar sesión." : undefined;

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <AppLogo />
      </div>

      <LoginForm notice={notice} />

      <EmptyState
        description="La sesión queda persistente por 12 horas y se cierra manualmente desde la app cuando haga falta."
        title="Ingreso interno listo"
      />
    </div>
  );
}
