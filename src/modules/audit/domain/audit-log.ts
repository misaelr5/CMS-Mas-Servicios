// Dominio del modulo audit.
//
// Define la entidad de log y el PUERTO (driven port) que el dominio necesita
// para persistir. El dominio no sabe nada de Supabase: solo declara la interfaz.
// La infraestructura provee el adapter que la implementa.

export type AuditLogEntry = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  reason?: string | null;
};

export type AuditLogSaveResult = { ok: true } | { ok: false; reason: string };

// Puerto: contrato de persistencia que la aplicacion depende y la
// infraestructura implementa (inversion de dependencias).
export interface AuditLogRepository {
  save(entry: AuditLogEntry): Promise<AuditLogSaveResult>;
}
