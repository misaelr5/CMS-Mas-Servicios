import { cookies } from "next/headers";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerAuthContext } from "@/lib/auth/server";
import { getCashModuleData, isCashReportLoaded } from "@/lib/cash/cash-service";
import { getDailyReportViewData, isDailyReportLockedStatus } from "@/lib/finance/daily-report-service";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import { formatArs } from "@/lib/operations/seed-data";

export default async function CajasPage() {
  const auth = await getServerAuthContext(cookies());
  const cashData = await getCashModuleData(auth ? { role: auth.role, userId: auth.userId } : undefined);
  const dailyReportData = await getDailyReportViewData(getBuenosAiresDateString(), auth ? { role: auth.role, userId: auth.userId } : undefined);
  const canWrite = auth?.role === "admin" || auth?.role === "encargado" || auth?.role === "cajero";

  const visibleRegisters = cashData.registers;
  const loadedCount = cashData.summary.registers_loaded_today;
  const pendingCount = cashData.summary.registers_pending_today;
  const statusReadyCount = visibleRegisters.filter((register) => isCashReportLoaded(register.today_status)).length;
  const lockedBranchIds = new Set(
    dailyReportData.branches.filter((branch) => isDailyReportLockedStatus(branch.dailyReport?.status)).map((branch) => branch.branch.id)
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        description={
          auth?.role === "cajero"
            ? "Vista limitada a tu caja asignada. Sin paneo general."
            : "Control operativo de las cajas Pago Fácil con reportes diarios y estado de carga."
        }
        title="Cajas"
        rightSlot={<Badge variant="outline">{visibleRegisters.length} cajas</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard helper="Cajas con reporte cargado o revisado hoy" label="Cajas cargadas" status="ok" value={`${loadedCount}`} />
        <StatCard helper="Cajas todavía sin reporte final" label="Cajas pendientes" status="revisar" value={`${pendingCount}`} />
        <StatCard helper="Suma total operada en Pago Fácil" label="Total operado hoy" status="neutral" value={formatArs(cashData.summary.total_operated_today)} />
        <StatCard helper="Ganancia operativa consolidada" label="Ganancia Pago Fácil hoy" status="ok" value={formatArs(cashData.summary.total_profit_today)} />
        <StatCard helper="Cajas con estado listo" label="Estado listo" status="pendiente" value={`${statusReadyCount}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard helper="Ganancia del corredor Centro" label="Ganancia Centro" status="ok" value={formatArs(cashData.summary.center_profit_today)} />
        <StatCard helper="Ganancia del corredor Terminal" label="Ganancia Terminal" status="ok" value={formatArs(cashData.summary.terminal_profit_today)} />
        <StatCard helper="Modo interno" label="Fuente de datos" status="neutral" value={cashData.source === "database" ? "Supabase" : "Seeds"} />
        <StatCard helper="Permisos para la carga diaria" label="Carga activa" status={canWrite ? "ok" : "pendiente"} value={canWrite ? "Sí" : "Solo lectura"} />
      </div>

      {visibleRegisters.length === 0 ? (
        <EmptyState
          actionLabel="Volver al inicio"
          actionHref="/dashboard"
          description="No hay cajas visibles para tu perfil. Si sos cajero, revisá que la caja esté asignada a tu usuario."
          title="Sin cajas disponibles"
        />
      ) : (
        <div className="overflow-x-auto rounded-[28px] border border-white/10 bg-darkSurface shadow-medium">
          <table className="min-w-[1100px] border-separate border-spacing-0 text-sm">
            <thead className="bg-white/5 text-brandWhite">
              <tr>
                <th className="sticky left-0 z-20 border-b border-white/10 bg-darkSurface/95 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Caja</th>
                <th className="border-b border-white/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Sucursal</th>
                <th className="border-b border-white/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Responsable</th>
                <th className="border-b border-white/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Estado</th>
                <th className="border-b border-white/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Operado</th>
                <th className="border-b border-white/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Ganancia</th>
                <th className="border-b border-white/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Bloqueo diario</th>
                <th className="border-b border-white/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleRegisters.map((register, index) => {
                const locked = lockedBranchIds.has(register.branch_id);
                return (
                  <tr key={register.id} className={index % 2 === 0 ? "bg-white" : "bg-lightGray/15"}>
                    <td className="sticky left-0 z-10 border-b border-lightGray bg-inherit px-4 py-4">
                      <div className="space-y-1">
                        <p className="font-black text-brandBlack">{register.register_number ? `Caja ${register.register_number}` : register.name}</p>
                        <p className="text-xs text-mediumGray">{register.slug}</p>
                      </div>
                    </td>
                    <td className="border-b border-lightGray px-4 py-4">{register.branch_name}</td>
                    <td className="border-b border-lightGray px-4 py-4">{register.responsible_name ?? register.name}</td>
                    <td className="border-b border-lightGray px-4 py-4">
                      <Badge variant={isCashReportLoaded(register.today_status) ? "success" : register.today_status === "parcial" ? "warning" : "neutral"}>
                        {register.today_status}
                      </Badge>
                    </td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(register.today_operated_ars)}</td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(register.today_profit_ars)}</td>
                    <td className="border-b border-lightGray px-4 py-4">
                      <Badge variant={locked ? "danger" : "success"}>{locked ? "Cerrado" : "Abierto"}</Badge>
                    </td>
                    <td className="border-b border-lightGray px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild className="shadow-yellowGlow" size="sm">
                          <Link href={`/cajas/${register.id}`}>Ver caja</Link>
                        </Button>
                        {canWrite && !locked ? (
                          <Button asChild size="sm" variant="secondary">
                            <Link href={`/cajas/${register.id}/cargar`}>Cargar día</Link>
                          </Button>
                        ) : (
                          <Button disabled size="sm" variant="secondary">
                            {locked ? "Cerrado" : "Cargar día"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link href="/reporte-diario">Ir a reporte diario</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
