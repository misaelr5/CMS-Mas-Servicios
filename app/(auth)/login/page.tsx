import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
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

  return <LoginForm notice={notice} />;
}
