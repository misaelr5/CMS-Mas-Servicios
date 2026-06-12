import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ImportantNotesWidget } from "@/components/notes/important-notes-widget";
import { NotesPanel } from "@/components/notes/notes-panel";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { DataCard } from "@/components/data-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCashModuleData } from "@/lib/cash/cash-service";
import { getBagsOverview } from "@/lib/bags/bag-service";
import { formatUsd } from "@/lib/bags/bag-calculations";
import { formatArs } from "@/lib/operations/seed-data";

export default async function DashboardPage() {
  const bags = await getBagsOverview();
  const cashData = await getCashModuleData();
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Cajas cargadas" status="ok" value={`${cashData.summary.registers_loaded_today}`} />
        <StatCard label="Cajas pendientes" status="revisar" value={`${cashData.summary.registers_pending_today}`} />
        <StatCard label="Operado Pago Facil" status="neutral" value={formatArs(cashData.summary.total_operated_today)} />
        <StatCard label="Ganancia Centro" status="ok" value={formatArs(cashData.summary.center_profit_today)} />
        <StatCard label="Ganancia Terminal" status="ok" value={formatArs(cashData.summary.terminal_profit_today)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <DataCard description="Resumen de control de divisas." title="Estado de bolsas">
          <div className="space-y-3 text-sm text-brandBlack">
            <p>• Bolsas con diferencia o revisión: {totals.review}</p>
            <p>• Saldos cargados por día y por operación.</p>
            <p>• Exportación CSV disponible por bolsa.</p>
          </div>
        </DataCard>

        <EmptyState
          actionLabel="Abrir cajas"
          actionHref="/cajas"
          secondaryActionLabel="Ver reporte diario"
          secondaryActionHref="/reporte-diario"
          description="Acá se centraliza el seguimiento diario de las cajas Pago Fácil y sus cargas por categoría."
          title="Control de cajas listo"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <ImportantNotesWidget />
        <NotesPanel
          description="Notas generales del sistema para seguimiento interno."
          entityHref="/dashboard"
          entityLabel="Dashboard"
          entityType="general"
          title="Notas generales"
        />
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
