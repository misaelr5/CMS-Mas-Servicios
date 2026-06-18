import type {
  Branch,
  CashDailyReport,
  CashDailyReportStatus,
  CashRegister,
  DailyReport,
  DailyReportStatus,
  Expense,
  ReportAdjustment
} from "@/lib/db/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { seedBranches, seedCashRegisters } from "@/lib/operations/seed-data";
import { getBuenosAiresDateString, isSameBuenosAiresDate } from "@/lib/finance/report-dates";
import { getSignedAdjustmentAmount } from "@/src/modules/daily-reports/domain/daily-report-rules";
import { getFriendlySupabaseErrorMessage } from "@/lib/errors/user-facing";

type MaybeRow = Record<string, unknown>;

export type DailyReportRegisterSummary = {
  id: string;
  register_number: number | null;
  name: string;
  branch_id: string;
  status: CashDailyReportStatus;
  report_id: string | null;
  total_operated_ars: number;
  total_profit_ars: number;
};

export type DailyReportBranchSummary = {
  branch: Branch;
  cashRegisters: DailyReportRegisterSummary[];
  dailyReport: DailyReport | null;
  dailyReportClosedByName: string | null;
  adjustments: ReportAdjustment[];
  expenses: Expense[];
  automaticPfProfitArs: number;
  manualPfAdjustmentArs: number;
  automaticCurrencyProfitArs: number;
  manualCurrencyAdjustmentArs: number;
  currencyPurchasedUsd: number;
  currencyPurchasedArs: number;
  currencySoldUsd: number;
  currencySoldArs: number;
  grossProfitArs: number;
  expensesArs: number;
  availableProfitArs: number;
  hasNegativeAvailable: boolean;
};

export type DailyReportViewData = {
  date: string;
  branches: DailyReportBranchSummary[];
  totals: {
    automaticPfProfitArs: number;
    manualPfAdjustmentArs: number;
    automaticCurrencyProfitArs: number;
    manualCurrencyAdjustmentArs: number;
    grossProfitArs: number;
    expensesArs: number;
    availableProfitArs: number;
  };
  source: "database" | "seed-fallback";
};

export type DailyReportAccessContext = {
  role: "admin" | "encargado" | "cajero" | "viewer";
  userId: string;
};

function emptyBranchSummary(branch: Branch): DailyReportBranchSummary {
  return {
    branch,
    cashRegisters: [],
    dailyReport: null,
    dailyReportClosedByName: null,
    adjustments: [],
    expenses: [],
    automaticPfProfitArs: 0,
    manualPfAdjustmentArs: 0,
    automaticCurrencyProfitArs: 0,
    manualCurrencyAdjustmentArs: 0,
    currencyPurchasedUsd: 0,
    currencyPurchasedArs: 0,
    currencySoldUsd: 0,
    currencySoldArs: 0,
    grossProfitArs: 0,
    expensesArs: 0,
    availableProfitArs: 0,
    hasNegativeAvailable: false
  };
}

function sortBranches(branches: Branch[]) {
  return [...branches].sort((left, right) => left.name.localeCompare(right.name));
}

function sortRegisters(registers: CashRegister[]) {
  return [...registers].sort((left, right) => Number(left.register_number ?? 0) - Number(right.register_number ?? 0));
}

function buildFallbackData(date: string): DailyReportViewData {
  const branches = sortBranches(seedBranches).map((branch) => emptyBranchSummary(branch));
  return {
    date,
    branches,
    totals: {
      automaticPfProfitArs: 0,
      manualPfAdjustmentArs: 0,
      automaticCurrencyProfitArs: 0,
      manualCurrencyAdjustmentArs: 0,
      grossProfitArs: 0,
      expensesArs: 0,
      availableProfitArs: 0
    },
    source: "seed-fallback"
  };
}

function sumExpenses(expenses: Expense[]) {
  return expenses.reduce((acc, expense) => {
    if (expense.status === "pagado" || expense.status === "imputado") {
      acc += Number(expense.amount_ars ?? 0);
    }
    return acc;
  }, 0);
}

