"use client";

import { useActionState } from "react";

import { saveCashDailyReportAction } from "@/app/actions/cash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CashRegisterOverview } from "@/lib/cash/cash-service";
import type { CashReportCategory } from "@/lib/db/types";
import { formatArs } from "@/lib/operations/seed-data";
import { calculateCashDailyReportTotals } from "@/src/modules/cash-registers/domain/cash-report-rules";

const initialState = {
  ok: false,
  message: ""
};

export function CashDailyReportForm({
  register,
  categories,
  reportDate,
  canReview,
  isLocked,
  weekLocked
}: {
  register: CashRegisterOverview;
  categories: CashReportCategory[];
  reportDate: string;
  canReview: boolean;
  isLocked?: boolean;
  weekLocked?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(saveCashDailyReportAction, initialState);

  const totals = register.today_report ? calculateCashDailyReportTotals(register.today_report.lines) : { operated: 0, profit: 0 };

  if (isLocked || weekLocked) {
    return (
      <div className="rounded-3xl border border-warning/30 bg-warning/10 p-4 text-sm font-semibold text-brandBlack">
        {weekLocked ? "Esta semana esta cerrada. Reabrila para modificarla." : "Este reporte diario esta cerrado. Reabrilo para modificarlo."}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input name="cash_register_id" type="hidden" value={register.id} />
      <input name="report_date" type="hidden" value={reportDate} />

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-darkSurface shadow-medium">
        <div className="border-b border-white/10 bg-white/5 px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brandYellow/90">Carga diaria</p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-lightGray/70">Fecha</p>
              <p className="mt-1 text-lg font-black text-brandWhite">{reportDate}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-lightGray/70">Caja</p>
              <p className="mt-1 text-lg font-black text-brandWhite">{register.register_number ? `Caja ${register.register_number}` : register.name}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-lightGray/70">Sucursal</p>
              <p className="mt-1 text-lg font-black text-brandWhite">{register.branch_name}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-lightGray/70">Estado</p>
              <p className="mt-1 text-lg font-black text-brandWhite">{register.today_status}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] border-separate border-spacing-0 text-sm">
            <thead className="bg-lightGray text-brandBlack">
              <tr>
                <th className="sticky left-0 z-20 border-b border-lightGray bg-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">
                  Categoría
                </th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">
                  Monto operado
                </th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">
                  Ganancia / comisión
                </th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">
                  Observación
                </th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">
                  Orden
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => {
                const existingLine = register.today_report?.lines.find((line) => line.category_id === category.id);
                return (
                  <tr key={category.id} className={index % 2 === 0 ? "bg-white" : "bg-lightGray/20"}>
                    <th className="sticky left-0 z-10 border-b border-lightGray bg-inherit px-4 py-4 text-left align-top">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Categoría</p>
                      <p className="mt-1 text-base font-black text-brandBlack">{category.name}</p>
                    </th>
                    <td className="border-b border-lightGray px-4 py-4 align-top">
                      <label className="sr-only" htmlFor={`operated_amount_ars_${category.id}`}>
                        Monto operado {category.name}
                      </label>
                      <Input
                        defaultValue={existingLine?.operated_amount_ars ?? 0}
                        id={`operated_amount_ars_${category.id}`}
                        inputMode="decimal"
                        min="0"
                        name={`operated_amount_ars_${category.id}`}
                        placeholder="0"
                        type="number"
                      />
                    </td>
                    <td className="border-b border-lightGray px-4 py-4 align-top">
                      <label className="sr-only" htmlFor={`profit_amount_ars_${category.id}`}>
                        Ganancia {category.name}
                      </label>
                      <Input
                        defaultValue={existingLine?.profit_amount_ars ?? 0}
                        id={`profit_amount_ars_${category.id}`}
                        inputMode="decimal"
                        name={`profit_amount_ars_${category.id}`}
                        placeholder="0"
                        step="any"
                        type="number"
                      />
                    </td>
                    <td className="border-b border-lightGray px-4 py-4 align-top">
                      <label className="sr-only" htmlFor={`notes_${category.id}`}>
                        Observación {category.name}
                      </label>
                      <textarea
                        className="min-h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-brandBlack shadow-sm placeholder:text-mediumGray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        defaultValue={existingLine?.notes ?? ""}
                        id={`notes_${category.id}`}
                        name={`notes_${category.id}`}
                        placeholder="Detalle interno"
                      />
                    </td>
                    <td className="border-b border-lightGray px-4 py-4 align-top">
                      <span className="inline-flex rounded-full border border-brandYellow/40 bg-brandYellow/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-brandBlack">
                        #{category.sort_order}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-brandYellow/15 text-brandBlack">
              <tr>
                <th className="sticky left-0 z-10 border-t border-lightGray bg-brandYellow/20 px-4 py-4 text-left font-black uppercase tracking-[0.2em]">
                  TOTAL
                </th>
                <td className="border-t border-lightGray px-4 py-4">
                  <p className="text-lg font-black">{formatArs(totals.operated)}</p>
                </td>
                <td className="border-t border-lightGray px-4 py-4">
                  <p className="text-lg font-black">{formatArs(totals.profit)}</p>
                </td>
                <td className="border-t border-lightGray px-4 py-4 text-sm text-mediumGray">Suma automática</td>
                <td className="border-t border-lightGray px-4 py-4 text-sm text-mediumGray">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-lightGray bg-white p-4 text-brandBlack shadow-soft">
          <p className="text-[11px] uppercase tracking-[0.22em] text-mediumGray">Nota general</p>
          <textarea
            className="mt-3 min-h-28 w-full rounded-md border border-lightGray bg-lightGray/30 px-4 py-3 text-sm text-brandBlack shadow-sm placeholder:text-mediumGray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
