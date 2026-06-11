import type { Note, NoteEntityType, NotePriority } from "@/lib/db/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && uuidPattern.test(value));
}

export type ListNotesInput = {
  entityType?: NoteEntityType;
  entityId?: string | null;
  limit?: number;
};

export async function listNotes({ entityType, entityId, limit = 20 }: ListNotesInput = {}) {
  const admin = getSupabaseAdminClient();
  if (!admin) return [] as Note[];

  try {
    let query = admin
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    if (isUuid(entityId)) {
      query = query.eq("entity_id", entityId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Note[];
  } catch {
    return [] as Note[];
  }
}

export async function listImportantNotes(limit = 6) {
  const admin = getSupabaseAdminClient();
  if (!admin) return [] as Note[];

  try {
    const { data, error } = await admin
      .from("notes")
      .select("*")
      .eq("status", "abierta")
      .in("priority", ["importante", "urgente"])
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as Note[];
  } catch {
    return [] as Note[];
  }
}

export function normalizePriority(value: FormDataEntryValue | null): NotePriority {
  if (value === "importante" || value === "urgente") return value;
  return "normal";
}
