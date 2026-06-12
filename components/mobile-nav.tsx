"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { quickNavItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const auth = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/8 bg-darkSurface/96 px-3 py-2 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2 overflow-x-auto">
        {quickNavItems.filter((item) => !item.roles || item.roles.includes(auth.role)).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold transition-all",
                active ? "bg-brandYellow text-brandBlack shadow-yellowGlow" : "bg-white/5 text-lightGray"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
