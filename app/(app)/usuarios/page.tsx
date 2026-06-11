import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { AccessDenied } from "@/components/access-denied";

export default function UsuariosPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        description="Pantalla reservada para usuarios, roles y permisos. Por ahora solo muestra la base visual."
        title="Usuarios"
      />

      <AccessDenied />

      <EmptyState
        actionLabel="Preparar accesos"
        description="Los roles todavía no están implementados. Cuando se agreguen, esta vista va a controlar accesos internos."
        title="Gestión de usuarios pendiente"
      />
    </div>
  );
}
