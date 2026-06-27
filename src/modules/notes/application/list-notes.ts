// Casos de uso de lectura de notas. Dependen del puerto NotesRepository.

import type { ListNotesFilters, NotesRepository } from "../domain/note";

export function makeListNotes(repository: NotesRepository) {
  return function listNotes(filters: ListNotesFilters = {}) {
    return repository.list(filters);
  };
}

export function makeListImportantNotes(repository: NotesRepository) {
  return function listImportantNotes(limit = 6) {
    return repository.listImportant(limit);
  };
}
