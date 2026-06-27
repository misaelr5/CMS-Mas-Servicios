// Facade publico de notes. Conserva la firma historica (isUuid, normalizePriority,
// listNotes, listImportantNotes) pero delega en el modulo hexagonal
// src/modules/notes (puerto + adapter + casos de uso).

export {
  isUuid,
  normalizePriority,
  listNotes,
  listImportantNotes
} from "@/src/modules/notes";

export type { ListNotesFilters, ListNotesFilters as ListNotesInput } from "@/src/modules/notes";
