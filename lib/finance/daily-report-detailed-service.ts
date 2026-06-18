import type {
  Bag,
  BagOperation,
  Branch,
  CashDailyReport,
  CashDailyReportLine,
  CashDailyReportStatus,
  CashRegister,
  CashReportCategory,
  DailyReport,
  Expense,
  ReportAdjustment
} from "@/lib/db/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import {
  calculateBranchDailyTotals,
  calculateCashBoxDailySheet,
  calculateDailyCurrencyProfit,
  calculateDailyReportGrandTotal,
  computeBranchManualAdj
} from "@/src/modules/daily-reports/domain/daily-report-sheet";

type MaybeRow = Record<string, unknown>;

export type CashRegisterDailySheet = {
  register: CashRegister & { branch_name: string };
  report: CashDailyReport | null;
  lines: Array<CashDailyReportLine & { category_name: string; sort_order: number }>;
  status: CashDailyReportStatus;
  totalOperatedArs: number;
  pfProfitArs: number;
};

export type BagDailySheet = {
  bag: Bag & { responsible_name: string | null };
  branchId: string | null;
  branchName: string | null;
  todayOps: BagOperation[];
  boughtUsdToday: number;
  soldUsdToday: number;
  currencyProfitArs: number;
  internalOpsCount: number;
  estimatedTotalArs: number;
  differenceArs: number;
};

export type BranchDailyGroup = {
  branch: Branch | null;
  registers: CashRegisterDailySheet[];
  bags: BagDailySheet[];
  dailyReport: DailyReport | null;
  adjustments: ReportAdjustment[];
  totals: {
    pfProfitArs: number;
    currencyProfitArs: number;
    totalProfitArs: number;
    totalOperatedArs: number;
    manualPfAdjArs: number;
    manualCurrencyAdjArs: number;
  };
};

export type DailyReportDetailedData = {
  date: string;
  registers: CashRegisterDailySheet[];
  bags: BagDailySheet[];
  expenses: Expense[];
  adjustments: ReportAdjustment[];
  dailyReports: DailyReport[];
  categories: CashReportCategory[];
  centro: BranchDailyGroup;
  terminal: BranchDailyGroup;
  generalBags: BagDailySheet[];
  grandTotals: ReturnType<typeof calculateDailyReportGrandTotal>;
  source: "database" | "seed-fallback";
};

function emptyGroup(): BranchDailyGroup {
  return {
    branch: null,
    registers: [],
    bags: [],
    dailyReport: null,
    adjustments: [],
    totals: { pfProfitArs: 0, currencyProfitArs: 0, totalProfitArs: 0, totalOperatedArs: 0, manualPfAdjArs: 0, manualCurrencyAdjArs: 0 }
  };
}

function emptyGrandTotals() {
  return {
    pfProfitCentro: 0, pfProfitTerminal: 0, pfProfitTotal: 0,
    currencyProfitCentro: 0, currencyProfitTerminal: 0, currencyProfitGeneral: 0, currencyProfitTotal: 0,
    grossProfitArs: 0, expensesArs: 0, freeProfitArs: 0
  };
}

function buildEmptyData(date: string): DailyReportDetailedData {
  return {
    date,
    registers: [],
    bags: [],
    expenses: [],
    adjustments: [],
    dailyReports: [],
    categories: [],
    centro: emptyGroup(),
    terminal: emptyGroup(),
    generalBags: [],
    grandTotals: emptyGrandTotals(),
    source: "seed-fallback"
  };
}

