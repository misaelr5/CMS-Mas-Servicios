import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, type StatusBadgeTone } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  helper,
  status = "neutral",
  className
}: {
  label: string;
  value: string;
  helper?: string;
  status?: StatusBadgeTone;
  className?: string;
}) {
  return (
    <Card className={cn("bg-white text-brandBlack shadow-medium", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription className="text-[11px] uppercase tracking-[0.2em] text-mediumGray">{label}</CardDescription>
            <CardTitle className="mt-2 text-3xl font-black">{value}</CardTitle>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      {helper ? <CardContent className="pt-0 text-sm text-mediumGray">{helper}</CardContent> : null}
    </Card>
  );
}
