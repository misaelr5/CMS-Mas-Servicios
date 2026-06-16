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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/8 bg-darkSurface/96 px-3 pb-safe pt-2 backdrop-blur-xl print:hidden lg:hidden">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {quickNavItems
          .filter((item) => !item.roles || item.roles.includes(auth.role))
          .map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-[68px] flex-1 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition-all duration-150",
                  active
                    ? "bg-brandYellow text-brandBlack shadow-yellowGlow"
                    : "bg-white/4 text-lightGray/65 hover:bg-white/8 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
