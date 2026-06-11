import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionTitle({
  title,
  description,
  rightSlot,
  className
}: {
  title: string;
  description?: string;
  rightSlot?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        <h1 className="font-heading text-2xl font-black tracking-tight text-brandWhite sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm text-lightGray/80">{description}</p> : null}
      </div>
      {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}
    </div>
  );
}
