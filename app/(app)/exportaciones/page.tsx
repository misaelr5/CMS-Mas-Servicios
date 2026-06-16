import Link from "next/link";
import { cookies } from "next/headers";

import { AccessDenied } from "@/components/access-denied";
import { DataCard } from "@/components/data-card";
import { SectionTitle } from "@/components/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerAuthContext } from "@/lib/auth/server";

const cards = [
  { href: "/exportaciones/reporte-diario", title: "Reporte diario", description: "Resumen por fecha y sucursal." },
  { href: "/exportaciones/cierre-semanal", title: "Cierre semanal", description: "Consolidado viernes a jueves." },
  { href: "/exportaciones/gastos", title: "Gastos", description: "Listado y filtros de gastos operativos." },
  { href: "/exportaciones/cargas-cajas", title: "Cargas de cajas", description: "Detalle por caja y categoría." },
  { href: "/exportaciones/bolsas", title: "Bolsas de divisas", description: "Operaciones, internas y ganancias." }
];

export default async function ExportacionesPage() {
  const auth = await getServerAuthContext(cookies());
  if (!auth) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Exportaciones descargables y vistas imprimibles para uso interno."
        title="Exportaciones"
        rightSlot={<Badge variant="outline">Solo lectura</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <DataCard description={card.description} key={card.href} title={card.title}>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="shadow-yellowGlow">
                <Link href={card.href}>Abrir</Link>
              </Button>
            </div>
          </DataCard>
        ))}
      </div>
    </div>
  );
}
