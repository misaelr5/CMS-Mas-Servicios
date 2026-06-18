import type { Role } from "@/lib/auth/roles";

export type ExportReportType = "reporte-diario" | "cierre-semanal" | "gastos" | "cargas-cajas" | "bolsas";

export type ExportFilters = {
  date?: string;
  from?: string;
  to?: string;
  branch_id?: string;
  status?: string;
  category?: string;
  cash_register_id?: string;
  bag_id?: string;
  operation_type?: string;
};

export type ExportPermissionDecision = {
  allowed: boolean;
  reason?: string;
  restrictedFilters?: Partial<ExportFilters>;
};

export type ExportPermissionInput =
  | {
      userRole: Role;
      exportType: ExportReportType;
      userId?: string;
      filters?: ExportFilters;
      assignedCashRegisterIds?: string[];
    }
  | [Role, ExportReportType, Partial<ExportFilters>?];

function buildDecision(allowed: boolean, reason?: string, restrictedFilters?: Partial<ExportFilters>): ExportPermissionDecision {
  return {
    allowed,
    reason,
    restrictedFilters
  };
}

function canExportWithObject({
  userRole,
  exportType,
  filters = {},
  assignedCashRegisterIds = []
}: {
  userRole: Role;
  exportType: ExportReportType;
  userId?: string;
  filters?: ExportFilters;
  assignedCashRegisterIds?: string[];
}): ExportPermissionDecision {
  if (userRole === "admin" || userRole === "encargado") {
    return buildDecision(true);
  }

  if (userRole === "viewer") {
    return buildDecision(false, "No tenes permisos para exportar este reporte.");
  }

  if (userRole === "cajero") {
    if (exportType !== "cargas-cajas") {
      return buildDecision(false, "No tenes permisos para exportar este reporte.");
    }

    const uniqueAssignedIds = Array.from(new Set(assignedCashRegisterIds.filter(Boolean)));
    if (uniqueAssignedIds.length !== 1) {
      return buildDecision(false, "No se pudo identificar una caja asignada de forma confiable.");
    }

    const assignedCashRegisterId = uniqueAssignedIds[0];
    if (!filters.cash_register_id) {
      return buildDecision(true, undefined, { cash_register_id: assignedCashRegisterId });
    }

    if (filters.cash_register_id !== assignedCashRegisterId) {
      return buildDecision(false, "Solo podés exportar tu caja asignada.");
    }

    return buildDecision(true, undefined, { cash_register_id: assignedCashRegisterId });
  }

  return buildDecision(false, "No tenes permisos para exportar este reporte.");
}

export function canExportType(roleOrInput: Role | { userRole: Role; exportType: ExportReportType; userId?: string; filters?: ExportFilters; assignedCashRegisterIds?: string[] }, type?: ExportReportType, filters?: Partial<ExportFilters>) {
  if (typeof roleOrInput === "string") {
    if (!type) return buildDecision(false, "Tipo de exportacion invalido.");
    return canExportWithObject({ userRole: roleOrInput, exportType: type, filters: filters ?? {} });
  }

  return canExportWithObject(roleOrInput);
}
