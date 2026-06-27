// Facade publico de cash-registers. El adapter (implementacion Supabase) vive
// en src/modules/cash-registers/infrastructure. Los callers siguen importando
// desde "@/lib/cash/cash-service" sin cambios.
export * from "@/src/modules/cash-registers/infrastructure/cash-service";
