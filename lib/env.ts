// Validacion centralizada de variables de entorno requeridas por el servidor.
//
// Evita la degradacion silenciosa: si falta una clave critica de Supabase,
// queremos enterarnos al arrancar (instrumentation) y poder reportarlo en el
// health-check, en vez de que las acciones fallen con mensajes genericos.

export const REQUIRED_SERVER_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

export function getMissingServerEnv(): string[] {
  return REQUIRED_SERVER_ENV.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });
}

export function assertServerEnv(): void {
  const missing = getMissingServerEnv();
  if (missing.length > 0) {
    throw new Error(
      `Variables de entorno faltantes: ${missing.join(", ")}. Configuralas en .env.local o en Vercel.`
    );
  }
}
