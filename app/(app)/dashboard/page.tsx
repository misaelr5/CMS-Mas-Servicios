import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { DataCard } from "@/components/data-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const overview = [
  { label: "Bolsas activas", value: "—", helper: "Sin operaciones cargadas", status: "pendiente" as const },
  { label: "Cajas abiertas", value: "—", helper: "Preparadas para vincular movimientos", status: "pendiente" as const },
  { label: "Diferencias", value: "—", helper: "Se mostrarán cuando llegue la lógica", status: "revisar" as const },
  { label: "Notas internas", value: "—", helper: "Espacio listo para el equipo", status: "ok" as const }
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        description="Vista principal para Nico. Esta pantalla ya deja lista la estructura visual del control interno, sin cálculos ni operaciones reales todavía."
        title="Dashboard"
        rightSlot={
          <Badge className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]" variant="outline">
            Vista base
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overview.map((item) => (
          <StatCard key={item.label} className="min-h-[170px]" {...item} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <DataCard
          description="Espacio preparado para los módulos que todavía no tienen lógica."
          title="Estado general"
        >
          <div className="space-y-3 text-sm text-brandBlack">
            <p>• El layout ya está listo para navegar entre módulos.</p>
            <p>• Los componentes base quedan reutilizables para futuras pantallas.</p>
            <p>• Supabase quedó preparado, sin enlazar aún procesos complejos.</p>
          </div>
        </DataCard>

      <EmptyState
        actionLabel="Abrir bolsas"
        actionHref="/bolsas"
        secondaryActionLabel="Ver cajas"
        secondaryActionHref="/cajas"
        description="Cuando empiece la etapa operativa, acá se va a visualizar la actividad diaria, revisiones y alertas."
        title="Sin datos cargados"
      />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/bolsas">Ir a bolsas</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/cajas">Ir a cajas</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/reporte-diario">Ver reporte diario</Link>
        </Button>
      </div>
    </div>
  );
}
