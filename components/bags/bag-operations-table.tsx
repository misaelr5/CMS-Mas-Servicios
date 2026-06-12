import { annulInternalBagTransferFormAction } from "@/app/actions/bags";
import type { BagOperation } from "@/lib/db/types";
import { formatUsd } from "@/lib/bags/bag-calculations";
import { formatArs } from "@/lib/operations/seed-data";

const operationLabels: Record<string, string> = {
  compra_usd: "Compra USD",
  venta_usd: "Venta USD",
  venta_interna_bolsa: "Venta interna a otra bolsa",
  compra_interna_bolsa: "Compra interna desde otra bolsa",
  ingreso_pesos_efectivo: "Ingreso efectivo",
  egreso_pesos_efectivo: "Egreso efectivo",
  ingreso_pesos_cuenta: "Ingreso cuenta",
  egreso_pesos_cuenta: "Egreso cuenta",
  prestamo_entregado: "Prestamo entregado",
  prestamo_recibido: "Prestamo recibido",
  devolucion_prestamo: "Devolucion prestamo",
  ajuste_manual: "Ajuste manual",
  anulacion_operacion: "Anulacion"
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
    return operation.money_destination === "cuenta" ? "Origen recibe en cuenta" : "Origen recibe en efectivo";
  }

  if (operation.operation_type === "compra_interna_bolsa") {
    return operation.money_source === "cuenta" ? "Destino paga desde cuenta" : "Destino paga desde efectivo";
  }

  if (operation.operation_type === "compra_usd") {
    return operation.money_source === "cuenta" ? "Sale de cuenta" : "Sale de efectivo";
  }

  if (operation.operation_type === "venta_usd") {
    return operation.money_destination === "cuenta" ? "Entra a cuenta" : "Entra a efectivo";
  }

  return "Movimiento interno";
}

function statusTone(status: BagOperation["status"]) {
  if (status === "confirmada") return "bg-success/10 text-success";
  if (status === "revisar") return "bg-warning/15 text-warning";
  return "bg-danger/10 text-danger";
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
      <input className="h-9 rounded-md border border-border bg-white px-3 text-xs text-brandBlack" name="reason" placeholder="Motivo de anulacion" required />
      <input className="h-9 rounded-md border border-border bg-white px-3 text-xs text-brandBlack" name="note" placeholder="Nota obligatoria" required />
      <button className="rounded-lg bg-danger px-3 py-2 text-xs font-bold text-white" type="submit">
        Anular venta interna
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
    return <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4 text-sm text-mediumGray">Sin historial cargado para esta bolsa.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:hidden">
        {operations.map((op) => (
          <article key={op.id} className="rounded-2xl border border-lightGray bg-white p-4 text-sm text-brandBlack shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-heading text-base font-black">{operationLabel(op)}</p>
                <p className="mt-1 text-xs text-mediumGray">{new Date(op.created_at).toLocaleString("es-AR")}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${statusTone(op.status)}`}>
                {op.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-lightGray/35 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-mediumGray">Movimiento</p>
                <p className="mt-1 font-semibold">{formatArs(Number(op.total_ars ?? 0))}</p>
                <p className="text-mediumGray">{formatUsd(Number(op.amount_usd ?? 0))} USD a {formatArs(Number(op.rate_ars ?? 0))}</p>
              </div>
              <div className="rounded-xl bg-lightGray/35 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-mediumGray">Flujo</p>
                <p className="mt-1 font-semibold">{moneyFlow(op)}</p>
                <p className="text-mediumGray">Ganancia: {formatArs(Number(op.profit_ars ?? 0))}</p>
              </div>
              <div className="rounded-xl bg-lightGray/35 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-mediumGray">Antes</p>
                <p className="mt-1">Efectivo: {formatArs(Number(op.previous_cash_ars ?? 0))}</p>
                <p>Cuenta: {formatArs(Number(op.previous_account_ars ?? 0))}</p>
                <p>USD: {formatUsd(Number(op.previous_usd ?? 0))}</p>
              </div>
              <div className="rounded-xl bg-lightGray/35 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-mediumGray">Despues</p>
                <p className="mt-1">Efectivo: {formatArs(Number(op.new_cash_ars ?? 0))}</p>
                <p>Cuenta: {formatArs(Number(op.new_account_ars ?? 0))}</p>
                <p>USD: {formatUsd(Number(op.new_usd ?? 0))}</p>
              </div>
            </div>

            {op.notes ? <p className="mt-3 rounded-xl bg-brandYellow/15 p-3 text-sm text-brandBlack">Nota: {op.notes}</p> : null}
            {canAnnulInternalTransfer(op, canManageInternalTransfers) ? <AnnulInternalTransferForm operation={op} /> : null}
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-lightGray lg:block">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-lightGray text-left text-sm">
          <thead className="bg-lightGray/40 text-brandBlack">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Flujo</th>
              <th className="px-4 py-3">USD</th>
              <th className="px-4 py-3">ARS</th>
              <th className="px-4 py-3">Saldo anterior</th>
              <th className="px-4 py-3">Saldo nuevo</th>
              <th className="px-4 py-3">Ganancia</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Nota</th>
              {canManageInternalTransfers ? <th className="px-4 py-3">Acciones</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-lightGray bg-white text-brandBlack">
            {operations.map((op) => (
              <tr key={op.id}>
                <td className="px-4 py-3">{new Date(op.created_at).toLocaleString("es-AR")}</td>
                <td className="px-4 py-3 font-semibold">{operationLabel(op)}</td>
                <td className="px-4 py-3">{moneyFlow(op)}</td>
                <td className="px-4 py-3">{formatUsd(Number(op.amount_usd ?? 0))}</td>
                <td className="px-4 py-3">{formatArs(Number(op.total_ars ?? 0))}</td>
                <td className="px-4 py-3 text-xs text-mediumGray">
                  <p>Efectivo: {formatArs(Number(op.previous_cash_ars ?? 0))}</p>
                  <p>Cuenta: {formatArs(Number(op.previous_account_ars ?? 0))}</p>
                  <p>USD: {formatUsd(Number(op.previous_usd ?? 0))}</p>
                </td>
                <td className="px-4 py-3 text-xs text-mediumGray">
                  <p>Efectivo: {formatArs(Number(op.new_cash_ars ?? 0))}</p>
                  <p>Cuenta: {formatArs(Number(op.new_account_ars ?? 0))}</p>
                  <p>USD: {formatUsd(Number(op.new_usd ?? 0))}</p>
                </td>
                <td className="px-4 py-3">{formatArs(Number(op.profit_ars ?? 0))}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${statusTone(op.status)}`}>
                    {op.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {op.notes ? <span>{op.notes}</span> : <span className="text-mediumGray">Sin nota</span>}
                </td>
                {canManageInternalTransfers ? (
                  <td className="px-4 py-3">
                    {canAnnulInternalTransfer(op, canManageInternalTransfers) ? <AnnulInternalTransferForm operation={op} /> : <span className="text-xs text-mediumGray">Sin acciones</span>}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
