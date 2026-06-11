import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const variants = {
  ok: "success",
  revisar: "warning",
  error: "danger",
  pendiente: "neutral",
  neutral: "outline"
} as const;

export type StatusBadgeTone = keyof typeof variants;

export function StatusBadge({
  status,
  className
}: {
  status: StatusBadgeTone;
  className?: string;
}) {
  const variant = variants[status];
  const label =
    status === "ok" ? "OK" : status === "revisar" ? "Revisar" : status === "error" ? "Error" : status === "pendiente" ? "Pendiente" : "Estado";

  return <Badge className={cn("rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]", className)} variant={variant}>{label}</Badge>;
}
