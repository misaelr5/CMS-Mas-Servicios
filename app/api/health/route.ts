import { NextResponse } from "next/server";

import { getMissingServerEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Health-check liviano para deploy/monitoreo.
// Reporta solo booleans y nombres de variables faltantes; nunca valores
// secretos ni mensajes crudos de error de la base.
export async function GET() {
  const missingEnv = getMissingServerEnv();
  const envOk = missingEnv.length === 0;

  let dbOk = false;
  if (envOk) {
    try {
      const admin = getSupabaseAdminClient();
      if (admin) {
        const { error } = await admin.from("branches").select("id").limit(1);
        if (error) {
          console.error("[health] error consultando la base", error.message);
        } else {
          dbOk = true;
        }
      } else {
        console.error("[health] admin client nulo (env incompleto)");
      }
    } catch (error) {
      console.error("[health] excepcion consultando la base", error);
    }
  }

  const ok = envOk && dbOk;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      env: { ok: envOk, missing: missingEnv },
      db: { ok: dbOk }
    },
    { status: ok ? 200 : 503 }
  );
}
