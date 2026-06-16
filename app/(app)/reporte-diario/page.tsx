import Link from "next/link";
import { cookies } from "next/headers";

import { AccessDenied } from "@/components/access-denied";
import { DataCard } from "@/components/data-card";
import { EmptyState } from "@/components/empty-state";
import { NotesPanel } from "@/components/notes/notes-panel";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DailyReportAdjustmentAnnulForm } from "@/components/reports/daily-report-adjustment-annul-form";
import { DailyReportAdjustmentForm } from "@/components/reports/daily-report-adjustment-form";
import { DailyReportCloseForm } from "@/components/reports/daily-report-close-form";
import { DailyReportReopenForm } from "@/components/reports/daily-report-reopen-form";
import { DailyReportSaveForm } from "@/components/reports/daily-report-save-form";
import { getServerAuthContext } from "@/lib/auth/server";
import { getCashModuleData } from "@/lib/cash/cash-service";
import { dailyReportStatusLabels, getDailyReportStatusTone } from "@/lib/finance/daily-report-calculations";
import { getDailyReportViewData } from "@/lib/finance/daily-report-service";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import { formatArs } from "@/lib/operations/seed-data";

type SearchParams = Promise<{ date?: string }>;

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function badgeVariantFromTone(tone: "ok" | "error" | "pendiente" | "revisar" | "neutral") {
  if (tone === "ok") return "success" as const;
  if (tone === "error") return "danger" as const;
  if (tone === "revisar") return "warning" as const;
  if (tone === "pendiente") return "neutral" as const;
  return "outline" as const;
}

