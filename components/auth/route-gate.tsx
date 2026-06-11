"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AccessDenied } from "@/components/access-denied";
import { LoadingState } from "@/components/loading-state";
import { useAuth } from "@/components/auth/auth-provider";
import { canAccessPath } from "@/lib/auth/roles";

export function RouteGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();

  if (auth.status === "loading") {
    return <LoadingState rows={2} />;
  }

  if (auth.status === "unauthenticated") {
    return <LoadingState rows={1} />;
  }

  if (!canAccessPath(auth.role, pathname)) {
    return <AccessDenied />;
  }

  return children;
}

