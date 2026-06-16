import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function DataCard({
  title,
  description,
  icon: Icon,
  rightSlot,
  children,
  className
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  rightSlot?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon ? (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brandYellow/10">
                <Icon className="h-3.5 w-3.5 text-brandYellow" />
              </div>
            ) : null}
            <div className="min-w-0">
              <CardTitle className="leading-tight">{title}</CardTitle>
              {description ? (
                <CardDescription className="mt-0.5">{description}</CardDescription>
              ) : null}
            </div>
          </div>
          {rightSlot ? (
            <div className="flex shrink-0 items-center gap-2">{rightSlot}</div>
          ) : null}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}
