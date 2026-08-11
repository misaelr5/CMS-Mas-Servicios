export function formatCurrencyARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

export function formatUSD(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(Number(value ?? 0));
}

export function formatDateAR(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value.includes("T") ? value : `${value}T00:00:00`) : value;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function csvEscape(value: unknown) {
  let text = String(value ?? "");
  // Prefix formula injection chars so spreadsheet apps don't execute them
  if (/^[=+\-@\t\r]/.test(text)) {
    text = "'" + text;
  }
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function generateCSV(rows: Array<Record<string, unknown>>, headers: string[]) {
  const body = rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","));
  return [headers.join(","), ...body].join("\n");
}

