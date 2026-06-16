"use client";

import { useActionState, useRef, useState } from "react";

import { reopenDailyReportAction } from "@/app/actions/finance";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

const initialState = { ok: false, message: "" };

export function DailyReportReopenForm({
  branchId,
  date,
  currentPath
}: {
  branchId: string;
  date: string;
  currentPath: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(reopenDailyReportAction, initialState);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <form ref={formRef} action={formAction} className="space-y-4">
        <input name="branch_id" type="hidden" value={branchId} />
        <input name="date" type="hidden" value={date} />
        <input name="current_path" type="hidden" value={currentPath} />
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandWhite" htmlFor={`reopen_reason_${branchId}`}>
            Motivo de reapertura
          </label>
          <textarea
            className="min-h-28 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-brandBlack shadow-sm placeholder:text-mediumGray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            id={`reopen_reason_${branchId}`}
            name="reopen_reason"
            placeholder="Explicá por qué hace falta reabrir este reporte"
            required
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button className="shadow-yellowGlow" disabled={isPending} type="button" onClick={() => setConfirmOpen(true)}>
            {isPending ? "Procesando..." : "Reabrir día"}
          </Button>
          {state.message ? (
            <p className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{state.message}</p>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Reabrir día"
        description="Vas a reabrir el reporte y volver a habilitar la edición."
        onConfirm={() => formRef.current?.requestSubmit()}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        title="Reabrir día"
      />
    </>
  );
}
