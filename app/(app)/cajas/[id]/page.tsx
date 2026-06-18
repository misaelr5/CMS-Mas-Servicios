import { cookies } from "next/headers";
import Link from "next/link";

import { AccessDenied } from "@/components/access-denied";
import { DataCard } from "@/components/data-card";
import { EmptyState } from "@/components/empty-state";
import { NotesPanel } from "@/components/notes/notes-panel";
import { SectionTitle } from "@/components/section-title";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerAuthContext } from "@/lib/auth/server";
import {
  calculateCashDailyReportTotals,
  cashReportStatusLabels,
  getCashRegisterDisplayLabel,
  getCashReportStatusTone,
  sortCashReportCategories
} from "@/lib/cash/cash-calculations";
import { getCashRegisterData } from "@/lib/cash/cash-service";
import { formatArs } from "@/lib/operations/seed-data";

function formatReportDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

export default async function CajaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getServerAuthContext(cookies());
  const cashData = await getCashRegisterData(id, auth ? { role: auth.role, userId: auth.userId } : undefined);
  const register = cashData.register;

  if (!register) {
    return <AccessDenied />;
  }

  const canWrite = auth?.role === "admin" || auth?.role === "encargado" || auth?.role === "cajero";
  const todayReport = register.today_report;
  const summaryTotals = calculateCashDailyReportTotals(todayReport?.lines ?? []);
  const summaryRows = sortCashReportCategories(cashData.categories).map((category) => {
    const line = todayReport?.lines.find((item) => item.category_id === category.id) ?? null;
    const operated = Number(line?.operated_amount_ars ?? 0);
    const profit = Number(line?.profit_amount_ars ?? 0);
    const hasMovement = operated > 0 || profit > 0 || Boolean(line?.notes);

    return {
      category,
      line,
      operated,
      profit,
      hasMovement
    };
  });
  const categoriesWithMovement = summaryRows.filter((row) => row.hasMovement).length;
  const recentHistory = register.history.slice(0, 5);
  const hasMoreHistory = register.history.length > recentHistory.length;

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Detalle operativo de la caja con una vista superior de todo lo cargado hoy."
        title={getCashRegisterDisplayLabel(register)}
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{register.branch_name}</Badge>
            <Button asChild size="sm" variant="secondary">
              <Link href="/cajas">Volver a cajas</Link>
            </Button>
            {canWrite ? (
              <Button asChild className="shadow-yellowGlow" size="sm">
                <Link href={`/cajas/${register.id}/cargar`}>Cargar dia</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <DataCard description="Vista ejecutiva de todo lo cargado hoy, resumido por categoria." title="Resumen operativo de hoy">
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-2xl border border-lightGray bg-white p-4 shadow-soft">
              <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Caja</p>
              <p className="mt-1 font-heading text-lg font-black text-brandBlack">{register.register_number ? `Caja ${register.register_number}` : register.name}</p>
              <p className="text-sm text-mediumGray">{register.slug}</p>
            </div>
            <div className="rounded-2xl border border-lightGray bg-white p-4 shadow-soft">
              <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Responsable</p>
              <p className="mt-1 font-heading text-lg font-black text-brandBlack">{register.responsible_name ?? register.name}</p>
              <p className="text-sm text-mediumGray">Asignacion de usuario</p>
            </div>
            <div className="rounded-2xl border border-lightGray bg-white p-4 shadow-soft">
              <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Estado</p>
              <div className="mt-2">
                <StatusBadge status={getCashReportStatusTone(register.today_status)} />
              </div>
              <p className="mt-2 text-sm text-mediumGray">{cashReportStatusLabels[register.today_status]}</p>
            </div>
            <div className="rounded-2xl border border-lightGray bg-white p-4 shadow-soft">
              <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Operado total</p>
              <p className="mt-1 font-heading text-2xl font-black text-brandBlack">{formatArs(summaryTotals.operated)}</p>
              <p className="text-sm text-mediumGray">Volumen del dia</p>
            </div>
            <div className="rounded-2xl border border-lightGray bg-white p-4 shadow-soft">
              <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Comision total</p>
              <p className="mt-1 font-heading text-2xl font-black text-brandBlack">{formatArs(summaryTotals.profit)}</p>
              <p className="text-sm text-mediumGray">Utilidad del dia</p>
            </div>
            <div className="rounded-2xl border border-lightGray bg-white p-4 shadow-soft">
              <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Categorias con movimiento</p>
              <p className="mt-1 font-heading text-2xl font-black text-brandBlack">{categoriesWithMovement}</p>
              <p className="text-sm text-mediumGray">{cashData.categories.length} categorias cargadas</p>
            </div>
          </div>

          <div className="rounded-3xl border border-lightGray bg-white shadow-soft">
            <div className="border-b border-lightGray px-4 py-4">
              <h3 className="font-heading text-lg font-black text-brandBlack">Detalle por categoria</h3>
              <p className="text-sm text-mediumGray">Cada fila resume cuanto se opero, cuanto dejo y si quedo observacion.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead className="bg-lightGray text-brandBlack">
                  <tr>
                    <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Categoria</th>
                    <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Operado</th>
                    <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Comision</th>
                    <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Observacion</th>
                    <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((row, index) => (
                    <tr key={row.category.id} className={index % 2 === 0 ? "bg-white" : "bg-lightGray/20"}>
                      <td className="border-b border-lightGray px-4 py-4 align-top">
                        <p className="font-semibold text-brandBlack">{row.category.name}</p>
                        <p className="text-xs text-mediumGray">Orden {row.category.sort_order}</p>
                      </td>
                      <td className="border-b border-lightGray px-4 py-4 align-top font-semibold text-brandBlack">{formatArs(row.operated)}</td>
                      <td className="border-b border-lightGray px-4 py-4 align-top font-semibold text-brandBlack">{formatArs(row.profit)}</td>
                      <td className="border-b border-lightGray px-4 py-4 align-top text-mediumGray">
                        {row.line?.notes ? row.line.notes : "Sin observacion"}
                      </td>
                      <td className="border-b border-lightGray px-4 py-4 align-top">
                        <StatusBadge status={row.hasMovement ? "ok" : "pendiente"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-lightGray bg-lightGray/20 px-4 py-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white bg-white p-4 shadow-soft">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Fuente</p>
                  <p className="mt-1 font-semibold text-brandBlack">{cashData.source === "database" ? "Supabase" : "Seeds locales"}</p>
                </div>
                <div className="rounded-2xl border border-white bg-white p-4 shadow-soft">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Carga de hoy</p>
                  <p className="mt-1 font-semibold text-brandBlack">{register.today_report ? cashReportStatusLabels[register.today_status] : "Pendiente"}</p>
                </div>
                <div className="rounded-2xl border border-white bg-white p-4 shadow-soft">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Lectura</p>
                  <p className="mt-1 font-semibold text-brandBlack">Vista superior para controlar la caja sin entrar al historial.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DataCard>

      <DataCard description="Mostramos solo las ultimas cargas para que la lectura sea rapida." title="Historial reciente">
        {recentHistory.length === 0 ? (
          <EmptyState description="Aun no se guardaron cargas para esta caja." title="Sin historial" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[860px] border-separate border-spacing-0 text-sm">
              <thead className="bg-lightGray text-brandBlack">
                <tr>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Fecha</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Estado</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Operado</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Ganancia</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Categorias</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Cargado por</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.map((report, index) => (
                  <tr key={report.id} className={index % 2 === 0 ? "bg-white" : "bg-lightGray/15"}>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatReportDate(report.report_date)}</td>
                    <td className="border-b border-lightGray px-4 py-4">
                      <StatusBadge status={getCashReportStatusTone(report.status)} />
                      <p className="mt-1 text-xs text-mediumGray">{cashReportStatusLabels[report.status]}</p>
                    </td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(Number(report.total_operated_ars ?? 0))}</td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(Number(report.total_profit_ars ?? 0))}</td>
                    <td className="border-b border-lightGray px-4 py-4 text-mediumGray">{report.lines.length}</td>
                    <td className="border-b border-lightGray px-4 py-4 text-mediumGray">{report.created_by_name ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasMoreHistory ? (
          <details className="mt-4 rounded-2xl border border-lightGray bg-lightGray/15 p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-brandBlack">
              Ver historial completo
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[980px] border-separate border-spacing-0 text-sm">
                <thead className="bg-lightGray text-brandBlack">
                  <tr>
                    <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Fecha</th>
                    <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Estado</th>
                    <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Operado</th>
                    <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Ganancia</th>
                    <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Categorias</th>
                    <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Cargado por</th>
                  </tr>
                </thead>
                <tbody>
                  {register.history.map((report, index) => (
                    <tr key={report.id} className={index % 2 === 0 ? "bg-white" : "bg-lightGray/15"}>
                      <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatReportDate(report.report_date)}</td>
                      <td className="border-b border-lightGray px-4 py-4">
                        <StatusBadge status={getCashReportStatusTone(report.status)} />
                        <p className="mt-1 text-xs text-mediumGray">{cashReportStatusLabels[report.status]}</p>
                      </td>
                      <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(Number(report.total_operated_ars ?? 0))}</td>
                      <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(Number(report.total_profit_ars ?? 0))}</td>
                      <td className="border-b border-lightGray px-4 py-4 text-mediumGray">{report.lines.length}</td>
                      <td className="border-b border-lightGray px-4 py-4 text-mediumGray">{report.created_by_name ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ) : null}
      </DataCard>

      <NotesPanel
        description="Notas vinculadas a esta caja."
        entityHref={`/cajas/${register.id}`}
        entityId={register.id}
        entityLabel={getCashRegisterDisplayLabel(register)}
        entityType="cash_register"
        title="Notas de la caja"
      />
    </div>
  );
}
