import { cookies } from "next/headers";

import { NoteCard } from "@/components/notes/note-card";
import { NoteForm } from "@/components/notes/note-form";
import { DataCard } from "@/components/data-card";
import { EmptyState } from "@/components/empty-state";
import { getServerAuthContext } from "@/lib/auth/server";
import type { NoteEntityType } from "@/lib/db/types";
import { listNotes } from "@/lib/notes/notes-service";

export async function NotesPanel({
  entityType,
  entityId,
  entityLabel,
  entityHref,
  title = "Notas internas",
  description = "Observaciones operativas vinculadas a esta pantalla."
}: {
  entityType: NoteEntityType;
  entityId?: string | null;
  entityLabel?: string;
  entityHref?: string;
  title?: string;
  description?: string;
}) {
  const auth = await getServerAuthContext(cookies());
  const role = auth?.role ?? "viewer";
  const canWrite = role === "admin" || role === "encargado" || role === "cajero";
  const canResolve = role === "admin" || role === "encargado";
  const canAnnul = role === "admin" || role === "encargado";
  const notes = await listNotes({ entityType, entityId, limit: 12 });

  return (
    <DataCard description={description} title={title}>
      <div className="space-y-5">
        <NoteForm
          canWrite={canWrite}
          entityHref={entityHref}
          entityId={entityId}
          entityLabel={entityLabel}
          entityType={entityType}
        />

        {notes.length === 0 ? (
          <EmptyState description="Todavia no hay notas internas para esta seccion." title="Sin notas" />
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <NoteCard canAnnul={canAnnul} canResolve={canResolve} key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </DataCard>
  );
}
