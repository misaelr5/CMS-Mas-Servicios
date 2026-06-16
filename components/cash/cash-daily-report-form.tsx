"use client";

import { useActionState } from "react";

import { saveCashDailyReportAction } from "@/app/actions/cash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CashRegisterOverview, CashReportLineWithCategory } from "@/lib/cash/cash-service";
import type { CashReportCategory } from "@/lib/db/types";
import { formatArs } from "@/lib/operations/seed-data";

const initialState = {
  ok: false,
  message: ""
};

export function CashDailyReportForm({
  register,
  categories,
  reportDate,
  canReview,
  isLocked
}: {
  register: CashRegisterOverview;
  categories: CashReportCategory[];
  reportDate: string;
  canReview: boolean;
  isLocked?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(saveCashDailyReportAction, initialState);

  const totals = register.today_report?.lines.reduce(
    (acc: { operated: number; profit: number }, line: CashReportLineWithCategory) => {
      acc.operated += Number(line.operated_amount_ars ?? 0);
      acc.profit += Number(line.profit_amount_ars ?? 0);
      return acc;
    },
    { operated: 0, profit: 0 }
  ) ?? { operated: 0, profit: 0 };

  if (isLocked) {
    return (
      <div className="rounded-3xl border border-warning/30 bg-warning/10 p-4 text-sm font-semibold text-brandBlack">
        Este reporte diario esta cerrado. Reabrilo para modificarlo.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input name="cash_register_id" type="hidden" value={register.id} />
      <input name="report_date" type="hidden" value={reportDate} />

      <div className="grid gap-4 lg:grid-cols-2">
        {categories.map((category) => (
          <div key={category.id} className="rounded-3xl border border-lightGray bg-lightGray/20 p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-mediumGray">Categoría</p>
                <h3 className="mt-1 font-heading text-lg font-black text-brandBlack">{category.name}</h3>
              </div>
              <span className="rounded-full border border-brandYellow/40 bg-brandYellow/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brandBlack">
                #{category.sort_order}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brandBlack" htmlFor={`operated_amount_ars_${category.id}`}>
                  Monto operado
                </label>
                <Input
                  id={`operated_amount_ars_${category.id}`}
                  inputMode="decimal"
                  min="0"
                  name={`operated_amount_ars_${category.id}`}
                  placeholder="0"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brandBlack" htmlFor={`profit_amount_ars_${category.id}`}>
                  Ganancia / comisión
                </label>
                <Input
                  id={`profit_amount_ars_${category.id}`}
                  inputMode="decimal"
                  name={`profit_amount_ars_${category.id}`}
                  placeholder="0"
                  type="number"
                  step="any"
                />
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <label className="text-sm font-semibold text-brandBlack" htmlFor={`notes_${category.id}`}>
                Observación opcional
              </label>
              <textarea
                className="min-h-20 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-brandBlack shadow-sm placeholder:text-mediumGray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                id={`notes_${category.id}`}
                name={`notes_${category.id}`}
                placeholder="Detalle interno de la categoría"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-lightGray bg-white p-4 text-brandBlack shadow-soft">
          <p className="text-[11px] uppercase tracking-[0.22em] text-mediumGray">Nota general</p>
          <textarea
            className="mt-3 min-h-28 w-full rounded-2xl border border-lightGray bg-lightGray/30 px-4 py-3 text-sm text-brandBlack shadow-sm placeholder:text-mediumGray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            name="general_note"
            placeholder="Observación general de la carga"
          />
        </div>

        <div className="rounded-3xl border border-lightGray bg-lightGray/25 p-4 text-brandBlack shadow-soft">
          <p className="text-[11px] uppercase tracking-[0.22em] text-mediumGray">Control</p>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              Caja: <span className="font-semibold">{register.register_number ? `Caja ${register.register_number}` : register.name}</span>
            </p>
            <p>
              Sucursal: <span className="font-semibold">{register.branch_name}</span>
            </p>
            <p>
              Operado acumulado: <span className="font-semibold">{formatArs(totals.operated)}</span>
            </p>
            <p>
              Ganancia acumulada: <span className="font-semibold">{formatArs(totals.profit)}</span>
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold text-brandBlack" htmlFor="negative_profit_reason">
              Motivo si hay ganancia negativa
            </label>
            <Input id="negative_profit_reason" name="negative_profit_reason" placeholder="Obligatorio para admin/encargado si cargás negativos" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending} name="submit_mode" type="submit" value="parcial">
          {isPending ? "Guardando..." : "Guardar parcial"}
        </Button>
        <Button disabled={isPending} name="submit_mode" type="submit" value="cargado" variant="secondary">
          Guardar como cargado
        </Button>
        {canReview ? (
          <Button disabled={isPending} name="submit_mode" type="submit" value="revisado" variant="outline">
            Marcar como revisado
          </Button>
        ) : null}
      </div>

      {state.message ? (
        <p className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{state.message}</p>
      ) : (
        <p className="text-sm text-mediumGray">
          Completá los importes por categoría. Si una carga queda a medias, guardala como parcial para no perder el trabajo.
        </p>
      )}
    </form>
  );
}
