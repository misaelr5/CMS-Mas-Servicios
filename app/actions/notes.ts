"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit/audit-log";
import { getServerAuthContext } from "@/lib/auth/server";
import { ensureCurrentUserProfile } from "@/lib/auth/profile";
import { type Role } from "@/lib/auth/roles";
import type { NoteEntityType, NotePriority } from "@/lib/db/types";
import { isUuid, normalizePriority } from "@/lib/notes/notes-service";
import { getFriendlySupabaseErrorMessage } from "@/lib/errors/user-facing";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type ActionState = {
  ok: boolean;
  message: string;
};

const canWriteNotes = (role: Role) => role === "admin" || role === "encargado" || role === "cajero";
const canResolveNotes = (role: Role) => role === "admin" || role === "encargado";
const canAnnulNotes = (role: Role) => role === "admin" || role === "encargado";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getEntityType(value: string): NoteEntityType {
  const allowed: NoteEntityType[] = [
    "bag",
    "bag_operation",
    "cash_register",
    "cash_daily_report",
    "daily_report",
    "weekly_cash_closure",
    "expense",
    "closure",
    "general"
  ];
  return allowed.includes(value as NoteEntityType) ? (value as NoteEntityType) : "general";
}

function safePath(path: string) {
  return path.startsWith("/") ? path : "/dashboard";
}

function isMissingNotesTableError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("public.notes") && (message.includes("schema cache") || message.includes("could not find the table"));
}

export async function createNoteAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canWriteNotes(auth.role)) {
    return { ok: false, message: "No tenes permiso para crear notas." };
  }

  const title = getString(formData, "title");
  const body = getString(formData, "body");
  const entityType = getEntityType(getString(formData, "entity_type"));
  const entityId = getString(formData, "entity_id");
  const entityLabel = getString(formData, "entity_label");
  const entityHref = getString(formData, "entity_href");
  const priority = normalizePriority(formData.get("priority"));
  const currentPath = safePath(getString(formData, "current_path"));

  if (!title || !body) {
    return { ok: false, message: "Completá título y detalle de la nota." };
  }

  const admin = getSupabaseAdminClient();
  const profileSync = await ensureCurrentUserProfile(admin, auth);
  if (!profileSync.ok) {
    return profileSync;
  }
  const adminClient = admin as NonNullable<typeof admin>;

  const payload = {
    entity_type: entityType,
    entity_id: isUuid(entityId) ? entityId : null,
    entity_label: entityLabel || null,
    entity_href: entityHref || null,
    title,
    body,
    priority,
    status: "abierta",
    created_by: auth.userId
  };

  const { data, error } = await (adminClient.from("notes") as any).insert(payload).select("*").single();
  if (error) {
    if (isMissingNotesTableError(error)) {
      return {
        ok: false,
        message: "Falta aplicar la migracion de notas en Supabase. Ejecuta supabase/migrations/20260611_operational_notes.sql."
      };
    }
    return { ok: false, message: getFriendlySupabaseErrorMessage(error, "No se pudo crear la nota.") };
  }

  await createAuditLog({
    actorId: auth.userId,
    action: "note.created",
    entityType: "note",
    entityId: data.id,
    newData: data as Record<string, unknown>
  });

  revalidatePath(currentPath);
  revalidatePath("/dashboard");
  return { ok: true, message: "Nota creada." };
}

export async function updateNotePriorityAction(formData: FormData) {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canResolveNotes(auth.role)) return;

  const noteId = getString(formData, "note_id");
  const priority = normalizePriority(formData.get("priority"));
  const currentPath = safePath(getString(formData, "current_path"));
  const admin = getSupabaseAdminClient();
  if (!admin || !isUuid(noteId)) return;

  const profileSync = await ensureCurrentUserProfile(admin, auth);
  if (!profileSync.ok) return;
  const adminClient = admin as NonNullable<typeof admin>;

  const { data: oldData } = await (adminClient.from("notes") as any).select("*").eq("id", noteId).maybeSingle();
  if (!oldData || oldData.status !== "abierta") return;

  const { data: newData, error } = await (adminClient.from("notes") as any)
    .update({ priority })
    .eq("id", noteId)
    .eq("status", "abierta")
    .select("*")
    .single();
  if (error || !newData) return;

  await createAuditLog({
    actorId: auth.userId,
    action: "note.priority_updated",
    entityType: "note",
    entityId: noteId,
    oldData: oldData as Record<string, unknown>,
    newData: newData as Record<string, unknown>
  });

  revalidatePath(currentPath);
  revalidatePath("/dashboard");
}

export async function resolveNoteAction(formData: FormData) {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canResolveNotes(auth.role)) return;

  const noteId = getString(formData, "note_id");
  const currentPath = safePath(getString(formData, "current_path"));
  const admin = getSupabaseAdminClient();
  if (!admin || !isUuid(noteId)) return;

  const profileSync = await ensureCurrentUserProfile(admin, auth);
  if (!profileSync.ok) return;
  const adminClient = admin as NonNullable<typeof admin>;

  const { data: oldData } = await (adminClient.from("notes") as any).select("*").eq("id", noteId).maybeSingle();
  if (!oldData || oldData.status !== "abierta") return;

  const { data: newData, error } = await (adminClient.from("notes") as any)
    .update({ status: "resuelta", resolved_by: auth.userId, resolved_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("status", "abierta")
    .select("*")
    .single();
  if (error || !newData) return;

  await createAuditLog({
    actorId: auth.userId,
    action: "note.resolved",
    entityType: "note",
    entityId: noteId,
    oldData: oldData as Record<string, unknown>,
    newData: newData as Record<string, unknown>
  });

  revalidatePath(currentPath);
  revalidatePath("/dashboard");
}

export async function annulNoteAction(formData: FormData) {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canAnnulNotes(auth.role)) return;

  const noteId = getString(formData, "note_id");
  const reason = getString(formData, "reason");
  const currentPath = safePath(getString(formData, "current_path"));
  const admin = getSupabaseAdminClient();
  if (!admin || !isUuid(noteId) || !reason) return;

  const profileSync = await ensureCurrentUserProfile(admin, auth);
  if (!profileSync.ok) return;
  const adminClient = admin as NonNullable<typeof admin>;

  const { data: oldData } = await (adminClient.from("notes") as any).select("*").eq("id", noteId).maybeSingle();
  if (!oldData || oldData.status !== "abierta") return;

  const { data: newData, error } = await (adminClient.from("notes") as any)
    .update({
      status: "anulada",
      annulled_by: auth.userId,
      annulled_at: new Date().toISOString(),
      annul_reason: reason
    })
    .eq("id", noteId)
    .eq("status", "abierta")
    .select("*")
    .single();
  if (error || !newData) return;

  await createAuditLog({
    actorId: auth.userId,
    action: "note.annulled",
    entityType: "note",
    entityId: noteId,
    oldData: oldData as Record<string, unknown>,
    newData: newData as Record<string, unknown>,
    reason
  });

  revalidatePath(currentPath);
  revalidatePath("/dashboard");
}