export default async function ReporteDiarioPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedDate = resolvedSearchParams.date || getBuenosAiresDateString();
  const auth = await getServerAuthContext(cookies());

  if (!auth) {
    return <AccessDenied />;
  }

  const canWrite = auth.role === "admin" || auth.role === "encargado";
  const reportData = await getDailyReportViewData(selectedDate, { role: auth.role, userId: auth.userId });
  const cashData = await getCashModuleData({ role: auth.role, userId: auth.userId });

  const selectedBranches = reportData.branches;
  const totals = reportData.totals;
  const overallStatus =
    selectedBranches.length === 0
      ? "abierto"
      : selectedBranches.every((branch) => branch.dailyReport?.status === "cerrado")
        ? "cerrado"
        : selectedBranches.some((branch) => branch.dailyReport?.status === "revisar" || branch.hasNegativeAvailable)
          ? "revisar"
          : "abierto";

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Reporte diario de Pago Facil, divisas, gastos y ganancia libre por sucursal."
        title="Reporte diario"
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{formatDateLabel(selectedDate)}</Badge>
            <Badge variant={badgeVariantFromTone(getDailyReportStatusTone(overallStatus))}>
              {dailyReportStatusLabels[overallStatus]}
            </Badge>
          </div>
        }
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandWhite" htmlFor="date">
            Fecha
          </label>
          <Input defaultValue={selectedDate} id="date" name="date" type="date" />
        </div>
        <Button type="submit">Ver fecha</Button>
        <Button asChild variant="outline">
          <Link href="/gastos">Ir a gastos</Link>
        </Button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ganancia total Pago Facil" status="ok" value={formatArs(totals.automaticPfProfitArs + totals.manualPfAdjustmentArs)} />
        <StatCard label="Ganancia total divisas" status="ok" value={formatArs(totals.automaticCurrencyProfitArs + totals.manualCurrencyAdjustmentArs)} />
        <StatCard label="Gastos totales" status="neutral" value={formatArs(totals.expensesArs)} />
        <StatCard label="Ganancia libre total" status={totals.availableProfitArs < 0 ? "error" : "ok"} value={formatArs(totals.availableProfitArs)} />
      </div>

      {selectedBranches.length === 0 ? (
        <EmptyState description="Tu rol no tiene sucursal visible para este reporte o todavia no se cargaron datos." title="Sin sucursales visibles" />
      ) : (
        <div className="space-y-6">
          {selectedBranches.map((branch) => {
            const branchStatus = branch.dailyReport?.status ?? (branch.hasNegativeAvailable ? "revisar" : "abierto");
            const isLocked = branchStatus === "cerrado" || branchStatus === "revisar";
            const hasPendingCash = branch.cashRegisters.some((register) => register.status === "pendiente" || register.status === "parcial");
            const branchRegisters = cashData.registers.filter((register) => register.branch_id === branch.branch.id);
            const branchCategories = cashData.categories;

            return (
              <section className="space-y-4 rounded-3xl border border-white/10 bg-darkSurface/80 p-4 shadow-soft" key={branch.branch.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brandYellow/90">{branch.branch.name}</p>
                      <Badge variant={badgeVariantFromTone(getDailyReportStatusTone(branchStatus))}>
                        {dailyReportStatusLabels[branchStatus]}
                      </Badge>
                    </div>
                    <h2 className="font-heading text-2xl font-black text-brandWhite">Reporte {branch.branch.name}</h2>
                    <p className="text-sm text-lightGray/75">
                      {branchRegisters.map((register) => `Caja ${register.register_number ?? "?"}`).join(" · ")}
                    </p>
                    {isLocked ? (
                      <div className="rounded-2xl border border-lightGray/10 bg-white/5 px-4 py-3 text-sm text-lightGray">
                        <p className="font-semibold text-brandWhite">Cerrado por: {branch.dailyReportClosedByName ?? "Sin dato"}</p>
                        <p className="mt-1">Cierre: {formatDateTime(branch.dailyReport?.closed_at)}</p>
                        {branch.dailyReport?.close_note ? <p className="mt-2">{branch.dailyReport.close_note}</p> : null}
                      </div>
                    ) : (
                      <p className="text-sm text-lightGray/75">Abierto para edicion.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-start gap-2">
                    {!isLocked ? (
                      <>
                        <DailyReportSaveForm
                          branchId={branch.branch.id}
                          canWrite={canWrite}
                          currentStatus={branchStatus}
                          date={selectedDate}
                          isLocked={isLocked}
                        />
                        {canWrite ? (
                          <DailyReportCloseForm
                            branchId={branch.branch.id}
                            currentPath="/reporte-diario"
                            date={selectedDate}
                            hasPendingCash={hasPendingCash}
                          />
                        ) : null}
                      </>
                    ) : canWrite ? (
                      <DailyReportReopenForm branchId={branch.branch.id} currentPath="/reporte-diario" date={selectedDate} />
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-lightGray">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-brandYellow/85">PF automatica</p>
                    <p className="mt-2 text-2xl font-black text-brandWhite">{formatArs(branch.automaticPfProfitArs)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-lightGray">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-brandYellow/85">PF manual</p>
                    <p className="mt-2 text-2xl font-black text-brandWhite">{formatArs(branch.manualPfAdjustmentArs)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-lightGray">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-brandYellow/85">Divisas</p>
                    <p className="mt-2 text-2xl font-black text-brandWhite">{formatArs(branch.automaticCurrencyProfitArs)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-lightGray">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-brandYellow/85">Gastos</p>
                    <p className="mt-2 text-2xl font-black text-brandWhite">{formatArs(branch.expensesArs)}</p>
                  </div>
                  <div className="rounded-2xl border border-brandYellow/30 bg-brandYellow/15 p-4 text-sm text-brandBlack">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-mediumGray">Ganancia libre</p>
                    <p className="mt-2 text-2xl font-black">{formatArs(branch.availableProfitArs)}</p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-lightGray bg-white text-brandBlack shadow-soft">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-10 bg-lightGray/90 text-brandBlack">
                      <tr>
                        <th className="sticky left-0 z-20 border-b border-lightGray bg-lightGray/95 px-4 py-3 text-left font-bold uppercase tracking-[0.18em]">
                          Cobros / Pagos
                        </th>
                        {branchRegisters.map((register) => (
                          <th className="border-b border-lightGray px-4 py-3 text-center font-bold uppercase tracking-[0.18em]" key={register.id}>
                            Caja {register.register_number ?? "?"}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {branchCategories.map((category, index) => (
                        <tr key={category.id} className={index % 2 === 0 ? "bg-white" : "bg-lightGray/15"}>
                          <th className="sticky left-0 z-10 border-b border-lightGray bg-inherit px-4 py-3 text-left font-semibold">
                            {category.name}
                          </th>
                          {branchRegisters.map((register) => {
                            const line = register.today_report?.lines.find((item) => item.category_id === category.id);
                            return (
                              <td className="border-b border-lightGray px-4 py-3 text-center align-top" key={`${register.id}-${category.id}`}>
                                {line ? (
                                  <div className="space-y-1">
                                    <p className="text-base font-bold">{formatArs(Number(line.operated_amount_ars ?? 0))}</p>
                                    <p className="text-xs text-mediumGray">Ganancia {formatArs(Number(line.profit_amount_ars ?? 0))}</p>
                                  </div>
                                ) : (
                                  <span className="text-mediumGray">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      <tr className="bg-brandYellow/15">
                        <th className="sticky left-0 z-10 border-t border-lightGray bg-brandYellow/20 px-4 py-3 text-left font-black uppercase tracking-[0.18em]">
                          TOTAL
                        </th>
                        {branchRegisters.map((register) => (
                          <td className="border-t border-lightGray px-4 py-3 text-center" key={`${register.id}-total`}>
                            <p className="text-base font-black">{formatArs(register.today_operated_ars)}</p>
                            <p className="text-xs text-mediumGray">Ganancia {formatArs(register.today_profit_ars)}</p>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <DataCard className="bg-white text-brandBlack" description="Resumen de divisas y utilidad de la sucursal." title="Resumen de la sucursal">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-mediumGray">Divisas compradas</p>
                        <p className="mt-2 text-lg font-black">{formatArs(branch.currencyPurchasedArs)}</p>
                        <p className="text-sm text-mediumGray">USD {branch.currencyPurchasedUsd.toFixed(2)}</p>
                      </div>
                      <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-mediumGray">Divisas vendidas</p>
                        <p className="mt-2 text-lg font-black">{formatArs(branch.currencySoldArs)}</p>
                        <p className="text-sm text-mediumGray">USD {branch.currencySoldUsd.toFixed(2)}</p>
                      </div>
                      <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-mediumGray">Ganancia divisas</p>
                        <p className="mt-2 text-lg font-black">{formatArs(branch.automaticCurrencyProfitArs + branch.manualCurrencyAdjustmentArs)}</p>
                      </div>
                      <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-mediumGray">Cajas</p>
                        <p className="mt-2 text-lg font-black">{branchRegisters.length}</p>
                        <p className="text-sm text-mediumGray">{hasPendingCash ? "Con pendientes" : "Completas"}</p>
                      </div>
                    </div>
                  </DataCard>

                  <DataCard className="bg-white text-brandBlack" description="Cargas y ajustes de la sucursal." title="Ajustes manuales y notas">
                    <DailyReportAdjustmentForm
                      branches={selectedBranches.map((item) => item.branch)}
                      canWrite={canWrite}
                      date={selectedDate}
                      fixedBranchId={branch.branch.id}
                      isLocked={isLocked}
                    />

                    <div className="mt-4 space-y-3">
                      {branch.adjustments.length === 0 ? (
                        <EmptyState className="shadow-none" description="No hay ajustes manuales para esta sucursal." title="Sin ajustes" />
                      ) : (
                        branch.adjustments.map((adjustment) => (
                          <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4" key={adjustment.id}>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-semibold text-brandBlack">{adjustment.adjustment_type}</p>
                                <p className="text-sm text-mediumGray">{adjustment.reason}</p>
                                <p className="mt-1 text-sm font-semibold text-brandBlack">{formatArs(Number(adjustment.amount_ars ?? 0))}</p>
                              </div>
                              <Badge variant="neutral">Ajuste</Badge>
                            </div>

                            {canWrite && !isLocked && !adjustment.annulled_at ? (
                              <DailyReportAdjustmentAnnulForm
                                adjustmentId={adjustment.id}
                                branchId={branch.branch.id}
                                currentPath="/reporte-diario"
                                date={selectedDate}
                              />
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4">
                      {branch.dailyReport ? (
                        <NotesPanel
                          description="Notas internas del reporte diario."
                          entityHref={`/reporte-diario?date=${selectedDate}`}
                          entityId={branch.dailyReport.id}
                          entityLabel={`${branch.branch.name} · ${selectedDate}`}
                          entityType="daily_report"
                          title={`Notas de ${branch.branch.name}`}
                        />
                      ) : (
                        <EmptyState description="Guardá el reporte para habilitar notas vinculadas a esta sucursal." title="Sin reporte guardado" />
                      )}
                    </div>
                  </DataCard>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
