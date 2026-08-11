import type { BagOperation, CashDailyReportLine, Expense, ReportAdjustment } from "@/lib/db/types";
import { getSignedAdjustmentAmount } from "@/src/modules/daily-reports/domain/daily-report-rules";

export function calculateDailyCurrencyProfit(ops: BagOperation[]): {
  boughtUsd: number;
  soldUsd: number;
  profitArs: number;
  internalOpsCount: number;
} {
  let boughtUsd = 0;
  let soldUsd = 0;
  let profitArs = 0;
  let internalOpsCount = 0;

  for (const op of ops) {
    if (op.status === "anulada") continue;
    if (op.is_internal) {
      internalOpsCount++;
      continue;
    }
    if (op.operation_type === "compra_usd") {
      boughtUsd += Number(op.amount_usd ?? 0);
    } else if (op.operation_type === "venta_usd") {
      soldUsd += Number(op.amount_usd ?? 0);
      if (op.affects_profit !== false) {
        profitArs += Number(op.profit_ars ?? 0);
      }
    }
  }

  return { boughtUsd, soldUsd, profitArs, internalOpsCount };
}

export function calculateCashBoxDailySheet(
  lines: Array<Pick<CashDailyReportLine, "operated_amount_ars" | "profit_amount_ars">>
): { totalOperatedArs: number; pfProfitArs: number } {
  let totalOperatedArs = 0;
  let pfProfitArs = 0;
  for (const line of lines) {
    totalOperatedArs += Number(line.operated_amount_ars ?? 0);
    pfProfitArs += Number(line.profit_amount_ars ?? 0);
  }
  return { totalOperatedArs, pfProfitArs };
}

export function calculateBranchDailyTotals(params: {
  registers: Array<{ pfProfitArs: number; totalOperatedArs: number }>;
  bags: Array<{ currencyProfitArs: number }>;
}): { pfProfitArs: number; currencyProfitArs: number; totalProfitArs: number; totalOperatedArs: number } {
  const pfProfitArs = params.registers.reduce((sum, r) => sum + r.pfProfitArs, 0);
  const currencyProfitArs = params.bags.reduce((sum, b) => sum + b.currencyProfitArs, 0);
  const totalOperatedArs = params.registers.reduce((sum, r) => sum + r.totalOperatedArs, 0);
  return { pfProfitArs, currencyProfitArs, totalProfitArs: pfProfitArs + currencyProfitArs, totalOperatedArs };
}

export type GrandTotalsInput = {
  centro: { pfProfitArs: number; currencyProfitArs: number; manualPfAdjArs: number; manualCurrencyAdjArs: number };
  terminal: { pfProfitArs: number; currencyProfitArs: number; manualPfAdjArs: number; manualCurrencyAdjArs: number };
  generalBags: Array<{ currencyProfitArs: number }>;
  expenses: Expense[];
};

export function calculateDailyReportGrandTotal(params: GrandTotalsInput): {
  pfProfitCentro: number;
  pfProfitTerminal: number;
  pfProfitTotal: number;
  currencyProfitCentro: number;
  currencyProfitTerminal: number;
  currencyProfitGeneral: number;
  currencyProfitTotal: number;
  grossProfitArs: number;
  expensesArs: number;
  freeProfitArs: number;
} {
  const pfProfitCentro = params.centro.pfProfitArs + params.centro.manualPfAdjArs;
  const pfProfitTerminal = params.terminal.pfProfitArs + params.terminal.manualPfAdjArs;
  const pfProfitTotal = pfProfitCentro + pfProfitTerminal;

  const currencyProfitCentro = params.centro.currencyProfitArs + params.centro.manualCurrencyAdjArs;
  const currencyProfitTerminal = params.terminal.currencyProfitArs + params.terminal.manualCurrencyAdjArs;
  const currencyProfitGeneral = params.generalBags.reduce((sum, b) => sum + b.currencyProfitArs, 0);
  const currencyProfitTotal = currencyProfitCentro + currencyProfitTerminal + currencyProfitGeneral;

  const grossProfitArs = pfProfitTotal + currencyProfitTotal;
  const expensesArs = params.expenses.reduce((sum, expense) => {
    if (expense.status !== "pagado" && expense.status !== "imputado") return sum;
    return sum + Number(expense.amount_ars ?? 0);
  }, 0);

  return {
    pfProfitCentro,
    pfProfitTerminal,
    pfProfitTotal,
    currencyProfitCentro,
    currencyProfitTerminal,
    currencyProfitGeneral,
    currencyProfitTotal,
    grossProfitArs,
    expensesArs,
    freeProfitArs: grossProfitArs - expensesArs
  };
}

export function computeBranchManualAdj(adjustments: ReportAdjustment[]): {
  manualPfAdjArs: number;
  manualCurrencyAdjArs: number;
} {
  const active = adjustments.filter((a) => !a.annulled_at);
  const manualPfAdjArs = active.reduce((sum, a) => {
    if (!a.adjustment_type.startsWith("pf_")) return sum;
    return sum + getSignedAdjustmentAmount(a.adjustment_type, Number(a.amount_ars ?? 0));
  }, 0);
  const manualCurrencyAdjArs = active.reduce((sum, a) => {
    if (a.adjustment_type.startsWith("pf_")) return sum;
    return sum + getSignedAdjustmentAmount(a.adjustment_type, Number(a.amount_ars ?? 0));
  }, 0);
  return { manualPfAdjArs, manualCurrencyAdjArs };
}
