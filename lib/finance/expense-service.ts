// Facade publico de expenses. Conserva la firma historica `getExpensePageData`
// y sus tipos, pero delega en el modulo hexagonal src/modules/expenses
// (dominio puro + puerto + adapter + caso de uso).

export { getExpensePageData } from "@/src/modules/expenses";
export type { ExpensePageData, ExpenseListRow } from "@/src/modules/expenses";
