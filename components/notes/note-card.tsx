"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { annulNoteAction, resolveNoteAction, updateNotePriorityAction } from "@/app/actions/notes";
import { NoteStatusBadge } from "@/components/notes/note-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Note } from "@/lib/db/types";

export function NoteCard({
  note,
  canResolve,
  canAnnul
}: {
  note: Note;
  canResolve: boolean;
  canAnnul: boolean;
}) {
  const pathname = usePathname();
  const isOpen = note.status === "abierta";

  return (
    <article className="rounded-2xl border border-lightGray bg-lightGray/30 p-4 text-brandBlack">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-heading text-base font-bold">{note.title}</h4>
            <NoteStatusBadge priority={note.priority} status={note.status} />
          </div>
          <p className="text-sm text-mediumGray">{note.body}</p>
          {note.entity_label ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mediumGray">
              Relacionada:{" "}
              {note.entity_href ? (
                <Link className="text-brandBlack underline underline-offset-4" href={note.entity_href}>
                  {note.entity_label}
                </Link>
              ) : (
                note.entity_label
              )}
            </p>
          ) : null}
        </div>
        <p className="text-xs text-mediumGray">{new Date(note.created_at).toLocaleString("es-AR")}</p>
      </div>

      {isOpen && (canResolve || canAnnul) ? (
        <div className="mt-4 grid gap-3 border-t border-lightGray pt-4 lg:grid-cols-[1fr_auto_auto]">
          {canResolve ? (
            <form action={updateNotePriorityAction} className="flex gap-2">
              <input name="note_id" type="hidden" value={note.id} />
              <input name="current_path" type="hidden" value={pathname} />
              <select
                className="h-9 rounded-md border border-border bg-white px-3 text-xs font-semibold text-brandBlack"
                defaultValue={note.priority}
                name="priority"
              >
                <option value="normal">Normal</option>
                <option value="importante">Importante</option>
                <option value="urgente">Urgente</option>
              </select>
              <Button size="sm" type="submit" variant="soft">
                Marcar
              </Button>
            </form>
          ) : (
            <span />
          )}

          {canResolve ? (
            <form action={resolveNoteAction}>
              <input name="note_id" type="hidden" value={note.id} />
              <input name="current_path" type="hidden" value={pathname} />
              <Button size="sm" type="submit" variant="secondary">
                Resolver
              </Button>
            </form>
          ) : null}

          {canAnnul ? (
            <form action={annulNoteAction} className="flex gap-2">
              <input name="note_id" type="hidden" value={note.id} />
              <input name="current_path" type="hidden" value={pathname} />
              <Input className="h-9 min-w-36" name="reason" placeholder="Motivo" required />
              <Button size="sm" type="submit" variant="destructive">
                Anular
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {note.status === "anulada" && note.annul_reason ? (
        <p className="mt-3 text-xs font-semibold text-danger">Motivo de anulacion: {note.annul_reason}</p>
      ) : null}
    </article>
  );
}
