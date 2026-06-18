import Link from "next/link";
import { cookies } from "next/headers";

import { AccessDenied } from "@/components/access-denied";
import { DataCard } from "@/components/data-card";
import { SectionTitle } from "@/components/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canExportType } from "@/lib/exportaciones/export-permissions";
import { getServerAuthContext } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

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

  const admin = getSupabaseAdminClient();
  const assignedCashRegisterIds =
    auth.role === "cajero" && admin
      ? (
          await admin.from("cash_registers").select("id").eq("responsible_user_id", auth.userId)
        ).data?.map((row: { id?: unknown }) => String(row.id ?? "")) ?? []
      : [];

  const visibleCards = cards.filter((card) => {
    const tipo = card.href.replace("/exportaciones/", "") as "reporte-diario" | "cierre-semanal" | "gastos" | "cargas-cajas" | "bolsas";
    return canExportType({
      userRole: auth.role,
      exportType: tipo,
      userId: auth.userId,
      assignedCashRegisterIds
    }).allowed;
  });

  if (visibleCards.length === 0) {
    return (
      <AccessDenied
        description="No tenés permisos para exportar reportes desde esta cuenta."
        title="No tenés permisos para exportar este reporte"
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Exportaciones descargables y vistas imprimibles para uso interno."
        title="Exportaciones"
        rightSlot={<Badge variant="outline">Solo lectura</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map((card) => (
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
