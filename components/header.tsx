"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PrimaryButton } from "@/components/primary-button";
import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/bolsas": "Bolsas",
  "/cajas": "Cajas",
  "/reporte-diario": "Reporte diario",
  "/gastos": "Gastos",
  "/cierres": "Cierres",
  "/usuarios": "Usuarios",
  "/configuracion": "Configuración"
};

export function Header() {
  const pathname = usePathname();
  const activeItem = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const title = activeItem ? titles[activeItem.href] : "Dashboard";

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-darkSurface/85 backdrop-blur">
      <div className="flex items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brandYellow/90">Más Servicios</p>
          <h2 className="mt-1 font-heading text-xl font-black text-brandWhite">{title}</h2>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span className="rounded-full border border-brandYellow/20 bg-brandYellow/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brandYellow">
            Interna
          </span>
          <PrimaryButton className="shadow-yellowGlow" type="button">
            Panel base
          </PrimaryButton>
        </div>
        <div className="md:hidden">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-brandYellow/30 bg-brandYellow px-4 text-sm font-semibold text-brandBlack"
            href="/dashboard"
          >
            Base
          </Link>
        </div>
      </div>
    </header>
  );
}
