import Link from "next/link";
import { cookies } from "next/headers";

import { AccessDenied } from "@/components/access-denied";
import { EmptyState } from "@/components/empty-state";
import { NotesPanel } from "@/components/notes/notes-panel";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { DataCard } from "@/components/data-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getServerAuthContext } from "@/lib/auth/server";
import { formatArs } from "@/lib/operations/seed-data";
import {
  getWeeklyCashClosureLabel,
  getWeeklyCashClosureStatusTone,
  weeklyCashClosureStatusLabels
} from "@/lib/finance/weekly-cash-closure-calculations";
import { getWeeklyCashClosureViewData, getWeeklyClosureTone } from "@/lib/finance/weekly-cash-closure-service";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import { WeeklyCashClosureCloseForm, WeeklyCashClosureReopenForm } from "@/components/closures/weekly-cash-closure-actions";

type SearchParams = Promise<{ date?: string }>;

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function badgeVariantFromTone(tone: "ok" | "error" | "pendiente" | "revisar" | "neutral") {
  if (tone === "ok") return "success" as const;
  if (tone === "error") return "danger" as const;
  if (tone === "revisar") return "warning" as const;
  if (tone === "pendiente") return "neutral" as const;
  return "outline" as const;
}

export default async function CierresPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedDate = resolvedSearchParams.date || getBuenosAiresDateString();
  const auth = await getServerAuthContext(cookies());

  if (!auth) {
    return <AccessDenied />;
  }

  const canManage = auth.role === "admin" || auth.role === "encargado";
  const closureData = await getWeeklyCashClosureViewData(selectedDate, { role: auth.role, userId: auth.userId });
  const isLocked = closureData.status === "cerrado";
  const hasPending = closureData.registerSummaries.some((summary) => summary.pendingDaysCount > 0 || summary.status === "revisar");

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Cierre semanal de Pago Facil, con semana operativa viernes a jueves y bloqueo sobre cargas cerradas."
        title="Cierres"
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={badgeVariantFromTone(getWeeklyClosureTone(closureData.status))}>
              {weeklyCashClosureStatusLabels[closureData.status]}
            </Badge>
            <Badge variant="outline">{formatDateLabel(selectedDate)}</Badge>
          </div>
        }
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandWhite" htmlFor="date">
            Semana a revisar
          </label>
          <Input defaultValue={selectedDate} id="date" name="date" type="date" />
        </div>
        <Button type="submit">Ver semana</Button>
        <Button asChild variant="outline">
          <Link href="/reporte-diario">Ir a reporte diario</Link>
        </Button>
      </form>

      {isLocked ? (
        <div className="rounded-3xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-brandWhite">
          Esta semana esta cerrada. Reabrila para modificarla.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Estado semanal" status={getWeeklyCashClosureStatusTone(closureData.status)} value={weeklyCashClosureStatusLabels[closureData.status]} />
        <StatCard label="Semana operativa" value={getWeeklyCashClosureLabel(selectedDate)} />
        <StatCard label="Operado semanal" status="neutral" value={formatArs(closureData.totals.totalOperatedArs)} />
        <StatCard label="Ganancia semanal" status="ok" value={formatArs(closureData.totals.totalProfitArs)} />
        <StatCard label="Cajas revisadas" status="revisar" value={`${closureData.totals.reviewedDaysCount}`} />
      </div>

      <DataCard description="Estado general de la semana operativa." title="Resumen semanal">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] border-separate border-spacing-0 text-sm">
            <thead className="bg-lightGray text-brandBlack">
              <tr>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Sucursal</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Operado</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Ganancia</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Cargados</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Pendientes</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Revisados</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Estado</th>
              </tr>
            </thead>
            <tbody>
              {closureData.branches.map((branch, index) => (
                <tr className={index % 2 === 0 ? "bg-white" : "bg-lightGray/15"} key={branch.branch.id}>
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">{branch.branch.name}</td>
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(branch.totalOperatedArs)}</td>
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(branch.totalProfitArs)}</td>
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">{branch.loadedDaysCount}</td>
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">{branch.pendingDaysCount}</td>
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">{branch.reviewedDaysCount}</td>
                  <td className="border-b border-lightGray px-4 py-4">
                    <Badge variant={badgeVariantFromTone(getWeeklyClosureTone(branch.status))}>
                      {weeklyCashClosureStatusLabels[branch.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
              <tr className="bg-brandYellow/15">
                <td className="border-t border-lightGray px-4 py-4 font-black uppercase tracking-[0.18em]">Total general</td>
                <td className="border-t border-lightGray px-4 py-4 font-black">{formatArs(closureData.totals.totalOperatedArs)}</td>
                <td className="border-t border-lightGray px-4 py-4 font-black">{formatArs(closureData.totals.totalProfitArs)}</td>
                <td className="border-t border-lightGray px-4 py-4 font-black">{closureData.totals.loadedDaysCount}</td>
                <td className="border-t border-lightGray px-4 py-4 font-black">{closureData.totals.pendingDaysCount}</td>
                <td className="border-t border-lightGray px-4 py-4 font-black">{closureData.totals.reviewedDaysCount}</td>
                <td className="border-t border-lightGray px-4 py-4 font-black">{weeklyCashClosureStatusLabels[closureData.status]}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </DataCard>

      <DataCard description="Detalle completo por caja Pago Facil." title="Detalle por caja">
        {closureData.registerSummaries.length === 0 ? (
          <EmptyState description="Todavia no hay cajas para consolidar en esta semana." title="Sin detalle por caja" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] border-separate border-spacing-0 text-sm">
              <thead className="bg-lightGray text-brandBlack">
                <tr>
                  <th className="sticky left-0 z-20 border-b border-lightGray bg-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Caja</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Sucursal</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Operado</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Ganancia</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Cargados</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Pendientes</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Revisados</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Estado</th>
                </tr>
              </thead>
              <tbody>
                {closureData.registerSummaries.map((register, index) => (
                  <tr className={index % 2 === 0 ? "bg-white" : "bg-lightGray/15"} key={register.cashRegister.id}>
                    <td className="sticky left-0 z-10 border-b border-lightGray bg-inherit px-4 py-4">
                      <div className="space-y-1">
                        <p className="font-black text-brandBlack">Caja {register.cashRegister.register_number ?? "?"}</p>
                        <p className="text-xs text-mediumGray">{register.cashRegister.name}</p>
                      </div>
                    </td>
                    <td className="border-b border-lightGray px-4 py-4">{register.branch.name}</td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(register.totalOperatedArs)}</td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(register.totalProfitArs)}</td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{register.loadedDaysCount}</td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{register.pendingDaysCount}</td>
                    <td className="border-b border-lightGray px-4 py-4 font-semibold">{register.reviewedDaysCount}</td>
                    <td className="border-b border-lightGray px-4 py-4">
                      <Badge variant={badgeVariantFromTone(getWeeklyClosureTone(register.status))}>
                        {weeklyCashClosureStatusLabels[register.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>

      {canManage ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {closureData.status !== "cerrado" ? (
            <DataCard description="Cerrar la semana operativa viernes a jueves." title="Cerrar semana">
              <WeeklyCashClosureCloseForm currentPath="/cierres" date={selectedDate} hasPending={hasPending} />
            </DataCard>
          ) : (
            <DataCard description="La semana ya quedo cerrada." title="Cerrar semana">
              <EmptyState description="Para volver a tocar las cargas primero tenes que reabrir la semana." title="Semana cerrada" />
            </DataCard>
          )}

          {closureData.closure && closureData.status !== "abierto" ? (
            <DataCard description="Volver a abrir para corregir cargas de la semana." title="Reabrir semana">
              <WeeklyCashClosureReopenForm currentPath="/cierres" date={selectedDate} />
            </DataCard>
          ) : (
            <DataCard description="Cuando exista un cierre semanal previo vas a poder reabrirlo con motivo." title="Reapertura">
              <EmptyState description="La reapertura aparece cuando existe un cierre semanal cerrado o en revisar." title="Sin cierre para reabrir" />
            </DataCard>
          )}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        {closureData.closure ? (
          <NotesPanel
            description="Notas de seguimiento para el cierre semanal."
            entityHref="/cierres"
            entityId={closureData.closure.id}
            entityLabel={`Semana ${closureData.weekStartDate} a ${closureData.weekEndDate}`}
            entityType="weekly_cash_closure"
            title="Notas del cierre"
          />
        ) : (
          <DataCard description="Las notas se habilitan cuando se guarda un cierre semanal." title="Notas del cierre">
            <EmptyState description="Todavia no hay un cierre semanal guardado para vincular notas." title="Sin notas de cierre" />
          </DataCard>
        )}

        <DataCard description="Referencia para saber que queda como ultimo registro." title="Ultimo cierre">
          {closureData.lastClosure ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Semana</p>
                <p className="mt-1 font-semibold text-brandBlack">
                  {closureData.lastClosure.week_start_date} a {closureData.lastClosure.week_end_date}
                </p>
              </div>
              <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Estado</p>
                <p className="mt-1 font-semibold text-brandBlack">{weeklyCashClosureStatusLabels[closureData.lastClosure.status]}</p>
              </div>
              <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Cerrado / reabierto</p>
                <p className="mt-1 text-sm text-brandBlack">
                  Cierre: {closureData.lastClosure.closed_at ?? "-"}
                  <br />
                  Reapertura: {closureData.lastClosure.reopened_at ?? "-"}
                </p>
              </div>
            </div>
          ) : (
            <EmptyState description="Todavia no hay cierres semanales registrados." title="Sin cierres anteriores" />
          )}
        </DataCard>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/dashboard">Ir al dashboard</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/cajas">Ir a cajas</Link>
        </Button>
      </div>
    </div>
  );
}
