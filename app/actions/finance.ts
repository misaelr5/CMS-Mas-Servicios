"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit/audit-log";
import { getServerAuthContext } from "@/lib/auth/server";
import { ensureCurrentUserProfile } from "@/lib/auth/profile";
import { type Role } from "@/lib/auth/roles";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  dailyReportAdjustmentTypeLabels,
  dailyReportStatusOptions
} from "@/lib/finance/daily-report-calculations";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import {
  getDailyReportViewData,
  getDailyReportRecordByBranchDate,
  isDailyReportLockedStatus,
  recalculateDailyReportBranch
} from "@/lib/finance/daily-report-service";

type ActionState = {
  ok: boolean;
  message: string;
};

const canWriteReports = (role: Role) => role === "admin" || role === "encargado";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) ? value : 0;
}

function safePath(path: string) {
  return path.startsWith("/") ? path : "/reporte-diario";
}

function getDateValue(formData: FormData, key = "date") {
  const value = getString(formData, key);
  return value || getBuenosAiresDateString();
}

function normalizeReportStatus(value: string) {
  return dailyReportStatusOptions.includes(value as (typeof dailyReportStatusOptions)[number])
    ? (value as (typeof dailyReportStatusOptions)[number])
    : "abierto";
}

function isMissingDailyReportTablesError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("daily_reports") ||
    message.includes("report_adjustments") ||
    message.includes("expenses")
  ) && (message.includes("schema cache") || message.includes("could not find the table"));
}

function reportLockedMessage() {
  return "Este reporte diario esta cerrado. Reabrilo para modificarlo.";
}

async function ensureProfile(auth: NonNullable<Awaited<ReturnType<typeof getServerAuthContext>>>) {
  const admin = getSupabaseAdminClient();
  const profileSync = await ensureCurrentUserProfile(admin, auth);
  if (!profileSync.ok) {
    return { ok: false as const, message: profileSync.message };
  }
  return { ok: true as const, admin: admin as NonNullable<typeof admin> };
}

async function getDailyReportId(admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, branchId: string, date: string) {
  const { data, error } = await (admin.from("daily_reports") as any)
    .select("id,branch_id,report_date")
    .eq("branch_id", branchId)
    .eq("report_date", date)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id as string | null;
}

async function ensureDailyReportRow({
  admin,
  auth,
  branchId,
  date,
  status
}: {
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>;
  auth: NonNullable<Awaited<ReturnType<typeof getServerAuthContext>>>;
  branchId: string;
  date: string;
  status?: string;
}) {
  const result = await recalculateDailyReportBranch({
    branchId,
    date,
    actorId: auth.userId,
    status: normalizeReportStatus(status ?? "abierto")
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true as const };
}

export async function saveDailyReportAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canWriteReports(auth.role)) {
    return { ok: false, message: "No tenes permiso para guardar reportes diarios." };
  }

  const profile = await ensureProfile(auth);
  if (!profile.ok) return profile;
  const admin = profile.admin;

  const branchId = getString(formData, "branch_id");
  const date = getDateValue(formData);
  const status = normalizeReportStatus(getString(formData, "status"));
  const currentPath = safePath(getString(formData, "current_path"));

  if (!branchId) {
    return { ok: false, message: "Elegí una sucursal." };
  }

  const lockedReport = await getDailyReportRecordByBranchDate(branchId, date);
  if (lockedReport && isDailyReportLockedStatus(lockedReport.status)) {
    return { ok: false, message: reportLockedMessage() };
  }

  const beforeId = await getDailyReportId(admin, branchId, date);
  const recalc = await ensureDailyReportRow({ admin, auth, branchId, date, status });
  if (!recalc.ok) {
    return recalc;
  }

  const afterId = await getDailyReportId(admin, branchId, date);
  const action = beforeId ? "daily_report.updated" : "daily_report.created";

  await createAuditLog({
    actorId: auth.userId,
    action,
    entityType: "daily_report",
    entityId: afterId,
    newData: {
      branch_id: branchId,
      report_date: date,
      status
    }
  });

  revalidatePath("/reporte-diario");
  revalidatePath("/dashboard");
  revalidatePath(currentPath);

  return { ok: true, message: beforeId ? "Reporte diario actualizado." : "Reporte diario creado." };
}

