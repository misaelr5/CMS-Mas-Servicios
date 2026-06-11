import { cookies } from "next/headers";

import { AccessDenied } from "@/components/access-denied";
import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { Badge } from "@/components/ui/badge";
import { getServerAuthContext } from "@/lib/auth/server";

export default async function ConfiguracionPage() {
  const auth = await getServerAuthContext(cookies());
  if (!auth || auth.role !== "admin") {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Sección básica para revisar roles, datos generales y base de permisos."
        title="Configuración"
        rightSlot={<Badge variant="outline">Admin</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-border bg-white p-5 text-brandBlack shadow-soft">
          <h3 className="font-heading text-lg font-bold">Roles</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4">
              <p className="font-semibold">Admin</p>
              <p className="mt-1 text-sm text-mediumGray">Ve todo y administra usuarios.</p>
            </div>
            <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4">
              <p className="font-semibold">Encargado</p>
              <p className="mt-1 text-sm text-mediumGray">Opera módulos diarios sin administrar usuarios.</p>
            </div>
            <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4">
              <p className="font-semibold">Cajero</p>
              <p className="mt-1 text-sm text-mediumGray">Carga operaciones asignadas.</p>
            </div>
            <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4">
              <p className="font-semibold">Viewer</p>
              <p className="mt-1 text-sm text-mediumGray">Solo lectura.</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-white p-5 text-brandBlack shadow-soft">
          <h3 className="font-heading text-lg font-bold">Datos generales</h3>
          <div className="mt-4 space-y-3 text-sm text-mediumGray">
            <p>• Branding y layout ya definidos en la etapa anterior.</p>
            <p>• Sesión persistente por 12 horas.</p>
            <p>• Protección de rutas activa desde middleware.</p>
            <p>• Supabase preparado para crecer sin rediseñar la base.</p>
          </div>
        </div>
      </div>

      <EmptyState
        description="Más adelante este módulo concentrará parámetros del sistema y permisos extendidos."
        title="Configuración básica lista"
      />
    </div>
  );
}
