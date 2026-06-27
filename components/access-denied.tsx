"use client";

import Link from "next/link";

import { PrimaryButton } from "@/components/primary-button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { getHomePathForRole } from "@/lib/auth/roles";

export function AccessDenied({
  title = "No tenés permiso para entrar a esta sección",
  description = "Esta pantalla está restringida para tu rol actual. Revisá los permisos o volvé al inicio."
}: {
  title?: string;
  description?: string;
}) {
  const auth = useAuth();
  const homePath = getHomePathForRole(auth.role);

  return (
    <Card className="mx-auto max-w-xl bg-white/[0.06] p-6 text-brandWhite shadow-medium">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lightGray/55">Acceso restringido</p>
      <h2 className="mt-3 font-heading text-2xl font-black">{title}</h2>
      <p className="mt-3 text-sm text-lightGray/55">{description}</p>
      <div className="mt-6">
        <PrimaryButton asChild>
          <Link href={homePath}>Volver al inicio</Link>
        </PrimaryButton>
      </div>
    </Card>
  );
}