export async function createDailyReportAdjustmentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canWriteReports(auth.role)) {
    return { ok: false, message: "No tenes permiso para crear ajustes manuales." };
  }

  const profile = await ensureProfile(auth);
  if (!profile.ok) return profile;
  const admin = profile.admin;

  const branchId = getString(formData, "branch_id");
  const date = getDateValue(formData);
  const adjustmentType = getString(formData, "adjustment_type");
  const amount = getNumber(formData, "amount_ars");
  const reason = getString(formData, "reason");
  const currentPath = safePath(getString(formData, "current_path"));

  if (!branchId || !reason || amount <= 0) {
    return { ok: false, message: "Elegí sucursal, monto mayor a 0 y motivo." };
  }

  if (!dailyReportAdjustmentTypeLabels[adjustmentType as keyof typeof dailyReportAdjustmentTypeLabels]) {
    return { ok: false, message: "Tipo de ajuste inválido." };
  }

  const lockedReport = await getDailyReportRecordByBranchDate(branchId, date);
  if (lockedReport && isDailyReportLockedStatus(lockedReport.status)) {
    return { ok: false, message: reportLockedMessage() };
  }

  const reportId = await getDailyReportId(admin, branchId, date);
  const reportEnsure = reportId
    ? { ok: true as const }
    : await ensureDailyReportRow({ admin, auth, branchId, date, status: "abierto" });
  if (!reportEnsure.ok) return reportEnsure;

  const dailyReportId = reportId ?? (await getDailyReportId(admin, branchId, date));
  if (!dailyReportId) {
    return { ok: false, message: "No se pudo resolver el reporte diario." };
  }

  const recentAdjustmentCutoff = new Date(Date.now() - 10_000).toISOString();
  const { data: duplicateAdjustment } = await (admin.from("report_adjustments") as any)
    .select("*")
    .eq("daily_report_id", dailyReportId)
    .eq("adjustment_type", adjustmentType)
    .eq("amount_ars", amount)
    .eq("reason", reason)
    .eq("created_by", auth.userId)
    .gte("created_at", recentAdjustmentCutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (duplicateAdjustment) {
    return { ok: true, message: "El ajuste ya estaba registrado." };
  }

  const { data, error } = await (admin.from("report_adjustments") as any)
    .insert({
      daily_report_id: dailyReportId,
      adjustment_type: adjustmentType,
      amount_ars: amount,
      reason,
      created_by: auth.userId
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingDailyReportTablesError(error)) {
      return {
        ok: false,
        message: "Falta aplicar la migracion de reporte diario. Ejecuta supabase/migrations/20260613_daily_reports_expenses.sql."
      };
    }
    return { ok: false, message: `No se pudo crear el ajuste: ${error.message}` };
  }

  await createAuditLog({
    actorId: auth.userId,
    action: "daily_report_adjustment.created",
    entityType: "daily_report_adjustment",
    entityId: data.id,
    newData: data as Record<string, unknown>
  });

  await ensureDailyReportRow({ admin, auth, branchId, date });

  revalidatePath("/reporte-diario");
  revalidatePath("/dashboard");
  revalidatePath(currentPath);

  return { ok: true, message: "Ajuste manual guardado." };
}

export async function annulDailyReportAdjustmentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canWriteReports(auth.role)) {
    return { ok: false, message: "No tenes permiso para anular ajustes." };
  }

  const profile = await ensureProfile(auth);
  if (!profile.ok) return profile;
  const admin = profile.admin;

  const adjustmentId = getString(formData, "adjustment_id");
  const reason = getString(formData, "reason");
  const branchId = getString(formData, "branch_id");
  const date = getDateValue(formData);
  const currentPath = safePath(getString(formData, "current_path"));

  if (!adjustmentId || !reason || !branchId) {
    return { ok: false, message: "Falta ajuste, motivo o sucursal." };
  }

  const lockedReport = await getDailyReportRecordByBranchDate(branchId, date);
  if (lockedReport && isDailyReportLockedStatus(lockedReport.status)) {
    return { ok: false, message: reportLockedMessage() };
  }

  const { data: oldData } = await (admin.from("report_adjustments") as any).select("*").eq("id", adjustmentId).maybeSingle();
  if (!oldData || oldData.annulled_at) {
    return { ok: false, message: "El ajuste no existe o ya fue anulado." };
  }

  const { data, error } = await (admin.from("report_adjustments") as any)
    .update({
      annulled_at: new Date().toISOString(),
      annulled_by: auth.userId,
      annulment_reason: reason
    })
    .eq("id", adjustmentId)
    .select("*")
    .single();

  if (error) {
    return { ok: false, message: `No se pudo anular el ajuste: ${error.message}` };
  }

  await createAuditLog({
    actorId: auth.userId,
    action: "daily_report_adjustment.annulled",
    entityType: "daily_report_adjustment",
    entityId: adjustmentId,
    oldData: oldData as Record<string, unknown>,
    newData: data as Record<string, unknown>,
    reason
  });

  await ensureDailyReportRow({ admin, auth, branchId, date });

  revalidatePath("/reporte-diario");
  revalidatePath("/dashboard");
  revalidatePath(currentPath);

  return { ok: true, message: "Ajuste anulado." };
}

export async function createExpenseAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canWriteReports(auth.role)) {
    return { ok: false, message: "No tenes permiso para crear gastos." };
  }

  const profile = await ensureProfile(auth);
  if (!profile.ok) return profile;
  const admin = profile.admin;

  const branchId = getString(formData, "branch_id");
  const date = getDateValue(formData);
  const amount = getNumber(formData, "amount_ars");
  const category = getString(formData, "category");
  const detail = getString(formData, "detail");
  const status = getString(formData, "status") || "pendiente";
  const paidFrom = getString(formData, "paid_from") || "otro";
  const note = getString(formData, "note");
  const currentPath = safePath(getString(formData, "current_path"));

  if (!branchId || !category || !detail || amount <= 0) {
    return { ok: false, message: "Completá sucursal, categoría, detalle y monto mayor a 0." };
  }

  const lockedReport = await getDailyReportRecordByBranchDate(branchId, date);
  if (lockedReport && isDailyReportLockedStatus(lockedReport.status)) {
    return { ok: false, message: reportLockedMessage() };
  }

  const recentExpenseCutoff = new Date(Date.now() - 10_000).toISOString();
  const { data: duplicateExpense } = await (admin.from("expenses") as any)
    .select("*")
    .eq("branch_id", branchId)
    .eq("date", date)
    .eq("amount_ars", amount)
    .eq("category", category)
    .eq("detail", detail)
    .eq("status", status)
    .eq("paid_from", paidFrom)
    .eq("created_by", auth.userId)
    .gte("created_at", recentExpenseCutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (duplicateExpense) {
    return { ok: true, message: "El gasto ya estaba registrado." };
  }

  const { data, error } = await (admin.from("expenses") as any)
    .insert({
      branch_id: branchId,
      date,
      amount_ars: amount,
      category,
      detail,
      status,
      paid_from: paidFrom,
      created_by: auth.userId
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingDailyReportTablesError(error)) {
      return {
        ok: false,
        message: "Falta aplicar la migracion de reporte diario y gastos. Ejecuta supabase/migrations/20260613_daily_reports_expenses.sql."
      };
    }
    return { ok: false, message: `No se pudo crear el gasto: ${error.message}` };
  }

  await createAuditLog({
    actorId: auth.userId,
    action: "expense.created",
    entityType: "expense",
    entityId: data.id,
    newData: data as Record<string, unknown>
  });

  if (note) {
    const { data: noteData } = await (admin.from("notes") as any)
      .insert({
        entity_type: "expense",
        entity_id: data.id,
        entity_label: `${category} · ${date}`,
        entity_href: "/gastos",
        title: `Gasto ${category}`,
        body: note,
        priority: "normal",
        status: "abierta",
        created_by: auth.userId
      })
      .select("*")
      .single();

    if (noteData) {
      await createAuditLog({
        actorId: auth.userId,
        action: "note.created",
        entityType: "note",
        entityId: noteData.id,
        newData: noteData as Record<string, unknown>
      });
    }
  }

  await ensureDailyReportRow({ admin, auth, branchId, date });

  revalidatePath("/gastos");
  revalidatePath("/reporte-diario");
  revalidatePath("/dashboard");
  revalidatePath(currentPath);

  return { ok: true, message: "Gasto creado." };
}

