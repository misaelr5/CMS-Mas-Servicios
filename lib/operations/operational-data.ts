import { seedBags, seedBranches, seedCashRegisters, seedCashReportCategories } from "@/lib/operations/seed-data";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Bag, Branch, CashRegister, CashReportCategory } from "@/lib/db/types";

export type OperationalConfigData = {
  branches: Branch[];
  cashRegisters: CashRegister[];
  bags: Bag[];
  cashReportCategories: CashReportCategory[];
  source: "database" | "seed-fallback";
};

export async function getOperationalConfigData(): Promise<OperationalConfigData> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return {
      branches: seedBranches,
      cashRegisters: seedCashRegisters,
      bags: seedBags,
      cashReportCategories: seedCashReportCategories,
      source: "seed-fallback"
    };
  }

  try {
    const [branchesResult, cashRegistersResult, categoriesResult, bagsResult] = await Promise.all([
      admin.from("branches").select("id,name,slug,status,created_at,updated_at").order("name"),
      admin
        .from("cash_registers")
        .select("id,branch_id,register_number,name,slug,status,responsible_user_id,created_at,updated_at,branches(name)")
        .order("name"),
      admin.from("cash_report_categories").select("id,name,sort_order,active,created_at").order("sort_order").order("name"),
      admin
        .from("bags")
        .select("id,name,slug,base_limit_ars,current_cash_ars,current_account_ars,current_usd,borrowed_ars,average_usd_cost,accumulated_profit_ars,status,created_at,updated_at")
        .order("name")
    ]);

    if (branchesResult.error || cashRegistersResult.error || bagsResult.error || categoriesResult.error) {
      throw branchesResult.error ?? cashRegistersResult.error ?? bagsResult.error ?? categoriesResult.error;
    }

    const cashRegisters = ((cashRegistersResult.data ?? []) as any[]).map((row) => ({
      id: row.id,
      branch_id: row.branch_id,
      branch_name: row.branches?.name ?? undefined,
      register_number: row.register_number ?? undefined,
      name: row.name,
      slug: row.slug,
      status: row.status,
      responsible_user_id: row.responsible_user_id ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return {
      branches: (branchesResult.data ?? []) as Branch[],
      cashRegisters,
      cashReportCategories: (categoriesResult.data ?? []) as CashReportCategory[],
      bags: (bagsResult.data ?? []) as Bag[],
      source: "database"
    };
  } catch {
    return {
      branches: seedBranches,
      cashRegisters: seedCashRegisters,
      bags: seedBags,
      cashReportCategories: seedCashReportCategories,
      source: "seed-fallback"
    };
  }
}
