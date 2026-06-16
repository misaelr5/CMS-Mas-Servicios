"use client";

import { useActionState } from "react";

import { createDailyReportAdjustmentAction } from "@/app/actions/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import type { Branch } from "@/lib/db/types";
import { dailyReportAdjustmentTypeLabels } from "@/lib/finance/daily-report-calculations";

const initialState = { ok: false, message: "" };

export function DailyReportAdjustmentForm({
  date,
  branches,
  fixedBranchId,
  canWrite,
  isLocked
}: {
  date: string;
  branches: Branch[];
  fixedBranchId?: string;
  canWrite: boolean;
  isLocked?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    createDailyReportAdjustmentAction,
    initialState
  );

  if (!canWrite) {
    return (
      <p className="text-sm text-mediumGray">
        Solo admin o encargado pueden crear ajustes.
      </p>
    );
  }

  if (isLocked) {
    return (
      <p className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-brandBlack">
        Este reporte diario está cerrado. Reabrilo para modificarlo.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input name="date" type="hidden" value={date} />
      <input name="current_path" type="hidden" value="/reporte-diario" />
      {fixedBranchId ? (
        <input name="branch_id" type="hidden" value={fixedBranchId} />
      ) : (
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
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <FormField label="Tipo de ajuste" htmlFor="adjustment_type" required>
          <Select id="adjustment_type" name="adjustment_type" required>
            {Object.entries(dailyReportAdjustmentTypeLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </Select>
        </FormField>

        <FormField label="Monto" htmlFor="amount_ars" required>
          <Input
            id="amount_ars"
            min="1"
            name="amount_ars"
            placeholder="0"
            required
            type="number"
          />
        </FormField>

        <FormField label="Motivo" htmlFor="reason" required>
          <Input
            id="reason"
            name="reason"
            placeholder="Motivo del ajuste"
            required
          />
        </FormField>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={isPending} type="submit">
          {isPending ? "Guardando..." : "Crear ajuste"}
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
