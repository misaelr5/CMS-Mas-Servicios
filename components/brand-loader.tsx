import { BrandIcon } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

export function BrandLoader({
  label = "Cargando...",
  className
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[70vh] w-full flex-col items-center justify-center gap-7",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        {/* Halo pulsante difuso */}
        <div className="absolute inset-0 animate-pulse rounded-full bg-brandYellow/20 blur-2xl" />
        {/* Anillo giratorio */}
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-brandYellow/15 border-t-brandYellow" />
        {/* Símbolo de marca */}
        <BrandIcon className="relative h-12 w-12 drop-shadow-[0_4px_16px_rgba(255,212,0,0.35)]" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="font-heading text-base font-black uppercase tracking-[0.28em] text-brandWhite">
          MAS SERVICIOS
        </p>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brandYellow/80 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brandYellow/80 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brandYellow/80" />
        </div>
        <p className="text-xs text-lightGray/55">{label}</p>
      </div>

      <span className="sr-only">{label}</span>
    </div>
  );
}
