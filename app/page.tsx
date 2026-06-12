import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getHomePathForRole } from "@/lib/auth/roles";
import { getServerAuthContext } from "@/lib/auth/server";

export default async function HomePage() {
  const auth = await getServerAuthContext(cookies());
  redirect(getHomePathForRole(auth?.role ?? "viewer"));
}
