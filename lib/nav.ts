import {
  Banknote,
  Building2,
  LayoutDashboard,
  NotebookPen,
  Settings2,
  ShieldCheck,
  StickyNote,
  WalletCards,
  Users
} from "lucide-react";

import type { Role } from "@/lib/auth/roles";

export const navItems: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "encargado", "viewer"] },
  { href: "/bolsas", label: "Bolsas", icon: Banknote },
  { href: "/cajas", label: "Cajas", icon: WalletCards },
  { href: "/reporte-diario", label: "Reporte diario", icon: NotebookPen },
  { href: "/gastos", label: "Gastos", icon: StickyNote },
  { href: "/cierres", label: "Cierres", icon: ShieldCheck },
  { href: "/usuarios", label: "Usuarios", icon: Users },
  { href: "/configuracion", label: "ConfiguraciÃ³n", icon: Settings2 }
];

export const quickNavItems: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}> = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, roles: ["admin", "encargado", "viewer"] },
  { href: "/bolsas", label: "Bolsas", icon: Banknote },
  { href: "/cajas", label: "Cajas", icon: WalletCards },
  { href: "/configuracion", label: "MÃ¡s", icon: Building2 }
];
