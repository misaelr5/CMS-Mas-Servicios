import { cookies } from "next/headers";
import Link from "next/link";

import { AccessDenied } from "@/components/access-denied";
import { EmptyState } from "@/components/empty-state";
import { NotesPanel } from "@/components/notes/notes-panel";
import { SectionTitle } from "@/components/section-title";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/data-card";
import { getServerAuthContext } from "@/lib/auth/server";
import { cashReportStatusLabels, getCashRegisterDisplayLabel, getCashReportStatusTone } from "@/lib/cash/cash-calculations";
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

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Detalle operativo de la caja, con estado de hoy, historial de cargas y notas internas."
        title={getCashRegisterDisplayLabel(register)}
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{register.branch_name}</Badge>
            <Button asChild size="sm" variant="secondary">
              <Link href="/cajas">Volver a cajas</Link>
            </Button>
            {canWrite ? (
              <Button asChild className="shadow-yellowGlow" size="sm">
                <Link href={`/cajas/${register.id}/cargar`}>Cargar día</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Estado actual" status={getCashReportStatusTone(register.today_status)} value={cashReportStatusLabels[register.today_status]} />
        <StatCard label="Operado hoy" status="neutral" value={formatArs(register.today_operated_ars)} />
        <StatCard label="Ganancia hoy" status="ok" value={formatArs(register.today_profit_ars)} />
        <StatCard label="Historial" status="pendiente" value={`${register.history.length}`} helper="Cargas guardadas para esta caja" />
      </div>

      <DataCard description="Resumen actual de la caja Pago Fácil." title="Resumen de hoy">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Caja</p>
            <p className="mt-1 font-semibold text-brandBlack">{register.register_number ? `Caja ${register.register_number}` : register.name}</p>
          </div>
          <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Responsable</p>
            <p className="mt-1 font-semibold text-brandBlack">{register.responsible_name ?? register.name}</p>
          </div>
          <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Sucursal</p>
            <p className="mt-1 font-semibold text-brandBlack">{register.branch_name}</p>
          </div>
          <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Fuente</p>
            <p className="mt-1 font-semibold text-brandBlack">{cashData.source === "database" ? "Supabase" : "Seeds locales"}</p>
          </div>
        </div>
      </DataCard>

      <DataCard description="Historial de cargas por fecha, con detalle por categoría." title="Historial de cargas">
        {register.history.length === 0 ? (
          <EmptyState description="Aún no se guardaron cargas para esta caja." title="Sin historial" />
        ) : (
          <div className="space-y-3">
            {register.history.map((report) => (
              <details className="overflow-hidden rounded-3xl border border-lightGray bg-white p-4 shadow-soft" key={report.id} open={report.report_date === register.history[0]?.report_date}>
                <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">{formatReportDate(report.report_date)}</p>
                    <h3 className="mt-1 font-heading text-lg font-black text-brandBlack">{cashReportStatusLabels[report.status]}</h3>
                  </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={getCashReportStatusTone(report.status)} />
                      <Badge variant="neutral">Operado {formatArs(Number(report.total_operated_ars ?? 0))}</Badge>
                      <Badge variant="outline">Ganancia {formatArs(Number(report.total_profit_ars ?? 0))}</Badge>
                    </div>
                </summary>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {report.lines.map((line) => (
                    <div key={line.id} className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">{line.category_name}</p>
                      <p className="mt-2 text-sm text-brandBlack">Operado: <span className="font-semibold">{formatArs(Number(line.operated_amount_ars ?? 0))}</span></p>
                      <p className="text-sm text-brandBlack">Ganancia: <span className="font-semibold">{formatArs(Number(line.profit_amount_ars ?? 0))}</span></p>
                      {line.notes ? <p className="mt-2 text-sm text-mediumGray">{line.notes}</p> : null}
                    </div>
                  ))}
                </div>
                {report.created_by_name ? <p className="mt-3 text-xs text-mediumGray">Cargado por {report.created_by_name}</p> : null}
              </details>
            ))}
          </div>
        )}
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
