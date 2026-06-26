// Facade publico de auditoria.
//
// Mantiene la firma historica `createAuditLog` para no cambiar a los callers
// (app/actions/*), pero delega en el modulo hexagonal audit (composition root).
// La logica real vive en src/modules/audit (puerto + adapter + use case).

import { recordAuditLog } from "@/src/modules/audit";

export type CreateAuditLogInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  reason?: string | null;
};

export async function createAuditLog(input: CreateAuditLogInput) {
  return recordAuditLog(input);
}
