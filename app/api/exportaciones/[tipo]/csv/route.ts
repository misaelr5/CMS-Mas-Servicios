import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit/audit-log";
import { getServerAuthContext } from "@/lib/auth/server";
import { canExportType, type ExportFilters, type ExportReportType } from "@/lib/exportaciones/export-permissions";
import { generateCSV } from "@/lib/exportaciones/export-utils";
import { buildBagsExport, buildCashLoadsExport, buildDailyReportExport, buildExpensesExport, buildWeeklyClosureExport } from "@/lib/exportaciones/export-service";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

function getParam(url: URL, key: string, fallback = "") {
  return url.searchParams.get(key) || fallback;
}

async function getAssignedCashRegisterIds(userId: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin.from("cash_registers").select("id").eq("responsible_user_id", userId);
  if (error) return [];
  return ((data ?? []) as Array<{ id?: unknown }>).map((row) => String(row.id ?? ""));
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

  const url = new URL(request.url);
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const date = getParam(url, "date", getBuenosAiresDateString());
  const from = getParam(url, "from", date);
  const to = getParam(url, "to", date);
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  const filters: ExportFilters = {
    date,
    from,
    to,
    branch_id: getParam(url, "branch_id") || undefined,
    status: getParam(url, "status") || undefined,
    category: getParam(url, "category") || undefined,
    cash_register_id: getParam(url, "cash_register_id") || undefined,
    bag_id: getParam(url, "bag_id") || undefined,
    operation_type: getParam(url, "operation_type") || undefined
  };
  const assignedCashRegisterIds = auth.role === "cajero" ? await getAssignedCashRegisterIds(auth.userId) : [];
  const permission = canExportType({
    userRole: auth.role,
    exportType: tipo,
    userId: auth.userId,
    filters,
    assignedCashRegisterIds
  });

  if (!permission.allowed) {
    await createAuditLog({
      actorId: auth.userId,
      action: `export.${tipo}.blocked`,
      entityType: "export",
      entityId: null,
      newData: {
        tipo,
        rol: auth.role,
        filtros: filters,
        resultado: "blocked"
      },
      reason: permission.reason ?? "blocked_by_permissions"
    });

    return NextResponse.json({ error: permission.reason ?? "No tenés permiso para exportar esta información." }, { status: 403 });
  }

  const effectiveFilters = {
    ...filters,
    ...permission.restrictedFilters
  };

  const exportData =
    tipo === "reporte-diario"
      ? await buildDailyReportExport(effectiveFilters.date ?? date, { role: auth.role, userId: auth.userId })
      : tipo === "cierre-semanal"
        ? await buildWeeklyClosureExport(effectiveFilters.date ?? date, { role: auth.role, userId: auth.userId })
        : tipo === "gastos"
          ? await buildExpensesExport(
              {
                from: effectiveFilters.from ?? from,
                to: effectiveFilters.to ?? to,
                branchId: effectiveFilters.branch_id || undefined,
                status: (effectiveFilters.status || "all") as any,
                category: effectiveFilters.category || undefined
              },
              { role: auth.role, userId: auth.userId }
            )
          : tipo === "cargas-cajas"
            ? await buildCashLoadsExport(
                {
                  from: effectiveFilters.from ?? from,
                  to: effectiveFilters.to ?? to,
                  branchId: effectiveFilters.branch_id || undefined,
                  cashRegisterId: effectiveFilters.cash_register_id || undefined,
                  status: effectiveFilters.status || undefined
                },
                { role: auth.role, userId: auth.userId }
              )
            : await buildBagsExport(
                {
                  from: effectiveFilters.from ?? from,
                  to: effectiveFilters.to ?? to,
                  bagId: effectiveFilters.bag_id || undefined,
                  operationType: effectiveFilters.operation_type || undefined
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
      rol: auth.role,
      filtros: effectiveFilters,
      resultado: "allowed",
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
