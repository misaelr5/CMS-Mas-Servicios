"use client";

import { useActionState, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { createBagOperationAction } from "@/app/actions/bags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import type { Role } from "@/lib/auth/roles";
import type { BagOverview } from "@/lib/bags/bag-service";
import { bagOperationTypes, formatUsd } from "@/lib/bags/bag-calculations";
import { formatArs } from "@/lib/operations/seed-data";

const initialState = { ok: false, message: "" };
const simpleOperationTypes = ["compra_usd", "venta_usd"] as const;
const operationLabels: Record<string, string> = {
  compra_usd: "Comprar USD",
  venta_usd: "Vender USD",
  ingreso_pesos_efectivo: "Ingresar efectivo",
  egreso_pesos_efectivo: "Retirar efectivo",
  ingreso_pesos_cuenta: "Ingresar transferencia",
  egreso_pesos_cuenta: "Retirar transferencia",
  prestamo_entregado: "Préstamo entregado",
  prestamo_recibido: "Préstamo recibido",
  devolucion_prestamo: "Devolución de préstamo",
  ajuste_manual: "Ajuste manual",
  anulacion_operacion: "Anular operación"
};

export function BagOperationForm({
  bags,
  defaultBagId,
  lockedBagId,
  lockedBagName,
  userRole,
  submitLabel = "Guardar operación"
}: {
  bags: BagOverview[];
  defaultBagId?: string;
  lockedBagId?: string | null;
  lockedBagName?: string | null;
  userRole?: Role;
  submitLabel?: string;
}) {
  const pathname = usePathname();
  const [state, formAction, isPending] = useActionState(createBagOperationAction, initialState);
  const isLocked = Boolean(lockedBagId);
  const [bagId, setBagId] = useState(lockedBagId ?? defaultBagId ?? bags[0]?.id ?? "");
  const [operationType, setOperationType] = useState(bagOperationTypes[0]);
  const [amountUsd, setAmountUsd] = useState("");
  const [rateArs, setRateArs] = useState("");
  const [moneySource, setMoneySource] = useState<"efectivo" | "cuenta">("efectivo");
  const [moneyDestination, setMoneyDestination] = useState<"efectivo" | "cuenta">("efectivo");
  const [notes, setNotes] = useState("");
  const [confirmReview, setConfirmReview] = useState(false);
  const [cashDelta, setCashDelta] = useState("");
  const [accountDelta, setAccountDelta] = useState("");
  const [usdDelta, setUsdDelta] = useState("");
  const [borrowedDelta, setBorrowedDelta] = useState("");
  const [profitDelta, setProfitDelta] = useState("");
  const availableOperationTypes = userRole === "cajero" ? simpleOperationTypes : bagOperationTypes;

  const selectedBag = bags.find((bag) => bag.id === bagId) ?? bags[0];
  const parsedUsd = Number(amountUsd || 0);
  const parsedRate = Number(rateArs || 0);
  const parsedCashDelta = Number(cashDelta || 0);
  const parsedAccountDelta = Number(accountDelta || 0);
  const parsedUsdDelta = Number(usdDelta || 0);
  const preview = useMemo(() => {
    if (!selectedBag) return null;
    const totalArs = parsedUsd > 0 && parsedRate > 0 ? parsedUsd * parsedRate : parsedCashDelta || parsedAccountDelta || 0;
    const nextCash =
      operationType === "compra_usd"
        ? (selectedBag.current_cash_ars ?? 0) - (moneySource === "efectivo" ? totalArs : 0)
        : operationType === "venta_usd"
          ? (selectedBag.current_cash_ars ?? 0) + (moneyDestination === "efectivo" ? totalArs : 0)
          : operationType === "ingreso_pesos_efectivo"
            ? (selectedBag.current_cash_ars ?? 0) + totalArs
            : operationType === "egreso_pesos_efectivo"
              ? (selectedBag.current_cash_ars ?? 0) - totalArs
              : (selectedBag.current_cash_ars ?? 0) + parsedCashDelta;
    const nextAccount =
      operationType === "compra_usd"
        ? (selectedBag.current_account_ars ?? 0) - (moneySource === "cuenta" ? totalArs : 0)
        : operationType === "venta_usd"
          ? (selectedBag.current_account_ars ?? 0) + (moneyDestination === "cuenta" ? totalArs : 0)
          : operationType === "ingreso_pesos_cuenta"
            ? (selectedBag.current_account_ars ?? 0) + totalArs
            : operationType === "egreso_pesos_cuenta"
              ? (selectedBag.current_account_ars ?? 0) - totalArs
              : (selectedBag.current_account_ars ?? 0) + parsedAccountDelta;
    const nextUsd =
      operationType === "compra_usd"
        ? (selectedBag.current_usd ?? 0) + parsedUsd
        : operationType === "venta_usd"
          ? (selectedBag.current_usd ?? 0) - parsedUsd
          : (selectedBag.current_usd ?? 0) + parsedUsdDelta;

    return { nextCash, nextAccount, nextUsd, totalArs };
  }, [moneyDestination, moneySource, operationType, parsedAccountDelta, parsedCashDelta, parsedRate, parsedUsd, parsedUsdDelta, selectedBag]);

  return (
    <form action={formAction} className="space-y-4">
      <input name="current_path" type="hidden" value={pathname} />
      <div className="grid gap-3 md:grid-cols-2">
        <FormField label="Bolsa" htmlFor="bag_id">
          {isLocked ? (
            <>
              <input name="bag_id" type="hidden" value={bagId} />
              <div className="flex h-11 items-center rounded-md border border-border bg-lightGray/40 px-3 text-sm font-semibold text-brandBlack shadow-sm">
                {lockedBagName ?? selectedBag?.name ?? "Bolsa asignada"}
              </div>
              <p className="text-xs text-mediumGray">La bolsa queda fija para tu usuario.</p>
            </>
          ) : (
            <Select
              id="bag_id"
              name="bag_id"
              value={bagId}
              onChange={(event) => setBagId(event.target.value)}
            >
              {bags.map((bag) => (
                <option key={bag.id} value={bag.id}>
                  {bag.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Tipo de operación" htmlFor="operation_type">
          <Select
            id="operation_type"
            name="operation_type"
            value={operationType}
            onChange={(event) => setOperationType(event.target.value as typeof operationType)}
          >
            {availableOperationTypes.map((type) => (
              <option key={type} value={type}>
                {operationLabels[type] ?? type.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          {userRole === "cajero" ? <p className="text-xs text-mediumGray">Tu carga normal es comprar o vender USD sobre tu bolsa.</p> : null}
        </FormField>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="amount_usd">
            Cantidad USD
          </label>
          <Input id="amount_usd" name="amount_usd" placeholder="0" value={amountUsd} onChange={(event) => setAmountUsd(event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandBlack" htmlFor="rate_ars">
            Cotización ARS
          </label>
          <Input id="rate_ars" name="rate_ars" placeholder="0" value={rateArs} onChange={(event) => setRateArs(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FormField label="Origen" htmlFor="money_source">
          <Select
            id="money_source"
            name="money_source"
            value={moneySource}
            onChange={(event) => setMoneySource(event.target.value as "efectivo" | "cuenta")}
          >
            <option value="efectivo">Efectivo</option>
            <option value="cuenta">Cuenta</option>
          </Select>
        </FormField>
        <FormField label="Destino" htmlFor="money_destination">
          <Select
            id="money_destination"
            name="money_destination"
            value={moneyDestination}
            onChange={(event) => setMoneyDestination(event.target.value as "efectivo" | "cuenta")}
          >
            <option value="efectivo">Efectivo</option>
            <option value="cuenta">Cuenta</option>
          </Select>
        </FormField>
      </div>

      {userRole !== "cajero" ? (
        <details className="rounded-3xl border border-lightGray bg-lightGray/20 p-4">
          <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.18em] text-brandBlack">
            Opciones avanzadas
          </summary>
          <p className="mt-2 text-sm text-mediumGray">
            Usar solo para ajustes, prestamos, anulaciones o correcciones autorizadas.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brandBlack" htmlFor="cash_delta">Ajuste efectivo (ARS)</label>
              <Input id="cash_delta" name="cash_delta" placeholder="0" value={cashDelta} onChange={(event) => setCashDelta(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brandBlack" htmlFor="account_delta">Ajuste cuenta (ARS)</label>
              <Input id="account_delta" name="account_delta" placeholder="0" value={accountDelta} onChange={(event) => setAccountDelta(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brandBlack" htmlFor="usd_delta">Ajuste USD</label>
              <Input id="usd_delta" name="usd_delta" placeholder="0" value={usdDelta} onChange={(event) => setUsdDelta(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brandBlack" htmlFor="borrowed_delta">Ajuste prestado (ARS)</label>
              <Input id="borrowed_delta" name="borrowed_delta" placeholder="0" value={borrowedDelta} onChange={(event) => setBorrowedDelta(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brandBlack" htmlFor="profit_delta">Ajuste ganancia (ARS)</label>
              <Input id="profit_delta" name="profit_delta" placeholder="0" value={profitDelta} onChange={(event) => setProfitDelta(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brandBlack" htmlFor="base_limit_adjustment">Ajuste base / límite (ARS)</label>
              <Input id="base_limit_adjustment" name="base_limit_adjustment" placeholder="0" />
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-brandBlack">
            <input checked={confirmReview} name="confirm_review" type="checkbox" onChange={(event) => setConfirmReview(event.target.checked)} />
            Confirmar como revisar
          </label>
        </details>
      ) : null}

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-brandBlack" htmlFor="notes">Motivo u observación</label>
        <textarea
          className="min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-brandBlack shadow-sm"
          id="notes"
          name="notes"
          placeholder="Motivo u observacion"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="rounded-md border border-lightGray bg-lightGray/30 p-4 text-sm text-mediumGray">
        <p className="font-semibold text-brandBlack">Vista previa</p>
        {selectedBag ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <p>Saldo efectivo nuevo: {formatArs(preview?.nextCash ?? Number(selectedBag.current_cash_ars ?? 0))}</p>
            <p>Saldo cuenta nuevo: {formatArs(preview?.nextAccount ?? Number(selectedBag.current_account_ars ?? 0))}</p>
            <p>USD nuevo: {formatUsd(preview?.nextUsd ?? Number(selectedBag.current_usd ?? 0))}</p>
            <p>Movimiento ARS: {formatArs(preview?.totalArs ?? 0)}</p>
          </div>
        ) : (
          <p>Elegí una bolsa para ver el impacto.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button className="shadow-yellowGlow" disabled={isPending} type="submit">
          {isPending ? "Guardando..." : submitLabel}
        </Button>
        {state.message ? <p className={state.ok ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"}>{state.message}</p> : null}
      </div>
    </form>
  );
}
