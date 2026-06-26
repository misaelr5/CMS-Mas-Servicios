import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type CreateAuditLogInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  reason?: string | null;
};

export async function createAuditLog({
  actorId = null,
  action,
  entityType,
  entityId = null,
  oldData = null,
  newData = null,
  reason = null
}: CreateAuditLogInput) {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    console.error("[createAuditLog] sin admin client; no se registro la accion", { action, entityType, entityId });
    return { ok: false, reason: "missing-admin-client" as const };
  }

  const { error } = await (admin.from("audit_logs") as any).insert({
    user_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData,
    new_data: newData,
    reason
  });

  if (error) {
    console.error("[createAuditLog] no se pudo escribir el audit log", { action, entityType, entityId, reason: error.message });
    return { ok: false, reason: error.message };
  }

  return { ok: true as const };
}
