// Helpers compartidos para leer FormData en Server Actions.
//
// Centralizan la extraccion de strings/numeros y aplican un tope de longitud
// defensivo para evitar que un cliente envie campos de texto enormes que luego
// se persistirian (por ejemplo en audit_logs.new_data) e inflarian la base.

const DEFAULT_MAX_TEXT_LENGTH = 2000;
const MAX_NUMERIC_INPUT_LENGTH = 32;

export function getString(formData: FormData, key: string, maxLength = DEFAULT_MAX_TEXT_LENGTH) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function getNumber(formData: FormData, key: string) {
  const value = Number(getString(formData, key, MAX_NUMERIC_INPUT_LENGTH));
  return Number.isFinite(value) ? value : 0;
}
