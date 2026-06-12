import type { Role } from "@/lib/auth/roles";
import type {
  CashDailyReport,
  CashDailyReportLine,
  CashDailyReportStatus,
  CashRegister,
  CashReportCategory
} from "@/lib/db/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { seedBranches, seedCashRegisters, seedCashReportCategories } from "@/lib/operations/seed-data";
import { calculateCashDailyReportTotals, getCashReportStatusTone, sortCashReportCategories } from "@/lib/cash/cash-calculations";

type MaybeRow = Record<string, unknown>;

export type CashReportLineWithCategory = CashDailyReportLine & {
  category_name: string;
  category_sort_order: number;
};

export type CashDailyReportWithLines = CashDailyReport & {
  created_by_name: string | null;
  lines: CashReportLineWithCategory[];
};

export type CashRegisterOverview = CashRegister & {
  branch_name: string;
  responsible_name: string | null;
  today_report: CashDailyReportWithLines | null;
  history: CashDailyReportWithLines[];
  today_status: CashDailyReportStatus;
  today_operated_ars: number;
  today_profit_ars: number;
};

export type CashModuleSummary = {
  registers_total: number;
  registers_loaded_today: number;
  registers_pending_today: number;
  total_operated_today: number;
  total_profit_today: number;
  center_profit_today: number;
  terminal_profit_today: number;
};

export type CashModuleData = {
  registers: CashRegisterOverview[];
  categories: CashReportCategory[];
  summary: CashModuleSummary;
  source: "database" | "seed-fallback";
};

type AuthFilter = {
  role: Role;
  userId: string;
};

function todayIsoInBuenosAires() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function getStringMap(rows: MaybeRow[], idKey = "id", valueKey = "name") {
  return new Map(
    rows
      .map((row) => {
        const id = typeof row[idKey] === "string" ? row[idKey] : "";
        const value = typeof row[valueKey] === "string" ? row[valueKey] : "";
        return id ? ([id, value] as const) : null;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry))
  );
}

function sortRegisters<T extends { register_number?: number | null; name: string }>(registers: T[]) {
  return [...registers].sort((left, right) => {
    const leftNumber = Number(left.register_number ?? 0);
    const rightNumber = Number(right.register_number ?? 0);
    return leftNumber - rightNumber || left.name.localeCompare(right.name);
  });
}

function buildReportRecord(
  report: CashDailyReport,
  linesByReportId: Map<string, CashReportLineWithCategory[]>,
  createdByName: string | null
): CashDailyReportWithLines {
  return {
    ...report,
    created_by_name: createdByName,
    lines: linesByReportId.get(report.id) ?? []
  };
}

function getInitialFallbackData(): CashModuleData {
  const categories = sortCashReportCategories(seedCashReportCategories);
  const registers = sortRegisters(
    seedCashRegisters.map((register) => ({
      ...register,
      branch_name: register.branch_name ?? seedBranches.find((branch) => branch.id === register.branch_id)?.name ?? "Sin sucursal",
      responsible_name: null,
      today_report: null,
      history: [],
      today_status: "pendiente" as CashDailyReportStatus,
      today_operated_ars: 0,
      today_profit_ars: 0
    }))
  ) as CashRegisterOverview[];

  return {
    registers,
    categories,
    summary: {
      registers_total: registers.length,
      registers_loaded_today: 0,
      registers_pending_today: registers.length,
      total_operated_today: 0,
      total_profit_today: 0,
      center_profit_today: 0,
      terminal_profit_today: 0
    },
    source: "seed-fallback"
  };
}

function isTodayReport(reportDate: string) {
  return reportDate === todayIsoInBuenosAires();
}

function summarizeRegisters(registers: CashRegisterOverview[]): CashModuleSummary {
  const totals = registers.reduce(
    (acc, register) => {
      if (register.today_report && isCashReportLoaded(register.today_report.status)) {
        acc.loaded += 1;
      } else {
        acc.pending += 1;
      }

      acc.operated += Number(register.today_operated_ars ?? 0);
      acc.profit += Number(register.today_profit_ars ?? 0);

      if (register.branch_name === "Centro") {
        acc.centerProfit += Number(register.today_profit_ars ?? 0);
      }

      if (register.branch_name === "Terminal") {
        acc.terminalProfit += Number(register.today_profit_ars ?? 0);
      }

      return acc;
    },
    { loaded: 0, pending: 0, operated: 0, profit: 0, centerProfit: 0, terminalProfit: 0 }
  );

  return {
    registers_total: registers.length,
    registers_loaded_today: totals.loaded,
    registers_pending_today: totals.pending,
    total_operated_today: totals.operated,
    total_profit_today: totals.profit,
    center_profit_today: totals.centerProfit,
    terminal_profit_today: totals.terminalProfit
  };
}

