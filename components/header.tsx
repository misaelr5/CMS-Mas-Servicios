"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

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
  const activeItem = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  const title = activeItem ? titles[activeItem.href] : "Dashboard";
  const Icon = activeItem?.icon;

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-darkSurface/85 backdrop-blur-xl print:hidden">
      <div className="flex items-center gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center gap-3 min-w-0">
          {Icon ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brandYellow/10 border border-brandYellow/20">
              <Icon className="h-4 w-4 text-brandYellow" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-black leading-tight text-brandWhite truncate">
              {title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {auth.status === "authenticated" ? (
            <div className="hidden flex-col items-end gap-0.5 xl:flex">
              <span className="text-xs font-semibold text-lightGray/90 leading-none">
                {auth.fullName ?? auth.email ?? "Usuario interno"}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brandYellow/80 leading-none">
                {auth.role}
              </span>
            </div>
          ) : null}
          <span className="hidden rounded-full border border-brandYellow/20 bg-brandYellow/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brandYellow md:inline-flex">
            Interna
          </span>
          <div className="hidden md:block">
            <LogoutButton compact />
          </div>
          <div className="md:hidden">
            <LogoutButton compact />
          </div>
        </div>
      </div>

      <div className="border-t border-white/6 px-4 pb-2.5 pt-2 text-xs text-lightGray/60 md:hidden">
        {auth.status === "authenticated"
          ? `${auth.fullName ?? auth.email ?? "Usuario interno"} · ${auth.role}`
          : "Validando sesión..."}
      </div>
    </header>
  );
}
