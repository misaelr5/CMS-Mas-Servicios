// Caso de uso: armar la data de la pagina de gastos.
// Depende del puerto ExpensesRepository y de la logica pura del dominio.
// `today` y `fallbackBranches` se inyectan para no acoplar la app a infra.

import type { Branch } from "@/lib/db/types";
import {
  buildExpenseRows,
  collectCategories,
  computeExpenseTotals,
  emptyExpensePage,
  resolveDateRange,
  sortBranches,
  type AccessContext,
  type ExpenseFilters,
  type ExpensePageData
} from "../domain/expense-page";
import type { ExpensesRepository } from "../domain/expenses-repository";

type Deps = {
  today: () => string;
  fallbackBranches: Branch[];
};

export function makeGetExpensePageData(repository: ExpensesRepository, deps: Deps) {
  return async function getExpensePageData(
    filters: ExpenseFilters = {},
    auth?: AccessContext | null
  ): Promise<ExpensePageData> {
    const range = resolveDateRange(filters, deps.today());

    const data = await repository.loadForRange(range.dateFrom, range.dateTo);
    if (!data) {
      return emptyExpensePage(range, deps.fallbackBranches);
    }

    const visibleBranchIds = new Set<string>();
    if (auth?.role === "cajero") {
      const ids = await repository.branchIdsForCashier(auth.userId);
      ids.forEach((id) => visibleBranchIds.add(id));
    } else {
      data.branches.forEach((branch) => visibleBranchIds.add(branch.id));
    }

    const rows = buildExpenseRows(data.expenses, data.branches, visibleBranchIds, filters);

    return {
      date: range.dateFrom,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      branches: sortBranches(data.branches),
      expenses: rows,
      totals: computeExpenseTotals(rows),
      categories: collectCategories(rows),
      source: "database"
    };
  };
}
