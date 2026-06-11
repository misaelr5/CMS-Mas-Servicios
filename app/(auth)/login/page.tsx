import Link from "next/link";

import { AppLogo } from "@/components/app-logo";
import { EmptyState } from "@/components/empty-state";
import { PrimaryButton } from "@/components/primary-button";
import { SecondaryButton } from "@/components/secondary-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="space-y-4">
      <Card className="border-brandYellow/30 bg-white/96 text-brandBlack shadow-medium">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardDescription className="text-xs uppercase tracking-[0.24em] text-mediumGray">Acceso interno</CardDescription>
              <CardTitle className="mt-2 text-3xl font-black">MAS SERVICIOS</CardTitle>
            </div>
            <div className="hidden sm:block">
              <AppLogo />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-mediumGray">
            Base preparada para operar con bolsas, cajas, gastos, cierres y reporte diario. En esta etapa no hay login real todavía.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <PrimaryButton asChild className="shadow-yellowGlow">
              <Link href="/dashboard">Entrar al dashboard</Link>
            </PrimaryButton>
            <SecondaryButton asChild>
              <Link href="/dashboard">Explorar la base</Link>
            </SecondaryButton>
          </div>
        </CardContent>
      </Card>

      <EmptyState
        actionLabel="Ir al dashboard"
        actionHref="/dashboard"
        description="Cuando se conecte autenticación real, este espacio va a concentrar el acceso del equipo interno."
        title="Login visual listo, autenticación pendiente"
      />
    </div>
  );
}