function sumManualAdjustments(adjustments: ReportAdjustment[], filter: "pf" | "currency") {
  return adjustments.reduce((acc, adjustment) => {
    const isPf = adjustment.adjustment_type.startsWith("pf_");
    const matchesFilter = filter === "pf" ? isPf : !isPf;
    if (!matchesFilter) return acc;
    return acc + getSignedAdjustmentAmount(adjustment.adjustment_type, Number((adjustment as any).amount_ars ?? 0));
  }, 0);
}

function asDateString(value: string | Date) {
  return typeof value === "string" ? value : getBuenosAiresDateString(value);
}

export async function getDailyReportViewData(
  dateInput: string | Date = getBuenosAiresDateString(),
  auth?: DailyReportAccessContext | null
): Promise<DailyReportViewData> {
  const date = asDateString(dateInput);
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return buildFallbackData(date);
  }

  try {
    const [branchesResult, registersResult, cashReportsResult, dailyReportsResult, adjustmentsResult, expensesResult, bagsResult, bagOperationsResult] =
      await Promise.all([
        admin.from("branches").select("id,name,slug,status,created_at,updated_at").order("name"),
        admin
          .from("cash_registers")
          .select("id,branch_id,register_number,name,slug,status,responsible_user_id,created_at,updated_at")
          .order("register_number", { ascending: true }),
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
          .from("report_adjustments")
          .select("id,daily_report_id,adjustment_type,amount_ars,reason,created_by,created_at,annulled_at,annulled_by,annulment_reason"),
        admin
          .from("expenses")
          .select("id,branch_id,date,amount_ars,category,detail,status,paid_from,created_by,created_at,annulled_at,annulled_by,annulment_reason")
          .eq("date", date),
        admin.from("bags").select("id,responsible_user_id,name,slug"),
        admin
          .from("bag_operations")
          .select("id,bag_id,operation_type,profit_ars,is_internal,affects_profit,status,created_at")
          .order("created_at", { ascending: false })
      ]);

    const firstError =
      branchesResult.error ??
      registersResult.error ??
      cashReportsResult.error ??
      dailyReportsResult.error ??
      adjustmentsResult.error ??
      expensesResult.error ??
      bagsResult.error ??
      bagOperationsResult.error;
    if (firstError) throw firstError;

    const branches = sortBranches((branchesResult.data ?? []) as Branch[]);
    const registers = sortRegisters((registersResult.data ?? []) as CashRegister[]);
    const cashReports = (cashReportsResult.data ?? []) as CashDailyReport[];
    const dailyReports = (dailyReportsResult.data ?? []) as DailyReport[];
    const adjustments = (adjustmentsResult.data ?? []) as ReportAdjustment[];
    const expenses = (expensesResult.data ?? []) as Expense[];
    const bags = (bagsResult.data ?? []) as MaybeRow[];
    const bagOperations = (bagOperationsResult.data ?? []) as MaybeRow[];

    const profileIds = new Set<string>();
    dailyReports.forEach((report) => {
      if (report.created_by) profileIds.add(report.created_by);
      if (report.closed_by) profileIds.add(report.closed_by);
    });
    const profilesResult = profileIds.size
      ? await admin.from("profiles").select("id,full_name,email").in("id", Array.from(profileIds))
      : { data: [], error: null };

    if ("error" in profilesResult && profilesResult.error) {
      throw profilesResult.error;
    }

    const profileMap = new Map<string, string>();
    (profilesResult.data ?? []).forEach((profile: MaybeRow) => {
      const id = typeof profile.id === "string" ? profile.id : "";
      const name = typeof profile.full_name === "string" ? profile.full_name : typeof profile.email === "string" ? profile.email : "";
      if (id) profileMap.set(id, name);
    });

    const branchById = new Map(branches.map((branch) => [branch.id, branch] as const));
    const registerBranchMap = new Map<string, string>();
    const visibleBranchIds = new Set<string>();

    registers.forEach((register) => {
      registerBranchMap.set(register.responsible_user_id ?? "", register.branch_id);
    });

    if (auth?.role === "cajero") {
      const branchId = registerBranchMap.get(auth.userId);
      if (branchId) visibleBranchIds.add(branchId);
    } else {
      branches.forEach((branch) => visibleBranchIds.add(branch.id));
    }

    const bagResponsibleBranchMap = new Map<string, string>();
    bags.forEach((bag) => {
      const responsibleUserId = typeof bag.responsible_user_id === "string" ? bag.responsible_user_id : "";
      const branchId = registerBranchMap.get(responsibleUserId);
      if (responsibleUserId && branchId) {
        bagResponsibleBranchMap.set(String(bag.id), branchId);
      }
    });

    const branchSummaries = branches.map((branch) => {
      const branchCashRegisters = registers.filter((register) => register.branch_id === branch.id);
      const cashReportRows = cashReports.filter((report) => report.branch_id === branch.id);
      const report = dailyReports.find((item) => item.branch_id === branch.id) ?? null;
      const reportAdjustments = adjustments.filter((adjustment) => adjustment.daily_report_id === report?.id);
      const branchExpenses = expenses.filter((expense) => expense.branch_id === branch.id);
      const branchBagOperations = bagOperations.filter((operation) => {
        if (operation.status === "anulada") return false;
        if (operation.is_internal) return false;
        if (operation.affects_profit === false) return false;
        if (operation.operation_type !== "venta_usd") return false;
        const bagId = typeof operation.bag_id === "string" ? operation.bag_id : "";
        const branchId = bagResponsibleBranchMap.get(bagId);
        return branchId === branch.id && isSameBuenosAiresDate(String(operation.created_at ?? ""), date);
      });

      const automaticPfProfitArs = cashReportRows.reduce((sum, item) => sum + Number(item.total_profit_ars ?? 0), 0);
      const automaticCurrencyProfitArs = branchBagOperations.reduce((sum, item) => sum + Number(item.profit_ars ?? 0), 0);
      const currencyPurchasedUsd = branchBagOperations.reduce((sum, item) => {
        if (item.operation_type !== "compra_usd") return sum;
        return sum + Number(item.amount_usd ?? 0);
      }, 0);
      const currencyPurchasedArs = branchBagOperations.reduce((sum, item) => {
        if (item.operation_type !== "compra_usd") return sum;
        return sum + Number(item.total_ars ?? 0);
      }, 0);
      const currencySoldUsd = branchBagOperations.reduce((sum, item) => {
        if (item.operation_type !== "venta_usd") return sum;
        return sum + Number(item.amount_usd ?? 0);
      }, 0);
      const currencySoldArs = branchBagOperations.reduce((sum, item) => {
        if (item.operation_type !== "venta_usd") return sum;
        return sum + Number(item.total_ars ?? 0);
      }, 0);
      const manualPfAdjustmentArs = sumManualAdjustments(reportAdjustments, "pf");
      const manualCurrencyAdjustmentArs = sumManualAdjustments(reportAdjustments, "currency");
      const grossProfitArs =
        automaticPfProfitArs + manualPfAdjustmentArs + automaticCurrencyProfitArs + manualCurrencyAdjustmentArs;
      const expensesArs = sumExpenses(branchExpenses);
      const availableProfitArs = grossProfitArs - expensesArs;

      const cashRegisterStatuses = branchCashRegisters.map((register) => {
        const cashReport = cashReports.find((reportRow) => reportRow.cash_register_id === register.id) ?? null;
        return {
          id: register.id,
          register_number: register.register_number ?? null,
          name: register.name,
          branch_id: register.branch_id,
          status: cashReport?.status ?? ("pendiente" as CashDailyReportStatus),
          report_id: cashReport?.id ?? null,
          total_operated_ars: Number(cashReport?.total_operated_ars ?? 0),
          total_profit_ars: Number(cashReport?.total_profit_ars ?? 0)
        };
      });

      return {
        branch,
        cashRegisters: cashRegisterStatuses,
        dailyReport: report,
        dailyReportClosedByName: report?.closed_by ? profileMap.get(report.closed_by) ?? null : null,
        adjustments: reportAdjustments,
        expenses: branchExpenses,
        automaticPfProfitArs,
        manualPfAdjustmentArs,
        automaticCurrencyProfitArs,
        manualCurrencyAdjustmentArs,
        currencyPurchasedUsd,
        currencyPurchasedArs,
        currencySoldUsd,
        currencySoldArs,
        grossProfitArs,
        expensesArs,
        availableProfitArs,
        hasNegativeAvailable: availableProfitArs < 0
      } satisfies DailyReportBranchSummary;
    });

    const visibleBranchSummaries = branchSummaries.filter((item) => visibleBranchIds.has(item.branch.id));
    const totals = visibleBranchSummaries.reduce(
      (acc, branch) => {
        acc.automaticPfProfitArs += branch.automaticPfProfitArs;
        acc.manualPfAdjustmentArs += branch.manualPfAdjustmentArs;
        acc.automaticCurrencyProfitArs += branch.automaticCurrencyProfitArs;
        acc.manualCurrencyAdjustmentArs += branch.manualCurrencyAdjustmentArs;
        acc.grossProfitArs += branch.grossProfitArs;
        acc.expensesArs += branch.expensesArs;
        acc.availableProfitArs += branch.availableProfitArs;
        return acc;
      },
      {
        automaticPfProfitArs: 0,
        manualPfAdjustmentArs: 0,
        automaticCurrencyProfitArs: 0,
        manualCurrencyAdjustmentArs: 0,
        grossProfitArs: 0,
        expensesArs: 0,
        availableProfitArs: 0
      }
    );

    return {
      date,
      branches: visibleBranchSummaries,
      totals,
      source: "database"
    };
  } catch {
    return buildFallbackData(date);
  }
}

