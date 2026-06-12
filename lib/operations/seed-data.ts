import type { Bag, Branch, CashRegister } from "@/lib/db/types";

export const seedBranches: Branch[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Centro",
    slug: "centro",
    status: "active"
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    name: "Terminal",
    slug: "terminal",
    status: "active"
  }
];

export const seedCashRegisters: CashRegister[] = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    branch_id: seedBranches[0].id,
    branch_name: "Centro",
    name: "Lourdes",
    slug: "lourdes-centro",
    status: "active"
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    branch_id: seedBranches[0].id,
    branch_name: "Centro",
    name: "Vicky",
    slug: "vicky-centro",
    status: "active"
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    branch_id: seedBranches[0].id,
    branch_name: "Centro",
    name: "Antonella manana",
    slug: "antonella-manana-centro",
    status: "active"
  },
  {
    id: "00000000-0000-4000-8000-000000000204",
    branch_id: seedBranches[1].id,
    branch_name: "Terminal",
    name: "Roman",
    slug: "roman-terminal",
    status: "active"
  },
  {
    id: "00000000-0000-4000-8000-000000000205",
    branch_id: seedBranches[1].id,
    branch_name: "Terminal",
    name: "Anto tarde",
    slug: "anto-tarde-terminal",
    status: "active"
  }
];

export function getDefaultBagOpeningBalances(baseLimitArs: number) {
  if (baseLimitArs === 5000000) {
    return {
      current_cash_ars: 4700000,
      current_account_ars: 300000
    };
  }

  return {
    current_cash_ars: 1700000,
    current_account_ars: 300000
  };
}

const bagOpening2000000 = getDefaultBagOpeningBalances(2000000);
const bagOpening5000000 = getDefaultBagOpeningBalances(5000000);

export const seedBags: Bag[] = [
  {
    id: "00000000-0000-4000-8000-000000000301",
    name: "Bolsa 1",
    slug: "bolsa-1",
    base_limit_ars: 2000000,
    current_cash_ars: bagOpening2000000.current_cash_ars,
    current_account_ars: bagOpening2000000.current_account_ars,
    current_usd: 0,
    borrowed_ars: 0,
    average_usd_cost: 0,
    accumulated_profit_ars: 0,
    status: "ok"
  },
  {
    id: "00000000-0000-4000-8000-000000000302",
    name: "Bolsa 2",
    slug: "bolsa-2",
    base_limit_ars: 2000000,
    current_cash_ars: bagOpening2000000.current_cash_ars,
    current_account_ars: bagOpening2000000.current_account_ars,
    current_usd: 0,
    borrowed_ars: 0,
    average_usd_cost: 0,
    accumulated_profit_ars: 0,
    status: "ok"
  },
  {
    id: "00000000-0000-4000-8000-000000000303",
    name: "Bolsa 3",
    slug: "bolsa-3",
    base_limit_ars: 2000000,
    current_cash_ars: bagOpening2000000.current_cash_ars,
    current_account_ars: bagOpening2000000.current_account_ars,
    current_usd: 0,
    borrowed_ars: 0,
    average_usd_cost: 0,
    accumulated_profit_ars: 0,
    status: "ok"
  },
  {
    id: "00000000-0000-4000-8000-000000000304",
    name: "Bolsa 4",
    slug: "bolsa-4",
    base_limit_ars: 2000000,
    current_cash_ars: bagOpening2000000.current_cash_ars,
    current_account_ars: bagOpening2000000.current_account_ars,
    current_usd: 0,
    borrowed_ars: 0,
    average_usd_cost: 0,
    accumulated_profit_ars: 0,
    status: "ok"
  },
  {
    id: "00000000-0000-4000-8000-000000000305",
    name: "Bolsa 5",
    slug: "bolsa-5",
    base_limit_ars: 5000000,
    current_cash_ars: bagOpening5000000.current_cash_ars,
    current_account_ars: bagOpening5000000.current_account_ars,
    current_usd: 0,
    borrowed_ars: 0,
    average_usd_cost: 0,
    accumulated_profit_ars: 0,
    status: "ok"
  }
];

export function formatArs(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(amount);
}
