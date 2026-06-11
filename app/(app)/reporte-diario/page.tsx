import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { DataCard } from "@/components/data-card";
import { StatCard } from "@/components/stat-card";

export default function ReporteDiarioPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        description="Plantilla base para el reporte diario. Queda preparada para integrar luego saldos, movimientos y resumen operativo."
        title="Reporte diario"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard helper="Sin datos diarios todavía" label="Ingresos" status="pendiente" value="—" />
        <StatCard helper="Pendiente de consolidación" label="Egresos" status="revisar" value="—" />
        <StatCard helper="Se completará con cierres" label="Balance" status="ok" value="—" />
      </div>

      <DataCard description="Bloque preparado para el armado del reporte." title="Estructura del informe">
        <div className="space-y-3 text-sm text-brandBlack">
          <p>• Resumen de cajas y bolsas.</p>
          <p>• Señales de revisión para diferencias.</p>
          <p>• Notas internas y observaciones del día.</p>
        </div>
      </DataCard>

      <EmptyState
        actionLabel="Generar borrador"
        description="El reporte diario todavía no calcula nada. Esta pantalla solo prepara el contenedor visual y la navegación."
        title="Sin reporte generado"
      />
    </div>
  );
}
