import { describe, expect, it } from "vitest";

import { calculateCashDailyReportTotals } from "@/src/modules/cash-registers/domain/cash-report-rules";
import {
  calculateAverageUsdCost,
  calculateBagOperationImpact,
  calculateInternalBagTransferImpact,
  calculateUsdSaleProfit,
  validateBagOperation,
  validateSellToAnotherBag,
  type BagBalance
} from "@/src/modules/bags/domain/bag-rules";
import { calculateDailyReportTotals } from "@/src/modules/daily-reports/domain/daily-report-rules";
import { calculateWeeklyClosureTotals } from "@/src/modules/weekly-closures/domain/weekly-closure-rules";
import { isNegativeMoney, roundArs, roundRate, roundUsd } from "@/src/shared/domain/money";

const baseBagBalance: BagBalance = {
  cashArs: 0,
  accountArs: 0,
  usd: 0,
  borrowedArs: 0,
  averageUsdCost: 0,
  accumulatedProfitArs: 0,
  baseLimitArs: 0
};

describe("money helpers", () => {
  it("rounds ARS, USD and rates consistently", () => {
    expect(roundArs(0.1 + 0.2)).toBe(0.3);
    expect(roundArs(1000.005)).toBe(1000.01);
    expect(roundUsd(1.23456)).toBe(1.2346);
    expect(roundRate(1200.12345)).toBe(1200.1235);
    expect(isNegativeMoney(-0.004)).toBe(false);
    expect(isNegativeMoney(-0.01)).toBe(true);
  });
});

describe("bag calculations", () => {
  it("calculates weighted USD cost and sale profit with rounded money", () => {
    expect(calculateAverageUsdCost(1000, 10, 5, 1300)).toBe(1100);
    expect(calculateUsdSaleProfit(3, 1200.3333, 1000.1111)).toBe(600.67);
  });

  it("calculates USD purchase impact", () => {
    const impact = calculateBagOperationImpact({
      operationType: "compra_usd",
      previous: {
        ...baseBagBalance,
        cashArs: 10000,
        accountArs: 10000,
        usd: 10,
        averageUsdCost: 1000
      },
      amountUsd: 5,
      rateArs: 1300,
      moneySource: "cuenta"
    });

    expect(impact.totalArs).toBe(6500);
    expect(impact.next.accountArs).toBe(3500);
    expect(impact.next.usd).toBe(15);
    expect(impact.next.averageUsdCost).toBe(1100);
  });

  it("calculates USD sale impact and accumulated profit", () => {
    const impact = calculateBagOperationImpact({
      operationType: "venta_usd",
      previous: {
        ...baseBagBalance,
        cashArs: 100,
        usd: 10,
        averageUsdCost: 1000.1111,
        accumulatedProfitArs: 50
      },
      amountUsd: 3,
      rateArs: 1200.3333,
      moneyDestination: "efectivo"
    });

    expect(impact.totalArs).toBe(3601);
    expect(impact.profitArs).toBe(600.67);
    expect(impact.next.cashArs).toBe(3701);
    expect(impact.next.usd).toBe(7);
    expect(impact.next.accumulatedProfitArs).toBe(650.67);
  });

  it("rejects operations that leave negative balances", () => {
    const validation = validateBagOperation({
      operationType: "compra_usd",
      previous: { ...baseBagBalance, cashArs: 100 },
      amountUsd: 1,
      rateArs: 101,
      moneySource: "efectivo"
    });

    expect(validation.ok).toBe(false);
  });

  it("calculates internal bag transfers without affecting profit", () => {
    const impact = calculateInternalBagTransferImpact({
      origin: { ...baseBagBalance, usd: 10, averageUsdCost: 1000 },
      destination: { ...baseBagBalance, cashArs: 2000 },
      amountUsd: 1,
      internalRateArs: 1200,
      transferMode: "venta",
      destinationPaymentSource: "efectivo",
      originReceiveDestination: "efectivo"
    });

    expect(impact.totalArs).toBe(1200);
    expect(impact.origin.cashArs).toBe(1200);
    expect(impact.origin.usd).toBe(9);
    expect(impact.destination.cashArs).toBe(800);
    expect(impact.destination.usd).toBe(1);
    expect(impact.destination.averageUsdCost).toBe(1200);
    expect(impact.affectsProfit).toBe(false);
  });

  it("rejects internal transfers when the destination cannot pay", () => {
    const validation = validateSellToAnotherBag({
      origin: { ...baseBagBalance, usd: 10 },
      destination: { ...baseBagBalance, cashArs: 1000 },
      amountUsd: 1,
      internalRateArs: 1200,
      transferMode: "venta",
      destinationPaymentSource: "efectivo",
      originReceiveDestination: "efectivo"
    });

    expect(validation.ok).toBe(false);
  });
});

describe("report aggregations", () => {
  it("rounds daily report totals and ignores unpaid expenses", () => {
    const totals = calculateDailyReportTotals({
      cashReports: [
        { total_profit_ars: 10.105 },
        { total_profit_ars: 0.105 }
      ] as never,
      adjustments: [
        { adjustment_type: "pf_manual_positive", amount_ars: 0.105, annulled_at: null },
        { adjustment_type: "currency_manual_negative", amount_ars: 0.005, annulled_at: null }
      ] as never,
      expenses: [
        { amount_ars: 5.105, status: "pagado" },
        { amount_ars: 999, status: "pendiente" }
      ] as never,
      automaticCurrencyProfitArs: 1.005
    });

    expect(totals.automaticPfProfitArs).toBe(10.21);
    expect(totals.manualPfAdjustmentArs).toBe(0.11);
    expect(totals.automaticCurrencyProfitArs).toBe(1.01);
    expect(totals.manualCurrencyAdjustmentArs).toBe(-0.01);
    expect(totals.expensesArs).toBe(5.11);
    expect(totals.availableProfitArs).toBe(6.21);
  });

  it("rounds cash register daily totals", () => {
    const totals = calculateCashDailyReportTotals([
      { operated_amount_ars: 0.1, profit_amount_ars: 0.2 },
      { operated_amount_ars: 0.2, profit_amount_ars: 0.1 }
    ] as never);

    expect(totals.operated).toBe(0.3);
    expect(totals.profit).toBe(0.3);
  });

  it("rounds weekly closure totals", () => {
    const totals = calculateWeeklyClosureTotals([
      { totalOperatedArs: 0.1, totalProfitArs: 0.2, loadedDaysCount: 1, pendingDaysCount: 0, reviewedDaysCount: 1 },
      { totalOperatedArs: 0.2, totalProfitArs: 0.1, loadedDaysCount: 1, pendingDaysCount: 1, reviewedDaysCount: 0 }
    ]);

    expect(totals.totalOperatedArs).toBe(0.3);
    expect(totals.totalProfitArs).toBe(0.3);
    expect(totals.loadedDaysCount).toBe(2);
    expect(totals.pendingDaysCount).toBe(1);
    expect(totals.reviewedDaysCount).toBe(1);
  });
});
