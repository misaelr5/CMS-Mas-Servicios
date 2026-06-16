"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit/audit-log";
import { getServerAuthContext } from "@/lib/auth/server";
import { ensureCurrentUserProfile } from "@/lib/auth/profile";
import { type Role } from "@/lib/auth/roles";
import type { CashDailyReportStatus } from "@/lib/db/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { seedCashReportCategories } from "@/lib/operations/seed-data";
import {
  calculateCashDailyReportTotals,
  cashDailyReportStatuses,
  parseMoneyInput,
  sortCashReportCategories
} from "@/lib/cash/cash-calculations";
import {
  getDailyReportRecordByBranchDate,
  isDailyReportLockedStatus
} from "@/lib/finance/daily-report-service";

type ActionState = {
  ok: boolean;
  message: string;
  reportId?: string;
};

const canWrite = (role: Role) => role === "admin" || role === "encargado" || role === "cajero";
const canReview = (role: Role) => role === "admin" || role === "encargado";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function todayIsoInBuenosAires() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function getSubmitStatus(value: string): CashDailyReportStatus {
  if (cashDailyReportStatuses.includes(value as CashDailyReportStatus)) {
    return value as CashDailyReportStatus;
  }
  return "parcial";
}

function isMissingCashTablesError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("cash_daily_reports") ||
    message.includes("cash_daily_report_lines") ||
    message.includes("cash_report_categories")
  ) && (message.includes("schema cache") || message.includes("could not find the table"));
}

async function getCashCategories() {
  const admin = getSupabaseAdminClient();
  if (!admin) return sortCashReportCategories(seedCashReportCategories);

  const { data, error } = await admin
    .from("cash_report_categories")
    .select("id,name,sort_order,active,created_at")
    .eq("active", true)
    .order("sort_order")
    .order("name");

  if (error || !data?.length) {
    return sortCashReportCategories(seedCashReportCategories);
  }

  return sortCashReportCategories(data as typeof seedCashReportCategories);
}

