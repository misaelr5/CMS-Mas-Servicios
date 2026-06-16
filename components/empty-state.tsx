import Link from "next/link";
import { Inbox } from "lucide-react";

import { PrimaryButton } from "@/components/primary-button";
import { SecondaryButton } from "@/components/secondary-button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  secondaryActionLabel,
  secondaryActionHref,
  className
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  className?: string;
}) {
  return (
    <Card className={cn("border-dashed border-lightGray/50 bg-white p-6 text-brandBlack shadow-medium", className)}>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brandYellow/18 text-brandBlack">
          <Inbox className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-lg font-bold">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-mediumGray">{description}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {actionLabel ? (
            actionHref ? (
              <PrimaryButton asChild>
                <Link href={actionHref}>{actionLabel}</Link>
              </PrimaryButton>
            ) : (
              <PrimaryButton type="button">{actionLabel}</PrimaryButton>
            )
          ) : null}
          {secondaryActionLabel ? (
            secondaryActionHref ? (
              <SecondaryButton asChild>
                <Link href={secondaryActionHref}>{secondaryActionLabel}</Link>
              </SecondaryButton>
            ) : (
              <SecondaryButton type="button">{secondaryActionLabel}</SecondaryButton>
            )
          ) : null}
        </div>
      </div>
    </Card>
  );
}
