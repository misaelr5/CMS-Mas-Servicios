"use client";

import { useActionState, useRef, useState } from "react";

import { closeDailyReportAction } from "@/app/actions/finance";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

const initialState = { ok: false, message: "" };

export function DailyReportCloseForm({
  branchId,
  date,
  currentPath,
  hasPendingCash
}: {
  branchId: string;
  date: string;
  currentPath: string;
  hasPendingCash: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(closeDailyReportAction, initialState);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <form ref={formRef} action={formAction} className="space-y-4">
        <input name="branch_id" type="hidden" value={branchId} />
        <input name="date" type="hidden" value={date} />
        <input name="current_path" type="hidden" value={currentPath} />
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandWhite" htmlFor={`close_note_${branchId}`}>
            Nota de cierre opcional
          </label>
          <textarea
            className="min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-brandBlack shadow-sm placeholder:text-mediumGray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            id={`close_note_${branchId}`}
            name="close_note"
            placeholder="Observación de cierre"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button className="shadow-yellowGlow" disabled={isPending} type="button" onClick={() => setConfirmOpen(true)}>
            {isPending ? "Procesando..." : "Cerrar día"}
          </Button>
          {state.message ? (
            <p className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{state.message}</p>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Cerrar día"
        description={
          hasPendingCash
            ? "Hay cajas pendientes o parciales. Podés cerrar el día, pero quedará marcado como revisar."
            : "Vas a cerrar el día y bloquear la edición normal de este reporte."
        }
        onConfirm={() => formRef.current?.requestSubmit()}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        title="Cerrar día"
      />
    </>
  );
}
