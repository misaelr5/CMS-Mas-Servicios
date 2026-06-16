import { ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react";

import { annulInternalBagTransferFormAction } from "@/app/actions/bags";
import { Badge } from "@/components/ui/badge";
import type { BagOperation } from "@/lib/db/types";
import { formatUsd } from "@/lib/bags/bag-calculations";
import { formatArs } from "@/lib/operations/seed-data";
import { cn } from "@/lib/utils";

const operationLabels: Record<string, string> = {
  compra_usd: "Compra USD",
  venta_usd: "Venta USD",
  venta_interna_bolsa: "Venta interna a otra bolsa",
  compra_interna_bolsa: "Compra interna desde otra bolsa",
  ingreso_pesos_efectivo: "Ingreso efectivo",
  egreso_pesos_efectivo: "Egreso efectivo",
  ingreso_pesos_cuenta: "Ingreso cuenta",
  egreso_pesos_cuenta: "Egreso cuenta",
  prestamo_entregado: "Préstamo entregado",
  prestamo_recibido: "Préstamo recibido",
  devolucion_prestamo: "Devolución préstamo",
  ajuste_manual: "Ajuste manual",
  anulacion_operacion: "Anulación"
};

function operationLabel(operation: BagOperation) {
  if (operation.operation_type === "venta_interna_bolsa" && operation.notes) {
    return operation.notes.split(".")[0] ?? "Venta interna a otra bolsa";
  }

  if (operation.operation_type === "compra_interna_bolsa" && operation.notes) {
    return operation.notes.split(".")[0] ?? "Compra interna desde otra bolsa";
  }

  return operationLabels[operation.operation_type] ?? operation.operation_type.replaceAll("_", " ");
}

function moneyFlow(operation: BagOperation) {
  if (operation.operation_type === "venta_interna_bolsa") {
    return operation.notes?.split(".")[0] ?? (operation.money_destination === "cuenta" ? "Origen recibe en cuenta" : "Origen recibe en efectivo");
  }

  if (operation.operation_type === "compra_interna_bolsa") {
    return operation.notes?.split(".")[0] ?? (operation.money_source === "cuenta" ? "Origen paga desde cuenta" : "Origen paga desde efectivo");
  }

  if (operation.operation_type === "compra_usd") {
    return operation.money_source === "cuenta" ? "Sale de cuenta" : "Sale de efectivo";
  }

  if (operation.operation_type === "venta_usd") {
    return operation.money_destination === "cuenta" ? "Entra a cuenta" : "Entra a efectivo";
  }

  return "Movimiento interno";
}

type FlowDirection = "in" | "out" | "neutral";

function flowDirection(text: string): FlowDirection {
  const lower = text.toLowerCase();
  if (lower.includes("entra") || lower.includes("ingreso") || lower.includes("recibe")) return "in";
  if (lower.includes("sale") || lower.includes("egreso") || lower.includes("paga")) return "out";
  return "neutral";
}

function FlowCell({ text }: { text: string }) {
  const dir = flowDirection(text);
  const Icon = dir === "in" ? ArrowDownLeft : dir === "out" ? ArrowUpRight : RefreshCw;
  const tone =
    dir === "in" ? "text-success" : dir === "out" ? "text-danger" : "text-mediumGray";

  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", tone)} />
      <span className="text-brandBlack">{text}</span>
    </span>
  );
}

const statusConfig: Record<
  string,
  { variant: "success" | "warning" | "danger" | "neutral"; label: string }
> = {
  confirmada: { variant: "success", label: "Confirmada" },
  revisar: { variant: "warning", label: "Revisar" },
  anulada: { variant: "danger", label: "Anulada" }
};

function StatusPill({ status }: { status: BagOperation["status"] }) {
  const config = statusConfig[status] ?? { variant: "neutral" as const, label: status };
  return (
    <Badge variant={config.variant} dot className="text-[10px] uppercase tracking-[0.14em]">
      {config.label}
    </Badge>
  );
}

function BalanceCell({
  cash,
  account,
  usd
}: {
  cash: number;
  account: number;
  usd: number;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      <span className="text-mediumGray">Efvo</span>
      <span className="text-right font-medium tabular-nums text-brandBlack">{formatArs(cash)}</span>
      <span className="text-mediumGray">Cta</span>
      <span className="text-right font-medium tabular-nums text-brandBlack">{formatArs(account)}</span>
      <span className="text-mediumGray">USD</span>
      <span className="text-right font-medium tabular-nums text-brandBlack">{formatUsd(usd)}</span>
    </div>
  );
}

function GananciaValue({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-mediumGray"
      )}
    >
      {formatArs(value)}
    </span>
  );
}

function canAnnulInternalTransfer(operation: BagOperation, canManageInternalTransfers: boolean) {
  return (
    canManageInternalTransfers &&
    operation.status === "confirmada" &&
    Boolean(operation.internal_transfer_id) &&
    (operation.operation_type === "venta_interna_bolsa" || operation.operation_type === "compra_interna_bolsa")
  );
}

function AnnulInternalTransferForm({ operation }: { operation: BagOperation }) {
  if (!operation.internal_transfer_id) return null;

  return (
    <form action={annulInternalBagTransferFormAction} className="mt-3 grid gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3">
      <input name="internal_transfer_id" type="hidden" value={operation.internal_transfer_id} />
      <input className="h-9 rounded-md border border-border bg-white px-3 text-xs text-brandBlack focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="reason" placeholder="Motivo de anulación" required />
      <input className="h-9 rounded-md border border-border bg-white px-3 text-xs text-brandBlack focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" name="note" placeholder="Nota obligatoria" required />
      <button className="rounded-lg bg-danger px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90" type="submit">
        Anular movimiento interno
      </button>
    </form>
  );
}

