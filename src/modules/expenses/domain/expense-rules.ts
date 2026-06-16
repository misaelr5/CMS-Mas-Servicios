export type ExpenseValidationInput = {
  amountArs: number;
  detail: string;
  annulmentReason?: string | null;
};

export function validateExpense({ amountArs, detail }: ExpenseValidationInput) {
  if (amountArs <= 0) return { ok: false as const, message: "El monto del gasto debe ser mayor a 0." };
  if (!detail.trim()) return { ok: false as const, message: "El detalle del gasto es obligatorio." };
  return { ok: true as const };
}

export function validateExpenseAnnulment(reason: string) {
  if (!reason.trim()) return { ok: false as const, message: "El motivo de anulacion es obligatorio." };
  return { ok: true as const };
}
