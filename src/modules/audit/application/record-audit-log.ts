// Caso de uso: registrar un log de auditoria.
//
// Depende del PUERTO (AuditLogRepository), no de Supabase. Esto lo hace
// testeable inyectando un repositorio falso, sin tocar la base.

import type {
  AuditLogEntry,
  AuditLogRepository,
  AuditLogSaveResult
} from "../domain/audit-log";

export function makeRecordAuditLog(repository: AuditLogRepository) {
  return async function recordAuditLog(entry: AuditLogEntry): Promise<AuditLogSaveResult> {
    return repository.save(entry);
  };
}

export type RecordAuditLog = ReturnType<typeof makeRecordAuditLog>;
