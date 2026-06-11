import { EmptyState } from "@/components/empty-state";
import { NotesPanel } from "@/components/notes/notes-panel";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { DataCard } from "@/components/data-card";

export default function CierresPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        description="Vista base para cierres operativos y verificación diaria. Todavía sin cálculos ni automatizaciones."
        title="Cierres"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard helper="Listo para revisión manual" label="Pendientes" status="pendiente" value="—" />
        <StatCard helper="Se marcarán diferencias" label="Revisar" status="revisar" value="—" />
        <StatCard helper="Pendiente de confirmación" label="Cerrados" status="ok" value="—" />
      </div>

      <DataCard description="Checklist visual para la etapa siguiente." title="Estado del cierre">
        <div className="space-y-3 text-sm text-brandBlack">
          <p>• Bolas y cajas por consolidar.</p>
          <p>• Diferencias por señalar.</p>
          <p>• Observaciones internas por registrar.</p>
        </div>
      </DataCard>

      <EmptyState
        actionLabel="Abrir cierre"
        description="No hay cierres generados todavía. Esta pantalla ya deja preparada la navegación y el diseño del módulo."
        title="Sin cierres cargados"
      />
      <NotesPanel
        description="Notas de seguimiento para cierres operativos."
        entityHref="/cierres"
        entityLabel="Cierres"
        entityType="closure"
      />
    </div>
  );
}
