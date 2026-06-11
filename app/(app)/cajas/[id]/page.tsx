import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { DataCard } from "@/components/data-card";
import { Badge } from "@/components/ui/badge";

export default function CajaDetallePage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <SectionTitle
        description="Ficha de caja preparada para detalle, seguimiento y movimientos futuros."
        title={`Caja ${params.id}`}
        rightSlot={<Badge variant="outline">Detalle</Badge>}
      />

      <DataCard description="Datos visuales de soporte hasta que exista la lógica operativa." title="Resumen de la caja">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Estado: pendiente</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Sucursal: por definir</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Saldo: —</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Diferencia: —</div>
        </div>
      </DataCard>

      <EmptyState
        actionLabel="Cargar movimiento"
        description="La vista ya queda preparada para la secuencia de carga, control y cierre de caja."
        title="Sin movimientos cargados"
      />
    </div>
  );
}
