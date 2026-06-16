import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function SectionTitle({
  title,
  description,
  icon: Icon,
  rightSlot,
  className
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  rightSlot?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brandYellow/15 border border-brandYellow/20">
            <Icon className="h-4 w-4 text-brandYellow" />
          </div>
        ) : null}
        <div>
          <h1 className="font-heading text-2xl font-black tracking-tight text-brandWhite sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-3xl text-sm text-lightGray/75">{description}</p>
          ) : null}
        </div>
      </div>
      {rightSlot ? (
        <div className="flex flex-wrap items-center gap-2">{rightSlot}</div>
      ) : null}
    </div>
  );
}
