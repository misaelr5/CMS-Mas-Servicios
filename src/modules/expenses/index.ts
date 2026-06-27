// Composition root del modulo expenses: cablea el adapter Supabase + las deps
// de infraestructura (fecha de hoy y sucursales seed de fallback) con el caso
// de uso. Unico punto que conoce la implementacion concreta.

import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import { seedBranches } from "@/lib/operations/seed-data";
import { makeGetExpensePageData } from "./application/get-expense-page-data";
import { SupabaseExpensesRepository } from "./infrastructure/supabase-expenses-repository";

const expensesRepository = new SupabaseExpensesRepository();

export const getExpensePageData = makeGetExpensePageData(expensesRepository, {
  today: getBuenosAiresDateString,
  fallbackBranches: seedBranches
});

export { makeGetExpensePageData } from "./application/get-expense-page-data";
export type {
  ExpensePageData,
  ExpenseListRow,
  ExpenseTotals,
  ExpenseFilters,
  AccessContext
} from "./domain/expense-page";
export type { ExpensesRepository } from "./domain/expenses-repository";
