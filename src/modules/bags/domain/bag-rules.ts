export type MoneyLocation = "efectivo" | "cuenta";

export type BagBalance = {
  cashArs: number;
  accountArs: number;
  usd: number;
  borrowedArs: number;
  averageUsdCost: number;
  accumulatedProfitArs: number;
  baseLimitArs: number;
};

export type BagOperationKind =
  | "compra_usd"
  | "venta_usd"
  | "ingreso_pesos_efectivo"
  | "egreso_pesos_efectivo"
  | "ingreso_pesos_cuenta"
  | "egreso_pesos_cuenta"
  | "prestamo_entregado"
  | "prestamo_recibido"
  | "devolucion_prestamo"
  | "ajuste_manual"
  | "anulacion_operacion";

export type BagOperationImpactInput = {
  operationType: BagOperationKind;
  previous: BagBalance;
  amountUsd?: number;
  rateArs?: number;
  moneySource?: MoneyLocation | null;
  moneyDestination?: MoneyLocation | null;
  cashDelta?: number;
  accountDelta?: number;
  usdDelta?: number;
  borrowedDelta?: number;
  profitDelta?: number;
  baseLimitAdjustment?: number;
};

export type BagOperationImpact = {
  next: BagBalance;
  totalArs: number;
  profitArs: number;
};

function finiteNumber(value: number | undefined | null) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function calculateAverageUsdCost(currentAverage: number, currentUsd: number, acquiredUsd: number, rate: number) {
  const totalUsd = currentUsd + acquiredUsd;
  if (totalUsd <= 0) return 0;
  return (currentAverage * currentUsd + rate * acquiredUsd) / totalUsd;
}

export function calculateUsdSaleProfit(amountUsd: number, saleRateArs: number, averageUsdCost: number) {
  return (saleRateArs - averageUsdCost) * amountUsd;
}

export function calculateBagOperationImpact(input: BagOperationImpactInput): BagOperationImpact {
  const amountUsd = finiteNumber(input.amountUsd);
  const rateArs = finiteNumber(input.rateArs);
  const cashDelta = finiteNumber(input.cashDelta);
  const accountDelta = finiteNumber(input.accountDelta);
  const usdDelta = finiteNumber(input.usdDelta);
  const borrowedDelta = finiteNumber(input.borrowedDelta);
  const profitDelta = finiteNumber(input.profitDelta);
  const baseLimitAdjustment = finiteNumber(input.baseLimitAdjustment);
  const previous = input.previous;
  const next: BagBalance = { ...previous };
  let totalArs = amountUsd * rateArs;
  let profitArs = profitDelta;

  switch (input.operationType) {
    case "compra_usd": {
      if (input.moneySource === "efectivo") next.cashArs -= totalArs;
      if (input.moneySource === "cuenta") next.accountArs -= totalArs;
      next.averageUsdCost = calculateAverageUsdCost(previous.averageUsdCost, previous.usd, amountUsd, rateArs);
      next.usd += amountUsd;
      profitArs = 0;
      break;
    }
    case "venta_usd": {
      if (input.moneyDestination === "efectivo") next.cashArs += totalArs;
      if (input.moneyDestination === "cuenta") next.accountArs += totalArs;
      next.usd -= amountUsd;
      profitArs = calculateUsdSaleProfit(amountUsd, rateArs, previous.averageUsdCost);
      next.accumulatedProfitArs += profitArs;
      if (next.usd <= 0) next.averageUsdCost = 0;
      break;
    }
    case "ingreso_pesos_efectivo":
      next.cashArs += totalArs || cashDelta;
      break;
    case "egreso_pesos_efectivo":
      next.cashArs -= totalArs || cashDelta;
      break;
    case "ingreso_pesos_cuenta":
      next.accountArs += totalArs || accountDelta;
      break;
    case "egreso_pesos_cuenta":
      next.accountArs -= totalArs || accountDelta;
      break;
    case "prestamo_entregado":
      next.cashArs -= totalArs || cashDelta;
      next.borrowedArs += totalArs || cashDelta;
      break;
    case "prestamo_recibido":
      next.cashArs += totalArs || cashDelta;
      next.borrowedArs -= totalArs || cashDelta;
      break;
    case "devolucion_prestamo":
      next.cashArs += cashDelta;
      next.borrowedArs -= borrowedDelta || cashDelta;
      break;
    case "ajuste_manual":
      next.cashArs += cashDelta;
      next.accountArs += accountDelta;
      next.usd += usdDelta;
      next.borrowedArs += borrowedDelta;
      next.accumulatedProfitArs += profitDelta;
      next.baseLimitArs += baseLimitAdjustment;
      break;
    case "anulacion_operacion":
      break;
  }

  return { next, totalArs, profitArs };
}

