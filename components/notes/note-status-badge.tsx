import { Badge } from "@/components/ui/badge";
import type { NotePriority, NoteStatus } from "@/lib/db/types";

export function NoteStatusBadge({ status, priority }: { status: NoteStatus; priority: NotePriority }) {
  if (status === "anulada") {
    return <Badge variant="danger">Anulada</Badge>;
  }

  if (status === "resuelta") {
    return <Badge variant="success">Resuelta</Badge>;
  }

  if (priority === "urgente") {
    return <Badge variant="danger">Urgente</Badge>;
  }

  if (priority === "importante") {
    return <Badge variant="warning">Importante</Badge>;
  }

  return <Badge variant="neutral">Abierta</Badge>;
}
