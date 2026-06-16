import Link from "next/link";
import { cookies } from "next/headers";

import { AccessDenied } from "@/components/access-denied";
import { InternalBagTransferForm } from "@/components/bags/internal-bag-transfer-form";
import { DataCard } from "@/components/data-card";
import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { Button } from "@/components/ui/button";
import { getServerAuthContext } from "@/lib/auth/server";
import { getAssignedBagIdsForUser, getInternalTransferBagOptions } from "@/lib/bags/bag-service";

export default async function VenderABolsaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getServerAuthContext(cookies());
  const isCashier = auth?.role === "cajero";
  const assignedBagIds = isCashier && auth ? await getAssignedBagIdsForUser(auth.userId) : [];

  if (isCashier && !assignedBagIds.includes(id)) {
    return <AccessDenied />;
  }

  const bags = await getInternalTransferBagOptions();
  const originBag = bags.find((bag) => bag.id === id);
  const destinationBags = bags.filter((bag) => bag.id !== id);

  if (!originBag) {
    return <EmptyState description="No se encontro la bolsa origen." title="Bolsa no encontrada" />;
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Movimiento interno entre bolsas. Permite vender o comprar USD y definir si los pesos van por efectivo o cuenta."
        title="Intercambiar con otra bolsa"
        rightSlot={
          <Button asChild variant="outline">
            <Link href={`/bolsas/${id}`}>Volver atras</Link>
          </Button>
        }
      />

      {destinationBags.length === 0 ? (
        <EmptyState description="No hay otra bolsa disponible como destino." title="Sin bolsa destino" />
      ) : (
        <DataCard description="Elegí la direccion del movimiento y el origen de los pesos para cada lado." title="Confirmar movimiento interno">
          <InternalBagTransferForm destinationBags={destinationBags} originBag={originBag} />
        </DataCard>
      )}
    </div>
  );
}
