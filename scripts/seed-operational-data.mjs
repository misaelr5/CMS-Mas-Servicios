import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const branches = [
  { id: "00000000-0000-4000-8000-000000000101", name: "Centro", slug: "centro", status: "active" },
  { id: "00000000-0000-4000-8000-000000000102", name: "Terminal", slug: "terminal", status: "active" }
];

const cashRegisters = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    branch_id: branches[0].id,
    register_number: 1,
    name: "Lourdes",
    slug: "caja-1-lourdes",
    responsible_user_id: "25ab0e24-f36f-45b9-a1a8-81b9dfde328f",
    status: "active"
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    branch_id: branches[0].id,
    register_number: 2,
    name: "Victoria",
    slug: "caja-2-victoria",
    responsible_user_id: "b4516776-938c-4863-a58e-e65fc4302502",
    status: "active"
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    branch_id: branches[0].id,
    register_number: 3,
    name: "Antonella",
    slug: "caja-3-antonella",
    responsible_user_id: "9c62754f-1710-4f58-b4fe-3a22cda0166a",
    status: "active"
  },
  {
    id: "00000000-0000-4000-8000-000000000204",
    branch_id: branches[1].id,
    register_number: 4,
    name: "Román",
    slug: "caja-4-roman",
    responsible_user_id: "ee188491-0332-45d0-b036-14a0e13cb037",
    status: "active"
  },
  {
    id: "00000000-0000-4000-8000-000000000205",
    branch_id: branches[1].id,
    register_number: 5,
    name: "Antonella",
    slug: "caja-5-antonella",
    responsible_user_id: "cce9fc58-f0cd-4568-b7f0-2849445bf897",
    status: "active"
  }
];

const bags = [
  { id: "00000000-0000-4000-8000-000000000301", name: "Bolsa 1", slug: "bolsa-1", base_limit_ars: 2000000, status: "active" },
  { id: "00000000-0000-4000-8000-000000000302", name: "Bolsa 2", slug: "bolsa-2", base_limit_ars: 2000000, status: "active" },
  { id: "00000000-0000-4000-8000-000000000303", name: "Bolsa 3", slug: "bolsa-3", base_limit_ars: 2000000, status: "active" },
  { id: "00000000-0000-4000-8000-000000000304", name: "Bolsa 4", slug: "bolsa-4", base_limit_ars: 2000000, status: "active" },
  { id: "00000000-0000-4000-8000-000000000305", name: "Bolsa 5", slug: "bolsa-5", base_limit_ars: 5000000, status: "active" }
];

async function upsertOrFail(table, rows) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "slug" });
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

await upsertOrFail("branches", branches);
await upsertOrFail("cash_registers", cashRegisters);
await upsertOrFail("bags", bags);
await upsertOrFail("cash_report_categories", [
  { id: "00000000-0000-4000-8000-000000000401", name: "Envíos internacionales", sort_order: 1, active: true },
  { id: "00000000-0000-4000-8000-000000000402", name: "Pagos internacionales", sort_order: 2, active: true },
  { id: "00000000-0000-4000-8000-000000000403", name: "Envíos nacionales", sort_order: 3, active: true },
  { id: "00000000-0000-4000-8000-000000000404", name: "Pagos nacionales", sort_order: 4, active: true },
  { id: "00000000-0000-4000-8000-000000000405", name: "Extracciones", sort_order: 5, active: true },
  { id: "00000000-0000-4000-8000-000000000406", name: "Billetera virtual", sort_order: 6, active: true },
  { id: "00000000-0000-4000-8000-000000000407", name: "Cobro facturas crédito", sort_order: 7, active: true },
  { id: "00000000-0000-4000-8000-000000000408", name: "Transferencia x efectivo", sort_order: 8, active: true },
  { id: "00000000-0000-4000-8000-000000000409", name: "Depósito CBU", sort_order: 9, active: true },
  { id: "00000000-0000-4000-8000-000000000410", name: "Impresiones / CUS-ISA / tickets", sort_order: 10, active: true }
]);

console.log("Seeds operativos listos: 2 sucursales, 5 cajas, 10 categorías y 5 bolsas.");
