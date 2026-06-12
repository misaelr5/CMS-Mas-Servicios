"use client";

import { useActionState } from "react";

import { saveDailyReportAction } from "@/app/actions/finance";
import { Button } from "@/components/ui/button";
import type { DailyReportStatus } from "@/lib/db/types";
import { dailyReportStatusLabels, dailyReportStatusOptions } from "@/lib/finance/daily-report-calculations";

const initialState = { ok: false, message: "" };

export function DailyReportSaveForm({
  branchId,
  date,
  currentStatus,
  canWrite
}: {
  branchId: string;
  date: string;
  currentStatus: DailyReportStatus;
  canWrite: boolean;
}) {
  const [state, formAction, isPending] = useActionState(saveDailyReportAction, initialState);

  if (!canWrite) {
    return <p className="text-sm text-mediumGray">Solo lectura para tu rol.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input name="branch_id" type="hidden" value={branchId} />
      <input name="date" type="hidden" value={date} />
      <input name="current_path" type="hidden" value="/reporte-diario" />
      <select
        className="h-11 rounded-md border border-border bg-white px-3 text-sm font-semibold text-brandBlack shadow-sm"
        defaultValue={currentStatus}
        name="status"
      >
        {dailyReportStatusOptions.map((status) => (
          <option key={status} value={status}>
            {dailyReportStatusLabels[status]}
          </option>
        ))}
      </select>
      <Button className="shadow-yellowGlow" disabled={isPending} type="submit">
        {isPending ? "Guardando..." : "Guardar reporte"}
      </Button>
      {state.message ? (
        <p className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{state.message}</p>
      ) : null}
    </form>
  );
}
