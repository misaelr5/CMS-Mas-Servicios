import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { DataCard } from "@/components/data-card";
import { Badge } from "@/components/ui/badge";

export default function BolsaDetallePage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <SectionTitle
        description="Ficha vacía preparada para el detalle de una bolsa. Todavía no conecta con datos ni cálculos."
        title={`Bolsa ${params.id}`}
        rightSlot={<Badge variant="neutral">Detalle</Badge>}
      />

      <DataCard description="Secciones reservadas para información futura." title="Resumen de la bolsa">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Estado: pendiente</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Moneda: por definir</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Monto: —</div>
          <div className="rounded-2xl border border-border bg-white/5 p-4 text-sm text-lightGray">Diferencia: —</div>
        </div>
      </DataCard>

      <EmptyState
        actionLabel="Cargar operación"
        description="Más adelante este detalle va a mostrar el historial, los movimientos y el cierre de la bolsa."
        title="Detalle sin movimientos"
      />
    </div>
  );
}
