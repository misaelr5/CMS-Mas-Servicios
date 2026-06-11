import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return adminClient;
}

export function createSupabaseServerClient(cookies: {
  getAll: () => { name: string; value: string }[];
  setAll?: (cookies: { name: string; value: string; options: Record<string, string | number | boolean | Date> }[], headers: Record<string, string>) => void;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: cookies.getAll,
      setAll: cookies.setAll ?? (() => undefined)
    },
    cookieOptions: {
      path: "/"
    }
  } as any);
}
