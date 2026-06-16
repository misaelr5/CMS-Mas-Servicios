import type { CashDailyReportLine } from "@/lib/db/types";

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

export function validateCashDailyReportLine(line: Pick<CashDailyReportLine, "operated_amount_ars" | "profit_amount_ars">) {
  if (Number(line.operated_amount_ars ?? 0) < 0) {
    return { ok: false as const, message: "El monto operado no puede ser negativo." };
  }

  return { ok: true as const };
}
