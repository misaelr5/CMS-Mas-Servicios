import type { ReactNode } from "react";

import { AuthProvider } from "@/components/auth/auth-provider";
import { RouteGate } from "@/components/auth/route-gate";
import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>
        <RouteGate>{children}</RouteGate>
      </AppShell>
    </AuthProvider>
  );
}
