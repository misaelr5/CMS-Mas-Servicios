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
        {weekLocked ? "Esta semana está cerrada. Reabrila para modificarla." : "Este reporte diario está cerrado. Reabrilo para modificarlo."}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input name="cash_register_id" type="hidden" value={register.id} />
      <input name="report_date" type="hidden" value={reportDate} />

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-darkSurface shadow-medium">
        <div className="border-b border-white/10 bg-gradient-to-r from-white/8 via-white/4 to-transparent px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brandYellow/90">Carga diaria</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-lightGray/80">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-brandWhite">{reportDate}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-brandWhite">
                  {register.register_number ? `Caja ${register.register_number}` : register.name}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-brandWhite">{register.branch_name}</span>
              </div>
            </div>
            <div className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-success">
              {register.today_status}
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 bg-brandBlack/35 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-lightGray/70">Fecha</p>
              <p className="mt-1 text-lg font-black text-brandWhite">{reportDate}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-lightGray/70">Operado total</p>
              <p className="mt-1 text-lg font-black text-brandWhite">{formatArs(totals.operated)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-lightGray/70">Ganancia total</p>
              <p className="mt-1 text-lg font-black text-brandWhite">{formatArs(totals.profit)}</p>
            </div>
            <div className="rounded-2xl border border-brandYellow/30 bg-brandYellow/10 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-brandYellow/90">Estado</p>
              <p className="mt-1 text-lg font-black text-brandWhite">{register.today_status}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category, index) => {
            const existingLine = register.today_report?.lines.find((line) => line.category_id === category.id);
            return (
              <section
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-soft transition-colors hover:border-brandYellow/30"
                key={category.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-lightGray/60">Categoría</p>
                    <h3 className="mt-1 text-lg font-black text-brandWhite">{category.name}</h3>
                  </div>
                  <div className="rounded-full border border-brandYellow/30 bg-brandYellow/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-brandYellow">
                    #{index + 1}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-lightGray/70" htmlFor={`operated_amount_ars_${category.id}`}>
                      Operado
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
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-lightGray/70" htmlFor={`profit_amount_ars_${category.id}`}>
                      Ganancia
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
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-lightGray bg-white p-4 text-brandBlack shadow-soft">
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

          {canReview ? (
            <div className="mt-4 space-y-2">
              <label className="text-sm font-semibold text-brandBlack" htmlFor="negative_profit_reason">
                Motivo si hay ganancia negativa
              </label>
              <Input id="negative_profit_reason" name="negative_profit_reason" placeholder="Obligatorio para admin/encargado si cargas negativos" />
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-brandYellow/25 bg-brandYellow/10 p-4 text-brandBlack shadow-soft">
          <p className="text-[11px] uppercase tracking-[0.22em] text-brandBlack/70">Lectura rápida</p>
          <div className="mt-3 space-y-3 text-sm">
            <div className="rounded-2xl bg-white/65 px-4 py-3 font-semibold">Cargá solo importes. Las notas se manejan en otras pantallas.</div>
            <div className="rounded-2xl bg-white/65 px-4 py-3 font-semibold">Guardá parcial si todavía no terminaste.</div>
            <div className="rounded-2xl bg-white/65 px-4 py-3 font-semibold">Las sumas se recalculan automáticamente.</div>
          </div>
        </div>
      </div>

      {state.message ? (
        <p role="alert" className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{state.message}</p>
      ) : (
        <p className="text-sm text-mediumGray">Completá los importes por categoría. Si una carga queda a medias, guardala como parcial para no perder el trabajo.</p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending} loading={isPending} name="submit_mode" type="submit" value="parcial">
          Guardar parcial
        </Button>
        <Button disabled={isPending} loading={isPending} name="submit_mode" type="submit" value="cargado" variant="secondary">
          Guardar como cargado
        </Button>
        {canReview ? (
          <Button disabled={isPending} loading={isPending} name="submit_mode" type="submit" value="revisado" variant="outline">
            Marcar como revisado
          </Button>
        ) : null}
      </div>
    </form>
  );
}
