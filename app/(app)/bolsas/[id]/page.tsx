import Link from "next/link";

import { NotesPanel } from "@/components/notes/notes-panel";
import { BagOperationsTable } from "@/components/bags/bag-operations-table";
import { SectionTitle } from "@/components/section-title";
import { DataCard } from "@/components/data-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { getBagDetail, getBagByIdOrSeed } from "@/lib/bags/bag-service";
import { formatUsd } from "@/lib/bags/bag-calculations";
import { formatArs } from "@/lib/operations/seed-data";

export default async function BolsaDetallePage({ params }: { params: { id: string } }) {
  const detail = await getBagDetail(params.id);
  const bag = detail?.bag ?? (await getBagByIdOrSeed(params.id));

  if (!bag) {
    return <EmptyState description="No se encontro la bolsa solicitada." title="Bolsa no encontrada" />;
  }

  const latestUpdate = bag.updated_at ? new Date(bag.updated_at).toLocaleString("es-AR") : "Sin datos";

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Detalle operativo de la bolsa con historial, notas y cierre diario."
        title={bag.name}
        rightSlot={<Badge variant={detail ? (detail.status_label === "ok" ? "success" : detail.status_label === "revisar" ? "warning" : "danger") : "neutral"}>{detail?.status_label ?? bag.status}</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DataCard description="Capacidad base" title="Base / limite">
          <p className="text-2xl font-black text-brandBlack">{formatArs(Number(bag.base_limit_ars ?? 0))}</p>
        </DataCard>
        <DataCard description="Pesos disponibles" title="Efectivo y cuenta">
          <p className="text-sm text-mediumGray">Efectivo</p>
          <p className="font-semibold text-brandBlack">{formatArs(Number(bag.current_cash_ars ?? 0))}</p>
          <p className="mt-2 text-sm text-mediumGray">Cuenta</p>
          <p className="font-semibold text-brandBlack">{formatArs(Number(bag.current_account_ars ?? 0))}</p>
        </DataCard>
        <DataCard description="Dolares y costo" title="USD y promedio">
          <p className="text-sm text-mediumGray">USD</p>
          <p className="font-semibold text-brandBlack">{formatUsd(Number(bag.current_usd ?? 0))}</p>
          <p className="mt-2 text-sm text-mediumGray">Costo promedio</p>
          <p className="font-semibold text-brandBlack">{formatArs(Number(bag.average_usd_cost ?? 0))}</p>
        </DataCard>
        <DataCard description="Utilidad y diferencia" title="Resultados">
          <p className="text-sm text-mediumGray">Ganancia acumulada</p>
          <p className="font-semibold text-brandBlack">{formatArs(Number(bag.accumulated_profit_ars ?? 0))}</p>
          <p className="mt-2 text-sm text-mediumGray">Diferencia estimada</p>
          <p className="font-semibold text-brandBlack">{formatArs(Number(detail?.difference_ars ?? 0))}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-mediumGray">Ultima actualizacion</p>
          <p className="text-sm font-semibold text-brandBlack">{latestUpdate}</p>
        </DataCard>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/bolsas/nueva-operacion?bagId=${bag.id}`}>Nueva operacion</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/bolsas/${bag.id}/cierre-diario`}>Cierre diario</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/api/bolsas/${bag.id}/csv`}>Exportar CSV</Link>
        </Button>
      </div>

      <DataCard description="Historial de movimientos cargados en esta bolsa." title="Operaciones">
        {detail ? <BagOperationsTable bagId={bag.id} operations={detail.operations} /> : <EmptyState description="Aun no hay movimientos registrados." title="Sin operaciones" />}
      </DataCard>

      <NotesPanel
        description="Notas abiertas, importantes, urgentes y resueltas para esta bolsa."
        entityHref={`/bolsas/${bag.id}`}
        entityId={bag.id}
        entityLabel={bag.name}
        entityType="bag"
        title="Notas de la bolsa"
      />
    </div>
  );
}
