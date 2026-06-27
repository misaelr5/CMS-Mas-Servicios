import Link from "next/link";
import { cookies } from "next/headers";

import { NotesPanel } from "@/components/notes/notes-panel";
import { AccessDenied } from "@/components/access-denied";
import { BagCloseForm } from "@/components/bags/bag-close-form";
import { SectionTitle } from "@/components/section-title";
import { DataCard } from "@/components/data-card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerAuthContext } from "@/lib/auth/server";
import { getAssignedBagIdsForUser, getBagDetail, getBagByIdOrSeed } from "@/lib/bags/bag-service";
import { formatArs } from "@/lib/operations/seed-data";
import { formatUsd } from "@/lib/bags/bag-calculations";

export default async function CierreDiarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getServerAuthContext(cookies());
  const assignedBagIds = auth?.role === "cajero" ? await getAssignedBagIdsForUser(auth.userId) : [];
  if (auth?.role === "cajero" && !assignedBagIds.includes(id)) {
    return <AccessDenied />;
  }

  const detail = await getBagDetail(id);
  const bag = detail?.bag ?? (await getBagByIdOrSeed(id));

  if (!bag) {
    return <EmptyState description="No se encontro la bolsa para cerrar." title="Bolsa no encontrada" />;
  }

  const estimated = detail?.estimated_total_ars ?? 0;
  const difference = detail?.difference_ars ?? 0;

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Cierre diario sin reiniciar saldos. Se guarda el snapshot y la observacion."
        title={`Cierre diario - ${bag.name}`}
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/bolsas/${bag.id}`}>Volver atras</Link>
            </Button>
            <Badge variant={detail ? "outline" : "neutral"}>{detail?.status_label ?? bag.status}</Badge>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DataCard description="Estado actual" title="Resumen">
          <div className="space-y-2 text-sm text-brandWhite">
            <p>Efectivo: {formatArs(Number(bag.current_cash_ars ?? 0))}</p>
            <p>Cuenta: {formatArs(Number(bag.current_account_ars ?? 0))}</p>
            <p>USD: {formatUsd(Number(bag.current_usd ?? 0))}</p>
            <p>Prestado: {formatArs(Number(bag.borrowed_ars ?? 0))}</p>
          </div>
        </DataCard>
        <DataCard description="Resultado" title="Corte estimado">
          <div className="space-y-2 text-sm text-brandWhite">
            <p>Total estimado: {formatArs(estimated)}</p>
            <p>Diferencia: {formatArs(difference)}</p>
            <p>Costo promedio USD: {formatArs(Number(bag.average_usd_cost ?? 0))}</p>
          </div>
        </DataCard>
        <DataCard description="Confirmacion" title="Guardar snapshot">
          <BagCloseForm bag={bag} />
        </DataCard>
      </div>

      <NotesPanel
        description="Notas ligadas al cierre diario de la bolsa."
        entityHref={`/bolsas/${bag.id}/cierre-diario`}
        entityId={bag.id}
        entityLabel={bag.name}
        entityType="bag"
        title="Notas del cierre"
      />
    </div>
  );
}
