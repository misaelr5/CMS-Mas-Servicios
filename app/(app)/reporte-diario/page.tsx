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
import { getServerAuthContext } from "@/lib/auth/server";
import { cashReportStatusLabels, getCashReportStatusTone } from "@/lib/cash/cash-calculations";
import { dailyReportStatusLabels, getDailyReportStatusTone } from "@/lib/finance/daily-report-calculations";
import { getDailyReportViewData } from "@/lib/finance/daily-report-service";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import { formatArs } from "@/lib/operations/seed-data";
import { DailyReportAdjustmentAnnulForm } from "@/components/reports/daily-report-adjustment-annul-form";
import { DailyReportAdjustmentForm } from "@/components/reports/daily-report-adjustment-form";
import { DailyReportCloseForm } from "@/components/reports/daily-report-close-form";
import { DailyReportReopenForm } from "@/components/reports/daily-report-reopen-form";
import { DailyReportSaveForm } from "@/components/reports/daily-report-save-form";

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
  const selectedBranches = reportData.branches;
  const totals = reportData.totals;
  const overallStatus = selectedBranches.length === 0
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

      <DataCard description="Estado actual del dia por sucursal." title="Estado del reporte">
        <div className="grid gap-4 md:grid-cols-2">
          {selectedBranches.map((branch) => {
            const branchStatus = branch.dailyReport?.status ?? (branch.hasNegativeAvailable ? "revisar" : "abierto");
            const isLocked = branchStatus === "cerrado" || branchStatus === "revisar";
            const hasPendingCash = branch.cashRegisters.some(
              (register) => register.status === "pendiente" || register.status === "parcial"
            );

            return (
              <div className="rounded-3xl border border-lightGray bg-white p-4 text-brandBlack shadow-soft" key={branch.branch.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">{branch.branch.name}</p>
                    <h3 className="mt-1 font-heading text-lg font-black">Reporte diario</h3>
                  </div>
                  <Badge variant={badgeVariantFromTone(getDailyReportStatusTone(branchStatus))}>
                    {dailyReportStatusLabels[branchStatus]}
                  </Badge>
                </div>

                {isLocked ? (
                  <div className="mt-3 rounded-2xl border border-lightGray bg-lightGray/25 p-4 text-sm">
                    <p className="font-semibold text-brandBlack">Cerrado por: {branch.dailyReportClosedByName ?? "Sin dato"}</p>
                    <p className="mt-1 text-mediumGray">Cierre: {formatDateTime(branch.dailyReport?.closed_at)}</p>
                    {branch.dailyReport?.close_note ? <p className="mt-2 text-mediumGray">{branch.dailyReport.close_note}</p> : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-mediumGray">Abierto para edición.</p>
                )}

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-3 text-sm">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-mediumGray">Cajas</p>
                    <p className="mt-1 font-semibold text-brandBlack">
                      {branch.cashRegisters.length} · {hasPendingCash ? "Con pendientes" : "Completas"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-3 text-sm">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-mediumGray">Ganancia libre</p>
                    <p className="mt-1 font-semibold text-brandBlack">{formatArs(branch.availableProfitArs)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DataCard>

      {selectedBranches.length === 0 ? (
        <EmptyState
          description="Tu rol no tiene sucursal visible para este reporte o todavia no se cargaron datos."
          title="Sin sucursales visibles"
        />
      ) : (
        <div className="space-y-4">
          {selectedBranches.map((branch) => {
            const branchStatus = branch.dailyReport?.status ?? (branch.hasNegativeAvailable ? "revisar" : "abierto");
            const isLocked = branchStatus === "cerrado" || branchStatus === "revisar";
            const hasPendingCash = branch.cashRegisters.some(
              (register) => register.status === "pendiente" || register.status === "parcial"
            );

            return (
              <div className="space-y-4 rounded-3xl border border-white/10 bg-darkSurface/80 p-4 shadow-soft" key={branch.branch.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brandYellow/90">{branch.branch.name}</p>
                    <h2 className="mt-1 font-heading text-2xl font-black text-brandWhite">Reporte de {branch.branch.name}</h2>
                    <p className="mt-2 text-sm text-lightGray/80">
                      {branch.cashRegisters.map((register) => `${register.register_number ?? "?"} ${register.name}`).join(" · ")}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-start gap-2">
                    <Badge variant={badgeVariantFromTone(getDailyReportStatusTone(branchStatus))}>
                      {dailyReportStatusLabels[branchStatus]}
                    </Badge>
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
                      <DailyReportReopenForm
                        branchId={branch.branch.id}
                        currentPath="/reporte-diario"
                        date={selectedDate}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <StatCard helper="Suma automatica de cajas de Pago Facil" label="PF automatica" status="ok" value={formatArs(branch.automaticPfProfitArs)} />
                  <StatCard helper="Ajustes manuales de Pago Facil" label="PF manual" status="revisar" value={formatArs(branch.manualPfAdjustmentArs)} />
                  <StatCard helper="Ventas reales de divisas" label="Divisas automatica" status="ok" value={formatArs(branch.automaticCurrencyProfitArs)} />
                  <StatCard helper="Ajustes manuales de divisas" label="Divisas manual" status="revisar" value={formatArs(branch.manualCurrencyAdjustmentArs)} />
                  <StatCard helper="Gastos pagados o imputados" label="Gastos" status="neutral" value={formatArs(branch.expensesArs)} />
                  <StatCard
                    helper="Resultado despues de gastos"
                    label="Ganancia libre"
                    status={branch.hasNegativeAvailable ? "error" : "ok"}
                    value={formatArs(branch.availableProfitArs)}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <DataCard className="bg-white text-brandBlack" description="Estado operativo de las cajas del dia." title="Cajas de la sucursal">
                    <div className="space-y-3">
                      {branch.cashRegisters.map((register) => (
                        <div
                          className="flex flex-col gap-2 rounded-2xl border border-lightGray bg-lightGray/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                          key={register.id}
                        >
                          <div>
                            <p className="font-semibold text-brandBlack">
                              Caja {register.register_number ?? "?"} - {register.name}
                            </p>
                            <p className="text-sm text-mediumGray">
                              Operado {formatArs(register.total_operated_ars)} · Ganancia {formatArs(register.total_profit_ars)}
                            </p>
                          </div>
                          <Badge variant={badgeVariantFromTone(getCashReportStatusTone(register.status))}>
                            {cashReportStatusLabels[register.status]}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </DataCard>

                  <DataCard className="bg-white text-brandBlack" description="Cargas y ajustes de la sucursal." title="Ajustes manuales">
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
                  </DataCard>
                </div>

                <DataCard className="bg-white text-brandBlack" description="Notas vinculadas al reporte diario de la sucursal." title="Notas del reporte">
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
                    <EmptyState
                      description="Guardá el reporte para habilitar notas vinculadas a esta sucursal."
                      title="Sin reporte guardado"
                    />
                  )}
                </DataCard>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
