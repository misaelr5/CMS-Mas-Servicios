// Dominio del modulo notes: reglas puras + PUERTO de persistencia.
// No conoce Supabase; solo declara el contrato que la infraestructura implementa.

import type { Note, NoteEntityType, NotePriority } from "@/lib/db/types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && uuidPattern.test(value));
}

export function normalizePriority(value: FormDataEntryValue | null): NotePriority {
  if (value === "importante" || value === "urgente") return value;
  return "normal";
}

export type ListNotesFilters = {
  entityType?: NoteEntityType;
  entityId?: string | null;
  limit?: number;
};

// Puerto (driven port) de lectura de notas.
export interface NotesRepository {
  list(filters: ListNotesFilters): Promise<Note[]>;
  listImportant(limit: number): Promise<Note[]>;
}
