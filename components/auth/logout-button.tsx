"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const { logout, status } = useAuth();

  return (
    <Button
      className={compact ? "h-10 px-3" : undefined}
      disabled={status === "loading"}
      onClick={() => void logout()}
      variant="outline"
      type="button"
    >
      Cerrar sesión
    </Button>
  );
}
