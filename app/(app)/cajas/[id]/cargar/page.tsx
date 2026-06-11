import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { DataCard } from "@/components/data-card";

export default function CajaCargarPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <SectionTitle
        description="Pantalla lista para cargar movimientos dentro de una caja, sin ejecutar todavía persistencia ni cálculos."
        title={`Cargar en caja ${params.id}`}
      />

      <DataCard description="Bloque visual para el futuro formulario." title="Carga de movimiento">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Tipo de movimiento</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Importe</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Referencia</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Nota interna</div>
        </div>
      </DataCard>

      <EmptyState
        actionLabel="Guardar carga"
        description="Por ahora no se guarda nada. La ruta ya existe y el diseño de la acción quedó resuelto."
        title="Formulario de carga listo"
      />
    </div>
  );
}
