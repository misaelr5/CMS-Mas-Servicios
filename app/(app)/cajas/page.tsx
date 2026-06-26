import { cookies } from "next/headers";
import Link from "next/link";
import { Building2, CheckCircle2, Clock3, DollarSign, LockKeyhole, WalletCards } from "lucide-react";

import { DataCard } from "@/components/data-card";
import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerAuthContext } from "@/lib/auth/server";
import { getCashModuleData, isCashReportLoaded } from "@/lib/cash/cash-service";
import type { CashDailyReportStatus } from "@/lib/db/types";
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

function safeStatus(status?: string | null): CashDailyReportStatus {
  if (status === "parcial" || status === "cargado" || status === "revisado") return status;
  return "pendiente";
}

function formatStatus(raw?: string | null): string {
  const status = safeStatus(raw);
  return statusLabels[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusVariant(status?: string | null) {
  const normalized = safeStatus(status);
  if (isCashReportLoaded(normalized)) return "success" as const;
  if (normalized === "parcial") return "warning" as const;
  return "neutral" as const;
}

function branchTone(branchName?: string | null) {
  return branchName?.toLowerCase().includes("terminal") ? "bg-brandYellow/15 text-brandYellow" : "bg-success/15 text-success";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function CajasPage() {
  const auth = await getServerAuthContext(cookies());
  const today = getBuenosAiresDateString();
  const cashData = await getCashModuleData(auth ? { role: auth.role, userId: auth.userId } : undefined);
  const dailyReportData = await getDailyReportViewData(today, auth ? { role: auth.role, userId: auth.userId } : undefined);
  const canWrite = auth?.role === "admin" || auth?.role === "encargado" || auth?.role === "cajero";
  const isCashier = auth?.role === "cajero";

  const visibleRegisters = cashData.registers;
  const loadedCount = cashData.summary.registers_loaded_today;
  const pendingCount = cashData.summary.registers_pending_today;
  const progressPercent = visibleRegisters.length > 0 ? Math.round((loadedCount / visibleRegisters.length) * 100) : 0;
  const lockedBranchIds = new Set(
    dailyReportData.branches.filter((branch) => isDailyReportLockedStatus(branch.dailyReport?.status)).map((branch) => branch.branch.id)
  );

  if (isCashier) {
    const register = visibleRegisters[0] ?? null;
    const locked = register ? lockedBranchIds.has(register.branch_id) : false;
    const loaded = register ? isCashReportLoaded(safeStatus(register.today_status)) : false;

    return (
      <div className="space-y-6">
        <SectionTitle
          description="Tu caja asignada para cargar el dia. Sin tablero general."
          title="Mi Pago Facil"
          rightSlot={<Badge variant="outline">{today}</Badge>}
        />

        {!register ? (
          <EmptyState
            actionLabel="Volver a bolsas"
            actionHref="/bolsas"
            description="No hay una caja asignada a tu usuario."
            title="Sin caja asignada"
          />
        ) : (
          <DataCard description={`${register.branch_name} - ${register.responsible_name ?? register.name}`} title={register.register_number ? `Caja ${register.register_number}` : register.name}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-mediumGray">Estado de hoy</p>
                <p className="mt-1 font-heading text-xl font-black text-brandBlack">{formatStatus(register.today_status)}</p>
              </div>
              <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-mediumGray">Operado</p>
                <p className="mt-1 font-heading text-xl font-black text-brandBlack">{formatArs(register.today_operated_ars)}</p>
              </div>
              <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-mediumGray">Ultima actualizacion</p>
                <p className="mt-1 font-heading text-xl font-black text-brandBlack">{formatDateTime(register.updated_at)}</p>
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

  const branchGroups = Array.from(
    visibleRegisters.reduce((groups, register) => {
      const key = register.branch_name ?? "Sin sucursal";
      const current = groups.get(key) ?? [];
      current.push(register);
      groups.set(key, current);
      return groups;
    }, new Map<string, typeof visibleRegisters>())
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Control diario de cargas Pago Facil por caja, responsable y sucursal."
        title="Pago Facil"
        rightSlot={<Badge variant="outline">{visibleRegisters.length} cajas</Badge>}
      />

      <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-darkSurface via-[#1d1d18] to-brandBlack p-5 shadow-medium">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-brandYellow">Estado del dia</p>
            <h2 className="font-heading text-2xl font-black text-brandWhite">{pendingCount > 0 ? `${pendingCount} cajas pendientes` : "Todas las cajas estan listas"}</h2>
            <p className="max-w-2xl text-sm text-lightGray/75">
              Vista resumida de cargas Pago Facil. Cada caja entra por su tarjeta y se abre directo al detalle o a la carga del día.
            </p>
          </div>
          <div className="min-w-[240px] rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-sm font-semibold text-brandWhite">
              <span>Progreso</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-brandYellow shadow-yellowGlow transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-lightGray/60">
              {loadedCount} cargadas · {pendingCount} pendientes
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CheckCircle2} helper="Cargadas o revisadas hoy" label="Cajas listas" status="ok" value={`${loadedCount}`} />
        <StatCard icon={Clock3} helper="Faltan terminar" label="Pendientes" status={pendingCount > 0 ? "revisar" : "ok"} value={`${pendingCount}`} />
        <StatCard icon={WalletCards} helper="Volumen cargado en Pago Facil" label="Operado hoy" status="neutral" value={formatArs(cashData.summary.total_operated_today)} />
        <StatCard icon={DollarSign} helper="Comisiones cargadas" label="Ganancia hoy" status="ok" value={formatArs(cashData.summary.total_profit_today)} />
      </div>

      {visibleRegisters.length === 0 ? (
        <EmptyState
          actionLabel="Volver al inicio"
          actionHref="/dashboard"
          description="No hay cajas visibles para tu perfil. Si sos cajero, revisa que la caja este asignada a tu usuario."
          title="Sin cajas disponibles"
        />
      ) : (
        <div className="space-y-8">
          {branchGroups.map(([branchName, registers]) => (
            <section key={branchName} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-soft ${branchTone(branchName)}`}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-heading text-xl font-black text-brandWhite">{branchName}</p>
                    <p className="text-sm text-lightGray/65">{registers.length} cajas asignadas</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {registers.map((register) => {
                  const locked = lockedBranchIds.has(register.branch_id);
                  const loaded = isCashReportLoaded(safeStatus(register.today_status));
                  return (
                    <article key={register.id} className="group/caja overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] text-brandWhite shadow-lift backdrop-blur-xl transition-all duration-200 hover:border-brandYellow/25 hover:bg-white/[0.06]">
                      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="default">{register.register_number ? `Caja ${register.register_number}` : register.name}</Badge>
                            <Badge variant={statusVariant(register.today_status)} dot>
                              {formatStatus(register.today_status)}
                            </Badge>
                            <Badge variant={locked ? "danger" : "success"}>{locked ? "Cerrado" : "Abierto"}</Badge>
                          </div>
                          <h3 className="mt-3 font-heading text-2xl font-black text-brandWhite">{register.responsible_name ?? register.name}</h3>
                          <p className="text-sm text-lightGray/55">{register.slug}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm">
                            <Link href={`/cajas/${register.id}`}>Ver caja</Link>
                          </Button>
                          {canWrite && !locked ? (
                            <Button asChild size="sm" variant="secondary">
                              <Link href={`/cajas/${register.id}/cargar`}>Cargar dia</Link>
                            </Button>
                          ) : (
                            <Button disabled size="sm" variant="secondary">
                              {locked ? "Cerrado" : "Cargar dia"}
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid border-t border-white/10 bg-black/20 sm:grid-cols-3">
                        <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lightGray/50">Operado</p>
                          <p className="mt-1 font-heading text-xl font-black tabular-nums text-brandWhite">{formatArs(register.today_operated_ars)}</p>
                        </div>
                        <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lightGray/50">Ganancia</p>
                          <p className="mt-1 font-heading text-xl font-black tabular-nums text-brandYellow">{formatArs(register.today_profit_ars)}</p>
                        </div>
                        <div className="p-4">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lightGray/50">Ultima actualizacion</p>
                          <p className="mt-1 font-heading text-xl font-black tabular-nums text-brandWhite">{formatDateTime(register.updated_at)}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
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
