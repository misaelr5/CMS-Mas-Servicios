"use client";

import { useActionState, useMemo, useState } from "react";

import { createInternalBagTransferAction } from "@/app/actions/bags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InternalTransferBagOption } from "@/lib/bags/bag-service";
import { formatUsd } from "@/lib/bags/bag-calculations";
import { formatArs } from "@/lib/operations/seed-data";

const initialState = { ok: false, message: "" };

export function InternalBagTransferForm({
  originBag,
  destinationBags
}: {
  originBag: InternalTransferBagOption;
  destinationBags: InternalTransferBagOption[];
}) {
  const [state, formAction, isPending] = useActionState(createInternalBagTransferAction, initialState);
  const [destinationBagId, setDestinationBagId] = useState(destinationBags[0]?.id ?? "");
  const [amountUsd, setAmountUsd] = useState("");
  const [internalRateArs, setInternalRateArs] = useState("");
  const [destinationPaymentSource, setDestinationPaymentSource] = useState<"efectivo" | "cuenta">("efectivo");
  const [originReceiveDestination, setOriginReceiveDestination] = useState<"efectivo" | "cuenta">("efectivo");

  const destinationBag = destinationBags.find((bag) => bag.id === destinationBagId) ?? destinationBags[0] ?? null;
  const parsedUsd = Number(amountUsd || 0);
  const parsedRate = Number(internalRateArs || 0);

  const preview = useMemo(() => {
    const totalArs = parsedUsd > 0 && parsedRate > 0 ? parsedUsd * parsedRate : 0;
    const originNextUsd = Number(originBag.current_usd ?? 0) - parsedUsd;
    const originNextCash = Number(originBag.current_cash_ars ?? 0) + (originReceiveDestination === "efectivo" ? totalArs : 0);
    const originNextAccount = Number(originBag.current_account_ars ?? 0) + (originReceiveDestination === "cuenta" ? totalArs : 0);

    const destinationPreviousUsd = Number(destinationBag?.current_usd ?? 0);
    const destinationNextUsd = destinationPreviousUsd + parsedUsd;
    const destinationNextCash = Number(destinationBag?.current_cash_ars ?? 0) - (destinationPaymentSource === "efectivo" ? totalArs : 0);
    const destinationNextAccount = Number(destinationBag?.current_account_ars ?? 0) - (destinationPaymentSource === "cuenta" ? totalArs : 0);
    const destinationAverage =
      destinationNextUsd > 0
        ? (destinationPreviousUsd * Number(destinationBag?.average_usd_cost ?? 0) + parsedUsd * parsedRate) / destinationNextUsd
        : 0;

    return {
      totalArs,
      originNextUsd,
      originNextCash,
      originNextAccount,
      destinationNextUsd,
      destinationNextCash,
      destinationNextAccount,
      destinationAverage
    };
  }, [destinationBag, destinationPaymentSource, originBag, originReceiveDestination, parsedRate, parsedUsd]);

  return (
    <form action={formAction} className="space-y-5">
      <input name="origin_bag_id" type="hidden" value={originBag.id} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-mediumGray">Bolsa origen</p>
          <p className="mt-2 font-heading text-xl font-black text-brandBlack">{originBag.display_label}</p>
          <div className="mt-3 grid gap-2 text-sm text-mediumGray sm:grid-cols-3">
            <p>Efectivo: <span className="font-semibold text-brandBlack">{formatArs(Number(originBag.current_cash_ars ?? 0))}</span></p>
            <p>Cuenta: <span className="font-semibold text-brandBlack">{formatArs(Number(originBag.current_account_ars ?? 0))}</span></p>
            <p>USD: <span className="font-semibold text-brandBlack">{formatUsd(Number(originBag.current_usd ?? 0))}</span></p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="destination_bag_id">
            Bolsa destino
          </label>
          <select
            className="flex min-h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-brandBlack shadow-sm"
            id="destination_bag_id"
            name="destination_bag_id"
            required
            value={destinationBagId}
            onChange={(event) => setDestinationBagId(event.target.value)}
          >
            {destinationBags.map((bag) => (
              <option key={bag.id} value={bag.id}>
                {bag.display_label} | Efectivo {formatArs(Number(bag.current_cash_ars ?? 0))} | Cuenta {formatArs(Number(bag.current_account_ars ?? 0))} | USD {formatUsd(Number(bag.current_usd ?? 0))}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="amount_usd">
            USD a vender
          </label>
          <Input id="amount_usd" name="amount_usd" required value={amountUsd} onChange={(event) => setAmountUsd(event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="internal_rate_ars">
            Cotizacion interna
          </label>
          <Input id="internal_rate_ars" name="internal_rate_ars" required value={internalRateArs} onChange={(event) => setInternalRateArs(event.target.value)} />
        </div>
        <div className="rounded-2xl border border-brandYellow/35 bg-brandYellow/15 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-mediumGray">Total a pagar</p>
          <p className="mt-2 font-heading text-2xl font-black text-brandBlack">{formatArs(preview.totalArs)}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="destination_payment_source">
            La bolsa destino paga desde
          </label>
          <select
            className="flex h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-brandBlack shadow-sm"
            id="destination_payment_source"
            name="destination_payment_source"
            value={destinationPaymentSource}
            onChange={(event) => setDestinationPaymentSource(event.target.value as "efectivo" | "cuenta")}
          >
            <option value="efectivo">efectivo</option>
            <option value="cuenta">transferencia / cuenta</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="origin_receive_destination">
            La bolsa origen recibe en
          </label>
          <select
            className="flex h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-brandBlack shadow-sm"
            id="origin_receive_destination"
            name="origin_receive_destination"
            value={originReceiveDestination}
            onChange={(event) => setOriginReceiveDestination(event.target.value as "efectivo" | "cuenta")}
          >
            <option value="efectivo">efectivo</option>
            <option value="cuenta">transferencia / cuenta</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-lightGray bg-white p-4 text-sm text-brandBlack">
          <p className="font-heading text-lg font-black">Vista previa de origen</p>
          <p className="mt-1 text-mediumGray">{originBag.display_label}</p>
          <div className="mt-4 space-y-2">
            <p>USD: {formatUsd(Number(originBag.current_usd ?? 0))} → {formatUsd(preview.originNextUsd)}</p>
            <p>Efectivo: {formatArs(Number(originBag.current_cash_ars ?? 0))} → {formatArs(preview.originNextCash)}</p>
            <p>Cuenta: {formatArs(Number(originBag.current_account_ars ?? 0))} → {formatArs(preview.originNextAccount)}</p>
            <p>Ganancia reportable: {formatArs(0)}</p>
            <p>Tipo: venta interna a otra bolsa</p>
          </div>
        </div>

        <div className="rounded-2xl border border-lightGray bg-white p-4 text-sm text-brandBlack">
          <p className="font-heading text-lg font-black">Vista previa de destino</p>
          <p className="mt-1 text-mediumGray">{destinationBag?.display_label ?? "Sin bolsa destino"}</p>
          <div className="mt-4 space-y-2">
            <p>USD: {formatUsd(Number(destinationBag?.current_usd ?? 0))} → {formatUsd(preview.destinationNextUsd)}</p>
            <p>Efectivo: {formatArs(Number(destinationBag?.current_cash_ars ?? 0))} → {formatArs(preview.destinationNextCash)}</p>
            <p>Cuenta: {formatArs(Number(destinationBag?.current_account_ars ?? 0))} → {formatArs(preview.destinationNextAccount)}</p>
            <p>Costo promedio USD nuevo: {formatArs(preview.destinationAverage)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="reason">
            Motivo
          </label>
          <Input id="reason" name="reason" required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="note">
            Nota obligatoria
          </label>
          <Input id="note" name="note" required />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button className="shadow-yellowGlow" disabled={isPending || destinationBags.length === 0} type="submit">
          {isPending ? "Guardando..." : "Confirmar venta interna"}
        </Button>
        {state.message ? <p className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{state.message}</p> : null}
      </div>
    </form>
  );
}
