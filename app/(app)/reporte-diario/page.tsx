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
import { dailyReportStatusLabels, dailyReportAdjustmentTypeLabels, getDailyReportStatusTone } from "@/lib/finance/daily-report-calculations";
import { getDailyReportDetailedData, type BranchDailyGroup } from "@/lib/finance/daily-report-detailed-service";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import { formatArs } from "@/lib/operations/seed-data";
import { formatUsd } from "@/lib/bags/bag-calculations";
import type { Branch, CashReportCategory } from "@/lib/db/types";

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

function registerStatusBadge(status: string) {
  if (status === "cargado" || status === "revisado") return "success" as const;
  if (status === "parcial") return "warning" as const;
  return "neutral" as const;
}

function BranchSection({
  group,
  categories,
  date,
  canWrite,
  isCashier,
  allBranches
}: {
  group: BranchDailyGroup;
  categories: CashReportCategory[];
  date: string;
  canWrite: boolean;
  isCashier: boolean;
  allBranches: Branch[];
}) {
  if (!group.branch) return null;

  const branch = group.branch;
  const branchStatus = group.dailyReport?.status ?? "abierto";
  const isLocked = branchStatus === "cerrado" || branchStatus === "revisar";
  const hasPendingCash = group.registers.some((r) => r.status === "pendiente" || r.status === "parcial");
  const closedByName = null; // not fetched in detailed service — shown via form

  return (
    <section
      className="space-y-4 rounded-3xl border border-white/10 bg-darkSurface/80 p-4 shadow-soft"
      key={branch.id}
    >
      {/* Branch header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brandYellow/90">{branch.name}</p>
            <Badge variant={badgeVariantFromTone(getDailyReportStatusTone(branchStatus))}>
              {dailyReportStatusLabels[branchStatus]}
            </Badge>
          </div>
          <h2 className="font-heading text-2xl font-black text-brandWhite">Reporte {branch.name}</h2>
          <p className="text-sm text-lightGray/75">
            {group.registers.map((r) => `Caja ${r.register.register_number ?? "?"}`).join(" · ")}
          </p>
          {isLocked ? (
            <div className="rounded-2xl border border-lightGray/10 bg-white/5 px-4 py-3 text-sm text-lightGray">
              <p className="font-semibold text-brandWhite">
                Cerrado: {formatDateTime(group.dailyReport?.closed_at)}
              </p>
              {group.dailyReport?.close_note ? (
                <p className="mt-2">{group.dailyReport.close_note}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-lightGray/75">Abierto para edicion.</p>
          )}
        </div>

        {!isCashier ? (
          <div className="flex flex-wrap items-start gap-2">
            {!isLocked ? (
              <>
                <DailyReportSaveForm
                  branchId={branch.id}
                  canWrite={canWrite}
                  currentStatus={branchStatus}
                  date={date}
                  isLocked={isLocked}
                />
                {canWrite ? (
                  <DailyReportCloseForm
                    branchId={branch.id}
                    currentPath="/reporte-diario"
                    date={date}
                    hasPendingCash={hasPendingCash}
                  />
                ) : null}
              </>
            ) : canWrite ? (
              <DailyReportReopenForm branchId={branch.id} currentPath="/reporte-diario" date={date} />
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Branch totals */}
      {!isCashier ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-brandYellow/85">PF {branch.name}</p>
            <p className="mt-2 text-2xl font-black text-brandWhite">
              {formatArs(group.totals.pfProfitArs + group.totals.manualPfAdjArs)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-brandYellow/85">Divisas {branch.name}</p>
            <p className="mt-2 text-2xl font-black text-brandWhite">
              {formatArs(group.totals.currencyProfitArs + group.totals.manualCurrencyAdjArs)}
            </p>
          </div>
          <div className="rounded-2xl border border-brandYellow/30 bg-brandYellow/15 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-mediumGray">Ganancia {branch.name}</p>
            <p className="mt-2 text-2xl font-black text-brandBlack">
              {formatArs(
                group.totals.pfProfitArs +
                  group.totals.manualPfAdjArs +
                  group.totals.currencyProfitArs +
                  group.totals.manualCurrencyAdjArs
              )}
            </p>
          </div>
        </div>
      ) : null}

      {/* PF Categories table */}
      <details className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-brandWhite">
          Ver planilla de Pago Facil de {branch.name}
        </summary>
        <div className="mt-4">
          <DataCard
            className="bg-white text-brandBlack"
            description={`Planilla de cargas por caja — Pago Facil ${branch.name}.`}
            title={`${branch.name} — Pago Facil`}
          >
            <div className="overflow-x-auto rounded-2xl border border-lightGray">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-lightGray/80 text-brandBlack">
              <tr>
                <th className="sticky left-0 z-10 border-b border-lightGray bg-lightGray/90 px-4 py-3 text-left font-bold uppercase tracking-[0.16em]">
                  Cobros / Pagos
                </th>
                {group.registers.map((rs) => (
                  <th
                    className="border-b border-lightGray px-4 py-3 text-center font-bold uppercase tracking-[0.16em]"
                    key={rs.register.id}
                  >
                    <Link
                      className="hover:underline"
                      href={`/cajas/${rs.register.id}`}
                    >
                      {rs.register.name}
                    </Link>
                    <span className="ml-2">
                      <Badge variant={registerStatusBadge(rs.status)}>{rs.status}</Badge>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => (
                <tr className={index % 2 === 0 ? "bg-white" : "bg-lightGray/15"} key={category.id}>
                  <th className="sticky left-0 z-10 border-b border-lightGray bg-inherit px-4 py-3 text-left font-semibold">
                    {category.name}
                  </th>
                  {group.registers.map((rs) => {
                    const line = rs.lines.find((l) => l.category_id === category.id);
                    return (
                      <td
                        className="border-b border-lightGray px-4 py-3 text-center align-top"
                        key={`${rs.register.id}-${category.id}`}
                      >
                        {line ? (
                          <div className="space-y-1">
                            <p className="text-base font-bold">{formatArs(Number(line.operated_amount_ars ?? 0))}</p>
                            {!isCashier ? (
                              <p className="text-xs text-mediumGray">
                                Ganancia {formatArs(Number(line.profit_amount_ars ?? 0))}
                              </p>
                            ) : null}
                            {line.notes ? (
                              <p className="text-xs italic text-mediumGray">{line.notes}</p>
                            ) : null}
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
                <th className="sticky left-0 z-10 border-t-2 border-lightGray bg-brandYellow/20 px-4 py-3 text-left font-black uppercase tracking-[0.16em]">
                  TOTAL
                </th>
                {group.registers.map((rs) => (
                  <td
                    className="border-t-2 border-lightGray px-4 py-3 text-center"
                    key={`${rs.register.id}-total`}
                  >
                    <p className="text-base font-black">{formatArs(rs.totalOperatedArs)}</p>
                    {!isCashier ? (
                      <p className="text-xs text-mediumGray">
                        Ganancia {formatArs(rs.pfProfitArs)}
                      </p>
                    ) : null}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
            </div>
          </DataCard>
        </div>
      </details>

      {/* Divisas / Bags table */}
      {!isCashier && group.bags.length > 0 ? (
        <DataCard
          className="bg-white text-brandBlack"
          description={`Estado de divisas y bolsas de la sucursal ${branch.name}.`}
          title={`${branch.name} — Divisas`}
        >
          <div className="overflow-x-auto rounded-2xl border border-lightGray">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-lightGray/80 text-brandBlack">
                <tr>
                  <th className="border-b border-lightGray px-4 py-3 text-left font-bold uppercase tracking-[0.14em]">Bolsa</th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">Efectivo</th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">Cuenta</th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">USD</th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">Comprados hoy</th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">Vendidos hoy</th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">Ganancia hoy</th>
                  <th className="border-b border-lightGray px-4 py-3 text-center font-bold uppercase tracking-[0.14em]">Internas</th>
                </tr>
              </thead>
              <tbody>
                {group.bags.map((bs, index) => (
                  <tr className={index % 2 === 0 ? "bg-white" : "bg-lightGray/15"} key={bs.bag.id}>
                    <td className="border-b border-lightGray px-4 py-3">
                      <Link className="font-semibold hover:underline" href={`/bolsas/${bs.bag.id}`}>
                        {bs.bag.name}
                      </Link>
                      {bs.bag.responsible_name ? (
                        <p className="text-xs text-mediumGray">{bs.bag.responsible_name}</p>
                      ) : null}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums">
                      {formatArs(Number(bs.bag.current_cash_ars ?? 0))}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums">
                      {formatArs(Number(bs.bag.current_account_ars ?? 0))}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums">
                      {formatUsd(Number(bs.bag.current_usd ?? 0))}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums">
                      {formatUsd(bs.boughtUsdToday)}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums">
                      {formatUsd(bs.soldUsdToday)}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums font-semibold">
                      {formatArs(bs.currencyProfitArs)}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-center">
                      {bs.internalOpsCount > 0 ? (
                        <Badge variant="neutral">{bs.internalOpsCount}</Badge>
                      ) : (
                        <span className="text-mediumGray">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataCard>
      ) : null}

      {/* Adjustments + notes */}
      {!isCashier ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <DataCard
            className="bg-white text-brandBlack"
            description="Ajustes manuales de PF y divisas."
            title="Ajustes manuales"
          >
            <DailyReportAdjustmentForm
              branches={allBranches}
              canWrite={canWrite}
              date={date}
              fixedBranchId={branch.id}
              isLocked={isLocked}
            />
            <div className="mt-4 space-y-3">
              {group.adjustments.length === 0 ? (
                <EmptyState
                  className="shadow-none"
                  description="No hay ajustes manuales para esta sucursal."
                  title="Sin ajustes"
                />
              ) : (
                group.adjustments.map((adjustment) => (
                  <div
                    className="rounded-2xl border border-lightGray bg-lightGray/25 p-4"
                    key={adjustment.id}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-brandBlack">
                          {dailyReportAdjustmentTypeLabels[adjustment.adjustment_type]}
                        </p>
                        <p className="text-sm text-mediumGray">{adjustment.reason}</p>
                        <p className="mt-1 text-sm font-semibold text-brandBlack">
                          {formatArs(Number(adjustment.amount_ars ?? 0))}
                        </p>
                      </div>
                      <Badge variant="neutral">Ajuste</Badge>
                    </div>
                    {canWrite && !isLocked ? (
                      <DailyReportAdjustmentAnnulForm
                        adjustmentId={adjustment.id}
                        branchId={branch.id}
                        currentPath="/reporte-diario"
                        date={date}
                      />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </DataCard>

          <DataCard
            className="bg-white text-brandBlack"
            description={`Notas internas del reporte ${branch.name}.`}
            title={`Notas ${branch.name}`}
          >
            {group.dailyReport ? (
              <NotesPanel
                description={`Notas del reporte ${branch.name}.`}
                entityHref={`/reporte-diario?date=${date}`}
                entityId={group.dailyReport.id}
                entityLabel={`${branch.name} · ${date}`}
                entityType="daily_report"
                title={`Notas de ${branch.name}`}
              />
            ) : (
              <EmptyState
                description="Guardá el reporte para habilitar notas."
                title="Sin reporte guardado"
              />
            )}
          </DataCard>
        </div>
      ) : null}
    </section>
  );
}

export default async function ReporteDiarioPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedDate = resolvedSearchParams.date || getBuenosAiresDateString();
  const auth = await getServerAuthContext(cookies());

  if (!auth) {
    return <AccessDenied />;
  }

  const canWrite = auth.role === "admin" || auth.role === "encargado";
  const isCashier = auth.role === "cajero";

  const data = await getDailyReportDetailedData(selectedDate, { role: auth.role, userId: auth.userId });

  const { grandTotals, categories } = data;

  const overallStatus =
    data.dailyReports.length === 0
      ? "abierto"
      : data.dailyReports.every((r) => r.status === "cerrado")
        ? "cerrado"
        : data.dailyReports.some((r) => r.status === "revisar")
          ? "revisar"
          : "abierto";

  const visibleBranchGroups = [data.centro, data.terminal].filter((group) => group.branch);
  const allBranches: Branch[] = visibleBranchGroups
    .map((g) => g.branch)
    .filter((b): b is Branch => b !== null);

  return (
    <div className="space-y-6">
      <SectionTitle
        description={
          isCashier
            ? "Vista operativa de tu sucursal. Solo ves tu propio reporte diario."
            : "Planilla operativa diaria — cajas Pago Facil, divisas y ganancia libre por sucursal."
        }
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

      {/* Date selector */}
      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandWhite" htmlFor="date">
            Fecha
          </label>
          <Input defaultValue={selectedDate} id="date" name="date" type="date" />
        </div>
        <Button type="submit">Ver fecha</Button>
        {!isCashier ? (
          <Button asChild variant="outline">
            <Link href="/gastos">Ir a gastos</Link>
          </Button>
        ) : null}
      </form>

      {/* Summary StatCards */}
      {!isCashier ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Ganancia PF total"
            status="ok"
            value={formatArs(grandTotals.pfProfitTotal)}
          />
          <StatCard
            label="Ganancia divisas total"
            status="ok"
            value={formatArs(grandTotals.currencyProfitTotal)}
          />
          <StatCard
            label="Gastos del dia"
            status="neutral"
            value={formatArs(grandTotals.expensesArs)}
          />
          <StatCard
            label="Ganancia libre"
            status={grandTotals.freeProfitArs < 0 ? "error" : "ok"}
            value={formatArs(grandTotals.freeProfitArs)}
          />
        </div>
      ) : null}

      {visibleBranchGroups.map((group) => (
        <BranchSection
          allBranches={allBranches}
          canWrite={canWrite}
          categories={categories}
          date={selectedDate}
          group={group}
          isCashier={isCashier}
          key={group.branch?.id ?? "branch"}
        />
      ))}

      {/* General bags (no branch) */}
      {!isCashier && data.generalBags.length > 0 ? (
        <DataCard
          className="bg-white text-brandBlack"
          description="Bolsas sin sucursal asignada — operacion general."
          title="Bolsas generales"
        >
          <div className="overflow-x-auto rounded-2xl border border-lightGray">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-lightGray/80 text-brandBlack">
                <tr>
                  <th className="border-b border-lightGray px-4 py-3 text-left font-bold uppercase tracking-[0.14em]">Bolsa</th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">Efectivo</th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">Cuenta</th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">USD</th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">Comprados hoy</th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">Vendidos hoy</th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-bold uppercase tracking-[0.14em]">Ganancia hoy</th>
                  <th className="border-b border-lightGray px-4 py-3 text-center font-bold uppercase tracking-[0.14em]">Internas</th>
                </tr>
              </thead>
              <tbody>
                {data.generalBags.map((bs, index) => (
                  <tr className={index % 2 === 0 ? "bg-white" : "bg-lightGray/15"} key={bs.bag.id}>
                    <td className="border-b border-lightGray px-4 py-3">
                      <Link className="font-semibold hover:underline" href={`/bolsas/${bs.bag.id}`}>
                        {bs.bag.name}
                      </Link>
                      {bs.bag.responsible_name ? (
                        <p className="text-xs text-mediumGray">{bs.bag.responsible_name}</p>
                      ) : null}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums">
                      {formatArs(Number(bs.bag.current_cash_ars ?? 0))}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums">
                      {formatArs(Number(bs.bag.current_account_ars ?? 0))}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums">
                      {formatUsd(Number(bs.bag.current_usd ?? 0))}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums">
                      {formatUsd(bs.boughtUsdToday)}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums">
                      {formatUsd(bs.soldUsdToday)}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums font-semibold">
                      {formatArs(bs.currencyProfitArs)}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-center">
                      {bs.internalOpsCount > 0 ? (
                        <Badge variant="neutral">{bs.internalOpsCount}</Badge>
                      ) : (
                        <span className="text-mediumGray">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataCard>
      ) : null}

      {/* Grand totals table */}
      {!isCashier ? (
        <DataCard
          description="Resumen consolidado del dia — PF, divisas, gastos y ganancia libre."
          title="Totales del dia"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[640px] border-separate border-spacing-0 text-sm">
              <thead className="bg-lightGray text-brandBlack">
                <tr>
                  <th className="border-b border-lightGray px-4 py-3 text-left font-black uppercase tracking-[0.16em]">
                    Concepto
                  </th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-black uppercase tracking-[0.16em]">
                    PF
                  </th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-black uppercase tracking-[0.16em]">
                    Divisas
                  </th>
                  <th className="border-b border-lightGray px-4 py-3 text-right font-black uppercase tracking-[0.16em]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="border-b border-lightGray px-4 py-3 font-semibold text-brandBlack">Centro</td>
                  <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums text-brandBlack">
                    {formatArs(grandTotals.pfProfitCentro)}
                  </td>
                  <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums text-brandBlack">
                    {formatArs(grandTotals.currencyProfitCentro)}
                  </td>
                  <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums font-bold text-brandBlack">
                    {formatArs(grandTotals.pfProfitCentro + grandTotals.currencyProfitCentro)}
                  </td>
                </tr>
                <tr className="bg-lightGray/15">
                  <td className="border-b border-lightGray px-4 py-3 font-semibold text-brandBlack">Terminal</td>
                  <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums text-brandBlack">
                    {formatArs(grandTotals.pfProfitTerminal)}
                  </td>
                  <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums text-brandBlack">
                    {formatArs(grandTotals.currencyProfitTerminal)}
                  </td>
                  <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums font-bold text-brandBlack">
                    {formatArs(grandTotals.pfProfitTerminal + grandTotals.currencyProfitTerminal)}
                  </td>
                </tr>
                {grandTotals.currencyProfitGeneral !== 0 ? (
                  <tr className="bg-white">
                    <td className="border-b border-lightGray px-4 py-3 font-semibold text-brandBlack">General</td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums text-brandBlack">
                      -
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums text-brandBlack">
                      {formatArs(grandTotals.currencyProfitGeneral)}
                    </td>
                    <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums font-bold text-brandBlack">
                      {formatArs(grandTotals.currencyProfitGeneral)}
                    </td>
                  </tr>
                ) : null}
                <tr className="bg-brandYellow/10">
                  <td className="border-b border-lightGray px-4 py-3 font-black text-brandBlack">TOTAL BRUTO</td>
                  <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums font-black text-brandBlack">
                    {formatArs(grandTotals.pfProfitTotal)}
                  </td>
                  <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums font-black text-brandBlack">
                    {formatArs(grandTotals.currencyProfitTotal)}
                  </td>
                  <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums font-black text-brandBlack">
                    {formatArs(grandTotals.grossProfitArs)}
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="border-b border-lightGray px-4 py-3 font-semibold text-brandBlack">Gastos</td>
                  <td className="border-b border-lightGray px-4 py-3 text-right text-brandBlack">-</td>
                  <td className="border-b border-lightGray px-4 py-3 text-right text-brandBlack">-</td>
                  <td className="border-b border-lightGray px-4 py-3 text-right tabular-nums font-semibold text-danger">
                    -{formatArs(grandTotals.expensesArs)}
                  </td>
                </tr>
                <tr className={grandTotals.freeProfitArs < 0 ? "bg-danger/10" : "bg-success/10"}>
                  <td className="px-4 py-3 font-black text-brandBlack">GANANCIA LIBRE</td>
                  <td className="px-4 py-3 text-right text-brandBlack">-</td>
                  <td className="px-4 py-3 text-right text-brandBlack">-</td>
                  <td className="px-4 py-3 text-right tabular-nums font-black text-brandBlack">
                    {formatArs(grandTotals.freeProfitArs)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </DataCard>
      ) : null}
    </div>
  );
}
