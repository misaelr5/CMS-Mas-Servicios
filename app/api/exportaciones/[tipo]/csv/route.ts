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
    return NextResponse.json({ error: "No pudimos validar tu sesión." }, { status: 401 });
  }

  const { tipo: rawTipo } = await params;
  const ALLOWED_TYPES: ExportReportType[] = ["reporte-diario", "cierre-semanal", "gastos", "cargas-cajas", "bolsas"];
  if (!ALLOWED_TYPES.includes(rawTipo as ExportReportType)) {
    return NextResponse.json({ error: "Tipo de exportación inválido." }, { status: 400 });
  }
  const tipo = rawTipo as ExportReportType;
  if (!canExportType(auth.role, tipo)) {
    return NextResponse.json({ error: "No tenés permiso para exportar esta información." }, { status: 403 });
  }

  const url = new URL(request.url);
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const date = getParam(url, "date", getBuenosAiresDateString());
  const from = getParam(url, "from", date);
  const to = getParam(url, "to", date);
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

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
    return NextResponse.json({ error: "No se pudieron preparar los datos para exportar." }, { status: 500 });
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
