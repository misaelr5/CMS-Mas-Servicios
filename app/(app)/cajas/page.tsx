import { cookies } from "next/headers";
import Link from "next/link";

import { DataCard } from "@/components/data-card";
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

const statusLabels: Record<string, string> = {
  cargado: "Cargado",
  revisado: "Revisado",
  parcial: "Parcial",
  pendiente: "Pendiente",
  sin_carga: "Sin carga"
};

function formatStatus(raw: string): string {
  return statusLabels[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function CajasPage() {
  const auth = await getServerAuthContext(cookies());
  const cashData = await getCashModuleData(auth ? { role: auth.role, userId: auth.userId } : undefined);
  const dailyReportData = await getDailyReportViewData(getBuenosAiresDateString(), auth ? { role: auth.role, userId: auth.userId } : undefined);
  const canWrite = auth?.role === "admin" || auth?.role === "encargado" || auth?.role === "cajero";
  const isCashier = auth?.role === "cajero";

  const visibleRegisters = cashData.registers;
  const loadedCount = cashData.summary.registers_loaded_today;
  const pendingCount = cashData.summary.registers_pending_today;
  const lockedBranchIds = new Set(
    dailyReportData.branches.filter((branch) => isDailyReportLockedStatus(branch.dailyReport?.status)).map((branch) => branch.branch.id)
  );

  if (isCashier) {
    const register = visibleRegisters[0] ?? null;
    const locked = register ? lockedBranchIds.has(register.branch_id) : false;

    return (
      <div className="space-y-6">
        <SectionTitle
          description="Tu caja asignada para cargar el dia. Sin tablero general."
          title="Mi caja"
          rightSlot={<Badge variant="outline">{getBuenosAiresDateString()}</Badge>}
        />

        {!register ? (
          <EmptyState
            actionLabel="Volver a bolsas"
            actionHref="/bolsas"
            description="No hay una caja asignada a tu usuario."
            title="Sin caja asignada"
          />
        ) : (
          <DataCard description={`${register.branch_name} · ${register.responsible_name ?? register.name}`} title={register.register_number ? `Caja ${register.register_number}` : register.name}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-mediumGray">Estado de hoy</p>
                <p className="mt-1 font-heading text-xl font-black text-brandBlack">{register.today_status}</p>
              </div>
              <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-mediumGray">Operado</p>
                <p className="mt-1 font-heading text-xl font-black text-brandBlack">{formatArs(register.today_operated_ars)}</p>
              </div>
              <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-mediumGray">Carga</p>
                <Badge variant={locked ? "danger" : isCashReportLoaded(register.today_status) ? "success" : "warning"}>
                  {locked ? "Cerrada" : isCashReportLoaded(register.today_status) ? "Lista" : "Pendiente"}
                </Badge>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {canWrite && !locked ? (
                <Button asChild className="shadow-yellowGlow">
                  <Link href={`/cajas/${register.id}/cargar`}>Cargar mi dia</Link>
                </Button>
              ) : (
                <Button disabled>{locked ? "Dia cerrado" : "Cargar mi dia"}</Button>
              )}
              <Button asChild variant="secondary">
                <Link href={`/cajas/${register.id}`}>Ver detalle</Link>
              </Button>
            </div>
          </DataCard>
        )}
      </div>
    );
  }

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard helper="Cajas con reporte cargado o revisado hoy" label="Cajas cargadas" status="ok" value={`${loadedCount}`} />
        <StatCard helper="Cajas todavía sin reporte final" label="Cajas pendientes" status="revisar" value={`${pendingCount}`} />
        <StatCard helper="Suma total operada en Pago Fácil" label="Total operado hoy" status="neutral" value={formatArs(cashData.summary.total_operated_today)} />
        <StatCard helper="Ganancia operativa consolidada" label="Ganancia hoy" status="ok" value={formatArs(cashData.summary.total_profit_today)} />
      </div>

      {visibleRegisters.length === 0 ? (
        <EmptyState
          actionLabel="Volver al inicio"
          actionHref="/dashboard"
          description="No hay cajas visibles para tu perfil. Si sos cajero, revisá que la caja esté asignada a tu usuario."
          title="Sin cajas disponibles"
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="grid gap-3 lg:hidden">
            {visibleRegisters.map((register) => {
              const locked = lockedBranchIds.has(register.branch_id);
              const loaded = isCashReportLoaded(register.today_status);
              return (
                <article key={register.id} className="rounded-lg border border-lightGray bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading font-black text-brandBlack">
                        {register.register_number ? `Caja ${register.register_number}` : register.name}
                      </p>
                      <p className="text-xs text-mediumGray">{register.branch_name} · {register.responsible_name ?? register.name}</p>
                    </div>
                    <Badge variant={loaded ? "success" : register.today_status === "parcial" ? "warning" : "neutral"} dot>
                      {formatStatus(register.today_status)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-lightGray/30 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-mediumGray">Operado</p>
                      <p className="mt-0.5 font-semibold tabular-nums text-brandBlack">{formatArs(register.today_operated_ars)}</p>
                    </div>
                    <div className="rounded-md bg-lightGray/30 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-mediumGray">Ganancia</p>
                      <p className="mt-0.5 font-semibold tabular-nums text-brandBlack">{formatArs(register.today_profit_ars)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant={locked ? "danger" : "success"}>{locked ? "Cerrado" : "Abierto"}</Badge>
                    <div className="flex gap-2">
                      <Button asChild size="sm">
                        <Link href={`/cajas/${register.id}`}>Ver caja</Link>
                      </Button>
                      {canWrite && !locked ? (
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/cajas/${register.id}/cargar`}>Cargar</Link>
                        </Button>
                      ) : (
                        <Button disabled size="sm" variant="secondary">Cargar</Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-xl border border-white/10 bg-darkSurface shadow-medium lg:block">
            <table className="min-w-[1000px] border-separate border-spacing-0 text-sm">
              <thead className="bg-white/5 text-brandWhite">
                <tr>
                  <th className="sticky left-0 z-20 border-b border-white/10 bg-darkSurface/95 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Caja</th>
                  <th className="border-b border-white/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Sucursal</th>
                  <th className="border-b border-white/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Responsable</th>
                  <th className="border-b border-white/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Estado</th>
                  <th className="border-b border-white/10 px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.2em]">Operado</th>
                  <th className="border-b border-white/10 px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.2em]">Ganancia</th>
                  <th className="border-b border-white/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Bloqueo</th>
                  <th className="border-b border-white/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleRegisters.map((register, index) => {
                  const locked = lockedBranchIds.has(register.branch_id);
                  const loaded = isCashReportLoaded(register.today_status);
                  return (
                    <tr key={register.id} className={`transition-colors hover:bg-brandYellow/5 ${index % 2 === 0 ? "bg-white" : "bg-lightGray/15"}`}>
                      <td className="sticky left-0 z-10 border-b border-lightGray bg-inherit px-4 py-4">
                        <div className="space-y-0.5">
                          <p className="font-black text-brandBlack">{register.register_number ? `Caja ${register.register_number}` : register.name}</p>
                          <p className="text-xs text-mediumGray">{register.slug}</p>
                        </div>
                      </td>
                      <td className="border-b border-lightGray px-4 py-4 text-brandBlack">{register.branch_name}</td>
                      <td className="border-b border-lightGray px-4 py-4 text-brandBlack">{register.responsible_name ?? register.name}</td>
                      <td className="border-b border-lightGray px-4 py-4">
                        <Badge variant={loaded ? "success" : register.today_status === "parcial" ? "warning" : "neutral"} dot>
                          {formatStatus(register.today_status)}
                        </Badge>
                      </td>
                      <td className="border-b border-lightGray px-4 py-4 text-right font-semibold tabular-nums text-brandBlack">{formatArs(register.today_operated_ars)}</td>
                      <td className="border-b border-lightGray px-4 py-4 text-right font-semibold tabular-nums text-brandBlack">{formatArs(register.today_profit_ars)}</td>
                      <td className="border-b border-lightGray px-4 py-4">
                        <Badge variant={locked ? "danger" : "success"}>{locked ? "Cerrado" : "Abierto"}</Badge>
                      </td>
                      <td className="border-b border-lightGray px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm">
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
        </>
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
