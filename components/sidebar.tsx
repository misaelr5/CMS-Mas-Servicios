"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppLogo } from "@/components/app-logo";
import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col">
      <div className="flex h-full flex-col border-r border-white/8 bg-darkSurface/95 px-5 py-6 backdrop-blur">
        <AppLogo />
        <div className="mt-8 flex-1 space-y-2 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-all",
                  active
                    ? "border-brandYellow/50 bg-brandYellow text-brandBlack shadow-yellowGlow"
                    : "border-white/6 bg-white/4 text-lightGray hover:border-brandYellow/30 hover:bg-white/8 hover:text-white"
                )}
                href={item.href}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="rounded-2xl border border-brandYellow/25 bg-brandYellow/10 p-4 text-sm text-lightGray">
          <p className="font-heading text-base font-bold text-white">Más Servicios</p>
          <p className="mt-2 text-xs leading-relaxed text-lightGray/80">
            Base interna preparada para operar ordenadamente.
          </p>
        </div>
      </div>
    </aside>
  );
}
