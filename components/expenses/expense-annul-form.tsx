"use client";

import { useActionState } from "react";

import { annulExpenseAction } from "@/app/actions/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState = { ok: false, message: "" };

export function ExpenseAnnulForm({
  expenseId,
  branchId,
  date,
  currentPath
}: {
  expenseId: string;
  branchId: string;
  date: string;
  currentPath: string;
}) {
  const [state, formAction, isPending] = useActionState(annulExpenseAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input name="expense_id" type="hidden" value={expenseId} />
      <input name="branch_id" type="hidden" value={branchId} />
      <input name="date" type="hidden" value={date} />
      <input name="current_path" type="hidden" value={currentPath} />
      <Input name="reason" placeholder="Motivo para anular" required />
      <Button className="w-full sm:w-auto" disabled={isPending} size="sm" type="submit" variant="destructive">
        {isPending ? "Anulando..." : "Anular"}
      </Button>
      {state.message ? <p className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{state.message}</p> : null}
    </form>
  );
}
