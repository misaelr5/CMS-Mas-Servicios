import { cookies } from "next/headers";

import { AccessDenied } from "@/components/access-denied";
import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { Badge } from "@/components/ui/badge";
import { getServerAuthContext } from "@/lib/auth/server";
import { formatArs } from "@/lib/operations/seed-data";
import { getOperationalConfigData } from "@/lib/operations/operational-data";

export default async function ConfiguracionPage() {
  const auth = await getServerAuthContext(cookies());
  if (!auth || auth.role !== "admin") {
    return <AccessDenied />;
  }

  const configData = await getOperationalConfigData();

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
            <p>• Protección de rutas activa desde proxy.</p>
            <p>• Supabase preparado para crecer sin rediseñar la base.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-border bg-white p-5 text-brandBlack shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-lg font-bold">Sucursales</h3>
            <Badge variant="neutral">{configData.branches.length}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {configData.branches.map((branch) => (
              <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4" key={branch.id}>
                <p className="font-semibold">{branch.name}</p>
                <p className="text-sm text-mediumGray">Estado: {branch.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-white p-5 text-brandBlack shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-lg font-bold">Cajas Pago Facil</h3>
            <Badge variant="neutral">{configData.cashRegisters.length}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {configData.cashRegisters.map((cashRegister) => (
              <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4" key={cashRegister.id}>
                <p className="font-semibold">
                  {cashRegister.register_number ? `Caja ${cashRegister.register_number}` : cashRegister.name} - {cashRegister.name}
                </p>
                <p className="text-sm text-mediumGray">Sucursal: {cashRegister.branch_name ?? cashRegister.branch_id}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-white p-5 text-brandBlack shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-lg font-bold">Categorías Pago Facil</h3>
            <Badge variant="neutral">{configData.cashReportCategories.length}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {configData.cashReportCategories.map((category) => (
              <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4" key={category.id}>
                <p className="font-semibold">{category.name}</p>
                <p className="text-sm text-mediumGray">Orden: {category.sort_order}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-white p-5 text-brandBlack shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-lg font-bold">Bolsas iniciales</h3>
            <Badge variant="neutral">{configData.bags.length}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {configData.bags.map((bag) => (
              <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4" key={bag.id}>
                <p className="font-semibold">{bag.name}</p>
                <p className="text-sm text-mediumGray">Base: {formatArs(Number(bag.base_limit_ars))}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-white p-5 text-brandBlack shadow-soft">
        <h3 className="font-heading text-lg font-bold">Estado del sistema</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4">
            <p className="text-sm text-mediumGray">Fuente de datos</p>
            <p className="font-semibold">{configData.source === "database" ? "Supabase" : "Seeds locales"}</p>
          </div>
          <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4">
            <p className="text-sm text-mediumGray">Notas internas</p>
            <p className="font-semibold">Preparadas con auditoria</p>
          </div>
          <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4">
            <p className="text-sm text-mediumGray">RLS</p>
            <p className="font-semibold">Definido en migracion</p>
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
