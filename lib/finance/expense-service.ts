import type { Branch, Expense, ExpenseStatus } from "@/lib/db/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { seedBranches } from "@/lib/operations/seed-data";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";

type ExpenseFilters = {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  status?: ExpenseStatus | "all";
  category?: string;
};

type AccessContext = {
  role: "admin" | "encargado" | "cajero" | "viewer";
  userId: string;
};

export type ExpenseListRow = Expense & {
  branch_name: string;
};

export type ExpensePageData = {
  date: string;
  dateFrom: string;
  dateTo: string;
  branches: Branch[];
  expenses: ExpenseListRow[];
  totals: {
    amount_ars: number;
    pending_amount_ars: number;
    paid_amount_ars: number;
    imputed_amount_ars: number;
    count: number;
  };
  categories: string[];
  source: "database" | "seed-fallback";
};

function sortBranches(branches: Branch[]) {
  return [...branches].sort((left, right) => left.name.localeCompare(right.name));
}

export async function getExpensePageData(filters: ExpenseFilters = {}, auth?: AccessContext | null): Promise<ExpensePageData> {
  const today = getBuenosAiresDateString();
  const dateFrom = filters.dateFrom ?? filters.date ?? today;
  const dateTo = filters.dateTo ?? filters.date ?? dateFrom;
  const normalizedDateFrom = dateFrom <= dateTo ? dateFrom : dateTo;
  const normalizedDateTo = dateFrom <= dateTo ? dateTo : dateFrom;
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return {
      date: normalizedDateFrom,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
      branches: sortBranches(seedBranches),
      expenses: [],
      totals: {
        amount_ars: 0,
        pending_amount_ars: 0,
        paid_amount_ars: 0,
        imputed_amount_ars: 0,
        count: 0
      },
      categories: [],
      source: "seed-fallback"
    };
  }

  const [branchesResult, expensesResult] = await Promise.all([
    admin.from("branches").select("id,name,slug,status,created_at,updated_at").order("name"),
    admin
      .from("expenses")
      .select("id,branch_id,date,amount_ars,category,detail,status,paid_from,created_by,created_at,annulled_at,annulled_by,annulment_reason")
      .gte("date", normalizedDateFrom)
      .lte("date", normalizedDateTo)
      .order("created_at", { ascending: false })
  ]);

  if (branchesResult.error || expensesResult.error) {
    return {
      date: normalizedDateFrom,
      dateFrom: normalizedDateFrom,
      dateTo: normalizedDateTo,
      branches: sortBranches(seedBranches),
      expenses: [],
      totals: {
        amount_ars: 0,
        pending_amount_ars: 0,
        paid_amount_ars: 0,
        imputed_amount_ars: 0,
        count: 0
      },
      categories: [],
      source: "seed-fallback"
    };
  }

  const branches = (branchesResult.data ?? []) as Branch[];
  const branchMap = new Map(branches.map((branch) => [branch.id, branch.name] as const));
  const visibleBranchIds = new Set<string>();

  if (auth?.role === "cajero") {
    const { data: registerRows } = await admin
      .from("cash_registers")
      .select("branch_id,responsible_user_id")
      .eq("responsible_user_id", auth.userId);

    (registerRows ?? []).forEach((row: { branch_id?: string }) => {
      if (row.branch_id) visibleBranchIds.add(row.branch_id);
    });
  } else {
    branches.forEach((branch) => visibleBranchIds.add(branch.id));
  }

  const rows = ((expensesResult.data ?? []) as Expense[])
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

  const categories = Array.from(new Set(rows.map((expense) => expense.category))).sort((left, right) =>
    left.localeCompare(right)
  );

  const totals = rows.reduce(
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

  return {
    date: normalizedDateFrom,
    dateFrom: normalizedDateFrom,
    dateTo: normalizedDateTo,
    branches: sortBranches(branches),
    expenses: rows,
    totals,
    categories,
    source: "database"
  };
}
