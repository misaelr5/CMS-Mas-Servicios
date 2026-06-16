"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { AppLogo } from "@/components/app-logo";
import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: null,
    hrefs: ["/dashboard"]
  },
  {
    label: "Operaciones",
    hrefs: ["/bolsas", "/cajas", "/reporte-diario", "/gastos", "/cierres"]
  },
  {
    label: "Reportes",
    hrefs: ["/exportaciones"]
  },
  {
    label: "Admin",
    hrefs: ["/usuarios", "/configuracion"]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const auth = useAuth();

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(auth.role)
  );

  const initials = auth.fullName
    ? auth.fullName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : (auth.email?.[0] ?? "U").toUpperCase();

  return (
    <aside className="hidden print:hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col">
      <div className="flex h-full flex-col border-r border-white/8 bg-darkSurface/95 px-4 py-5 backdrop-blur-xl">
        <div className="px-1">
          <AppLogo href={auth.role === "cajero" ? "/bolsas" : "/dashboard"} />
        </div>

        <nav className="mt-7 flex-1 space-y-5 overflow-y-auto pr-1">
          {navGroups.map((group) => {
            const groupItems = visibleItems.filter((item) =>
              group.hrefs.includes(item.href)
            );
            if (groupItems.length === 0) return null;

            return (
              <div key={group.label ?? "main"}>
                {group.label ? (
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-lightGray/35">
                    {group.label}
                  </p>
                ) : null}
                <div className="space-y-1">
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-150",
                          active
                            ? "border-brandYellow/40 bg-brandYellow text-brandBlack shadow-yellowGlow"
                            : "border-transparent bg-transparent text-lightGray/70 hover:border-white/8 hover:bg-white/5 hover:text-white"
                        )}
                        href={item.href}
                      >
                        <Icon
                          className={cn(
                            "h-[17px] w-[17px] shrink-0",
                            active ? "text-brandBlack" : "text-lightGray/60"
                          )}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User card */}
        {auth.status === "authenticated" ? (
          <div className="mt-4 rounded-xl border border-white/8 bg-white/4 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brandYellow text-xs font-black text-brandBlack shadow-yellowGlow">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {auth.fullName ?? auth.email ?? "Usuario interno"}
                </p>
                <span className="inline-block rounded-full bg-brandYellow/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brandYellow">
                  {auth.role}
                </span>
              </div>
              <button
                onClick={() => void auth.logout()}
                title="Cerrar sesión"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lightGray/50 transition-colors hover:bg-white/8 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
