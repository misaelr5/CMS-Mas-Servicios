import Link from "next/link";

import { cn } from "@/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  return (
    <Link className={cn("group flex items-center gap-3", className)} href="/dashboard">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brandYellow text-sm font-black text-brandBlack shadow-yellowGlow">
        MS
      </span>
      <span className="leading-tight">
        <span className="block font-heading text-sm font-bold uppercase tracking-[0.24em] text-brandWhite">
          MAS SERVICIOS
        </span>
        <span className="block text-xs text-lightGray/75">Más Servicios</span>
      </span>
    </Link>
  );
}
