"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";

import { createExpenseAction } from "@/app/actions/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import type { Branch } from "@/lib/db/types";

const initialState = { ok: false, message: "" };

export function ExpenseForm({
  date,
  branches,
  canWrite,
  isLocked
}: {
  date: string;
  branches: Branch[];
  canWrite: boolean;
  isLocked?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(createExpenseAction, initialState);

  if (!canWrite) {
    return <p className="text-sm text-mediumGray">Solo lectura para tu rol.</p>;
  }

  if (isLocked) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-brandBlack">
        <Lock className="h-4 w-4 shrink-0 text-warning" />
        Este reporte diario está cerrado. Reabrilo para modificarlo.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input name="date" type="hidden" value={date} />
      <input name="current_path" type="hidden" value="/gastos" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FormField label="Sucursal" htmlFor="branch_id" required>
          <Select id="branch_id" name="branch_id" required>
            <option value="">Elegí sucursal</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Monto" htmlFor="amount_ars" required>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-mediumGray">
              $
            </span>
            <Input
              id="amount_ars"
              className="pl-7"
              min="1"
              name="amount_ars"
              placeholder="0"
              required
              type="number"
            />
          </div>
        </FormField>

        <FormField label="Categoría" htmlFor="category" required>
          <Input
            id="category"
            name="category"
            placeholder="Servicio, alquiler, flete..."
            required
          />
        </FormField>

        <FormField
          label="Detalle"
          htmlFor="detail"
          required
          className="md:col-span-2 xl:col-span-3"
        >
          <Input
            id="detail"
            name="detail"
            placeholder="Ej: pago mensual de electricidad"
            required
          />
        </FormField>

        <FormField label="Estado" htmlFor="status" required>
          <Select id="status" name="status" defaultValue="pendiente" required>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="imputado">Imputado</option>
          </Select>
        </FormField>

        <FormField label="Pagado desde" htmlFor="paid_from" required>
          <Select id="paid_from" name="paid_from" defaultValue="otro" required>
            <option value="caja">Caja</option>
            <option value="ganancia">Ganancia</option>
            <option value="cuenta">Cuenta</option>
            <option value="otro">Otro</option>
          </Select>
        </FormField>

        <FormField
          label="Nota opcional"
          htmlFor="note"
          className="md:col-span-2 xl:col-span-3"
        >
          <Input
            id="note"
            name="note"
            placeholder="Observación interna"
          />
        </FormField>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button className="shadow-yellowGlow" disabled={isPending} type="submit">
          {isPending ? "Guardando..." : "Crear gasto"}
        </Button>
        {state.message ? (
          <p
            className={
              state.ok
                ? "text-sm font-semibold text-success"
                : "text-sm font-semibold text-danger"
            }
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