export async function getDailyReportDetailedData(
  dateInput: string | Date,
  _auth?: { role: string; userId: string } | null
): Promise<DailyReportDetailedData> {
  const date = typeof dateInput === "string" ? dateInput : getBuenosAiresDateString(dateInput);
  const admin = getSupabaseAdminClient();
  if (!admin) return buildEmptyData(date);

  const dateStartISO = new Date(`${date}T00:00:00-03:00`).toISOString();
  const dateEndISO = new Date(`${date}T23:59:59.999-03:00`).toISOString();

  const [
    branchesRes,
    registersRes,
    categoriesRes,
    cashReportsRes,
    dailyReportsRes,
    bagsRes,
    bagOpsRes,
    expensesRes
  ] = await Promise.all([
    admin.from("branches").select("id,name,slug,status").order("name"),
    admin
      .from("cash_registers")
      .select("id,branch_id,register_number,name,slug,status,responsible_user_id")
      .order("register_number", { ascending: true }),
    admin
      .from("cash_report_categories")
      .select("id,name,sort_order,active")
      .order("sort_order", { ascending: true }),
    admin
      .from("cash_daily_reports")
      .select("id,cash_register_id,branch_id,report_date,total_operated_ars,total_profit_ars,status,created_by,created_at,updated_at")
      .eq("report_date", date),
    admin
      .from("daily_reports")
      .select(
        "id,branch_id,report_date,automatic_pf_profit_ars,manual_pf_adjustment_ars,automatic_currency_profit_ars,manual_currency_adjustment_ars,gross_profit_ars,expenses_ars,available_profit_ars,status,closed_at,closed_by,close_note,created_by,created_at,updated_at"
      )
      .eq("report_date", date),
    admin
      .from("bags")
      .select(
        "id,name,slug,base_limit_ars,current_cash_ars,current_account_ars,current_usd,borrowed_ars,average_usd_cost,accumulated_profit_ars,responsible_user_id,status"
      ),
    admin
      .from("bag_operations")
      .select(
        "id,bag_id,operation_type,amount_usd,rate_ars,total_ars,money_source,money_destination,profit_ars,previous_cash_ars,previous_account_ars,previous_usd,previous_borrowed_ars,new_cash_ars,new_account_ars,new_usd,new_borrowed_ars,notes,status,created_by,created_at,updated_at,annulled_at,annulled_by,annulment_reason,is_internal,affects_profit"
      )
      .gte("created_at", dateStartISO)
      .lte("created_at", dateEndISO)
      .order("created_at", { ascending: true }),
    admin
      .from("expenses")
      .select(
        "id,branch_id,date,amount_ars,category,detail,status,paid_from,created_by,created_at,annulled_at,annulled_by,annulment_reason"
      )
      .eq("date", date)
  ]);

  const firstError =
    branchesRes.error ??
    registersRes.error ??
    categoriesRes.error ??
    cashReportsRes.error ??
    dailyReportsRes.error ??
    bagsRes.error ??
    bagOpsRes.error ??
    expensesRes.error;
  if (firstError) {
    console.error("[getDailyReportDetailedData]", firstError.message);
    return buildEmptyData(date);
  }

  const branches = (branchesRes.data ?? []) as Branch[];
  const registers = (registersRes.data ?? []) as CashRegister[];
  const categories = (categoriesRes.data ?? []) as CashReportCategory[];
  const cashReports = (cashReportsRes.data ?? []) as CashDailyReport[];
  const dailyReports = (dailyReportsRes.data ?? []) as DailyReport[];
  const bags = (bagsRes.data ?? []) as Bag[];
  const bagOps = (bagOpsRes.data ?? []) as BagOperation[];
  const expenses = (expensesRes.data ?? []) as Expense[];

  const cashReportIds = cashReports.map((r) => r.id);
  const dailyReportIds = dailyReports.map((r) => r.id);

  const [linesRes, adjustmentsRes, profilesRes] = await Promise.all([
    cashReportIds.length > 0
      ? admin
          .from("cash_daily_report_lines")
          .select("id,cash_daily_report_id,category_id,operated_amount_ars,profit_amount_ars,notes,created_at,updated_at")
          .in("cash_daily_report_id", cashReportIds)
      : { data: [], error: null },
    dailyReportIds.length > 0
      ? admin
          .from("report_adjustments")
          .select(
            "id,daily_report_id,adjustment_type,amount_ars,reason,created_by,created_at,annulled_at,annulled_by,annulment_reason"
          )
          .in("daily_report_id", dailyReportIds)
      : { data: [], error: null },
    (() => {
      const ids = new Set<string>();
      registers.forEach((r) => { if (r.responsible_user_id) ids.add(r.responsible_user_id); });
      bags.forEach((b) => { if (b.responsible_user_id) ids.add(b.responsible_user_id); });
      return ids.size > 0
        ? admin.from("profiles").select("id,full_name,email").in("id", Array.from(ids))
        : { data: [], error: null };
    })()
  ]);

  if (linesRes.error ?? adjustmentsRes.error ?? profilesRes.error) {
    console.error("[getDailyReportDetailedData secondary]", linesRes.error ?? adjustmentsRes.error ?? profilesRes.error);
    return buildEmptyData(date);
  }

  const lines = (linesRes.data ?? []) as CashDailyReportLine[];
  const adjustments = (adjustmentsRes.data ?? []) as ReportAdjustment[];
  const activeAdjustments = adjustments.filter((a) => !a.annulled_at);

  const profileMap = new Map<string, string>();
  ((profilesRes.data ?? []) as MaybeRow[]).forEach((p) => {
    const id = typeof p.id === "string" ? p.id : "";
    const name =
      typeof p.full_name === "string" ? p.full_name : typeof p.email === "string" ? p.email : "";
    if (id) profileMap.set(id, name);
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const branchMap = new Map(branches.map((b) => [b.id, b]));

  const registerResponsibleBranchMap = new Map<string, string>(
    registers
      .filter((r) => r.responsible_user_id)
      .map((r) => [r.responsible_user_id!, r.branch_id])
  );

  // Build per-register sheets
  const registerSheets: CashRegisterDailySheet[] = registers.map((register) => {
    const branch = branchMap.get(register.branch_id);
    const report = cashReports.find((r) => r.cash_register_id === register.id) ?? null;
    const reportLines = report
      ? lines
          .filter((l) => l.cash_daily_report_id === report.id)
          .map((l) => ({
            ...l,
            category_name: categoryMap.get(l.category_id)?.name ?? "",
            sort_order: categoryMap.get(l.category_id)?.sort_order ?? 0
          }))
          .sort((a, b) => a.sort_order - b.sort_order)
      : [];
    const { totalOperatedArs, pfProfitArs } = calculateCashBoxDailySheet(reportLines);
    return {
      register: { ...register, branch_name: branch?.name ?? "" },
      report,
      lines: reportLines,
      status: report?.status ?? "pendiente",
      totalOperatedArs,
      pfProfitArs
    };
  });

  // Build bag → branch mapping via responsible_user_id → register → branch
  const bagBranchMap = new Map<string, { branchId: string; branchName: string }>();
  bags.forEach((bag) => {
    if (bag.responsible_user_id) {
      const branchId = registerResponsibleBranchMap.get(bag.responsible_user_id);
      if (branchId) {
        const branch = branchMap.get(branchId);
        bagBranchMap.set(bag.id, { branchId, branchName: branch?.name ?? "" });
      }
    }
  });

  // Build per-bag sheets
  const bagSheets: BagDailySheet[] = bags.map((bag) => {
    const branchInfo = bagBranchMap.get(bag.id) ?? null;
    const todayOps = bagOps.filter((op) => op.bag_id === bag.id);
    const { boughtUsd, soldUsd, profitArs, internalOpsCount } = calculateDailyCurrencyProfit(todayOps);
    const estimatedTotalArs =
      Number(bag.current_cash_ars ?? 0) +
      Number(bag.current_account_ars ?? 0) +
      Number(bag.current_usd ?? 0) * Number(bag.average_usd_cost ?? 0);
    const differenceArs = estimatedTotalArs - Number(bag.base_limit_ars ?? 0);
    return {
      bag: {
        ...bag,
        responsible_name: bag.responsible_user_id ? (profileMap.get(bag.responsible_user_id) ?? null) : null
      },
      branchId: branchInfo?.branchId ?? null,
      branchName: branchInfo?.branchName ?? null,
      todayOps,
      boughtUsdToday: boughtUsd,
      soldUsdToday: soldUsd,
      currencyProfitArs: profitArs,
      internalOpsCount,
      estimatedTotalArs,
      differenceArs
    };
  });

  const centroBranch = branches.find((b) => b.slug === "centro") ?? null;
  const terminalBranch = branches.find((b) => b.slug === "terminal") ?? null;

  function buildGroup(branch: Branch | null): BranchDailyGroup {
    if (!branch) return emptyGroup();
    const branchRegisters = registerSheets.filter((r) => r.register.branch_id === branch.id);
    const branchBags = bagSheets.filter((b) => b.branchId === branch.id);
    const dailyReport = dailyReports.find((r) => r.branch_id === branch.id) ?? null;
    const branchAdjustments = dailyReport
      ? activeAdjustments.filter((a) => a.daily_report_id === dailyReport.id)
      : [];
    const { manualPfAdjArs, manualCurrencyAdjArs } = computeBranchManualAdj(branchAdjustments);
    const rawTotals = calculateBranchDailyTotals({ registers: branchRegisters, bags: branchBags });
    return {
      branch,
      registers: branchRegisters,
      bags: branchBags,
      dailyReport,
      adjustments: branchAdjustments,
      totals: { ...rawTotals, manualPfAdjArs, manualCurrencyAdjArs }
    };
  }

  const centro = buildGroup(centroBranch);
  const terminal = buildGroup(terminalBranch);
  const generalBags = bagSheets.filter((b) => b.branchId === null);

  const grandTotals = calculateDailyReportGrandTotal({
    centro: {
      pfProfitArs: centro.totals.pfProfitArs,
      currencyProfitArs: centro.totals.currencyProfitArs,
      manualPfAdjArs: centro.totals.manualPfAdjArs,
      manualCurrencyAdjArs: centro.totals.manualCurrencyAdjArs
    },
    terminal: {
      pfProfitArs: terminal.totals.pfProfitArs,
      currencyProfitArs: terminal.totals.currencyProfitArs,
      manualPfAdjArs: terminal.totals.manualPfAdjArs,
      manualCurrencyAdjArs: terminal.totals.manualCurrencyAdjArs
    },
    generalBags,
    expenses
  });

  return {
    date,
    registers: registerSheets,
    bags: bagSheets,
    expenses,
    adjustments: activeAdjustments,
    dailyReports,
    categories,
    centro,
    terminal,
    generalBags,
    grandTotals,
    source: "database"
  };
}
