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
    name: "Lourdes",
    slug: "lourdes-centro",
    status: "active"
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    branch_id: branches[0].id,
    name: "Vicky",
    slug: "vicky-centro",
    status: "active"
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    branch_id: branches[0].id,
    name: "Antonella manana",
    slug: "antonella-manana-centro",
    status: "active"
  },
  {
    id: "00000000-0000-4000-8000-000000000204",
    branch_id: branches[1].id,
    name: "Roman",
    slug: "roman-terminal",
    status: "active"
  },
  {
    id: "00000000-0000-4000-8000-000000000205",
    branch_id: branches[1].id,
    name: "Anto tarde",
    slug: "anto-tarde-terminal",
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

console.log("Seeds operativos listos: 2 sucursales, 5 cajas y 5 bolsas.");
