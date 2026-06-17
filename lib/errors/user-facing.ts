type UnknownErrorLike = { message?: string } | Error | string | null | undefined;

function extractMessage(error: UnknownErrorLike) {
  if (!error) return "";
  if (typeof error === "string") return error.toLowerCase();
  if (error instanceof Error) return error.message.toLowerCase();
  return String(error.message ?? "").toLowerCase();
}

export function getFriendlySupabaseErrorMessage(error: UnknownErrorLike, fallback = "No se pudo guardar la informacion.") {
  const message = extractMessage(error);

  if (!message) return fallback;
  if (message.includes("permission denied") || message.includes("row-level security")) {
    return "No tenes permiso para realizar esta accion.";
  }
  if (message.includes("could not find the table") || message.includes("schema cache") || message.includes("relation")) {
    return "Falta aplicar una migracion en Supabase.";
  }
  if (message.includes("duplicate key") || message.includes("unique constraint")) {
    return "Ya existe un registro con esos datos.";
  }
  if (message.includes("violates foreign key")) {
    return "Faltan datos relacionados para completar la operacion.";
  }
  if (message.includes("closed")) {
    return "El registro esta cerrado y no se puede modificar.";
  }
  if (message.includes("network") || message.includes("fetch") || message.includes("timeout") || message.includes("connection")) {
    return "No se pudo conectar con Supabase.";
  }

  return fallback;
}
