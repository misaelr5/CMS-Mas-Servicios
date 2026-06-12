"use client";

import { useActionState } from "react";

import { createExpenseAction } from "@/app/actions/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Branch } from "@/lib/db/types";

const initialState = { ok: false, message: "" };

export function ExpenseForm({
  date,
  branches,
  canWrite
}: {
  date: string;
  branches: Branch[];
  canWrite: boolean;
}) {
  const [state, formAction, isPending] = useActionState(createExpenseAction, initialState);

  if (!canWrite) {
    return <p className="text-sm text-mediumGray">Solo lectura para tu rol.</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input name="date" type="hidden" value={date} />
      <input name="current_path" type="hidden" value="/gastos" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="branch_id">
            Sucursal
          </label>
          <select className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-brandBlack shadow-sm" id="branch_id" name="branch_id" required>
            <option value="">Elegí sucursal</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="amount_ars">
            Monto
          </label>
          <Input id="amount_ars" min="1" name="amount_ars" placeholder="0" required type="number" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="category">
            Categoría
          </label>
          <Input id="category" name="category" placeholder="Servicio, alquiler, flete..." required />
        </div>
        <div className="space-y-2 md:col-span-2 xl:col-span-3">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="detail">
            Detalle
          </label>
          <Input id="detail" name="detail" placeholder="Detalle obligatorio del gasto" required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="status">
            Estado
          </label>
          <select className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-brandBlack shadow-sm" id="status" name="status" defaultValue="pendiente" required>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="imputado">Imputado</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="paid_from">
            Pagado desde
          </label>
          <select className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-brandBlack shadow-sm" id="paid_from" name="paid_from" defaultValue="otro" required>
            <option value="caja">Caja</option>
            <option value="ganancia">Ganancia</option>
            <option value="cuenta">Cuenta</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="space-y-2 md:col-span-2 xl:col-span-3">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="note">
            Nota opcional
          </label>
          <Input id="note" name="note" placeholder="Observación interna" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button className="shadow-yellowGlow" disabled={isPending} type="submit">
          {isPending ? "Guardando..." : "Crear gasto"}
        </Button>
        {state.message ? (
          <p className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
