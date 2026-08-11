import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

export function AppLogo({ className, href = "/dashboard" }: { className?: string; href?: string }) {
  return (
    <Link
      className={cn("group inline-flex items-center", className)}
      href={href}
      aria-label="Más Servicios — Inicio"
    >
      <BrandMark className="h-12 w-auto transition-transform duration-200 group-hover:scale-[1.03]" />
    </Link>
  );
}
