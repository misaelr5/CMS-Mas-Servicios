import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit/audit-log";
import { getServerAuthContext } from "@/lib/auth/server";
import { canExportType, type ExportReportType } from "@/lib/exportaciones/export-permissions";
import { generateCSV } from "@/lib/exportaciones/export-utils";
import { buildBagsExport, buildCashLoadsExport, buildDailyReportExport, buildExpensesExport, buildWeeklyClosureExport } from "@/lib/exportaciones/export-service";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";

function getParam(url: URL, key: string, fallback = "") {
  return url.searchParams.get(key) || fallback;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const auth = await getServerAuthContext(cookies());
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { tipo: rawTipo } = await params;
  const tipo = rawTipo as ExportReportType;
  if (!canExportType(auth.role, tipo)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const date = getParam(url, "date", getBuenosAiresDateString());
  const from = getParam(url, "from", date);
  const to = getParam(url, "to", date);

  const exportData =
    tipo === "reporte-diario"
      ? await buildDailyReportExport(date, { role: auth.role, userId: auth.userId })
      : tipo === "cierre-semanal"
        ? await buildWeeklyClosureExport(date, { role: auth.role, userId: auth.userId })
        : tipo === "gastos"
          ? await buildExpensesExport(
              {
                from,
                to,
                branchId: getParam(url, "branch_id") || undefined,
                status: (getParam(url, "status") || "all") as any,
                category: getParam(url, "category") || undefined
              },
              { role: auth.role, userId: auth.userId }
            )
          : tipo === "cargas-cajas"
            ? await buildCashLoadsExport(
                {
                  from,
                  to,
                  branchId: getParam(url, "branch_id") || undefined,
                  cashRegisterId: getParam(url, "cash_register_id") || undefined,
                  status: getParam(url, "status") || undefined
                },
                { role: auth.role, userId: auth.userId }
              )
            : await buildBagsExport(
                {
                  from,
                  to,
                  bagId: getParam(url, "bag_id") || undefined,
                  operationType: getParam(url, "operation_type") || undefined
                },
                { role: auth.role, userId: auth.userId }
              );

  if (!exportData) {
    return NextResponse.json({ error: "no-data" }, { status: 500 });
  }

  await createAuditLog({
    actorId: auth.userId,
    action: `export.${tipo}.csv`,
    entityType: "export",
    entityId: null,
    newData: {
      tipo,
      filtros: Object.fromEntries(url.searchParams.entries()),
      formato: "csv"
    }
  });

  const csv = generateCSV(exportData.rows, exportData.headers);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${exportData.filename}"`
    }
  });
}
