import { Banknote, Download, LayoutDashboard, NotebookPen, Settings2, ShieldCheck, StickyNote, WalletCards, Users } from "lucide-react";

import type { Role } from "@/lib/auth/roles";

export const navItems: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}> = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, roles: ["admin", "encargado", "viewer"] },
  { href: "/bolsas", label: "Bolsas", icon: Banknote, roles: ["admin", "encargado", "cajero", "viewer"] },
  { href: "/cajas", label: "Pago Facil", icon: WalletCards, roles: ["admin", "encargado", "cajero", "viewer"] },
  { href: "/reporte-diario", label: "Reporte", icon: NotebookPen, roles: ["admin", "encargado", "cajero", "viewer"] },
  { href: "/gastos", label: "Gastos", icon: StickyNote, roles: ["admin", "encargado", "cajero", "viewer"] },
  { href: "/cierres", label: "Cierres", icon: ShieldCheck, roles: ["admin", "encargado", "viewer"] },
  { href: "/exportaciones", label: "Exportar", icon: Download, roles: ["admin", "encargado", "viewer"] },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["admin"] },
  { href: "/configuracion", label: "Ajustes", icon: Settings2, roles: ["admin"] }
];

export const quickNavItems: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}> = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, roles: ["admin", "encargado", "viewer"] },
  { href: "/bolsas", label: "Bolsas", icon: Banknote, roles: ["admin", "encargado", "cajero", "viewer"] },
  { href: "/cajas", label: "Pago Facil", icon: WalletCards, roles: ["admin", "encargado", "cajero", "viewer"] },
  { href: "/reporte-diario", label: "Reporte", icon: NotebookPen, roles: ["admin", "encargado", "cajero", "viewer"] },
  { href: "/gastos", label: "Gastos", icon: StickyNote, roles: ["admin", "encargado", "cajero", "viewer"] },
  { href: "/exportaciones", label: "Exportar", icon: Download, roles: ["admin", "encargado", "viewer"] }
];