export async function annulExpenseAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canWriteReports(auth.role)) {
    return { ok: false, message: "No tenes permiso para anular gastos." };
  }

  const profile = await ensureProfile(auth);
  if (!profile.ok) return profile;
  const admin = profile.admin;

  const expenseId = getString(formData, "expense_id");
  const reason = getString(formData, "reason");
  const branchId = getString(formData, "branch_id");
  const date = getDateValue(formData);
  const currentPath = safePath(getString(formData, "current_path"));

  if (!expenseId || !reason || !branchId) {
    return { ok: false, message: "Falta gasto, motivo o sucursal." };
  }

  const lockedReport = await getDailyReportRecordByBranchDate(branchId, date);
  if (lockedReport && isDailyReportLockedStatus(lockedReport.status)) {
    return { ok: false, message: reportLockedMessage() };
  }

  const { data: oldData } = await (admin.from("expenses") as any).select("*").eq("id", expenseId).maybeSingle();
  if (!oldData || oldData.status === "anulado") {
    return { ok: false, message: "El gasto no existe o ya fue anulado." };
  }

  const { data, error } = await (admin.from("expenses") as any)
    .update({
      status: "anulado",
      annulled_at: new Date().toISOString(),
      annulled_by: auth.userId,
      annulment_reason: reason
    })
    .eq("id", expenseId)
    .select("*")
    .single();

  if (error) {
    return { ok: false, message: `No se pudo anular el gasto: ${error.message}` };
  }

  await createAuditLog({
    actorId: auth.userId,
    action: "expense.annulled",
    entityType: "expense",
    entityId: expenseId,
    oldData: oldData as Record<string, unknown>,
    newData: data as Record<string, unknown>,
    reason
  });

  await ensureDailyReportRow({ admin, auth, branchId, date });

  revalidatePath("/gastos");
  revalidatePath("/reporte-diario");
  revalidatePath("/dashboard");
  revalidatePath(currentPath);

  return { ok: true, message: "Gasto anulado." };
}

