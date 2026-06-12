import type { getSupabaseAdminClient } from "@/lib/supabase/server";

function isMissingProfilesTableError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("public.profiles") && (message.includes("schema cache") || message.includes("could not find the table"));
}

export async function ensureCurrentUserProfile(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  auth: { userId: string; email: string | null; fullName: string | null }
) {
  if (!admin) {
    return { ok: false, message: "Falta configurar Supabase en el servidor." };
  }

  const { error } = await (admin.from("profiles") as any).upsert({
    id: auth.userId,
    full_name: auth.fullName ?? null,
    email: auth.email ?? null,
    status: "active"
  });

  if (error) {
    if (isMissingProfilesTableError(error)) {
      return {
        ok: false,
        message: "Falta aplicar la migracion base de perfiles en Supabase. Ejecuta supabase/schema.sql."
      };
    }

    return { ok: false, message: `No se pudo sincronizar el perfil: ${error.message}` };
  }

  return { ok: true as const };
}
