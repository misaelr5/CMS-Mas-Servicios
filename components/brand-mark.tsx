import { cn } from "@/lib/utils";

const montserrat = "var(--font-montserrat), Montserrat, ui-sans-serif, sans-serif";

/**
 * Logo completo "MAS SERVICIOS" recreado en vectorial.
 * Si mas adelante se sube el PNG oficial a /public, se puede reemplazar
 * este componente por <Image src="/logo.png" ... />.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 168"
      className={cn("h-auto w-auto", className)}
      role="img"
      aria-label="Mas Servicios"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="4"
        y="30"
        width="352"
        height="132"
        rx="30"
        fill="#101010"
        stroke="rgba(255,255,255,0.09)"
        strokeWidth="1.5"
      />

      <g transform="rotate(-12 78 104)">
        <rect x="50" y="76" width="56" height="56" rx="16" fill="#FFD400" />
        <rect x="72" y="88" width="12" height="32" rx="3" fill="#101010" />
        <rect x="62" y="98" width="32" height="12" rx="3" fill="#101010" />
      </g>

      <text
        x="120"
        y="106"
        style={{ fontFamily: montserrat, fontWeight: 900, fontStyle: "italic" }}
        fontSize="60"
        letterSpacing="-1"
        fill="#FFD400"
      >
        MAS
      </text>

      <text
        x="121"
        y="144"
        style={{ fontFamily: montserrat, fontWeight: 800 }}
        fontSize="29"
        letterSpacing="0.5"
        fill="#FFFFFF"
      >
        SERVICIOS
      </text>
    </svg>
  );
}

export function BrandIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 72"
      className={cn("h-auto w-auto", className)}
      role="img"
      aria-label="Mas Servicios"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="rotate(-10 36 36)">
        <rect x="10" y="10" width="52" height="52" rx="16" fill="#FFD400" />
        <rect x="31" y="22" width="10" height="28" rx="2.5" fill="#101010" />
        <rect x="22" y="31" width="28" height="10" rx="2.5" fill="#101010" />
      </g>
    </svg>
  );
}
