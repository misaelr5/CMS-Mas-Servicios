// Facade publico de bags. El adapter (implementacion Supabase, ~1400 lineas)
// vive en src/modules/bags/infrastructure. Pendiente: dividirlo y extraer
// puertos + logica pura (ver ARCHITECTURE.md).
export * from "@/src/modules/bags/infrastructure/bag-service";
