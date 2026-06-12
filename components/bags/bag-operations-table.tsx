import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { BagOperation } from "@/lib/db/types";
import { formatUsd } from "@/lib/bags/bag-calculations";
import { formatArs } from "@/lib/operations/seed-data";

export function BagOperationsTable({ bagId, operations }: { bagId: string; operations: BagOperation[] }) {
  if (operations.length === 0) {
    return <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4 text-sm text-mediumGray">Sin movimientos cargados.</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-lightGray">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-lightGray text-left text-sm">
          <thead className="bg-lightGray/40 text-brandBlack">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">USD</th>
              <th className="px-4 py-3">ARS</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lightGray bg-white text-brandBlack">
            {operations.map((op) => (
              <tr key={op.id}>
                <td className="px-4 py-3">{new Date(op.created_at).toLocaleString("es-AR")}</td>
                <td className="px-4 py-3 font-semibold">{op.operation_type.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">{formatUsd(Number(op.amount_usd ?? 0))}</td>
                <td className="px-4 py-3">{formatArs(Number(op.total_ars ?? 0))}</td>
                <td className="px-4 py-3">{op.status}</td>
                <td className="px-4 py-3">
                  {op.notes ? (
                    <span>{op.notes}</span>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/bolsas/${bagId}`}>Ver detalle</Link>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
