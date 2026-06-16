import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brandYellow text-brandBlack",
        neutral: "border-border bg-white/5 text-foreground",
        success: "border-transparent bg-success/15 text-success",
        warning: "border-transparent bg-warning/15 text-warning",
        danger: "border-transparent bg-danger/15 text-danger",
        outline: "border-border text-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

const dotColorByVariant: Record<string, string> = {
  default: "bg-brandBlack/40",
  neutral: "bg-foreground/40",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  outline: "bg-foreground/40"
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  const resolvedVariant = variant ?? "default";
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            dotColorByVariant[resolvedVariant] ?? "bg-foreground/40"
          )}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
