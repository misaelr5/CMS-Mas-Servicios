"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";

import { closeBagWeekAction } from "@/app/actions/bags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatArs } from "@/lib/operations/seed-data";

const initialState = { ok: false, message: "" };

type BagWeekCloseTarget = {
  id: string;
  accumulated_profit_ars?: number | null;
};

export function BagWeekCloseForm({ bag }: { bag: BagWeekCloseTarget }) {
  const pathname = usePathname();
  const [state, formAction, isPending] = useActionState(closeBagWeekAction, initialState);
  const profit = Number(bag.accumulated_profit_ars ?? 0);

  return (
    <form action={formAction} className="space-y-4">
      <input name="bag_id" type="hidden" value={bag.id} />
      <input name="current_path" type="hidden" value={pathname} />

      <div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-sm text-lightGray/80">
        <p className="font-semibold text-brandWhite">Arrancar nueva semana</p>
        <p className="mt-1">
          Guarda un snapshot del estado actual y pone la <strong>ganancia acumulada</strong> en $ 0.
          El efectivo, la cuenta, los USD y lo prestado <strong>no se tocan</strong>.
        </p>
        <p className="mt-2">
          Ganancia a resetear: <span className="font-semibold text-brandYellow">{formatArs(profit)}</span>
        </p>
      </div>

      <Input name="note" placeholder="Nota del cierre semanal (opcional)" />

      <label className="flex items-center gap-2 text-sm text-lightGray/80">
        <input
          className="h-4 w-4 accent-brandYellow"
          name="confirm"
          type="checkbox"
          value="1"
          required
        />
        Confirmo el cierre semanal de esta bolsa.
      </label>

      <Button className="shadow-yellowGlow" disabled={isPending} type="submit" variant="destructive">
        {isPending ? "Cerrando semana..." : "Cerrar semana (resetear ganancia)"}
      </Button>

      {state.message ? (
        <p className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