export function validateBagOperation(input: BagOperationImpactInput) {
  const amountUsd = finiteNumber(input.amountUsd);
  const rateArs = finiteNumber(input.rateArs);

  if ((input.operationType === "compra_usd" || input.operationType === "venta_usd") && (amountUsd <= 0 || rateArs <= 0)) {
    return { ok: false as const, message: "USD y cotizacion deben ser mayores a 0." };
  }

  if (input.operationType === "compra_usd" && !input.moneySource) {
    return { ok: false as const, message: "Elegi desde donde sale el dinero." };
  }

  if (input.operationType === "venta_usd" && !input.moneyDestination) {
    return { ok: false as const, message: "Elegi donde ingresan los pesos." };
  }

  if (input.operationType === "venta_usd" && amountUsd > input.previous.usd) {
    return { ok: false as const, message: "No hay USD suficientes para vender." };
  }

  const impact = calculateBagOperationImpact(input);
  if (impact.next.cashArs < 0 || impact.next.accountArs < 0 || impact.next.usd < 0 || impact.next.borrowedArs < 0) {
    return { ok: false as const, message: "La operacion dejaria saldos negativos." };
  }

  return { ok: true as const, impact };
}

export type InternalBagTransferInput = {
  origin: BagBalance;
  destination: BagBalance;
  amountUsd: number;
  internalRateArs: number;
  transferMode: "venta" | "compra";
  destinationPaymentSource: MoneyLocation;
  originReceiveDestination: MoneyLocation;
};

export function calculateInternalBagTransferImpact(input: InternalBagTransferInput) {
  const totalArs = input.amountUsd * input.internalRateArs;
  const origin = { ...input.origin };
  const destination = { ...input.destination };

  if (input.transferMode === "venta") {
    origin.usd -= input.amountUsd;
    destination.usd += input.amountUsd;
    if (input.originReceiveDestination === "efectivo") origin.cashArs += totalArs;
    if (input.originReceiveDestination === "cuenta") origin.accountArs += totalArs;
    if (input.destinationPaymentSource === "efectivo") destination.cashArs -= totalArs;
    if (input.destinationPaymentSource === "cuenta") destination.accountArs -= totalArs;
    destination.averageUsdCost = calculateAverageUsdCost(input.destination.averageUsdCost, input.destination.usd, input.amountUsd, input.internalRateArs);
    if (origin.usd <= 0) origin.averageUsdCost = 0;
  } else {
    origin.usd += input.amountUsd;
    destination.usd -= input.amountUsd;
    if (input.originReceiveDestination === "efectivo") origin.cashArs -= totalArs;
    if (input.originReceiveDestination === "cuenta") origin.accountArs -= totalArs;
    if (input.destinationPaymentSource === "efectivo") destination.cashArs += totalArs;
    if (input.destinationPaymentSource === "cuenta") destination.accountArs += totalArs;
    origin.averageUsdCost = calculateAverageUsdCost(input.origin.averageUsdCost, input.origin.usd, input.amountUsd, input.internalRateArs);
    if (destination.usd <= 0) destination.averageUsdCost = 0;
  }

  return { origin, destination, totalArs, isInternal: true, affectsProfit: false };
}

export function validateSellToAnotherBag(input: InternalBagTransferInput) {
  if (input.amountUsd <= 0) return { ok: false as const, message: "USD debe ser mayor a 0." };
  if (input.internalRateArs <= 0) return { ok: false as const, message: "Cotizacion interna debe ser mayor a 0." };

  if (input.transferMode === "venta") {
    if (input.origin.usd < input.amountUsd) return { ok: false as const, message: "No hay USD suficientes en la bolsa origen." };
    const destinationBalance = input.destinationPaymentSource === "efectivo" ? input.destination.cashArs : input.destination.accountArs;
    if (destinationBalance < input.amountUsd * input.internalRateArs) {
      return { ok: false as const, message: "La bolsa destino no tiene pesos suficientes." };
    }
  } else {
    if (input.destination.usd < input.amountUsd) return { ok: false as const, message: "No hay USD suficientes en la bolsa destino." };
    const originBalance = input.originReceiveDestination === "efectivo" ? input.origin.cashArs : input.origin.accountArs;
    if (originBalance < input.amountUsd * input.internalRateArs) {
      return { ok: false as const, message: "La bolsa origen no tiene pesos suficientes." };
    }
  }

  const impact = calculateInternalBagTransferImpact(input);
  if (
    impact.origin.cashArs < 0 ||
    impact.origin.accountArs < 0 ||
    impact.origin.usd < 0 ||
    impact.destination.cashArs < 0 ||
    impact.destination.accountArs < 0 ||
    impact.destination.usd < 0
  ) {
    return { ok: false as const, message: "El movimiento dejaria saldos negativos." };
  }

  return { ok: true as const, impact };
}
