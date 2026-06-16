"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";

import { createNoteAction } from "@/app/actions/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { NoteEntityType } from "@/lib/db/types";

const initialState = {
  ok: false,
  message: ""
};

export function NoteForm({
  entityType,
  entityId,
  entityLabel,
  entityHref,
  canWrite
}: {
  entityType: NoteEntityType;
  entityId?: string | null;
  entityLabel?: string;
  entityHref?: string;
  canWrite: boolean;
}) {
  const pathname = usePathname();
  const [state, formAction, isPending] = useActionState(createNoteAction, initialState);

  if (!canWrite) {
    return (
      <div className="rounded-md border border-lightGray bg-lightGray/30 p-4 text-sm text-mediumGray">
        Tu rol permite leer notas, pero no crear nuevas.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input name="entity_type" type="hidden" value={entityType} />
      <input name="entity_id" type="hidden" value={entityId ?? ""} />
      <input name="entity_label" type="hidden" value={entityLabel ?? ""} />
      <input name="entity_href" type="hidden" value={entityHref ?? pathname} />
      <input name="current_path" type="hidden" value={pathname} />

      <div className="grid gap-3 md:grid-cols-[1fr_170px]">
        <Input name="title" placeholder="Título corto" required />
        <Select defaultValue="normal" name="priority">
          <option value="normal">Normal</option>
          <option value="importante">Importante</option>
          <option value="urgente">Urgente</option>
        </Select>
      </div>

      <textarea
        className="min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-brandBlack shadow-sm placeholder:text-mediumGray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        name="body"
        placeholder="Detalle interno para el equipo"
        required
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={isPending} type="submit">
          {isPending ? "Guardando..." : "Crear nota"}
        </Button>
        {state.message ? (
          <p
            className={
              state.ok
                ? "text-sm font-semibold text-success"
                : "text-sm font-semibold text-danger"
            }
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
