import Link from "next/link";
import { cookies } from "next/headers";

import { AccessDenied } from "@/components/access-denied";
import { EmptyState } from "@/components/empty-state";
import { ImportantNotesWidget } from "@/components/notes/important-notes-widget";
import { NotesPanel } from "@/components/notes/notes-panel";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { DataCard } from "@/components/data-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerAuthContext } from "@/lib/auth/server";
import { getCashModuleData } from "@/lib/cash/cash-service";
import { getBagsOverview } from "@/lib/bags/bag-service";
import { formatUsd } from "@/lib/bags/bag-calculations";
import { getExpensePageData } from "@/lib/finance/expense-service";
import { getDailyReportViewData } from "@/lib/finance/daily-report-service";
import { getWeeklyCashClosureViewData } from "@/lib/finance/weekly-cash-closure-service";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import { weeklyCashClosureStatusLabels } from "@/lib/finance/weekly-cash-closure-calculations";
import { formatArs } from "@/lib/operations/seed-data";
import { listNotes } from "@/lib/notes/notes-service";

function resolveReportStatus(branches: Awaited<ReturnType<typeof getDailyReportViewData>>["branches"]) {
  if (branches.length === 0) return "Sin datos";
  if (branches.some((branch) => branch.hasNegativeAvailable)) return "Revisar";
  if (branches.every((branch) => branch.dailyReport?.status === "cerrado")) return "Cerrado";
  return "Abierto";
}

