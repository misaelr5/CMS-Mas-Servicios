import { cookies } from "next/headers";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CashRegisterCard } from "@/components/cash/cash-register-card";
import { getServerAuthContext } from "@/lib/auth/server";
import { getCashModuleData, isCashReportLoaded } from "@/lib/cash/cash-service";
import { formatArs } from "@/lib/operations/seed-data";

export default async function CajasPage() {
  const auth = await getServerAuthContext(cookies());
  const cashData = await getCashModuleData(auth ? { role: auth.role, userId: auth.userId } : undefined);
  const canWrite = auth?.role === "admin" || auth?.role === "encargado" || auth?.role === "cajero";

  const visibleRegisters = cashData.registers;
  const loadedCount = cashData.summary.registers_loaded_today;
  const pendingCount = cashData.summary.registers_pending_today;
  const statusReadyCount = visibleRegisters.filter((register) => isCashReportLoaded(register.today_status)).length;

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
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleRegisters.map((register) => (
            <CashRegisterCard canWrite={canWrite} key={register.id} register={register} />
          ))}
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
