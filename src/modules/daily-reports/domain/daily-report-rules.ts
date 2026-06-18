import type { CashDailyReport, DailyReportAdjustment, Expense } from "@/lib/db/types";

export function getSignedAdjustmentAmount(type: DailyReportAdjustment["adjustment_type"], amount: number) {
  if (type === "pf_manual_negative" || type === "currency_manual_negative") return -Math.abs(amount);
  return Math.abs(amount);
}

export function calculateDailyReportTotals({
  cashReports,
  adjustments,
  expenses,
  automaticCurrencyProfitArs = 0
}: {
  cashReports: CashDailyReport[];
  adjustments: DailyReportAdjustment[];
  expenses: Expense[];
  automaticCurrencyProfitArs?: number;
}) {
  const activeAdjustments = adjustments.filter((adjustment) => !adjustment.annulled_at);
  const automaticPfProfitArs = cashReports.reduce((sum, report) => sum + Number(report.total_profit_ars ?? 0), 0);
  const manualPfAdjustmentArs = activeAdjustments.reduce((sum, adjustment) => {
    if (!adjustment.adjustment_type.startsWith("pf_")) return sum;
    return sum + getSignedAdjustmentAmount(adjustment.adjustment_type, Number(adjustment.amount_ars ?? 0));
  }, 0);
  const manualCurrencyAdjustmentArs = activeAdjustments.reduce((sum, adjustment) => {
    if (adjustment.adjustment_type.startsWith("pf_")) return sum;
    return sum + getSignedAdjustmentAmount(adjustment.adjustment_type, Number(adjustment.amount_ars ?? 0));
  }, 0);
  const expensesArs = expenses.reduce((sum, expense) => {
    if (expense.status !== "pagado" && expense.status !== "imputado") return sum;
    return sum + Number(expense.amount_ars ?? 0);
  }, 0);
  const grossProfitArs = automaticPfProfitArs + manualPfAdjustmentArs + automaticCurrencyProfitArs + manualCurrencyAdjustmentArs;

  return {
    automaticPfProfitArs,
    manualPfAdjustmentArs,
    automaticCurrencyProfitArs,
    manualCurrencyAdjustmentArs,
    grossProfitArs,
    expensesArs,
    availableProfitArs: grossProfitArs - expensesArs
  };
}

export function calculateTotalsFromReports(
  cashReports: CashDailyReport[],
  adjustments: DailyReportAdjustment[],
  expenses: Expense[],
  automaticCurrencyProfitArs = 0
) {
  return calculateDailyReportTotals({
    cashReports,
    adjustments,
    expenses,
    automaticCurrencyProfitArs
  });
}

export function validateManualAdjustment({ amountArs, reason }: { amountArs: number; reason: string }) {
  if (amountArs <= 0) return { ok: false as const, message: "El monto del ajuste debe ser mayor a 0." };
  if (!reason.trim()) return { ok: false as const, message: "El motivo del ajuste es obligatorio." };
  return { ok: true as const };
}

export function validateCloseDay({ hasPendingCashRegisters, note }: { hasPendingCashRegisters: boolean; note?: string | null }) {
  return {
    ok: true as const,
    nextStatus: hasPendingCashRegisters ? "revisar" as const : "cerrado" as const,
    note: note?.trim() ?? ""
  };
}
