// Adapter Supabase del puerto ExpensesRepository. Mantiene exactamente las
// mismas queries que el service original.

import type { Branch, Expense } from "@/lib/db/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ExpensesData, ExpensesRepository } from "../domain/expenses-repository";

export class SupabaseExpensesRepository implements ExpensesRepository {
  async loadForRange(dateFrom: string, dateTo: string): Promise<ExpensesData | null> {
    const admin = getSupabaseAdminClient();
    if (!admin) return null;

    const [branchesResult, expensesResult] = await Promise.all([
      admin.from("branches").select("id,name,slug,status,created_at,updated_at").order("name"),
      admin
        .from("expenses")
        .select(
          "id,branch_id,date,amount_ars,category,detail,status,paid_from,created_by,created_at,annulled_at,annulled_by,annulment_reason"
        )
        .gte("date", dateFrom)
        .lte("date", dateTo)
        .order("created_at", { ascending: false })
    ]);

    if (branchesResult.error || expensesResult.error) return null;

    return {
      branches: (branchesResult.data ?? []) as Branch[],
      expenses: (expensesResult.data ?? []) as Expense[]
    };
  }

  async branchIdsForCashier(userId: string): Promise<string[]> {
    const admin = getSupabaseAdminClient();
    if (!admin) return [];

    const { data } = await admin
      .from("cash_registers")
      .select("branch_id,responsible_user_id")
      .eq("responsible_user_id", userId);

    return ((data ?? []) as { branch_id?: string }[])
      .map((row) => row.branch_id)
      .filter((id): id is string => Boolean(id));
  }
}
