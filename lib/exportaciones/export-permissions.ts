import type { Role } from "@/lib/auth/roles";

export type ExportReportType = "reporte-diario" | "cierre-semanal" | "gastos" | "cargas-cajas" | "bolsas";

export function canExportType(role: Role, type: ExportReportType) {
  if (role === "admin" || role === "encargado") return true;
  if (role === "viewer") return true;
  return type === "cargas-cajas";
}
