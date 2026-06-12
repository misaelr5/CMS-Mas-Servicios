import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { getServerAuthContext } from "@/lib/auth/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getServerAuthContext(cookies());
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "missing admin client" }, { status: 500 });
  }

  const { data, error } = await (admin.from("bag_operations") as any)
    .select("*")
    .eq("bag_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "fecha",
    "bolsa",
    "tipo_operacion",
    "usd",
    "cotizacion",
    "total_ars",
    "ganancia",
    "saldo_anterior_efectivo",
    "saldo_nuevo_efectivo",
    "saldo_anterior_cuenta",
    "saldo_nuevo_cuenta",
    "usd_anterior",
    "usd_nuevo",
    "usuario",
    "estado",
    "nota"
  ];

  const rows = (data ?? []).map((row: any) =>
    [
      row.created_at,
      id,
      row.operation_type,
      row.amount_usd,
      row.rate_ars,
      row.total_ars,
      row.profit_ars,
      row.previous_cash_ars,
      row.new_cash_ars,
      row.previous_account_ars,
      row.new_account_ars,
      row.previous_usd,
      row.new_usd,
      row.created_by ?? "",
      row.status,
      row.notes ?? ""
    ]
      .map(csvEscape)
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="bolsa-${id}.csv"`
    }
  });
}
