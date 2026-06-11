import Link from "next/link";

import { PrimaryButton } from "@/components/primary-button";
import { Card } from "@/components/ui/card";

export function AccessDenied() {
  return (
    <Card className="mx-auto max-w-xl bg-white/96 p-6 text-brandBlack shadow-medium">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mediumGray">Acceso restringido</p>
      <h2 className="mt-3 font-heading text-2xl font-black">No tenés permiso para entrar a esta sección</h2>
      <p className="mt-3 text-sm text-mediumGray">
        Esta pantalla está preparada para cuando se conecten roles y permisos. Por ahora solo muestra el estado base del módulo.
      </p>
      <div className="mt-6">
        <PrimaryButton asChild>
          <Link href="/dashboard">Volver al dashboard</Link>
        </PrimaryButton>
      </div>
    </Card>
  );
}
