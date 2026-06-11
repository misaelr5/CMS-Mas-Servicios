import { EmptyState } from "@/components/empty-state";
import { NotesPanel } from "@/components/notes/notes-panel";
import { SectionTitle } from "@/components/section-title";
import { DataCard } from "@/components/data-card";

export default function GastosPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        description="Módulo base para gastos. El diseño ya está preparado para carga y revisión, sin lógica de negocio."
        title="Gastos"
      />

      <DataCard description="Espacio para el listado futuro." title="Registro de gastos">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Categoría</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Importe</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Fecha</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Observación</div>
        </div>
      </DataCard>

      <EmptyState
        actionLabel="Agregar gasto"
        description="No hay gastos cargados todavía. La ruta queda lista para cuando se habilite el alta real."
        title="Sin gastos registrados"
      />
      <NotesPanel
        description="Notas internas vinculadas al modulo de gastos."
        entityHref="/gastos"
        entityLabel="Gastos"
        entityType="expense"
      />
    </div>
  );
}
