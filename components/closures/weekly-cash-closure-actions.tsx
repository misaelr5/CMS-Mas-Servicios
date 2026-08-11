"use client";

import { useActionState, useRef, useState } from "react";

import { closeWeeklyCashClosureAction, reopenWeeklyCashClosureAction } from "@/app/actions/weekly-cash-closure";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

const initialState = { ok: false, message: "" };

export function WeeklyCashClosureCloseForm({
  date,
  currentPath,
  hasPending
}: {
  date: string;
  currentPath: string;
  hasPending: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(closeWeeklyCashClosureAction, initialState);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <form ref={formRef} action={formAction} className="space-y-4">
        <input name="date" type="hidden" value={date} />
        <input name="current_path" type="hidden" value={currentPath} />

        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandWhite" htmlFor="close_note">
            Nota opcional
          </label>
          <textarea
            className="min-h-24 w-full rounded-md border border-border bg-white/[0.06] px-3 py-2 text-sm text-brandWhite shadow-sm placeholder:text-lightGray/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            id="close_note"
            name="close_note"
            placeholder="Observacion de cierre semanal"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button className="shadow-yellowGlow" disabled={isPending} type="button" onClick={() => setConfirmOpen(true)}>
            {isPending ? "Procesando..." : "Cerrar semana"}
          </Button>
          {state.message ? (
            <p className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{state.message}</p>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Cerrar semana"
        description={
          hasPending
            ? "Hay cajas o dias pendientes. Podras cerrar la semana, pero quedara marcada como revisar."
            : "Vas a cerrar la semana operativa y bloquear las cargas que queden dentro de este rango."
        }
        onConfirm={() => formRef.current?.requestSubmit()}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        title="Cerrar semana"
      />
    </>
  );
}

export function WeeklyCashClosureReopenForm({
  date,
  currentPath
}: {
  date: string;
  currentPath: string;
}) {
  const [state, formAction, isPending] = useActionState(reopenWeeklyCashClosureAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input name="date" type="hidden" value={date} />
      <input name="current_path" type="hidden" value={currentPath} />

      <div className="space-y-2">
        <label className="text-sm font-semibold text-brandWhite" htmlFor="reopen_reason">
          Motivo de reapertura
        </label>
        <textarea
          className="min-h-24 w-full rounded-md border border-border bg-white/[0.06] px-3 py-2 text-sm text-brandWhite shadow-sm placeholder:text-lightGray/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          id="reopen_reason"
          name="reopen_reason"
          placeholder="Explicá por qué se necesita reabrir la semana"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-brandWhite" htmlFor="reopen_note">
          Nota obligatoria
        </label>
        <textarea
          className="min-h-24 w-full rounded-md border border-border bg-white/[0.06] px-3 py-2 text-sm text-brandWhite shadow-sm placeholder:text-lightGray/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          id="reopen_note"
          name="reopen_note"
          placeholder="Detalle interno de la reapertura"
          required
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={isPending} type="submit" variant="secondary">
          {isPending ? "Procesando..." : "Reabrir semana"}
        </Button>
        {state.message ? (
          <p className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
