import { BagOperationForm } from "@/components/bags/bag-operation-form";
import { DataCard } from "@/components/data-card";
import { SectionTitle } from "@/components/section-title";
import { getBagsOverview } from "@/lib/bags/bag-service";

export default async function NuevaOperacionPage({
  searchParams
}: {
  searchParams?: { bagId?: string };
}) {
  const bags = await getBagsOverview();

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Carga operativa de compra, venta, prestamos, ajustes y movimientos de pesos."
        title="Nueva operacion"
      />

      <DataCard description="Formulario operativo mobile-first con vista previa del impacto." title="Carga de operacion">
        <BagOperationForm bags={bags} defaultBagId={searchParams?.bagId} />
      </DataCard>
    </div>
  );
}
