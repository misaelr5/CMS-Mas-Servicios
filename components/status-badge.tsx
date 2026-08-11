import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const variants = {
  ok: "success",
  revisar: "warning",
  error: "danger",
  pendiente: "neutral",
  neutral: "outline"
} as const;

const labels = {
  ok: "OK",
  revisar: "Revisar",
  error: "Error",
  pendiente: "Pendiente",
  neutral: "Sin estado"
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

  return (
    <Badge
      className={cn("rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em]", className)}
      variant={variant}
      dot
    >
      {labels[status]}
    </Badge>
  );
}
