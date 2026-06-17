import type { Role } from "@/lib/auth/roles";
import type { Branch, ExpenseStatus } from "@/lib/db/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getBagsOverview } from "@/lib/bags/bag-service";
import { getCashModuleData } from "@/lib/cash/cash-service";
import { getExpensePageData } from "@/lib/finance/expense-service";
import { getDailyReportViewData } from "@/lib/finance/daily-report-service";
import { getWeeklyCashClosureViewData } from "@/lib/finance/weekly-cash-closure-service";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import { formatCurrencyARS, formatDateAR, formatUSD } from "@/lib/exportaciones/export-utils";
import { seedBranches } from "@/lib/operations/seed-data";

type AccessContext = {
  role: Role;
  userId: string;
};

type DateRange = {
  from: string;
  to: string;
};

type MaybeRow = Record<string, unknown>;

function sortBranches(branches: Branch[]) {
  return [...branches].sort((left, right) => left.name.localeCompare(right.name));
}

function getBranchNameMap(branches: Branch[]) {
  return new Map(branches.map((branch) => [branch.id, branch.name] as const));
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function buildDailyReportExport(date: string, auth: AccessContext) {
  const [reportData, cashData, expenseData] = await Promise.all([
    getDailyReportViewData(date, auth),
    getCashModuleData(auth),
    getExpensePageData({ date }, auth)
  ]);

  const rows: Array<Record<string, unknown>> = [
    {
      row_type: "reporte_diario",
      fecha: date,
      sucursal: "General",
      estado: reportData.branches.map((branch) => `${branch.branch.name}:${branch.dailyReport?.status ?? "abierto"}`).join(" | "),
      ganancia_pf_automatica: reportData.totals.automaticPfProfitArs,
      ajuste_pf: reportData.totals.manualPfAdjustmentArs,
      ganancia_divisas_automatica: reportData.totals.automaticCurrencyProfitArs,
      ajuste_divisas: reportData.totals.manualCurrencyAdjustmentArs,
      gastos: reportData.totals.expensesArs,
      ganancia_libre: reportData.totals.availableProfitArs,
      cajas: cashData.summary.registers_loaded_today,
      notas_importantes: 0
    }
  ];

  reportData.branches.forEach((branch) => {
    rows.push({
      row_type: "sucursal",
      fecha: date,
      sucursal: branch.branch.name,
      estado: branch.dailyReport?.status ?? "abierto",
      ganancia_pf_automatica: branch.automaticPfProfitArs,
      ajuste_pf: branch.manualPfAdjustmentArs,
      ganancia_divisas_automatica: branch.automaticCurrencyProfitArs,
      ajuste_divisas: branch.manualCurrencyAdjustmentArs,
      gastos: branch.expensesArs,
      ganancia_libre: branch.availableProfitArs,
      cajas: branch.cashRegisters.length,
      notas_importantes: branch.adjustments.length
    });
  });

  expenseData.expenses.forEach((expense) => {
    rows.push({
      row_type: "gasto",
      fecha: expense.date,
      sucursal: expense.branch_name,
      estado: expense.status,
      categoria: expense.category,
      detalle: expense.detail,
      monto_ars: expense.amount_ars,
      pagado_desde: expense.paid_from,
      creado_por: expense.created_by ?? ""
    });
  });

  return {
    filename: `reporte-diario-${date}.csv`,
    headers: [
      "row_type",
      "fecha",
      "sucursal",
      "estado",
      "ganancia_pf_automatica",
      "ajuste_pf",
      "ganancia_divisas_automatica",
      "ajuste_divisas",
      "gastos",
      "ganancia_libre",
      "cajas",
      "notas_importantes",
      "categoria",
      "detalle",
      "monto_ars",
      "pagado_desde",
      "creado_por"
    ],
    rows,
    title: "Reporte diario",
    subtitle: `Fecha ${formatDateAR(date)}`
  };
}

export async function buildWeeklyClosureExport(date: string, auth: AccessContext) {
  const closureData = await getWeeklyCashClosureViewData(date, auth);
  const rows: Array<Record<string, unknown>> = [
    {
      row_type: "cierre_semanal",
      fecha_inicio: closureData.weekStartDate,
      fecha_fin: closureData.weekEndDate,
      estado: closureData.status,
      total_operado: closureData.totals.totalOperatedArs,
      ganancia_total: closureData.totals.totalProfitArs,
      ganancia_centro: closureData.totals.centerProfitArs,
      ganancia_terminal: closureData.totals.terminalProfitArs,
      notas: closureData.closure?.notes ?? ""
    }
  ];

  closureData.registerSummaries.forEach((register) => {
    rows.push({
      row_type: "caja",
      fecha_inicio: closureData.weekStartDate,
      fecha_fin: closureData.weekEndDate,
      caja: `Caja ${register.cashRegister.register_number ?? "?"}`,
      responsable: register.cashRegister.responsible_name ?? register.cashRegister.name,
      sucursal: register.branch.name,
      total_operado: register.totalOperatedArs,
      ganancia_total: register.totalProfitArs,
      dias_cargados: register.loadedDaysCount,
      dias_pendientes: register.pendingDaysCount,
      dias_revisados: register.reviewedDaysCount,
      estado: register.status
    });
  });

  closureData.closureLines.forEach((line) => {
    rows.push({
      row_type: "linea",
      caja: line.cash_register_id,
      sucursal: line.branch_id,
      total_operado: line.total_operated_ars,
      ganancia_total: line.total_profit_ars,
      dias_cargados: line.loaded_days_count,
      dias_pendientes: line.pending_days_count,
      dias_revisados: line.reviewed_days_count,
      estado: line.status,
      notas: line.notes ?? ""
    });
  });

  return {
    filename: `cierre-semanal-${closureData.weekStartDate}-a-${closureData.weekEndDate}.csv`,
    headers: [
      "row_type",
      "fecha_inicio",
      "fecha_fin",
      "estado",
      "total_operado",
      "ganancia_total",
      "ganancia_centro",
      "ganancia_terminal",
      "notas",
      "caja",
      "responsable",
      "sucursal",
      "dias_cargados",
      "dias_pendientes",
      "dias_revisados"
    ],
    rows,
    title: "Cierre semanal Pago Facil",
    subtitle: `${closureData.weekStartDate} a ${closureData.weekEndDate}`
  };
}

export async function buildExpensesExport(filters: { from: string; to: string; branchId?: string; status?: ExpenseStatus | "all"; category?: string }, auth: AccessContext) {
  const expenseData = await getExpensePageData({ dateFrom: filters.from, dateTo: filters.to, branchId: filters.branchId, status: filters.status, category: filters.category }, auth);
  const rows: Array<Record<string, unknown>> = expenseData.expenses.map((expense) => ({
    fecha: expense.date,
    sucursal: expense.branch_name,
    monto_ars: expense.amount_ars,
    categoria: expense.category,
    detalle: expense.detail,
    estado: expense.status,
    pagado_desde: expense.paid_from,
    usuario_creador: expense.created_by ?? "",
    fecha_creacion: expense.created_at,
    motivo_anulacion: expense.annulment_reason ?? ""
  }));

  return {
    filename: `gastos-${filters.from}-a-${filters.to}.csv`,
    headers: ["fecha", "sucursal", "monto_ars", "categoria", "detalle", "estado", "pagado_desde", "usuario_creador", "fecha_creacion", "motivo_anulacion"],
    rows,
    title: "Gastos",
    subtitle: `${formatDateAR(filters.from)} a ${formatDateAR(filters.to)}`
  };
}

export async function buildCashLoadsExport(filters: { from: string; to: string; branchId?: string; cashRegisterId?: string; status?: string }, auth: AccessContext) {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const [branchesResult, registersResult, reportsResult, linesResult, categoriesResult] = await Promise.all([
    admin.from("branches").select("id,name,slug,status").order("name"),
    admin.from("cash_registers").select("id,branch_id,register_number,name,slug,status,responsible_user_id,created_at,updated_at").order("register_number", { ascending: true }),
    admin
      .from("cash_daily_reports")
      .select("id,cash_register_id,branch_id,report_date,total_operated_ars,total_profit_ars,status,created_by,created_at,updated_at")
      .gte("report_date", filters.from)
      .lte("report_date", filters.to)
      .order("report_date", { ascending: false }),
    admin
      .from("cash_daily_report_lines")
      .select("id,cash_daily_report_id,category_id,operated_amount_ars,profit_amount_ars,notes,created_at,updated_at"),
    admin.from("cash_report_categories").select("id,name,sort_order,active,created_at").order("sort_order")
  ]);

  if (branchesResult.error || registersResult.error || reportsResult.error || linesResult.error || categoriesResult.error) {
    return null;
  }

  const branches = sortBranches((branchesResult.data ?? []) as Branch[]);
  const branchMap = getBranchNameMap(branches);
  const registerMap = new Map((registersResult.data ?? []).map((row: MaybeRow) => [getString(row.id), row] as const));
  const categoryMap = new Map((categoriesResult.data ?? []).map((row: MaybeRow) => [getString(row.id), row] as const));
  const linesByReport = new Map<string, MaybeRow[]>();
  (linesResult.data ?? []).forEach((row: MaybeRow) => {
    const reportId = getString(row.cash_daily_report_id);
    const current = linesByReport.get(reportId) ?? [];
    linesByReport.set(reportId, [...current, row]);
  });

  const rows: Array<Record<string, unknown>> = [];
  (reportsResult.data ?? []).forEach((report: MaybeRow) => {
    const register = registerMap.get(getString(report.cash_register_id));
    const branchId = getString(report.branch_id);
    if (filters.branchId && branchId !== filters.branchId) return;
    if (filters.cashRegisterId && getString(report.cash_register_id) !== filters.cashRegisterId) return;
    if (filters.status && filters.status !== "all" && getString(report.status) !== filters.status) return;

    rows.push({
      fecha: getString(report.report_date),
      caja: `Caja ${register?.register_number ?? "?"}`,
      responsable: register?.responsible_user_id ?? "",
      sucursal: branchMap.get(branchId) ?? "Sin sucursal",
      estado: getString(report.status),
      total_operado: Number(report.total_operated_ars ?? 0),
      ganancia: Number(report.total_profit_ars ?? 0),
      categoria: "",
      monto_operado_categoria: "",
      ganancia_categoria: "",
      observacion: ""
    });

    (linesByReport.get(getString(report.id)) ?? []).forEach((line) => {
      const category = categoryMap.get(getString(line.category_id));
      rows.push({
        fecha: getString(report.report_date),
        caja: `Caja ${register?.register_number ?? "?"}`,
        responsable: register?.responsible_user_id ?? "",
        sucursal: branchMap.get(branchId) ?? "Sin sucursal",
        estado: getString(report.status),
        total_operado: Number(report.total_operated_ars ?? 0),
        ganancia: Number(report.total_profit_ars ?? 0),
        categoria: category ? getString(category.name) : "Categoria",
        monto_operado_categoria: Number(line.operated_amount_ars ?? 0),
        ganancia_categoria: Number(line.profit_amount_ars ?? 0),
        observacion: getString(line.notes)
      });
    });
  });

  return {
    filename: `cargas-cajas-${filters.from}-a-${filters.to}.csv`,
    headers: [
      "fecha",
      "caja",
      "responsable",
      "sucursal",
      "estado",
      "total_operado",
      "ganancia",
      "categoria",
      "monto_operado_categoria",
      "ganancia_categoria",
      "observacion"
    ],
    rows,
    title: "Cargas de cajas",
    subtitle: `${formatDateAR(filters.from)} a ${formatDateAR(filters.to)}`
  };
}

export async function buildBagsExport(filters: { from: string; to: string; bagId?: string; operationType?: string }, auth: AccessContext) {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const [bagsResult, operationsResult, profilesResult] = await Promise.all([
    admin.from("bags").select("id,name,slug,responsible_user_id,status").order("name"),
    admin
      .from("bag_operations")
      .select("*")
      .gte("created_at", `${filters.from}T00:00:00`)
      .lte("created_at", `${filters.to}T23:59:59`)
      .order("created_at", { ascending: false }),
    admin.from("profiles").select("id,full_name,email")
  ]);

  if (bagsResult.error || operationsResult.error || profilesResult.error) return null;

  const bagMap = new Map((bagsResult.data ?? []).map((row: MaybeRow) => [getString(row.id), row] as const));
  const profileMap = new Map(
    (profilesResult.data ?? []).map((row: MaybeRow) => [getString(row.id), getString(row.full_name) || getString(row.email)] as const)
  );

  const rows = ((operationsResult.data ?? []) as MaybeRow[])
    .filter((operation) => {
      if (filters.bagId && getString(operation.bag_id) !== filters.bagId) return false;
      if (filters.operationType && filters.operationType !== "all" && getString(operation.operation_type) !== filters.operationType) return false;
      return true;
    })
    .map((operation) => {
      const bag = bagMap.get(getString(operation.bag_id));
      return {
        fecha: getString(operation.created_at),
        bolsa: bag ? getString(bag.name) : "Bolsa",
        responsable: bag ? profileMap.get(getString(bag.responsible_user_id)) ?? "" : "",
        tipo_operacion: getString(operation.operation_type),
        usd: Number(operation.amount_usd ?? 0),
        cotizacion: Number(operation.rate_ars ?? 0),
        total_ars: Number(operation.total_ars ?? 0),
        efectivo_anterior: Number(operation.previous_cash_ars ?? 0),
        efectivo_nuevo: Number(operation.new_cash_ars ?? 0),
        cuenta_anterior: Number(operation.previous_account_ars ?? 0),
        cuenta_nueva: Number(operation.new_account_ars ?? 0),
        usd_anterior: Number(operation.previous_usd ?? 0),
        usd_nuevo: Number(operation.new_usd ?? 0),
        ganancia_reportable: Number(operation.profit_ars ?? 0),
        interna: Boolean(operation.is_internal ?? false),
        afecta_ganancia: Boolean(operation.affects_profit ?? true),
        nota: getString(operation.notes)
      };
    });

  return {
    filename: `bolsas-${filters.from}-a-${filters.to}.csv`,
    headers: [
      "fecha",
      "bolsa",
      "responsable",
      "tipo_operacion",
      "usd",
      "cotizacion",
      "total_ars",
      "efectivo_anterior",
      "efectivo_nuevo",
      "cuenta_anterior",
      "cuenta_nueva",
      "usd_anterior",
      "usd_nuevo",
      "ganancia_reportable",
      "interna",
      "afecta_ganancia",
      "nota"
    ],
    rows,
    title: "Bolsas de divisas",
    subtitle: `${formatDateAR(filters.from)} a ${formatDateAR(filters.to)}`
  };
}
