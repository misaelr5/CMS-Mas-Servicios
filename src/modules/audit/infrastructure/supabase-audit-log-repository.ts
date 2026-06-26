// Adapter (driven adapter): implementa el puerto AuditLogRepository usando
// Supabase. Es el unico lugar del modulo audit que conoce la infraestructura.

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  AuditLogEntry,
  AuditLogRepository,
  AuditLogSaveResult
} from "../domain/audit-log";

export class SupabaseAuditLogRepository implements AuditLogRepository {
  async save(entry: AuditLogEntry): Promise<AuditLogSaveResult> {
    const admin = getSupabaseAdminClient();
    if (!admin) {
      console.error("[audit] sin admin client; no se registro la accion", {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId
      });
      return { ok: false, reason: "missing-admin-client" };
    }

    const { error } = await (admin.from("audit_logs") as any).insert({
      user_id: entry.actorId ?? null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      old_data: entry.oldData ?? null,
      new_data: entry.newData ?? null,
      reason: entry.reason ?? null
    });

    if (error) {
      console.error("[audit] no se pudo escribir el audit log", {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        reason: error.message
      });
      return { ok: false, reason: error.message };
    }

    return { ok: true };
  }
}