export async function getCashModuleData(auth?: AuthFilter): Promise<CashModuleData> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return getInitialFallbackData();
  }

  try {
    const [branchesResult, registersResult, categoriesResult, reportsResult, linesResult] = await Promise.all([
      admin.from("branches").select("id,name,slug,status").order("name"),
      admin
        .from("cash_registers")
        .select("id,branch_id,register_number,name,slug,status,responsible_user_id,created_at,updated_at")
        .order("register_number", { ascending: true }),
      admin.from("cash_report_categories").select("id,name,sort_order,active,created_at").order("sort_order").order("name"),
      admin
        .from("cash_daily_reports")
        .select("id,cash_register_id,branch_id,report_date,total_operated_ars,total_profit_ars,status,created_by,created_at,updated_at")
        .order("report_date", { ascending: false })
        .order("created_at", { ascending: false }),
      admin
        .from("cash_daily_report_lines")
        .select("id,cash_daily_report_id,category_id,operated_amount_ars,profit_amount_ars,notes,created_at,updated_at")
        .order("created_at", { ascending: true })
    ]);

    if (branchesResult.error || registersResult.error || categoriesResult.error || reportsResult.error || linesResult.error) {
      throw branchesResult.error ?? registersResult.error ?? categoriesResult.error ?? reportsResult.error ?? linesResult.error;
    }

    const branchRows = (branchesResult.data ?? []) as MaybeRow[];
    const registerRows = (registersResult.data ?? []) as MaybeRow[];
    const categoryRows = sortCashReportCategories((categoriesResult.data ?? []) as CashReportCategory[]);
    const reportRows = (reportsResult.data ?? []) as CashDailyReport[];
    const lineRows = (linesResult.data ?? []) as MaybeRow[];

    const branchMap = getStringMap(branchRows);

    const profileIds = new Set<string>();
    registerRows.forEach((row) => {
      if (typeof row.responsible_user_id === "string" && row.responsible_user_id) {
        profileIds.add(row.responsible_user_id);
      }
    });
    reportRows.forEach((row) => {
      if (typeof row.created_by === "string" && row.created_by) {
        profileIds.add(row.created_by);
      }
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

    const categoryMap = new Map(
      categoryRows.map((category) => [category.id, category] as const)
    );

    const linesByReportId = new Map<string, CashReportLineWithCategory[]>();
    (lineRows as MaybeRow[]).forEach((row) => {
      const reportId = typeof row.cash_daily_report_id === "string" ? row.cash_daily_report_id : "";
      const categoryId = typeof row.category_id === "string" ? row.category_id : "";
      if (!reportId || !categoryId) return;

      const category = categoryMap.get(categoryId);
      const nextLine: CashReportLineWithCategory = {
        id: typeof row.id === "string" ? row.id : `${reportId}-${categoryId}`,
        cash_daily_report_id: reportId,
        category_id: categoryId,
        operated_amount_ars: Number(row.operated_amount_ars ?? 0),
        profit_amount_ars: Number(row.profit_amount_ars ?? 0),
        notes: typeof row.notes === "string" ? row.notes : null,
        created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
        updated_at: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
        category_name: category?.name ?? "Categoría",
        category_sort_order: category?.sort_order ?? 0
      };

      const existing = linesByReportId.get(reportId) ?? [];
      linesByReportId.set(reportId, [...existing, nextLine]);
    });

    const reportsByRegister = new Map<string, CashDailyReportWithLines[]>();
    reportRows.forEach((report) => {
      const createdByName = report.created_by ? profileMap.get(report.created_by) ?? null : null;
      const reportWithLines = buildReportRecord(report, linesByReportId, createdByName);
      const current = reportsByRegister.get(report.cash_register_id) ?? [];
      reportsByRegister.set(report.cash_register_id, [...current, reportWithLines]);
    });

    const registers = sortRegisters(
      registerRows.map((row) => ({
        id: typeof row.id === "string" ? row.id : "",
        branch_id: typeof row.branch_id === "string" ? row.branch_id : "",
        branch_name: branchMap.get(typeof row.branch_id === "string" ? row.branch_id : "") ?? "Sin sucursal",
        register_number: typeof row.register_number === "number" ? row.register_number : Number(row.register_number ?? 0),
        name: typeof row.name === "string" ? row.name : "Caja",
        slug: typeof row.slug === "string" ? row.slug : "",
        status: (row.status === "inactive" ? "inactive" : "active") as "active" | "inactive",
        responsible_user_id: typeof row.responsible_user_id === "string" ? row.responsible_user_id : null,
        responsible_name: typeof row.responsible_user_id === "string" ? profileMap.get(row.responsible_user_id) ?? null : null,
        created_at: typeof row.created_at === "string" ? row.created_at : undefined,
        updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
        today_report: null,
        history: [],
        today_status: "pendiente" as CashDailyReportStatus,
        today_operated_ars: 0,
        today_profit_ars: 0
      }))
    );

    const visibleRegisters = auth?.role === "cajero" && auth.userId
      ? registers.filter((register) => register.responsible_user_id === auth.userId)
      : registers;

    const registersWithHistory = visibleRegisters.map((register) => {
      const history = (reportsByRegister.get(register.id) ?? []).slice().sort((left, right) => right.report_date.localeCompare(left.report_date));
      const todayReport = history.find((report) => isTodayReport(report.report_date)) ?? null;
      const todayTotals = todayReport ? calculateCashDailyReportTotals(todayReport.lines) : { operated: 0, profit: 0 };

      return {
        ...register,
        today_report: todayReport,
        history,
        today_status: todayReport?.status ?? "pendiente",
        today_operated_ars: Number(todayReport?.total_operated_ars ?? todayTotals.operated),
        today_profit_ars: Number(todayReport?.total_profit_ars ?? todayTotals.profit)
      };
    });

    return {
      registers: registersWithHistory,
      categories: categoryRows,
      summary: summarizeRegisters(registersWithHistory),
      source: "database"
    };
  } catch {
    return getInitialFallbackData();
  }
}

export async function getCashRegisterData(registerId: string, auth?: AuthFilter) {
  const data = await getCashModuleData(auth);
  const register = data.registers.find((item) => item.id === registerId) ?? null;
  return {
    ...data,
    register
  };
}

export function isCashReportLoaded(status: CashDailyReportStatus) {
  return status === "cargado" || status === "revisado";
}

export { getCashReportStatusTone };
