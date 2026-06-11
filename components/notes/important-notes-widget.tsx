import Link from "next/link";

import { NoteStatusBadge } from "@/components/notes/note-status-badge";
import { DataCard } from "@/components/data-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { listImportantNotes } from "@/lib/notes/notes-service";

export async function ImportantNotesWidget() {
  const notes = await listImportantNotes(6);

  return (
    <DataCard
      description="Ultimas notas importantes o urgentes abiertas, preparadas para seguimiento operativo."
      title="Notas importantes"
    >
      {notes.length === 0 ? (
        <EmptyState
          actionHref="/dashboard"
          actionLabel="Crear desde dashboard"
          description="Cuando existan notas importantes o urgentes abiertas, van a aparecer aca."
          title="Sin alertas internas"
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <article className="rounded-2xl border border-lightGray bg-lightGray/30 p-4" key={note.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-heading text-base font-bold text-brandBlack">{note.title}</h4>
                <NoteStatusBadge priority={note.priority} status={note.status} />
              </div>
              <p className="mt-2 text-sm text-mediumGray">{note.body}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mediumGray">
                  {note.entity_label ?? "General"}
                </p>
                {note.entity_href ? (
                  <Button asChild size="sm" variant="secondary">
                    <Link href={note.entity_href}>Abrir</Link>
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </DataCard>
  );
}
