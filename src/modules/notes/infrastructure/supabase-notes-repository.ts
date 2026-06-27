// Adapter Supabase del puerto NotesRepository. Conserva la resiliencia original
// (devuelve [] si no hay admin client o si la query falla).

import type { Note } from "@/lib/db/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { isUuid, type ListNotesFilters, type NotesRepository } from "../domain/note";

export class SupabaseNotesRepository implements NotesRepository {
  async list({ entityType, entityId, limit = 20 }: ListNotesFilters): Promise<Note[]> {
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

  async listImportant(limit = 6): Promise<Note[]> {
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
}
