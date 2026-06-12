import type {
  CashDailyReport,
  DailyReportAdjustment,
  DailyReportAdjustmentType,
  DailyReportStatus,
  Expense,
  ExpenseStatus
} from "@/lib/db/types";

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
  if (type === "pf_manual_negative" || type === "currency_manual_negative") return -Math.abs(amount);
  return Math.abs(amount);
}

export function calculateTotalsFromReports(
  reports: CashDailyReport[],
  adjustments: DailyReportAdjustment[],
  expenses: Expense[],
  automaticCurrencyProfitArs = 0
) {
  const automaticPfProfitArs = reports.reduce((sum, report) => sum + Number(report.total_profit_ars ?? 0), 0);
  const manualPfAdjustmentArs = adjustments.reduce((sum, adjustment) => {
    if (adjustment.adjustment_type !== "pf_manual_positive" && adjustment.adjustment_type !== "pf_manual_negative") {
      return sum;
    }
    return sum + getSignedAdjustmentAmount(adjustment.adjustment_type, Number(adjustment.amount_ars ?? 0));
  }, 0);
  const manualCurrencyAdjustmentArs = adjustments.reduce((sum, adjustment) => {
    if (
      adjustment.adjustment_type !== "currency_manual_positive" &&
      adjustment.adjustment_type !== "currency_manual_negative"
    ) {
      return sum;
    }
    return sum + getSignedAdjustmentAmount(adjustment.adjustment_type, Number(adjustment.amount_ars ?? 0));
  }, 0);
  const expensesArs = expenses.reduce((sum, expense) => {
    if (expense.status !== "pagado" && expense.status !== "imputado") {
      return sum;
    }
    return sum + Number(expense.amount_ars ?? 0);
  }, 0);
  const grossProfitArs =
    automaticPfProfitArs + manualPfAdjustmentArs + automaticCurrencyProfitArs + manualCurrencyAdjustmentArs;
  const availableProfitArs = grossProfitArs - expensesArs;

  return {
    automaticPfProfitArs,
    manualPfAdjustmentArs,
    automaticCurrencyProfitArs,
    manualCurrencyAdjustmentArs,
    grossProfitArs,
    expensesArs,
    availableProfitArs
  };
}
