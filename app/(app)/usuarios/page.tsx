import { cookies } from "next/headers";

import { createUserAction } from "@/app/(app)/usuarios/actions";
import { AccessDenied } from "@/components/access-denied";
import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getServerAuthContext } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  role: string | null;
};

export default async function UsuariosPage() {
  const auth = await getServerAuthContext(cookies());
  if (!auth || auth.role !== "admin") {
    return <AccessDenied />;
  }

  const admin = getSupabaseAdminClient();
  const [profilesResult, rolesResult] = admin
    ? await Promise.all([
        admin.from("profiles").select("id, full_name, email, status, created_at").order("created_at", { ascending: false }),
        admin.from("user_roles").select("user_id, role")
      ])
    : [
        { data: [] as { id: string; full_name: string | null; email: string | null; status: string | null }[] },
        { data: [] as { user_id: string; role: string }[] }
      ];

  const roleMap = new Map<string, string>();
  (rolesResult.data ?? []).forEach((row) => {
    roleMap.set(row.user_id, row.role);
  });

  const rows: UserRow[] = (profilesResult.data ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    status: row.status,
    role: roleMap.get(row.id) ?? null
  }));

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Listado básico de perfiles y roles. Solo admin puede ver y crear usuarios."
        title="Usuarios"
        rightSlot={<Badge variant="outline">Admin</Badge>}
      />

      <div className="rounded-3xl border border-border bg-white p-5 text-brandBlack shadow-soft">
        <h3 className="font-heading text-lg font-bold">Crear usuario</h3>
        <p className="mt-1 text-sm text-mediumGray">
          Alta interna para usuarios de la empresa. No hay registro público.
        </p>

        <form action={createUserAction} className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="full_name">
              Nombre completo
            </label>
            <Input id="full_name" name="full_name" placeholder="Nombre y apellido" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="email">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="usuario@maservicios.ar" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="password">
              Contraseña
            </label>
            <Input id="password" name="password" type="password" placeholder="Contraseña temporal" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="role">
              Rol
            </label>
            <select
              className="flex h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-brandBlack shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              id="role"
              name="role"
              defaultValue="viewer"
            >
              <option value="admin">Admin</option>
              <option value="encargado">Encargado</option>
              <option value="cajero">Cajero</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-semibold" htmlFor="status">
              Estado
            </label>
            <select
              className="flex h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-brandBlack shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              id="status"
              name="status"
              defaultValue="active"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <Button className="shadow-yellowGlow" type="submit">
              Crear usuario
            </Button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-soft">
        <div className="border-b border-lightGray px-5 py-4">
          <h3 className="font-heading text-lg font-bold text-brandBlack">Listado</h3>
        </div>
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              description="Cuando se creen usuarios desde este panel, van a aparecer acá con nombre, email, rol y estado."
              title="No hay usuarios cargados"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-lightGray text-left text-sm text-brandBlack">
              <thead className="bg-lightGray/40">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nombre</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Rol</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lightGray">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-4 font-semibold">{row.full_name ?? "Sin nombre"}</td>
                    <td className="px-5 py-4 text-mediumGray">{row.email ?? "Sin email"}</td>
                    <td className="px-5 py-4">
                      <Badge variant="neutral">{row.role ?? "viewer"}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={row.status === "active" ? "success" : "neutral"}>{row.status ?? "active"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
