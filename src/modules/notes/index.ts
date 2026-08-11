// Composition root del modulo notes: cablea el adapter Supabase con los casos
// de uso de lectura. Unico punto que elige la implementacion del puerto.

import { makeListImportantNotes, makeListNotes } from "./application/list-notes";
import { SupabaseNotesRepository } from "./infrastructure/supabase-notes-repository";

const notesRepository = new SupabaseNotesRepository();

export const listNotes = makeListNotes(notesRepository);
export const listImportantNotes = makeListImportantNotes(notesRepository);

export { isUuid, normalizePriority } from "./domain/note";
export { makeListNotes, makeListImportantNotes } from "./application/list-notes";
export type { NotesRepository, ListNotesFilters } from "./domain/note";
