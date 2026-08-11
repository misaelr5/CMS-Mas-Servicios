import type {
  Branch,
  CashDailyReport,
  CashDailyReportStatus,
  CashRegister,
  WeeklyCashClosure,
  WeeklyCashClosureLine,
  WeeklyCashClosureStatus
} from "@/lib/db/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { seedBranches, seedCashRegisters } from "@/lib/operations/seed-data";
import { getBuenosAiresDateString, isSameBuenosAiresDate } from "@/lib/finance/report-dates";
import { getWeeklyCashClosureRange, getWeeklyCashClosureStatusTone } from "@/lib/finance/weekly-cash-closure-calculations";

type MaybeRow = Record<string, unknown>;

export type WeeklyCashClosureRegisterSummary = {
  cashRegister: CashRegister & {
    responsible_name: string | null;
  };
  branch: Branch;
  reports: CashDailyReport[];
  totalOperatedArs: number;
  totalProfitArs: number;
  loadedDaysCount: number;
  pendingDaysCount: number;
  reviewedDaysCount: number;
  status: WeeklyCashClosureStatus;
};

export type WeeklyCashClosureBranchSummary = {
  branch: Branch;
  registers: WeeklyCashClosureRegisterSummary[];
  totalOperatedArs: number;
  totalProfitArs: number;
  loadedDaysCount: number;
  pendingDaysCount: number;
  reviewedDaysCount: number;
  status: WeeklyCashClosureStatus;
};

export type WeeklyCashClosureViewData = {
  date: string;
  weekStartDate: string;
  weekEndDate: string;
  branches: WeeklyCashClosureBranchSummary[];
  registerSummaries: WeeklyCashClosureRegisterSummary[];
  closure: WeeklyCashClosure | null;
  closureLines: WeeklyCashClosureLine[];
  lastClosure: WeeklyCashClosure | null;
  totals: {
    totalOperatedArs: number;
    totalProfitArs: number;
    centerProfitArs: number;
    terminalProfitArs: number;
    loadedDaysCount: number;
    pendingDaysCount: number;
    reviewedDaysCount: number;
  };
  status: WeeklyCashClosureStatus;
  source: "database" | "seed-fallback";
};

export type WeeklyCashClosureAccessContext = {
  role: "admin" | "encargado" | "cajero" | "viewer";
  userId: string;
};

function sortBranches(branches: Branch[]) {
  return [...branches].sort((left, right) => left.name.localeCompare(right.name));
}

function sortRegisters(registers: CashRegister[]) {
  return [...registers].sort((left, right) => Number(left.register_number ?? 0) - Number(right.register_number ?? 0));
}

function emptyData(date: string): WeeklyCashClosureViewData {
  const range = getWeeklyCashClosureRange(date);
  const branches = sortBranches(seedBranches).map((branch) => ({
    branch,
    registers: [],
    totalOperatedArs: 0,
    totalProfitArs: 0,
    loadedDaysCount: 0,
    pendingDaysCount: 7,
    reviewedDaysCount: 0,
    status: "abierto" as WeeklyCashClosureStatus
  }));

  return {
    date,
    weekStartDate: range.weekStartDate,
    weekEndDate: range.weekEndDate,
    branches,
    registerSummaries: [],
    closure: null,
    closureLines: [],
    lastClosure: null,
    totals: {
      totalOperatedArs: 0,
      totalProfitArs: 0,
      centerProfitArs: 0,
      terminalProfitArs: 0,
      loadedDaysCount: 0,
      pendingDaysCount: 0,
      reviewedDaysCount: 0
    },
    status: "abierto",
    source: "seed-fallback"
  };
}

function inferRegisterStatus(reports: CashDailyReport[], weekDayCount = 7): WeeklyCashClosureStatus {
  if (reports.length === 0) return "abierto";
  const pendingOrPartial = reports.some((report) => report.status === "pendiente" || report.status === "parcial");
  if (pendingOrPartial) return "revisar";
  if (reports.length >= weekDayCount && reports.every((report) => report.status === "revisado")) return "cerrado";
  return "revisar";
}

