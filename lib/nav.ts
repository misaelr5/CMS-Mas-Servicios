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

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bolsas", label: "Bolsas", icon: Banknote },
  { href: "/cajas", label: "Cajas", icon: WalletCards },
  { href: "/reporte-diario", label: "Reporte diario", icon: NotebookPen },
  { href: "/gastos", label: "Gastos", icon: StickyNote },
  { href: "/cierres", label: "Cierres", icon: ShieldCheck },
  { href: "/usuarios", label: "Usuarios", icon: Users },
  { href: "/configuracion", label: "Configuración", icon: Settings2 }
];

export const quickNavItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/bolsas", label: "Bolsas", icon: Banknote },
  { href: "/cajas", label: "Cajas", icon: WalletCards },
  { href: "/configuracion", label: "Más", icon: Building2 }
];