export default async function DashboardPage() {
  const auth = await getServerAuthContext(cookies());
  if (!auth) {
    return <AccessDenied />;
  }

  const today = getBuenosAiresDateString();
  const bags = await getBagsOverview();
  const cashData = await getCashModuleData();
  const reportData = await getDailyReportViewData(today, { role: auth.role, userId: auth.userId });
  const expenseData = await getExpensePageData({ date: today }, { role: auth.role, userId: auth.userId });
  const weeklyClosureData = await getWeeklyCashClosureViewData(today, { role: auth.role, userId: auth.userId });
  const reportNotes = (await listNotes({ entityType: "daily_report", limit: 6 })).filter(
    (note) => note.priority === "importante" || note.priority === "urgente"
  );
  const totals = bags.reduce(
    (acc, bag) => {
      acc.cash += Number(bag.current_cash_ars ?? 0);
      acc.account += Number(bag.current_account_ars ?? 0);
      acc.usd += Number(bag.current_usd ?? 0);
      acc.borrowed += Number(bag.borrowed_ars ?? 0);
      acc.profit += Number(bag.accumulated_profit_ars ?? 0);
      if (bag.status !== "ok") acc.review += 1;
      return acc;
    },
    { cash: 0, account: 0, usd: 0, borrowed: 0, profit: 0, review: 0 }
  );
  const reportStatus = resolveReportStatus(reportData.branches);

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Vista principal para Nico. Conecta bolsas, notas y alertas operativas sin perder el layout interno."
        title="Dashboard"
        rightSlot={
          <Badge className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]" variant="outline">
            Vista base
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bolsas activas" value={`${bags.length}`} />
        <StatCard label="Bolsas para revisar" value={`${totals.review}`} />
        <StatCard label="Total USD" value={formatUsd(totals.usd)} />
        <StatCard label="Ganancia divisas" value={formatArs(totals.profit)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total efectivo" value={formatArs(totals.cash)} />
        <StatCard label="Total cuenta" value={formatArs(totals.account)} />
        <StatCard label="Total prestado" value={formatArs(totals.borrowed)} />
        <StatCard label="Notas internas" value="Activas" helper="Base lista para seguimiento" status="ok" />
      </div>

      <DataCard description="Estado actual del cierre semanal de Pago Facil." title="Cierre semanal">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] border-separate border-spacing-0 text-sm">
            <thead className="bg-lightGray text-brandBlack">
              <tr>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Semana</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Estado</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Operado</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Ganancia</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Pendientes</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Revisados</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Ultimo cierre</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="border-b border-lightGray px-4 py-4 font-semibold">{weeklyClosureData.weekStartDate} a {weeklyClosureData.weekEndDate}</td>
                <td className="border-b border-lightGray px-4 py-4">
                  <Badge variant={weeklyClosureData.status === "cerrado" ? "success" : weeklyClosureData.status === "revisar" ? "warning" : "neutral"}>
                    {weeklyCashClosureStatusLabels[weeklyClosureData.status]}
                  </Badge>
                </td>
                <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(weeklyClosureData.totals.totalOperatedArs)}</td>
                <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(weeklyClosureData.totals.totalProfitArs)}</td>
                <td className="border-b border-lightGray px-4 py-4 font-semibold">{weeklyClosureData.totals.pendingDaysCount}</td>
                <td className="border-b border-lightGray px-4 py-4 font-semibold">{weeklyClosureData.totals.reviewedDaysCount}</td>
                <td className="border-b border-lightGray px-4 py-4 text-mediumGray">
                  {weeklyClosureData.lastClosure ? `${weeklyClosureData.lastClosure.week_start_date} a ${weeklyClosureData.lastClosure.week_end_date}` : "Sin cierres"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DataCard>

      <DataCard description="Resumen operativo en formato de tabla." title="Bolsas">
        {bags.length === 0 ? (
          <EmptyState description="No hay bolsas cargadas." title="Sin bolsas" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] border-separate border-spacing-0 text-sm">
              <thead className="bg-lightGray text-brandBlack">
                <tr>
                  <th className="sticky left-0 z-20 border-b border-lightGray bg-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Bolsa</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Responsable</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Base</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Efectivo</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Cuenta</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">USD</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Ganancia</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Estado</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {bags.map((bag, index) => (
                  <tr key={bag.id} className={index % 2 === 0 ? "bg-white" : "bg-lightGray/15"}>
                    <td className="sticky left-0 z-10 border-b border-lightGray bg-inherit px-4 py-4">
                      <div className="space-y-1">
                        <p className="font-black text-brandBlack">{bag.name}</p>
                        <p className="text-xs text-mediumGray">{bag.slug}</p>
                      </div>
                    </td>
                    <td className="border-b border-lightGray px-4 py-4">{bag.responsible_name ?? "Sin asignar"}</td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(Number(bag.base_limit_ars ?? 0))}</td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(Number(bag.current_cash_ars ?? 0))}</td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(Number(bag.current_account_ars ?? 0))}</td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatUsd(Number(bag.current_usd ?? 0))}</td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(Number(bag.accumulated_profit_ars ?? 0))}</td>
                    <td className="border-b border-lightGray px-4 py-4">
                      <Badge variant={bag.status === "ok" ? "success" : bag.status === "revisar" ? "warning" : "danger"}>{bag.status}</Badge>
                    </td>
                    <td className="border-b border-lightGray px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild className="shadow-yellowGlow" size="sm">
                          <Link href={`/bolsas/${bag.id}`}>Ver detalles</Link>
                        </Button>
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/bolsas/nueva-operacion?bagId=${bag.id}`}>Nueva operacion</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>

      <DataCard description="Seguimiento rapido de cajas y reporte diario." title="Cajas y reporte">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] border-separate border-spacing-0 text-sm">
            <thead className="bg-lightGray text-brandBlack">
              <tr>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Indicador</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Valor</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="border-b border-lightGray px-4 py-4 font-semibold">Cajas cargadas</td>
                <td className="border-b border-lightGray px-4 py-4 font-black">{cashData.summary.registers_loaded_today}</td>
                <td className="border-b border-lightGray px-4 py-4 text-mediumGray">Cargadas o revisadas</td>
              </tr>
              <tr className="bg-lightGray/15">
                <td className="border-b border-lightGray px-4 py-4 font-semibold">Cajas pendientes</td>
                <td className="border-b border-lightGray px-4 py-4 font-black">{cashData.summary.registers_pending_today}</td>
                <td className="border-b border-lightGray px-4 py-4 text-mediumGray">Sin carga final</td>
              </tr>
              <tr className="bg-white">
                <td className="border-b border-lightGray px-4 py-4 font-semibold">Operado Pago Facil</td>
                <td className="border-b border-lightGray px-4 py-4 font-black">{formatArs(cashData.summary.total_operated_today)}</td>
                <td className="border-b border-lightGray px-4 py-4 text-mediumGray">Total del dia</td>
              </tr>
              <tr className="bg-lightGray/15">
                <td className="border-b border-lightGray px-4 py-4 font-semibold">Ganancia Pago Facil</td>
                <td className="border-b border-lightGray px-4 py-4 font-black">{formatArs(cashData.summary.total_profit_today)}</td>
                <td className="border-b border-lightGray px-4 py-4 text-mediumGray">Consolidado de cajas</td>
              </tr>
              <tr className="bg-white">
                <td className="border-b border-lightGray px-4 py-4 font-semibold">Ganancia libre</td>
                <td className="border-b border-lightGray px-4 py-4 font-black">{formatArs(reportData.totals.availableProfitArs)}</td>
                <td className="border-b border-lightGray px-4 py-4 text-mediumGray">Reporte diario</td>
              </tr>
              <tr className="bg-lightGray/15">
                <td className="px-4 py-4 font-semibold">Estado del reporte</td>
                <td className="px-4 py-4 font-black">{reportStatus}</td>
                <td className="px-4 py-4 text-mediumGray">Control general</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/cajas">Ir a cajas</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/reporte-diario">Ver reporte diario</Link>
          </Button>
        </div>
      </DataCard>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DataCard description="Ultimas notas importantes vinculadas a reportes diarios." title="Notas del reporte">
          {reportNotes.length === 0 ? (
            <EmptyState description="Cuando aparezcan notas importantes del reporte diario, van a mostrarse aqui." title="Sin notas de reporte" />
          ) : (
            <div className="space-y-3">
              {reportNotes.map((note) => (
                <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4" key={note.id}>
                  <p className="font-semibold text-brandBlack">{note.title}</p>
                  <p className="mt-1 text-sm text-mediumGray">{note.body}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-mediumGray">
                    {note.entity_label ?? "Reporte diario"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DataCard>

        <div className="space-y-4">
          <ImportantNotesWidget />
          <NotesPanel
            description="Notas generales del sistema para seguimiento interno."
            entityHref="/dashboard"
            entityLabel="Dashboard"
            entityType="general"
            title="Notas generales"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/bolsas">Ir a bolsas</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/cajas">Ir a cajas</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/reporte-diario">Ver reporte diario</Link>
        </Button>
      </div>
    </div>
  );
}
