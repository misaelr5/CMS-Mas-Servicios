// Hook de arranque de Next.js (se ejecuta una vez al iniciar el servidor).
// Verifica las variables de entorno criticas y avisa de forma clara si faltan,
// en lugar de degradar silenciosamente en runtime.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getMissingServerEnv } = await import("@/lib/env");
  const missing = getMissingServerEnv();

  if (missing.length > 0) {
    console.error(
      "\n[startup] FALTAN VARIABLES DE ENTORNO CRITICAS:\n" +
        missing.map((key) => `  - ${key}`).join("\n") +
        "\nLa app no funcionara correctamente hasta configurarlas (.env.local o Vercel).\n"
    );
  }
}
