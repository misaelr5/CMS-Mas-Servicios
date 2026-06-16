import type { Bag, BagOperationType } from "@/lib/db/types";
import {
  calculateAverageUsdCost,
  calculateBagOperationImpact,
  calculateInternalBagTransferImpact,
  calculateUsdSaleProfit,
  validateBagOperation,
  validateSellToAnotherBag
} from "@/src/modules/bags/domain/bag-rules";

export const bagOperationTypes: BagOperationType[] = [
  "compra_usd",
  "venta_usd",
  "ingreso_pesos_efectivo",
  "egreso_pesos_efectivo",
  "ingreso_pesos_cuenta",
  "egreso_pesos_cuenta",
  "prestamo_entregado",
  "prestamo_recibido",
  "devolucion_prestamo",
  "ajuste_manual",
  "anulacion_operacion"
];

export function normalizeMoneyLocation(value: FormDataEntryValue | null) {
  if (value === "efectivo" || value === "cuenta") return value;
  return null;
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function computeAverageUsdCost(currentAverage: number, currentUsd: number, acquiredUsd: number, rate: number) {
  return calculateAverageUsdCost(currentAverage, currentUsd, acquiredUsd, rate);
}

export function estimateTotal(bag: Pick<Bag, "current_cash_ars" | "current_account_ars" | "current_usd" | "borrowed_ars">, referenceRate?: number | null) {
  const rate = referenceRate && referenceRate > 0 ? referenceRate : 0;
  return (bag.current_cash_ars ?? 0) + (bag.current_account_ars ?? 0) + (bag.current_usd ?? 0) * rate - (bag.borrowed_ars ?? 0);
}

export function bagStatusFromDifference(difference: number, hasReferenceRate: boolean) {
  if (!hasReferenceRate) return "revisar";
  if (difference === 0) return "ok";
  if (Math.abs(difference) <= 5000) return "revisar";
  return "diferencia";
}

export function moneyLocationLabel(location: "efectivo" | "cuenta" | null) {
  if (location === "efectivo") return "Efectivo";
  if (location === "cuenta") return "Cuenta";
  return "N/A";
}

export {
  calculateAverageUsdCost,
  calculateBagOperationImpact,
  calculateInternalBagTransferImpact,
  calculateUsdSaleProfit,
  validateBagOperation,
  validateSellToAnotherBag
};
