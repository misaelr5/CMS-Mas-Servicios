// Logica pura de la vista de gastos: rango de fechas, filtros, totales y
// categorias. Sin infraestructura. La obtencion de datos vive detras del puerto.

import type { Branch, Expense, ExpenseStatus } from "@/lib/db/types";

export type ExpenseFilters = {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  status?: ExpenseStatus | "all";
  category?: string;
};

export type AccessContext = {
  role: "admin" | "encargado" | "cajero" | "viewer";
  userId: string;
};

export type ExpenseListRow = Expense & { branch_name: string };

export type ExpenseTotals = {
  amount_ars: number;
  pending_amount_ars: number;
  paid_amount_ars: number;
  imputed_amount_ars: number;
  count: number;
};

export type ExpensePageData = {
  date: string;
  dateFrom: string;
  dateTo: string;
  branches: Branch[];
  expenses: ExpenseListRow[];
  totals: ExpenseTotals;
  categories: string[];
  source: "database" | "seed-fallback";
};

export type ExpenseDateRange = { dateFrom: string; dateTo: string };

export function resolveDateRange(filters: ExpenseFilters, today: string): ExpenseDateRange {
  const dateFrom = filters.dateFrom ?? filters.date ?? today;
  const dateTo = filters.dateTo ?? filters.date ?? dateFrom;
  return dateFrom <= dateTo ? { dateFrom, dateTo } : { dateFrom: dateTo, dateTo: dateFrom };
}

export function sortBranches(branches: Branch[]): Branch[] {
  return [...branches].sort((left, right) => left.name.localeCompare(right.name));
}

export function buildExpenseRows(
  expenses: Expense[],
  branches: Branch[],
  visibleBranchIds: ReadonlySet<string>,
  filters: ExpenseFilters
): ExpenseListRow[] {
  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name] as const));
  return expenses
    .filter((expense) => {
      if (filters.branchId && expense.branch_id !== filters.branchId) return false;
      if (filters.status && filters.status !== "all" && expense.status !== filters.status) return false;
      if (filters.category && expense.category !== filters.category) return false;
      return visibleBranchIds.has(expense.branch_id);
    })
    .map((expense) => ({
      ...expense,
      branch_name: branchMap.get(expense.branch_id) ?? "Sin sucursal"
    }));
}

export function collectCategories(rows: ExpenseListRow[]): string[] {
  return Array.from(new Set(rows.map((expense) => expense.category))).sort((left, right) =>
    left.localeCompare(right)
  );
}

export function computeExpenseTotals(rows: ExpenseListRow[]): ExpenseTotals {
  return rows.reduce(
    (acc, expense) => {
      const amount = Number(expense.amount_ars ?? 0);
      acc.amount_ars += amount;
      acc.count += 1;
      if (expense.status === "pendiente") acc.pending_amount_ars += amount;
      if (expense.status === "pagado") acc.paid_amount_ars += amount;
      if (expense.status === "imputado") acc.imputed_amount_ars += amount;
      return acc;
    },
    { amount_ars: 0, pending_amount_ars: 0, paid_amount_ars: 0, imputed_amount_ars: 0, count: 0 }
  );
}

export function emptyExpensePage(range: ExpenseDateRange, fallbackBranches: Branch[]): ExpensePageData {
  return {
    date: range.dateFrom,
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    branches: sortBranches(fallbackBranches),
    expenses: [],
    totals: { amount_ars: 0, pending_amount_ars: 0, paid_amount_ars: 0, imputed_amount_ars: 0, count: 0 },
    categories: [],
    source: "seed-fallback"
  };
}
