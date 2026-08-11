"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AccessDenied } from "@/components/access-denied";
import { BrandLoader } from "@/components/brand-loader";
import { useAuth } from "@/components/auth/auth-provider";
import { canAccessPath } from "@/lib/auth/roles";

export function RouteGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();

  if (auth.status === "loading") {
    return <BrandLoader label="Validando sesión..." />;
  }

  if (auth.status === "unauthenticated") {
    return <BrandLoader label="Redirigiendo al ingreso..." />;
  }

  if (!canAccessPath(auth.role, pathname)) {
    return <AccessDenied />;
  }

  return children;
}

