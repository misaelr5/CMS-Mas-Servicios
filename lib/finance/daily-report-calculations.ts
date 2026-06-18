import type {
  CashDailyReport,
  DailyReportAdjustment,
  DailyReportAdjustmentType,
  DailyReportStatus,
  Expense,
  ExpenseStatus
} from "@/lib/db/types";
import {
  calculateDailyReportTotals,
  calculateTotalsFromReports as calculateTotalsFromReportsDomain,
  getSignedAdjustmentAmount as getSignedAdjustmentAmountDomain
} from "@/src/modules/daily-reports/domain/daily-report-rules";

export const dailyReportStatusLabels: Record<DailyReportStatus, string> = {
  abierto: "Abierto",
  cerrado: "Cerrado",
  revisar: "Revisar"
};

export const dailyReportStatusOptions: DailyReportStatus[] = ["abierto", "cerrado", "revisar"];

export const dailyReportAdjustmentTypeLabels: Record<DailyReportAdjustmentType, string> = {
  pf_manual_positive: "PF manual positivo",
  pf_manual_negative: "PF manual negativo",
  currency_manual_positive: "Divisas manual positivo",
  currency_manual_negative: "Divisas manual negativo"
};

export const expenseStatusLabels: Record<ExpenseStatus, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  imputado: "Imputado",
  anulado: "Anulado"
};

export function getDailyReportStatusTone(status: DailyReportStatus) {
  if (status === "abierto") return "pendiente" as const;
  if (status === "revisar") return "revisar" as const;
  return "ok" as const;
}

export function getExpenseStatusTone(status: ExpenseStatus) {
  if (status === "anulado") return "error" as const;
  if (status === "pendiente") return "pendiente" as const;
  if (status === "imputado") return "revisar" as const;
  return "ok" as const;
}

export function getSignedAdjustmentAmount(type: DailyReportAdjustmentType, amount: number) {
  return getSignedAdjustmentAmountDomain(type, amount);
}

export function calculateTotalsFromReports(
  reports: CashDailyReport[],
  adjustments: DailyReportAdjustment[],
  expenses: Expense[],
  automaticCurrencyProfitArs = 0
) {
  return calculateTotalsFromReportsDomain(reports, adjustments, expenses, automaticCurrencyProfitArs);
}

export { calculateDailyReportTotals };
