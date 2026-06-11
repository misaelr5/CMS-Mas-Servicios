"use server";

import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { getServerAuthContext } from "@/lib/auth/server";
import { normalizeRole } from "@/lib/auth/roles";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function createUserAction(formData: FormData) {
  const auth = await getServerAuthContext(cookies());
  if (!auth || auth.role !== "admin") {
    throw new Error("No tenés permisos para crear usuarios.");
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new Error("Falta configurar Supabase.");
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const role = normalizeRole(String(formData.get("role") ?? "viewer"));
  const status = String(formData.get("status") ?? "active").trim() || "active";

  if (!fullName || !email || !password) {
    throw new Error("Completá nombre, email y contraseña.");
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error("No se pudo crear el usuario.");
  }

  const now = new Date().toISOString();

  const [{ error: profileError }, { error: roleError }] = await Promise.all([
    admin.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      email,
      status,
      created_at: now,
      updated_at: now
    } as never),
    admin.from("user_roles").insert({
      id: randomUUID(),
      user_id: userId,
      role,
      created_at: now
    } as never)
  ]);

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (roleError) {
    throw new Error(roleError.message);
  }

  revalidatePath("/usuarios");
}
