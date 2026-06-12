import Link from "next/link";
import { cookies } from "next/headers";

import { BagOperationForm } from "@/components/bags/bag-operation-form";
import { DataCard } from "@/components/data-card";
import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { getBagsOverview } from "@/lib/bags/bag-service";
import { getAssignedBagIdsForUser } from "@/lib/bags/bag-service";
import { getServerAuthContext } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";

export default async function NuevaOperacionPage({
  searchParams
}: {
  searchParams?: { bagId?: string };
}) {
  const auth = await getServerAuthContext(cookies());
  const bags = await getBagsOverview();
  const assignedBagIds = auth?.role === "cajero" ? await getAssignedBagIdsForUser(auth.userId) : [];
  const assignedBags = auth?.role === "cajero" ? bags.filter((bag) => assignedBagIds.includes(bag.id)) : bags;
  const lockedBag = auth?.role === "cajero" ? assignedBags[0] ?? null : null;
  const defaultBagId = lockedBag?.id ?? searchParams?.bagId;

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Carga operativa de compra, venta, prestamos, ajustes y movimientos de pesos."
        title="Nueva operacion"
        rightSlot={
          <Button asChild variant="outline">
            <Link href="/bolsas">Volver atras</Link>
          </Button>
        }
      />

      {auth?.role === "cajero" && assignedBags.length === 0 ? (
        <EmptyState
          actionHref="/dashboard"
          actionLabel="Volver al dashboard"
          description="No tenes una bolsa asignada para cargar operaciones."
          title="Bolsa no asignada"
        />
      ) : (
        <DataCard description="Formulario operativo mobile-first con vista previa del impacto." title="Carga de operacion">
          <BagOperationForm bags={assignedBags} defaultBagId={defaultBagId} lockedBagId={lockedBag?.id} lockedBagName={lockedBag?.name} />
        </DataCard>
      )}
    </div>
  );
}
