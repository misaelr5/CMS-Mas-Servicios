import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { DataCard } from "@/components/data-card";
import { Badge } from "@/components/ui/badge";

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        description="Ajustes globales del sistema, branding y preparación de infraestructura. Sin lógica de negocio por ahora."
        title="Configuración"
        rightSlot={<Badge variant="neutral">Base</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <DataCard description="Tokens visuales ya aplicados." title="Branding">
          <div className="space-y-3 text-sm text-brandBlack">
            <p>• Más Servicios como marca textual.</p>
            <p>• MAS SERVICIOS como marca visual.</p>
            <p>• Alto contraste y foco comercial.</p>
          </div>
        </DataCard>

        <DataCard description="Supabase preparado para conectar más adelante." title="Infraestructura">
          <div className="space-y-3 text-sm text-brandBlack">
            <p>• Variables de entorno listas.</p>
            <p>• Cliente y servidor preparados de forma diferida.</p>
            <p>• Sin consultas ni modelos todavía.</p>
          </div>
        </DataCard>
      </div>

      <EmptyState
        actionLabel="Editar ajustes"
        description="Cuando empiece la etapa funcional, este módulo concentrará preferencias, branding y conexión externa."
        title="Sin configuraciones activas"
      />
    </div>
  );
}
