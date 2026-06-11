import { createClient } from "@supabase/supabase-js";

let serverClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseServerClient() {
  if (serverClient) return serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  serverClient = createClient(url, serviceRoleKey);
  return serverClient;
}
