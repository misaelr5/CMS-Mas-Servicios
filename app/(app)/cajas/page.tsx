import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";

export default function CajasPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        description="Módulo base para cajas de Pago Fácil. La estructura ya está lista para crecer cuando se agregue la lógica."
        title="Cajas"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard helper="Pendiente de datos reales" label="Cajas activas" status="pendiente" value="—" />
        <StatCard helper="Preparado para flujos de carga" label="Movimientos" status="revisar" value="—" />
        <StatCard helper="Estado visual sin cálculo" label="Diferencias" status="error" value="—" />
      </div>

      <EmptyState
        actionLabel="Abrir caja"
        description="Todavía no existen cajas cargadas. La pantalla ya está diseñada para recibir la administración operativa."
        title="No hay cajas registradas"
      />
    </div>
  );
}
