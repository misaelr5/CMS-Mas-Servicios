"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";

import { createBagSnapshotAction } from "@/app/actions/bags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatArs } from "@/lib/operations/seed-data";

const initialState = { ok: false, message: "" };

type BagCloseTarget = {
  id: string;
  current_cash_ars?: number | null;
  current_account_ars?: number | null;
};

export function BagCloseForm({ bag }: { bag: BagCloseTarget }) {
  const pathname = usePathname();
  const [state, formAction, isPending] = useActionState(createBagSnapshotAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input name="bag_id" type="hidden" value={bag.id} />
      <input name="current_path" type="hidden" value={pathname} />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-lightGray bg-lightGray/30 p-4 text-sm text-mediumGray">
          <p className="font-semibold text-brandBlack">Efectivo</p>
          <p>{formatArs(Number(bag.current_cash_ars ?? 0))}</p>
        </div>
        <div className="rounded-md border border-lightGray bg-lightGray/30 p-4 text-sm text-mediumGray">
          <p className="font-semibold text-brandBlack">Cuenta</p>
          <p>{formatArs(Number(bag.current_account_ars ?? 0))}</p>
        </div>
      </div>
      <Input name="note" placeholder="Nota del cierre diario" />
      <Button className="shadow-yellowGlow" disabled={isPending} type="submit">
        {isPending ? "Guardando..." : "Confirmar cierre"}
      </Button>
      {state.message ? <p className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{state.message}</p> : null}
    </form>
  );
}
