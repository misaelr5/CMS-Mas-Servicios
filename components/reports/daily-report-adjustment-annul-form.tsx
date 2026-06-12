"use client";

import { useActionState } from "react";

import { annulDailyReportAdjustmentAction } from "@/app/actions/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState = { ok: false, message: "" };

export function DailyReportAdjustmentAnnulForm({
  adjustmentId,
  branchId,
  date,
  currentPath
}: {
  adjustmentId: string;
  branchId: string;
  date: string;
  currentPath: string;
}) {
  const [state, formAction, isPending] = useActionState(annulDailyReportAdjustmentAction, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
      <input name="adjustment_id" type="hidden" value={adjustmentId} />
      <input name="branch_id" type="hidden" value={branchId} />
      <input name="date" type="hidden" value={date} />
      <input name="current_path" type="hidden" value={currentPath} />
      <Input name="reason" placeholder="Motivo para anular" required />
      <Button disabled={isPending} size="sm" type="submit" variant="destructive">
        {isPending ? "Anulando..." : "Anular"}
      </Button>
      {state.message ? <p className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{state.message}</p> : null}
    </form>
  );
}
