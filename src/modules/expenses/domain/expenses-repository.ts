// Puerto (driven port) de lectura de gastos. El dominio declara que necesita
// cargar gastos+sucursales de un rango y las sucursales visibles de un cajero;
// la infraestructura decide el como (Supabase).

import type { Branch, Expense } from "@/lib/db/types";

export type ExpensesData = {
  branches: Branch[];
  expenses: Expense[];
};

export interface ExpensesRepository {
  // Devuelve null cuando la infraestructura no esta disponible o falla la query
  // (la aplicacion cae a la vista de fallback con datos seed).
  loadForRange(dateFrom: string, dateTo: string): Promise<ExpensesData | null>;
  branchIdsForCashier(userId: string): Promise<string[]>;
}
