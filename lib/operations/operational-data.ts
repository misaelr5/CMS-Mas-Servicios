import { seedBags, seedBranches, seedCashRegisters } from "@/lib/operations/seed-data";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Bag, Branch, CashRegister } from "@/lib/db/types";

export type OperationalConfigData = {
  branches: Branch[];
  cashRegisters: CashRegister[];
  bags: Bag[];
  source: "database" | "seed-fallback";
};

export async function getOperationalConfigData(): Promise<OperationalConfigData> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return {
      branches: seedBranches,
      cashRegisters: seedCashRegisters,
      bags: seedBags,
      source: "seed-fallback"
    };
  }

  try {
    const [branchesResult, cashRegistersResult, bagsResult] = await Promise.all([
      admin.from("branches").select("id,name,slug,status,created_at,updated_at").order("name"),
      admin
        .from("cash_registers")
        .select("id,branch_id,name,slug,status,created_at,updated_at,branches(name)")
        .order("name"),
      admin
        .from("bags")
        .select("id,name,slug,base_limit_ars,current_cash_ars,current_account_ars,current_usd,borrowed_ars,average_usd_cost,accumulated_profit_ars,status,created_at,updated_at")
        .order("name")
    ]);

    if (branchesResult.error || cashRegistersResult.error || bagsResult.error) {
      throw branchesResult.error ?? cashRegistersResult.error ?? bagsResult.error;
    }

    const cashRegisters = ((cashRegistersResult.data ?? []) as any[]).map((row) => ({
      id: row.id,
      branch_id: row.branch_id,
      branch_name: row.branches?.name ?? undefined,
      name: row.name,
      slug: row.slug,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return {
      branches: (branchesResult.data ?? []) as Branch[],
      cashRegisters,
      bags: (bagsResult.data ?? []) as Bag[],
      source: "database"
    };
  } catch {
    return {
      branches: seedBranches,
      cashRegisters: seedCashRegisters,
      bags: seedBags,
      source: "seed-fallback"
    };
  }
}
