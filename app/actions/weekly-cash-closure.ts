"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit/audit-log";
import { getServerAuthContext } from "@/lib/auth/server";
import { ensureCurrentUserProfile } from "@/lib/auth/profile";
import { type Role } from "@/lib/auth/roles";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import {
  getWeeklyCashClosureRecordForDate,
  getWeeklyCashClosureViewData
} from "@/lib/finance/weekly-cash-closure-service";
import { getWeeklyCashClosureRange } from "@/lib/finance/weekly-cash-closure-calculations";

type ActionState = {
  ok: boolean;
  message: string;
};

const canManageClosures = (role: Role) => role === "admin" || role === "encargado";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safePath(path: string) {
  return path.startsWith("/") ? path : "/cierres";
}

function isMissingWeeklyClosureTablesError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("weekly_cash_closures") ||
    message.includes("weekly_cash_closure_lines")
  ) && (message.includes("schema cache") || message.includes("could not find the table"));
}

async function ensureProfile(auth: NonNullable<Awaited<ReturnType<typeof getServerAuthContext>>>) {
  const admin = getSupabaseAdminClient();
  const profileSync = await ensureCurrentUserProfile(admin, auth);
  if (!profileSync.ok) {
    return { ok: false as const, message: profileSync.message };
  }

  return { ok: true as const, admin: admin as NonNullable<typeof admin> };
}

