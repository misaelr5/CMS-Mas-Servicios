"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { useAuth } from "@/components/auth/auth-provider";
import { navItems } from "@/lib/nav";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/bolsas": "Bolsas",
  "/cajas": "Cajas",
  "/reporte-diario": "Reporte diario",
  "/gastos": "Gastos",
  "/cierres": "Cierres",
  "/exportaciones": "Exportaciones",
  "/usuarios": "Usuarios",
  "/configuracion": "Configuración"
};

export function Header() {
  const pathname = usePathname();
  const auth = useAuth();
  const activeItem = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const title = activeItem ? titles[activeItem.href] : "Dashboard";

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-darkSurface/85 backdrop-blur print:hidden">
      <div className="flex items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brandYellow/90">Más Servicios</p>
          <h2 className="mt-1 font-heading text-xl font-black text-brandWhite">{title}</h2>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {auth.status === "authenticated" ? (
            <div className="hidden flex-col items-end gap-1 xl:flex">
              <span className="text-xs font-semibold text-lightGray">{auth.fullName ?? auth.email ?? "Usuario interno"}</span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-brandYellow">{auth.role}</span>
            </div>
          ) : null}
          <span className="rounded-full border border-brandYellow/20 bg-brandYellow/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brandYellow">
            Interna
          </span>
          <LogoutButton />
        </div>
        <div className="md:hidden">
          <LogoutButton compact />
        </div>
      </div>
      <div className="border-t border-white/8 px-4 pb-3 pt-2 text-xs text-lightGray/75 md:hidden">
        {auth.status === "authenticated" ? `${auth.fullName ?? auth.email ?? "Usuario interno"} · ${auth.role}` : "Validando sesión..."}
      </div>
    </header>
  );
}
