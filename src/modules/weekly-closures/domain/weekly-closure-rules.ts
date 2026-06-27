import { roundArs } from "@/src/shared/domain/money";

export type WeeklyClosureLine = {
  totalOperatedArs: number;
  totalProfitArs: number;
  loadedDaysCount: number;
  pendingDaysCount: number;
  reviewedDaysCount: number;
};

export function calculateWeeklyClosureTotals(lines: WeeklyClosureLine[]) {
  return lines.reduce(
    (acc, line) => {
      acc.totalOperatedArs = roundArs(acc.totalOperatedArs + Number(line.totalOperatedArs ?? 0));
      acc.totalProfitArs = roundArs(acc.totalProfitArs + Number(line.totalProfitArs ?? 0));
      acc.loadedDaysCount += Number(line.loadedDaysCount ?? 0);
      acc.pendingDaysCount += Number(line.pendingDaysCount ?? 0);
      acc.reviewedDaysCount += Number(line.reviewedDaysCount ?? 0);
      return acc;
    },
    {
      totalOperatedArs: 0,
      totalProfitArs: 0,
      loadedDaysCount: 0,
      pendingDaysCount: 0,
      reviewedDaysCount: 0
    }
  );
}

export function validateCloseWeek({ pendingDaysCount, reason }: { pendingDaysCount: number; reason?: string | null }) {
  return {
    ok: true as const,
    nextStatus: pendingDaysCount > 0 ? "revisar" as const : "cerrado" as const,
    reason: reason?.trim() ?? ""
  };
}
