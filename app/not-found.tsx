import Link from "next/link";

import { AppLogo } from "@/components/app-logo";
import { PrimaryButton } from "@/components/primary-button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl bg-white/[0.06] p-6 text-brandWhite shadow-medium">
        <AppLogo className="mb-6" />
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mediumGray">404</p>
        <h1 className="mt-3 font-heading text-3xl font-black">La pantalla no existe</h1>
        <p className="mt-3 text-sm text-mediumGray">
          Esta ruta todavía no está disponible en la base inicial de la app.
        </p>
        <div className="mt-6">
          <PrimaryButton asChild>
            <Link href="/dashboard">Volver al dashboard</Link>
          </PrimaryButton>
        </div>
      </Card>
    </main>
  );
}