export async function recalculateDailyReportBranch({
  branchId,
  date,
  actorId,
  status,
  closedAt,
  closedBy,
  closeNote
}: {
  branchId: string;
  date: string;
  actorId: string;
  status?: DailyReportStatus;
  closedAt?: string | null;
  closedBy?: string | null;
  closeNote?: string | null;
}) {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { ok: false as const, message: "Falta configurar Supabase en el servidor." };
  }

  const viewData = await getDailyReportViewData(date, { role: "admin", userId: actorId });
  const branchSummary = viewData.branches.find((item) => item.branch.id === branchId);
  if (!branchSummary) {
    return { ok: false as const, message: "No se encontró la sucursal para recalcular." };
  }

  const payload = {
    branch_id: branchId,
    report_date: date,
    automatic_pf_profit_ars: branchSummary.automaticPfProfitArs,
    manual_pf_adjustment_ars: branchSummary.manualPfAdjustmentArs,
    automatic_currency_profit_ars: branchSummary.automaticCurrencyProfitArs,
    manual_currency_adjustment_ars: branchSummary.manualCurrencyAdjustmentArs,
    gross_profit_ars: branchSummary.grossProfitArs,
    expenses_ars: branchSummary.expensesArs,
    available_profit_ars: branchSummary.availableProfitArs,
    status: status ?? (branchSummary.hasNegativeAvailable ? "revisar" : "abierto"),
    closed_at: closedAt ?? null,
    closed_by: closedBy ?? null,
    close_note: closeNote ?? null,
    updated_at: new Date().toISOString()
  };

  const { data: existingReportData, error: readError } = await admin
    .from("daily_reports")
    .select("*")
    .eq("branch_id", branchId)
    .eq("report_date", date)
    .maybeSingle();

  if (readError) {
    return { ok: false as const, message: `No se pudo leer el reporte diario: ${readError.message}` };
  }

  const existingReport = existingReportData as DailyReport | null;
  const action = existingReport ? "updated" : "created";
  const mutation = await (admin.from("daily_reports") as any)
    .upsert({ ...payload, created_by: existingReport?.created_by ?? actorId }, { onConflict: "branch_id,report_date" })
    .select("*")
    .single();

  const { data, error } = mutation;
  if (error || !data) {
    return { ok: false as const, message: getFriendlySupabaseErrorMessage(error, "No se pudo guardar el reporte diario.") };
  }

  return { ok: true as const, action, report: data as DailyReport };
}

export async function getDailyReportRecordByBranchDate(branchId: string, date: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("daily_reports")
    .select(
      "id,branch_id,report_date,automatic_pf_profit_ars,manual_pf_adjustment_ars,automatic_currency_profit_ars,manual_currency_adjustment_ars,gross_profit_ars,expenses_ars,available_profit_ars,status,closed_at,closed_by,close_note,created_by,created_at,updated_at"
    )
    .eq("branch_id", branchId)
    .eq("report_date", date)
    .maybeSingle();

  if (error) return null;

  return (data as DailyReport | null) ?? null;
}

export function isDailyReportLockedStatus(status: DailyReportStatus | null | undefined) {
  return status === "cerrado" || status === "revisar";
}
