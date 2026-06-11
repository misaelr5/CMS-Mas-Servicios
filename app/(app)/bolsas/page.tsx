import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { DataCard } from "@/components/data-card";
import { StatusBadge } from "@/components/status-badge";

export default function BolsasPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        description="Módulo base para el control de bolsas de divisas. Por ahora solo deja lista la navegación y el diseño."
        title="Bolsas de divisas"
      />

      <DataCard description="Estructura visual lista para futuras operaciones." title="Próximo contenido">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="pendiente" />
          <StatusBadge status="revisar" />
          <StatusBadge status="ok" />
          <StatusBadge status="error" />
        </div>
      </DataCard>

      <EmptyState
        actionLabel="Nueva operación"
        actionHref="/bolsas/nueva-operacion"
        description="Todavía no hay operaciones registradas. Esta pantalla queda lista para la carga manual cuando se implemente la lógica."
        title="No hay bolsas cargadas"
      />
    </div>
  );
}
