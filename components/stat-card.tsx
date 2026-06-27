import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge, type StatusBadgeTone } from "@/components/status-badge";
import { cn } from "@/lib/utils";

const iconBgByStatus: Record<StatusBadgeTone, string> = {
  ok: "bg-success/12 text-success",
  revisar: "bg-warning/12 text-warning",
  error: "bg-danger/12 text-danger",
  pendiente: "bg-mediumGray/12 text-lightGray/55",
  neutral: "bg-brandYellow/12 text-brandYellow"
};

export function StatCard({
  label,
  value,
  helper,
  status = "neutral",
  icon: Icon,
  trend,
  trendUp,
  className
}: {
  label: string;
  value: string;
  helper?: string;
  status?: StatusBadgeTone;
  icon?: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("group border-white/10 bg-white/[0.035] text-brandWhite shadow-lift backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-brandYellow/25 hover:bg-white/[0.06]", className)}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-3">
          {Icon ? (
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-110",
                iconBgByStatus[status]
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <StatusBadge status={status} className="ml-auto shrink-0" />
        </div>
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lightGray/50">
            {label}
          </p>
          <p className="mt-1.5 font-heading text-3xl font-black leading-none tabular-nums text-brandWhite transition-colors duration-200">
            {value}
          </p>
          {trend ? (
            <div
              className={cn(
                "mt-1.5 flex items-center gap-1 text-xs font-semibold",
                trendUp ? "text-success" : "text-danger"
              )}
            >
              {trendUp ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>{trend}</span>
            </div>
          ) : null}
        </div>
      </CardHeader>
      {helper ? (
        <CardContent className="pb-4 pt-0 text-sm text-lightGray/55">
          {helper}
        </CardContent>
      ) : null}
    </Card>
  );
}
