import type { CashDailyReportLine, CashDailyReportStatus, CashRegister, CashReportCategory } from "@/lib/db/types";

export const cashDailyReportStatuses: CashDailyReportStatus[] = ["pendiente", "parcial", "cargado", "revisado"];

export const cashReportStatusLabels: Record<CashDailyReportStatus, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  cargado: "Cargado",
  revisado: "Revisado"
};

export function getCashReportStatusTone(status: CashDailyReportStatus) {
  if (status === "pendiente") return "pendiente" as const;
  if (status === "parcial") return "revisar" as const;
  return "ok" as const;
}

export function getCashRegisterDisplayLabel(register: Pick<CashRegister, "register_number" | "name">) {
  return `Caja ${register.register_number ?? "?"} — ${register.name}`;
}

export function getCashRegisterShortLabel(register: Pick<CashRegister, "register_number">) {
  return `Caja ${register.register_number ?? "?"}`;
}

export function calculateCashDailyReportTotals(lines: Array<Pick<CashDailyReportLine, "operated_amount_ars" | "profit_amount_ars">>) {
  return lines.reduce(
    (acc, line) => {
      acc.operated += Number(line.operated_amount_ars ?? 0);
      acc.profit += Number(line.profit_amount_ars ?? 0);
      return acc;
    },
    { operated: 0, profit: 0 }
  );
}

export function sortCashReportCategories(categories: CashReportCategory[]) {
  return [...categories].sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name));
}

export function getCashReportCategoryMap(categories: CashReportCategory[]) {
  return new Map(categories.map((category) => [category.id, category]));
}

export function parseMoneyInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replaceAll(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}