export async function closeDailyReportAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canWriteReports(auth.role)) {
    return { ok: false, message: "No tenes permisos para cerrar el dia." };
  }

  const profile = await ensureProfile(auth);
  if (!profile.ok) return profile;
  const admin = profile.admin;

  const branchId = getString(formData, "branch_id");
  const date = getDateValue(formData);
  const closeNote = getString(formData, "close_note");
  const currentPath = safePath(getString(formData, "current_path"));

  if (!branchId) {
    return { ok: false, message: "Elegi una sucursal." };
  }

  const existingReport = await getDailyReportRecordByBranchDate(branchId, date);
  if (existingReport && isDailyReportLockedStatus(existingReport.status)) {
    return { ok: false, message: reportLockedMessage() };
  }

  const viewData = await getDailyReportViewData(date, { role: auth.role, userId: auth.userId });
  const branchSummary = viewData.branches.find((item) => item.branch.id === branchId);
  if (!branchSummary) {
    return { ok: false, message: "No se encontro la sucursal para cerrar." };
  }

  const hasPendingCash = branchSummary.cashRegisters.some(
    (register) => register.status === "pendiente" || register.status === "parcial"
  );
  const nextStatus = hasPendingCash ? "revisar" : "cerrado";

  const result = await recalculateDailyReportBranch({
    branchId,
    date,
    actorId: auth.userId,
    status: nextStatus,
    closedAt: new Date().toISOString(),
    closedBy: auth.userId,
    closeNote: closeNote || null
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  await createAuditLog({
    actorId: auth.userId,
    action: "daily_report.closed",
    entityType: "daily_report",
    entityId: result.report.id,
    oldData: existingReport as Record<string, unknown> | null,
    newData: result.report as Record<string, unknown>,
    reason: closeNote || null
  });

  if (closeNote) {
    const { data: noteData } = await (admin.from("notes") as any)
      .insert({
        entity_type: "daily_report",
        entity_id: result.report.id,
        entity_label: `${branchSummary.branch.name} · ${date}`,
        entity_href: "/reporte-diario",
        title: `Cierre diario ${branchSummary.branch.name}`,
        body: closeNote,
        priority: "normal",
        status: "abierta",
        created_by: auth.userId
      })
      .select("*")
      .single();

    if (noteData) {
      await createAuditLog({
        actorId: auth.userId,
        action: "note.created",
        entityType: "note",
        entityId: noteData.id,
        newData: noteData as Record<string, unknown>
      });
    }
  }

  revalidatePath("/reporte-diario");
  revalidatePath("/dashboard");
  revalidatePath(currentPath);

  return {
    ok: true,
    message: hasPendingCash
      ? "Hay cajas pendientes o parciales. El dia quedo marcado como revisar."
      : "Dia cerrado."
  };
}

export async function reopenDailyReportAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canWriteReports(auth.role)) {
    return { ok: false, message: "No tenes permisos para reabrir el dia." };
  }

  const profile = await ensureProfile(auth);
  if (!profile.ok) return profile;
  const admin = profile.admin;

  const branchId = getString(formData, "branch_id");
  const date = getDateValue(formData);
  const reopenReason = getString(formData, "reopen_reason");
  const currentPath = safePath(getString(formData, "current_path"));

  if (!branchId) {
    return { ok: false, message: "Elegi una sucursal." };
  }

  if (!reopenReason) {
    return { ok: false, message: "Tenes que indicar el motivo de reapertura." };
  }

  const existingReport = await getDailyReportRecordByBranchDate(branchId, date);
  if (!existingReport || !isDailyReportLockedStatus(existingReport.status)) {
    return { ok: false, message: "Solo podes reabrir un reporte cerrado o en revisar." };
  }

  const viewData = await getDailyReportViewData(date, { role: auth.role, userId: auth.userId });
  const branchSummary = viewData.branches.find((item) => item.branch.id === branchId);

  const result = await recalculateDailyReportBranch({
    branchId,
    date,
    actorId: auth.userId,
    status: "abierto",
    closedAt: null,
    closedBy: null,
    closeNote: null
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  await createAuditLog({
    actorId: auth.userId,
    action: "daily_report.reopened",
    entityType: "daily_report",
    entityId: result.report.id,
    oldData: existingReport as Record<string, unknown>,
    newData: result.report as Record<string, unknown>,
    reason: reopenReason
  });

  const { data: noteData } = await (admin.from("notes") as any)
    .insert({
      entity_type: "daily_report",
      entity_id: result.report.id,
      entity_label: `${branchSummary?.branch.name ?? branchId} · ${date}`,
      entity_href: "/reporte-diario",
      title: "Reapertura de reporte diario",
      body: reopenReason,
      priority: "normal",
      status: "abierta",
      created_by: auth.userId
    })
    .select("*")
    .single();

  if (noteData) {
    await createAuditLog({
      actorId: auth.userId,
      action: "note.created",
      entityType: "note",
      entityId: noteData.id,
      newData: noteData as Record<string, unknown>
    });
  }

  revalidatePath("/reporte-diario");
  revalidatePath("/dashboard");
  revalidatePath(currentPath);

  return { ok: true, message: "Dia reabierto." };
}
