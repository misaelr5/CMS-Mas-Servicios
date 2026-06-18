import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const email = process.env.ROMAN_EMAIL ?? "roman@maservicios.com";
const legacyEmails = (process.env.ROMAN_LEGACY_EMAILS ?? "roman@masservicios.com")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const fullName = process.env.ROMAN_FULL_NAME ?? "Roman";
const password = process.env.ROMAN_PASSWORD ?? "1234";
const role = process.env.ROMAN_ROLE ?? "admin";
const status = process.env.ROMAN_STATUS ?? "active";

async function ensureAuthUser() {
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) {
    throw listError;
  }

  const existing = usersData.users.find(
    (user) =>
      user.email?.toLowerCase() === email.toLowerCase() ||
      legacyEmails.includes(user.email?.toLowerCase() ?? "")
  );

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role
      }
    });

    if (updateError) {
      throw updateError;
    }

    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role
    }
  });

  if (error) {
    throw error;
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error("No se pudo obtener el id del usuario creado.");
  }

  return userId;
}

async function tryUpsertProfiles(userId) {
  const now = new Date().toISOString();

  const profileResult = await supabase.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    email,
    status,
    created_at: now,
    updated_at: now
  });

  const roleResult = await supabase.from("user_roles").upsert({
    user_id: userId,
    role,
    created_at: now
  });

  return { profileResult, roleResult };
}

const userId = await ensureAuthUser();

try {
  const { profileResult, roleResult } = await tryUpsertProfiles(userId);
  if (profileResult.error) {
    console.warn(`profiles: ${profileResult.error.message}`);
  }
  if (roleResult.error) {
    console.warn(`user_roles: ${roleResult.error.message}`);
  }
} catch (error) {
  console.warn(`No se pudieron sincronizar tablas de perfil: ${error instanceof Error ? error.message : "error desconocido"}`);
}

console.log(`Usuario listo: ${fullName} <${email}>. Perfil y rol sincronizados.`);



