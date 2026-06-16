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
        description="Detalle operativo de la caja, con resumen tipo planilla e historial de cargas."
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

      <DataCard description="Resumen de hoy en formato tabla." title="Resumen de hoy">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-lightGray text-brandBlack">
              <tr>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Campo</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Valor</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <th className="border-b border-lightGray px-4 py-3 text-left font-semibold">Caja</th>
                <td className="border-b border-lightGray px-4 py-3">{register.register_number ? `Caja ${register.register_number}` : register.name}</td>
                <td className="border-b border-lightGray px-4 py-3 text-mediumGray">{register.slug}</td>
              </tr>
              <tr className="bg-lightGray/15">
                <th className="border-b border-lightGray px-4 py-3 text-left font-semibold">Responsable</th>
                <td className="border-b border-lightGray px-4 py-3">{register.responsible_name ?? register.name}</td>
                <td className="border-b border-lightGray px-4 py-3 text-mediumGray">Asignación de usuario</td>
              </tr>
              <tr className="bg-white">
                <th className="border-b border-lightGray px-4 py-3 text-left font-semibold">Sucursal</th>
                <td className="border-b border-lightGray px-4 py-3">{register.branch_name}</td>
                <td className="border-b border-lightGray px-4 py-3 text-mediumGray">Caja Pago Fácil</td>
              </tr>
              <tr className="bg-lightGray/15">
                <th className="border-b border-lightGray px-4 py-3 text-left font-semibold">Estado</th>
                <td className="border-b border-lightGray px-4 py-3">
                  <StatusBadge status={getCashReportStatusTone(register.today_status)} />
                </td>
                <td className="border-b border-lightGray px-4 py-3 text-mediumGray">{cashReportStatusLabels[register.today_status]}</td>
              </tr>
              <tr className="bg-white">
                <th className="border-b border-lightGray px-4 py-3 text-left font-semibold">Operado hoy</th>
                <td className="border-b border-lightGray px-4 py-3 font-semibold">{formatArs(register.today_operated_ars)}</td>
                <td className="border-b border-lightGray px-4 py-3 text-mediumGray">Volumen total del día</td>
              </tr>
              <tr className="bg-lightGray/15">
                <th className="border-b border-lightGray px-4 py-3 text-left font-semibold">Ganancia hoy</th>
                <td className="border-b border-lightGray px-4 py-3 font-semibold">{formatArs(register.today_profit_ars)}</td>
                <td className="border-b border-lightGray px-4 py-3 text-mediumGray">Comisión / utilidad</td>
              </tr>
              <tr className="bg-white">
                <th className="px-4 py-3 text-left font-semibold">Fuente</th>
                <td className="px-4 py-3">{cashData.source === "database" ? "Supabase" : "Seeds locales"}</td>
                <td className="px-4 py-3 text-mediumGray">Origen de los datos</td>
              </tr>
            </tbody>
          </table>
        </div>
      </DataCard>

      <DataCard description="Historial de cargas por fecha, con detalle por categoría, en formato de planilla." title="Historial de cargas">
        {register.history.length === 0 ? (
          <EmptyState description="Aún no se guardaron cargas para esta caja." title="Sin historial" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] border-separate border-spacing-0 text-sm">
              <thead className="bg-lightGray text-brandBlack">
                <tr>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Fecha</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Estado</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Operado</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Ganancia</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Categorías</th>
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
