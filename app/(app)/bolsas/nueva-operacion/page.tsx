import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { DataCard } from "@/components/data-card";

export default function NuevaOperacionPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        description="Pantalla lista para el alta de una nueva operación de bolsa. La lógica de captura vendrá después."
        title="Nueva operación"
      />

      <DataCard description="Formulario reservado para la siguiente etapa." title="Carga inicial">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Tipo de operación</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Monto y moneda</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Referencia interna</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Observación</div>
        </div>
      </DataCard>

      <EmptyState
        actionLabel="Guardar borrador"
        description="En esta etapa todavía no se registra nada. Solo queda listo el contenedor visual para la próxima implementación."
        title="Formulario preparado"
      />
    </div>
  );
}
