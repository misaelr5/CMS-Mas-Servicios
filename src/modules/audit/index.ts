// Composition root del modulo audit.
//
// Cablea el adapter concreto (Supabase) con el caso de uso. Es el unico punto
// donde se elige la implementacion del puerto; el resto del modulo depende de
// abstracciones. Para tests, se puede armar el use case con un repo falso.

import { makeRecordAuditLog } from "./application/record-audit-log";
import { SupabaseAuditLogRepository } from "./infrastructure/supabase-audit-log-repository";

const auditLogRepository = new SupabaseAuditLogRepository();

export const recordAuditLog = makeRecordAuditLog(auditLogRepository);

export type { AuditLogEntry, AuditLogRepository } from "./domain/audit-log";
export { makeRecordAuditLog } from "./application/record-audit-log";
