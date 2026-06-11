export type Role = "admin" | "encargado" | "cajero" | "viewer";

export type Branch = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
};

export type CashRegister = {
  id: string;
  branch_id: string;
  branch_name?: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
};

export type Bag = {
  id: string;
  name: string;
  slug: string;
  base_limit_ars: number;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
};

export type BagAssignment = {
  id: string;
  bag_id: string;
  user_id: string;
  status: "active" | "inactive";
  created_at?: string;
};

export type NoteEntityType =
  | "bag"
  | "bag_operation"
  | "cash_register"
  | "cash_daily_report"
  | "daily_report"
  | "expense"
  | "closure"
  | "general";

export type NotePriority = "normal" | "importante" | "urgente";

export type NoteStatus = "abierta" | "resuelta" | "anulada";

export type Note = {
  id: string;
  entity_type: NoteEntityType;
  entity_id: string | null;
  entity_label: string | null;
  entity_href: string | null;
  title: string;
  body: string;
  priority: NotePriority;
  status: NoteStatus;
  created_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  annulled_by: string | null;
  annulled_at: string | null;
  annul_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
};
