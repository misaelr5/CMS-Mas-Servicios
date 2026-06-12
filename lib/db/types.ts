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
  register_number?: number;
  name: string;
  slug: string;
  status: "active" | "inactive";
  responsible_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CashReportCategory = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at?: string;
};

export type CashDailyReportStatus = "pendiente" | "parcial" | "cargado" | "revisado";

export type CashDailyReport = {
  id: string;
  cash_register_id: string;
  branch_id: string;
  report_date: string;
  total_operated_ars: number;
  total_profit_ars: number;
  status: CashDailyReportStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CashDailyReportLine = {
  id: string;
  cash_daily_report_id: string;
  category_id: string;
  operated_amount_ars: number;
  profit_amount_ars: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Bag = {
  id: string;
  name: string;
  slug: string;
  base_limit_ars: number;
  current_cash_ars?: number;
  current_account_ars?: number;
  current_usd?: number;
  borrowed_ars?: number;
  average_usd_cost?: number;
  accumulated_profit_ars?: number;
  responsible_user_id?: string | null;
  status: "ok" | "revisar" | "diferencia" | "pendiente_cierre" | "active" | "inactive";
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
  | "bag_internal_transfer"
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
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
};

export type BagOperationType =
  | "compra_usd"
  | "venta_usd"
  | "venta_interna_bolsa"
  | "compra_interna_bolsa"
  | "ingreso_pesos_efectivo"
  | "egreso_pesos_efectivo"
  | "ingreso_pesos_cuenta"
  | "egreso_pesos_cuenta"
  | "prestamo_entregado"
  | "prestamo_recibido"
  | "devolucion_prestamo"
  | "ajuste_manual"
  | "anulacion_operacion";

export type BagOperation = {
  id: string;
  bag_id: string;
  operation_type: BagOperationType;
  amount_usd: number;
  rate_ars: number;
  total_ars: number;
  money_source: "efectivo" | "cuenta" | null;
  money_destination: "efectivo" | "cuenta" | null;
  profit_ars: number;
  previous_cash_ars: number;
  previous_account_ars: number;
  previous_usd: number;
  previous_borrowed_ars: number;
  new_cash_ars: number;
  new_account_ars: number;
  new_usd: number;
  new_borrowed_ars: number;
  notes: string | null;
  status: "confirmada" | "revisar" | "anulada";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  annulled_at: string | null;
  annulled_by: string | null;
  annulment_reason: string | null;
  internal_transfer_id?: string | null;
  related_operation_id?: string | null;
  is_internal?: boolean;
  affects_profit?: boolean;
};

export type BagInternalTransfer = {
  id: string;
  origin_bag_id: string;
  destination_bag_id: string;
  origin_operation_id: string | null;
  destination_operation_id: string | null;
  amount_usd: number;
  internal_rate_ars: number;
  total_ars: number;
  destination_payment_source: "efectivo" | "cuenta";
  origin_receive_destination: "efectivo" | "cuenta";
  reason: string;
  note: string;
  status: "confirmada" | "anulada";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  annulled_at: string | null;
  annulled_by: string | null;
  annulment_reason: string | null;
};

export type BagDailySnapshot = {
  id: string;
  bag_id: string;
  date: string;
  cash_ars: number;
  account_ars: number;
  usd_amount: number;
  borrowed_ars: number;
  average_usd_cost: number;
  total_estimated_ars: number;
  base_limit_ars: number;
  difference_ars: number;
  profit_day_ars: number;
  status: "ok" | "revisar" | "diferencia" | "pendiente_cierre";
  created_by: string | null;
  created_at: string;
};