export function BagOperationsTable({
  operations,
  canManageInternalTransfers = false
}: {
  bagId: string;
  operations: BagOperation[];
  canManageInternalTransfers?: boolean;
}) {
  if (operations.length === 0) {
    return <div className="rounded-md border border-lightGray bg-lightGray/30 p-4 text-sm text-mediumGray">Sin historial cargado para esta bolsa.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Mobile: cards */}
      <div className="grid gap-3 lg:hidden">
        {operations.map((op) => {
          const flow = moneyFlow(op);
          return (
            <article key={op.id} className="rounded-lg border border-lightGray bg-white p-4 text-sm text-brandBlack shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-base font-black">{operationLabel(op)}</p>
                  <p className="mt-1 text-xs text-mediumGray">{new Date(op.created_at).toLocaleString("es-AR")}</p>
                </div>
                <StatusPill status={op.status} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-lightGray/35 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-mediumGray">Movimiento</p>
                  <p className="mt-1 font-semibold tabular-nums">{formatArs(Number(op.total_ars ?? 0))}</p>
                  <p className="text-mediumGray">{formatUsd(Number(op.amount_usd ?? 0))} USD a {formatArs(Number(op.rate_ars ?? 0))}</p>
                </div>
                <div className="rounded-md bg-lightGray/35 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-mediumGray">Flujo</p>
                  <p className="mt-1 font-semibold"><FlowCell text={flow} /></p>
                  <p className="mt-1 text-mediumGray">Ganancia: <GananciaValue value={Number(op.profit_ars ?? 0)} /></p>
                </div>
                <div className="rounded-md bg-lightGray/35 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-mediumGray">Saldo anterior</p>
                  <div className="mt-1">
                    <BalanceCell
                      cash={Number(op.previous_cash_ars ?? 0)}
                      account={Number(op.previous_account_ars ?? 0)}
                      usd={Number(op.previous_usd ?? 0)}
                    />
                  </div>
                </div>
                <div className="rounded-md bg-lightGray/35 p-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-mediumGray">Saldo nuevo</p>
                  <div className="mt-1">
                    <BalanceCell
                      cash={Number(op.new_cash_ars ?? 0)}
                      account={Number(op.new_account_ars ?? 0)}
                      usd={Number(op.new_usd ?? 0)}
                    />
                  </div>
                </div>
              </div>

              {op.notes ? <p className="mt-3 rounded-md bg-brandYellow/15 p-3 text-sm text-brandBlack">Nota: {op.notes}</p> : null}
              {canAnnulInternalTransfer(op, canManageInternalTransfers) ? <AnnulInternalTransferForm operation={op} /> : null}
            </article>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-lg border border-lightGray lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-lightGray bg-lightGray/50 text-[11px] uppercase tracking-[0.12em] text-mediumGray">
                <th className="px-4 py-3.5 font-bold">Fecha</th>
                <th className="px-4 py-3.5 font-bold">Tipo</th>
                <th className="px-4 py-3.5 font-bold">Flujo</th>
                <th className="px-4 py-3.5 text-right font-bold">USD</th>
                <th className="px-4 py-3.5 text-right font-bold">ARS</th>
                <th className="px-4 py-3.5 font-bold">Saldo anterior</th>
                <th className="px-4 py-3.5 font-bold">Saldo nuevo</th>
                <th className="px-4 py-3.5 text-right font-bold">Ganancia</th>
                <th className="px-4 py-3.5 font-bold">Estado</th>
                <th className="px-4 py-3.5 font-bold">Nota</th>
                {canManageInternalTransfers ? <th className="px-4 py-3.5 font-bold">Acciones</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-lightGray bg-white text-brandBlack">
              {operations.map((op) => {
                const created = new Date(op.created_at);
                const flow = moneyFlow(op);
                return (
                  <tr key={op.id} className="transition-colors hover:bg-brandYellow/5">
                    <td className="whitespace-nowrap px-4 py-3.5 align-top">
                      <p className="font-semibold text-brandBlack">{created.toLocaleDateString("es-AR")}</p>
                      <p className="text-xs text-mediumGray">{created.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </td>
                    <td className="px-4 py-3.5 align-top font-semibold">{operationLabel(op)}</td>
                    <td className="px-4 py-3.5 align-top"><FlowCell text={flow} /></td>
                    <td className="px-4 py-3.5 text-right align-top tabular-nums">{formatUsd(Number(op.amount_usd ?? 0))}</td>
                    <td className="px-4 py-3.5 text-right align-top font-semibold tabular-nums">{formatArs(Number(op.total_ars ?? 0))}</td>
                    <td className="px-4 py-3.5 align-top">
                      <BalanceCell
                        cash={Number(op.previous_cash_ars ?? 0)}
                        account={Number(op.previous_account_ars ?? 0)}
                        usd={Number(op.previous_usd ?? 0)}
                      />
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <BalanceCell
                        cash={Number(op.new_cash_ars ?? 0)}
                        account={Number(op.new_account_ars ?? 0)}
                        usd={Number(op.new_usd ?? 0)}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-right align-top"><GananciaValue value={Number(op.profit_ars ?? 0)} /></td>
                    <td className="px-4 py-3.5 align-top"><StatusPill status={op.status} /></td>
                    <td className="max-w-[200px] px-4 py-3.5 align-top">
                      {op.notes ? <span className="text-brandBlack">{op.notes}</span> : <span className="text-mediumGray/70">Sin nota</span>}
                    </td>
                    {canManageInternalTransfers ? (
                      <td className="px-4 py-3.5 align-top">
                        {canAnnulInternalTransfer(op, canManageInternalTransfers) ? <AnnulInternalTransferForm operation={op} /> : <span className="text-xs text-mediumGray/70">Sin acciones</span>}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