function asDateString(value: string | Date) {
  return typeof value === "string" ? value : getBuenosAiresDateString(value);
}

export async function getWeeklyCashClosureViewData(
  dateInput: string | Date = getBuenosAiresDateString(),
  auth?: WeeklyCashClosureAccessContext | null
): Promise<WeeklyCashClosureViewData> {
  const date = asDateString(dateInput);
  const range = getWeeklyCashClosureRange(date);
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return emptyData(date);
  }

  try {
    const [branchesResult, registersResult, reportsResult, closuresResult, closureLinesResult] = await Promise.all([
      admin.from("branches").select("id,name,slug,status,created_at,updated_at").order("name"),
      admin
        .from("cash_registers")
        .select("id,branch_id,register_number,name,slug,status,responsible_user_id,created_at,updated_at")
        .order("register_number", { ascending: true }),
      admin
        .from("cash_daily_reports")
        .select("id,cash_register_id,branch_id,report_date,total_operated_ars,total_profit_ars,status,created_by,created_at,updated_at")
        .gte("report_date", range.weekStartDate)
        .lte("report_date", range.weekEndDate),
      admin
        .from("weekly_cash_closures")
        .select("*")
        .eq("week_start_date", range.weekStartDate)
        .maybeSingle(),
      admin
        .from("weekly_cash_closure_lines")
        .select("*")
        .order("created_at", { ascending: true })
    ]);

    const firstError = branchesResult.error ?? registersResult.error ?? reportsResult.error ?? closuresResult.error ?? closureLinesResult.error;
    if (firstError) throw firstError;

    const branches = sortBranches((branchesResult.data ?? []) as Branch[]);
    const registers = sortRegisters((registersResult.data ?? []) as CashRegister[]);
    const reports = (reportsResult.data ?? []) as CashDailyReport[];
    const closure = (closuresResult.data ?? null) as WeeklyCashClosure | null;
    const closureLines = (closureLinesResult.data ?? []) as WeeklyCashClosureLine[];

    const registerBranchMap = new Map<string, Branch>();
    registers.forEach((register) => {
      const branch = branches.find((item) => item.id === register.branch_id);
      if (branch) {
        registerBranchMap.set(register.id, branch);
      }
    });

    const profileIds = new Set<string>();
    reports.forEach((report) => {
      if (report.created_by) profileIds.add(report.created_by);
    });
    if (closure?.created_by) profileIds.add(closure.created_by);
    if (closure?.closed_by) profileIds.add(closure.closed_by);
    if (closure?.reopened_by) profileIds.add(closure.reopened_by);

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

    const lastClosureResult = await admin
      .from("weekly_cash_closures")
      .select("*")
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastClosureResult.error) {
      throw lastClosureResult.error;
    }

    const reportsByRegister = new Map<string, CashDailyReport[]>();
    reports.forEach((report) => {
      const current = reportsByRegister.get(report.cash_register_id) ?? [];
      reportsByRegister.set(report.cash_register_id, [...current, report]);
    });

    const registerSummaries = registers.map((register) => {
      const branch = registerBranchMap.get(register.id) ?? branches.find((item) => item.id === register.branch_id) ?? branches[0] ?? seedBranches[0];
      const registerReports = (reportsByRegister.get(register.id) ?? []).sort((left, right) => left.report_date.localeCompare(right.report_date));
      const loadedDaysCount = registerReports.filter((report) => report.status !== "pendiente").length;
      const pendingDaysCount = 7 - loadedDaysCount;
      const reviewedDaysCount = registerReports.filter((report) => report.status === "revisado").length;
      const totalOperatedArs = registerReports.reduce((sum, report) => sum + Number(report.total_operated_ars ?? 0), 0);
      const totalProfitArs = registerReports.reduce((sum, report) => sum + Number(report.total_profit_ars ?? 0), 0);
      const status = closure?.status ?? inferRegisterStatus(registerReports);

      return {
        cashRegister: {
          ...register,
          responsible_name: register.responsible_user_id ? profileMap.get(register.responsible_user_id) ?? null : null
        },
        branch,
        reports: registerReports,
        totalOperatedArs,
        totalProfitArs,
        loadedDaysCount,
        pendingDaysCount,
        reviewedDaysCount,
        status
      } satisfies WeeklyCashClosureRegisterSummary;
    });

    const branchesSummary = branches.map((branch) => {
      const branchRegisters = registerSummaries.filter((item) => item.branch.id === branch.id);
      const totalOperatedArs = branchRegisters.reduce((sum, item) => sum + item.totalOperatedArs, 0);
      const totalProfitArs = branchRegisters.reduce((sum, item) => sum + item.totalProfitArs, 0);
      const loadedDaysCount = branchRegisters.reduce((sum, item) => sum + item.loadedDaysCount, 0);
      const pendingDaysCount = branchRegisters.reduce((sum, item) => sum + item.pendingDaysCount, 0);
      const reviewedDaysCount = branchRegisters.reduce((sum, item) => sum + item.reviewedDaysCount, 0);
      const status = closure?.status ?? (branchRegisters.some((item) => item.status === "revisar") ? "revisar" : "abierto");

      return {
        branch,
        registers: branchRegisters,
        totalOperatedArs,
        totalProfitArs,
        loadedDaysCount,
        pendingDaysCount,
        reviewedDaysCount,
        status
      } satisfies WeeklyCashClosureBranchSummary;
    });

    const totals = registerSummaries.reduce(
      (acc, register) => {
        acc.totalOperatedArs += register.totalOperatedArs;
        acc.totalProfitArs += register.totalProfitArs;
        acc.loadedDaysCount += register.loadedDaysCount;
        acc.pendingDaysCount += register.pendingDaysCount;
        acc.reviewedDaysCount += register.reviewedDaysCount;
        if (register.branch.name === "Centro") acc.centerProfitArs += register.totalProfitArs;
        if (register.branch.name === "Terminal") acc.terminalProfitArs += register.totalProfitArs;
        return acc;
      },
      {
        totalOperatedArs: 0,
        totalProfitArs: 0,
        centerProfitArs: 0,
        terminalProfitArs: 0,
        loadedDaysCount: 0,
        pendingDaysCount: 0,
        reviewedDaysCount: 0
      }
    );

    const status = closure?.status ?? (registerSummaries.some((item) => item.status === "revisar") ? "revisar" : registerSummaries.length ? "abierto" : "abierto");

    return {
      date,
      weekStartDate: range.weekStartDate,
      weekEndDate: range.weekEndDate,
      branches: branchesSummary,
      registerSummaries,
      closure,
      closureLines,
      lastClosure: (lastClosureResult.data ?? null) as WeeklyCashClosure | null,
      totals,
      status,
      source: "database"
    };
  } catch {
    return emptyData(date);
  }
}

export function getWeeklyClosureLabelFromData(data: WeeklyCashClosureViewData) {
  return `${data.weekStartDate} a ${data.weekEndDate}`;
}

export function getWeeklyClosureTone(status: WeeklyCashClosureStatus) {
  return getWeeklyCashClosureStatusTone(status);
}

export function isWeeklyCashClosureLockedStatus(status: WeeklyCashClosureStatus | null | undefined) {
  return status === "cerrado";
}

export async function getWeeklyCashClosureRecordForDate(date: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const weekStart = getWeeklyCashClosureRange(date).weekStartDate;
  const { data, error } = await admin.from("weekly_cash_closures").select("*").eq("week_start_date", weekStart).maybeSingle();
  if (error) return null;
  return (data as WeeklyCashClosure | null) ?? null;
}

export async function getWeeklyCashClosureLockState(date: string) {
  const closure = await getWeeklyCashClosureRecordForDate(date);
  return {
    closure,
    locked: isWeeklyCashClosureLockedStatus(closure?.status)
  };
}