async function syncWeeklyClosureRows({
  admin,
  auth,
  date,
  status,
  notes,
  closeNote,
  reopenReason,
  reopened
}: {
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>;
  auth: NonNullable<Awaited<ReturnType<typeof getServerAuthContext>>>;
  date: string;
  status: "abierto" | "cerrado" | "revisar";
  notes: string | null;
  closeNote: string | null;
  reopenReason: string | null;
  reopened: boolean;
}) {
  const viewData = await getWeeklyCashClosureViewData(date, { role: auth.role, userId: auth.userId });
  const weekRange = getWeeklyCashClosureRange(date);
  const closureStatus = status;
  const allReviewed = viewData.registerSummaries.every(
    (summary) => summary.reports.length >= 7 && summary.reports.every((report) => report.status === "revisado")
  );
  const resolvedStatus = closureStatus === "cerrado" && !allReviewed ? "revisar" : closureStatus;
  const closureNotes = notes?.trim() ? notes.trim() : null;
  const payload = {
    week_start_date: weekRange.weekStartDate,
    week_end_date: weekRange.weekEndDate,
    status: resolvedStatus,
    total_operated_ars: viewData.totals.totalOperatedArs,
    total_profit_ars: viewData.totals.totalProfitArs,
    center_profit_ars: viewData.totals.centerProfitArs,
    terminal_profit_ars: viewData.totals.terminalProfitArs,
    notes: closureNotes,
    closed_at: resolvedStatus === "cerrado" || resolvedStatus === "revisar" ? new Date().toISOString() : null,
    closed_by: resolvedStatus === "cerrado" || resolvedStatus === "revisar" ? auth.userId : null,
    reopened_at: reopened ? new Date().toISOString() : null,
    reopened_by: reopened ? auth.userId : null,
    reopen_reason: reopenReason,
    created_by: auth.userId,
    updated_at: new Date().toISOString()
  };

  const { data: existingClosure, error: readError } = await admin
    .from("weekly_cash_closures")
    .select("*")
    .eq("week_start_date", weekRange.weekStartDate)
    .maybeSingle();

  if (readError) {
    if (isMissingWeeklyClosureTablesError(readError)) {
      return {
        ok: false as const,
        message: "Falta aplicar la migracion de cierre semanal en Supabase. Ejecuta supabase/migrations/20260617_weekly_cash_closures.sql."
      };
    }
    return { ok: false as const, message: `No se pudo leer el cierre semanal: ${readError.message}` };
  }

  const closureAction = existingClosure ? "updated" : "created";
  const { data: closureData, error: upsertError } = await (admin.from("weekly_cash_closures") as any)
    .upsert(payload, { onConflict: "week_start_date" })
    .select("*")
    .single();

  if (upsertError || !closureData) {
    if (isMissingWeeklyClosureTablesError(upsertError)) {
      return {
        ok: false as const,
        message: "Falta aplicar la migracion de cierre semanal en Supabase. Ejecuta supabase/migrations/20260617_weekly_cash_closures.sql."
      };
    }
    return { ok: false as const, message: upsertError?.message ?? "No se pudo guardar el cierre semanal." };
  }

  const closureId = closureData.id as string;
  const lineRows = viewData.registerSummaries.map((summary) => ({
    weekly_cash_closure_id: closureId,
    cash_register_id: summary.cashRegister.id,
    branch_id: summary.branch.id,
    total_operated_ars: summary.totalOperatedArs,
    total_profit_ars: summary.totalProfitArs,
    loaded_days_count: summary.loadedDaysCount,
    pending_days_count: summary.pendingDaysCount,
    reviewed_days_count: summary.reviewedDaysCount,
    status: resolvedStatus,
    notes: summary.pendingDaysCount > 0 ? "Semana con dias pendientes" : null
  }));

  if (lineRows.length > 0) {
    const { error: insertLinesError } = await (admin.from("weekly_cash_closure_lines") as any)
      .upsert(lineRows, { onConflict: "weekly_cash_closure_id,cash_register_id" })
      .select("*");

    if (insertLinesError) {
      if (isMissingWeeklyClosureTablesError(insertLinesError)) {
        return {
          ok: false as const,
          message: "Falta aplicar la migracion de cierre semanal en Supabase. Ejecuta supabase/migrations/20260617_weekly_cash_closures.sql."
        };
      }
      return { ok: false as const, message: `No se pudieron guardar las lineas del cierre: ${insertLinesError.message}` };
    }
  }

  await createAuditLog({
    actorId: auth.userId,
    action: reopened ? "weekly_cash_closure.reopened" : `weekly_cash_closure.${closureAction}`,
    entityType: "weekly_cash_closure",
    entityId: closureId,
    oldData: existingClosure as Record<string, unknown> | null,
    newData: closureData as Record<string, unknown>,
    reason: reopened ? reopenReason ?? null : closureNotes
  });

  if (closureNotes) {
    const { data: noteData } = await (admin.from("notes") as any)
      .insert({
        entity_type: "weekly_cash_closure",
        entity_id: closureId,
        entity_label: `Semana ${weekRange.weekStartDate} a ${weekRange.weekEndDate}`,
        entity_href: "/cierres",
        title: reopened ? "Reapertura de cierre semanal" : "Cierre semanal Pago Fácil",
        body: closureNotes,
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

  if (reopened && reopenReason) {
    const { data: noteData } = await (admin.from("notes") as any)
      .insert({
        entity_type: "weekly_cash_closure",
        entity_id: closureId,
        entity_label: `Semana ${weekRange.weekStartDate} a ${weekRange.weekEndDate}`,
        entity_href: "/cierres",
        title: "Motivo de reapertura",
        body: reopenReason,
        priority: "importante",
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

  revalidatePath("/cierres");
  revalidatePath("/dashboard");
  revalidatePath("/cajas");
  revalidatePath("/reporte-diario");

  return {
    ok: true as const,
    message:
      resolvedStatus === "cerrado"
        ? "Semana cerrada."
        : "Hay dias pendientes o parciales. La semana quedo marcada como revisar."
  };
}

export async function closeWeeklyCashClosureAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canManageClosures(auth.role)) {
    return { ok: false, message: "No tenes permisos para cerrar la semana." };
  }

  const profile = await ensureProfile(auth);
  if (!profile.ok) return profile;
  const admin = profile.admin;

  const date = getString(formData, "date") || getBuenosAiresDateString();
  const closeNote = getString(formData, "close_note");
  const currentPath = safePath(getString(formData, "current_path"));

  const result = await syncWeeklyClosureRows({
    admin,
    auth,
    date,
    status: "cerrado",
    notes: closeNote || null,
    closeNote: closeNote || null,
    reopenReason: null,
    reopened: false
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath(currentPath);
  return result;
}

export async function reopenWeeklyCashClosureAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canManageClosures(auth.role)) {
    return { ok: false, message: "No tenes permisos para reabrir la semana." };
  }

  const profile = await ensureProfile(auth);
  if (!profile.ok) return profile;
  const admin = profile.admin;

  const date = getString(formData, "date") || getBuenosAiresDateString();
  const reopenReason = getString(formData, "reopen_reason");
  const reopenNote = getString(formData, "reopen_note");
  const currentPath = safePath(getString(formData, "current_path"));

  if (!reopenReason) {
    return { ok: false, message: "Tenes que indicar el motivo de reapertura." };
  }

  if (!reopenNote) {
    return { ok: false, message: "La nota de reapertura es obligatoria." };
  }

  const existingClosure = await getWeeklyCashClosureRecordForDate(date);
  if (!existingClosure || existingClosure.status === "abierto") {
    return { ok: false, message: "Solo podes reabrir una semana cerrada o en revisar." };
  }

  const result = await syncWeeklyClosureRows({
    admin,
    auth,
    date,
    status: "abierto",
    notes: reopenNote,
    closeNote: null,
    reopenReason,
    reopened: true
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath(currentPath);
  return { ok: true, message: "Semana reabierta." };
}