export async function saveCashDailyReportAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canWrite(auth.role)) {
    return { ok: false, message: "No tenes permiso para cargar cajas." };
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { ok: false, message: "Falta configurar Supabase en el servidor." };
  }

  const profileSync = await ensureCurrentUserProfile(admin, auth);
  if (!profileSync.ok) {
    return profileSync;
  }

  const cashRegisterId = getString(formData, "cash_register_id");
  const reportDate = getString(formData, "report_date") || todayIsoInBuenosAires();
  const submitMode = getSubmitStatus(getString(formData, "submit_mode"));
  const generalNote = getString(formData, "general_note");
  const negativeProfitReason = getString(formData, "negative_profit_reason");

  if (!cashRegisterId) {
    return { ok: false, message: "Elegí una caja." };
  }

  if (submitMode === "revisado" && !canReview(auth.role)) {
    return { ok: false, message: "No tenes permiso para marcar como revisado." };
  }

  const [{ data: registerDataRaw, error: registerError }, categories] = await Promise.all([
    admin
      .from("cash_registers")
      .select("id,branch_id,register_number,name,slug,status,responsible_user_id")
      .eq("id", cashRegisterId)
      .maybeSingle(),
    getCashCategories()
  ]);

  if (registerError) {
    if (isMissingCashTablesError(registerError)) {
      return {
        ok: false,
        message: "Falta aplicar la migracion de cajas. Ejecuta supabase/migrations/20260612_cash_pay_facil.sql."
      };
    }
    return { ok: false, message: `No se pudo leer la caja: ${registerError.message}` };
  }

  const registerData = registerDataRaw as
    | {
        id: string;
        branch_id: string;
        register_number: number | null;
        name: string;
        slug: string;
        status: string;
        responsible_user_id: string | null;
      }
    | null;

  if (!registerData) {
    return { ok: false, message: "La caja no existe." };
  }

  if (auth.role === "cajero" && registerData.responsible_user_id !== auth.userId) {
    return { ok: false, message: "Como cajero solo podes cargar tu caja asignada." };
  }

  const lockedReport = await getDailyReportRecordByBranchDate(registerData.branch_id, reportDate);
  if (lockedReport && isDailyReportLockedStatus(lockedReport.status)) {
    return { ok: false, message: "Este reporte diario esta cerrado. Reabrilo para modificarlo." };
  }

  const reportRows = categories.map((category) => {
    const operatedAmount = parseMoneyInput(formData.get(`operated_amount_ars_${category.id}`));
    const profitAmount = parseMoneyInput(formData.get(`profit_amount_ars_${category.id}`));
    const note = getString(formData, `notes_${category.id}`);

    return {
      category,
      operatedAmount,
      profitAmount,
      note
    };
  });

  const hasPositiveValue = reportRows.some((row) => row.operatedAmount > 0 || row.profitAmount !== 0 || row.note.length > 0);
  if (!hasPositiveValue && !generalNote) {
    return { ok: false, message: "Completá al menos una categoría o dejá una nota general." };
  }

  if (reportRows.some((row) => row.operatedAmount < 0)) {
    return { ok: false, message: "No se permiten montos negativos." };
  }

  const hasNegativeProfit = reportRows.some((row) => row.profitAmount < 0);
  if (hasNegativeProfit && auth.role === "cajero") {
    return { ok: false, message: "Las ganancias negativas solo las puede cargar admin o encargado con motivo." };
  }
  if (hasNegativeProfit && canReview(auth.role) && !negativeProfitReason) {
    return { ok: false, message: "Si cargás una ganancia negativa, indicá el motivo." };
  }

  const totalRows = calculateCashDailyReportTotals(
    reportRows.map((row) => ({
      operated_amount_ars: row.operatedAmount,
      profit_amount_ars: row.profitAmount
    }))
  );

  const { data: existingReportRaw, error: existingError } = await admin
    .from("cash_daily_reports")
    .select("*")
    .eq("cash_register_id", cashRegisterId)
    .eq("report_date", reportDate)
    .maybeSingle();

  if (existingError) {
    return { ok: false, message: `No se pudo revisar el reporte actual: ${existingError.message}` };
  }

  const existingReport = existingReportRaw as
    | {
        id: string;
        cash_register_id: string;
        branch_id: string;
        report_date: string;
        total_operated_ars: number;
        total_profit_ars: number;
        status: CashDailyReportStatus;
        created_by: string | null;
        created_at: string;
        updated_at: string;
      }
    | null;

  const reportPayload = {
    cash_register_id: cashRegisterId,
    branch_id: registerData.branch_id,
    report_date: reportDate,
    total_operated_ars: totalRows.operated,
    total_profit_ars: totalRows.profit,
    status: submitMode,
    updated_at: new Date().toISOString()
  };

  let reportId = existingReport?.id ?? null;
  let savedReport = existingReport ?? null;

  if (existingReport) {
    const { data, error } = await (admin.from("cash_daily_reports") as any)
      .update(reportPayload)
      .eq("id", existingReport.id)
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, message: `No se pudo actualizar el reporte: ${error?.message ?? "error desconocido"}` };
    }

    savedReport = data as typeof existingReport;
    reportId = data.id;
  } else {
    const { data, error } = await (admin.from("cash_daily_reports") as any)
      .insert({
        ...reportPayload,
        created_by: auth.userId
      })
      .select("*")
      .single();

    if (error || !data) {
      if (error && isMissingCashTablesError(error)) {
        return {
          ok: false,
          message: "Falta aplicar la migracion de cajas. Ejecuta supabase/migrations/20260612_cash_pay_facil.sql."
        };
      }
      return { ok: false, message: `No se pudo crear el reporte: ${error?.message ?? "error desconocido"}` };
    }

    savedReport = data as typeof existingReport;
    reportId = data.id;
  }

  if (!reportId) {
    return { ok: false, message: "No se pudo identificar el reporte guardado." };
  }

  const linePayloads = reportRows.map((row) => ({
    cash_daily_report_id: reportId,
    category_id: row.category.id,
    operated_amount_ars: row.operatedAmount,
    profit_amount_ars: row.profitAmount,
    notes: row.note || null
  }));

  const { error: lineError } = await (admin.from("cash_daily_report_lines") as any).upsert(linePayloads, {
    onConflict: "cash_daily_report_id,category_id"
  });

  if (lineError) {
    return { ok: false, message: `No se pudieron guardar las líneas: ${lineError.message}` };
  }

  const oldStatus = existingReport?.status ?? "pendiente";
  const newStatus = submitMode;
  const oldData = existingReport ?? null;
  const newData = {
    ...(savedReport ?? {}),
    total_operated_ars: totalRows.operated,
    total_profit_ars: totalRows.profit,
    status: newStatus,
    negative_profit_reason: negativeProfitReason || null,
    general_note: generalNote || null
  };

  if (!existingReport) {
    await createAuditLog({
      actorId: auth.userId,
      action: "cash_daily_report.created",
      entityType: "cash_daily_report",
      entityId: reportId,
      newData
    });
  } else {
    await createAuditLog({
      actorId: auth.userId,
      action: "cash_daily_report.updated",
      entityType: "cash_daily_report",
      entityId: reportId,
      oldData,
      newData
    });
  }

  if (oldStatus !== newStatus) {
    await createAuditLog({
      actorId: auth.userId,
      action: newStatus === "revisado" ? "cash_daily_report.reviewed" : "cash_daily_report.status_changed",
      entityType: "cash_daily_report",
      entityId: reportId,
      oldData: { status: oldStatus },
      newData: { status: newStatus }
    });
  }

  if (generalNote) {
    const { data: noteData, error: noteError } = await (admin.from("notes") as any)
      .insert({
        entity_type: "cash_daily_report",
        entity_id: reportId,
        entity_label: `Caja ${registerData.register_number ?? "?"} — ${registerData.name}`,
        entity_href: `/cajas/${cashRegisterId}`,
        title: `Nota de carga ${reportDate}`,
        body: generalNote,
        priority: "normal",
        status: "abierta",
        created_by: auth.userId
      })
      .select("*")
      .single();

    if (!noteError && noteData) {
      await createAuditLog({
        actorId: auth.userId,
        action: "note.created",
        entityType: "note",
        entityId: noteData.id,
        newData: noteData as Record<string, unknown>
      });
    }
  }

  revalidatePath("/cajas");
  revalidatePath(`/cajas/${cashRegisterId}`);
  revalidatePath(`/cajas/${cashRegisterId}/cargar`);
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: submitMode === "revisado" ? "Reporte marcado como revisado." : submitMode === "cargado" ? "Reporte guardado como cargado." : "Reporte guardado como parcial.",
    reportId: reportId ?? undefined
  };
}
