import Link from "next/link";
import { cookies } from "next/headers";

import { AccessDenied } from "@/components/access-denied";
import { DataCard } from "@/components/data-card";
import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExportCsvButton } from "@/components/exportaciones/export-csv-button";
import { PrintButton } from "@/components/exportaciones/print-button";
import { createAuditLog } from "@/lib/audit/audit-log";
import { getServerAuthContext } from "@/lib/auth/server";
import { canExportType, type ExportReportType } from "@/lib/exportaciones/export-permissions";
import { formatCurrencyARS, formatDateAR, formatUSD } from "@/lib/exportaciones/export-utils";
import { buildBagsExport, buildCashLoadsExport, buildDailyReportExport, buildExpensesExport, buildWeeklyClosureExport } from "@/lib/exportaciones/export-service";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import { getWeeklyCashClosureRange } from "@/lib/finance/weekly-cash-closure-calculations";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getParam(searchParams: Record<string, string | string[] | undefined>, key: string, fallback = "") {
  const value = searchParams[key];
  return typeof value === "string" ? value : fallback;
}

function getKindTitle(tipo: ExportReportType) {
  switch (tipo) {
    case "reporte-diario":
      return "Reporte diario";
    case "cierre-semanal":
      return "Cierre semanal";
    case "gastos":
      return "Gastos";
    case "cargas-cajas":
      return "Cargas de cajas";
    case "bolsas":
      return "Bolsas de divisas";
  }
}

function buildCsvLink(tipo: ExportReportType, searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === "string" && value) params.set(key, value);
  });
  return `/api/exportaciones/${tipo}/csv?${params.toString()}`;
}

async function getAssignedCashRegisterIds(userId: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin.from("cash_registers").select("id").eq("responsible_user_id", userId);
  if (error) return [];
  return ((data ?? []) as Array<{ id?: unknown }>).map((row) => String(row.id ?? ""));
}

function renderCell(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") {
    if (key.includes("usd")) return formatUSD(value);
    if (key.includes("fecha")) return formatDateAR(String(value));
    return formatCurrencyARS(value);
  }
  if (typeof value === "string") {
    if (key.includes("fecha")) return formatDateAR(value);
    if (key.includes("usd") && /^[0-9.]+$/.test(value)) return formatUSD(Number(value));
    if ((key.includes("ars") || key.includes("monto") || key.includes("ganancia") || key.includes("total")) && /^[0-9.]+$/.test(value)) {
      return formatCurrencyARS(Number(value));
    }
    return value;
  }
  return String(value);
}

export default async function ExportacionTipoPage({
  params,
  searchParams
}: {
  params: Promise<{ tipo: string }>;
  searchParams?: SearchParams;
}) {
  const { tipo: rawTipo } = await params;
  const tipo = rawTipo as ExportReportType;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const auth = await getServerAuthContext(cookies());

  if (!auth) {
    return <AccessDenied />;
  }

  const assignedCashRegisterIds = auth.role === "cajero" ? await getAssignedCashRegisterIds(auth.userId) : [];
  const permission = canExportType({
    userRole: auth.role,
    exportType: tipo,
    userId: auth.userId,
    filters: {
      date: getParam(resolvedSearchParams, "date") || undefined,
      from: getParam(resolvedSearchParams, "from") || undefined,
      to: getParam(resolvedSearchParams, "to") || undefined,
      branch_id: getParam(resolvedSearchParams, "branch_id") || undefined,
      status: getParam(resolvedSearchParams, "status") || undefined,
      category: getParam(resolvedSearchParams, "category") || undefined,
      cash_register_id: getParam(resolvedSearchParams, "cash_register_id") || undefined,
      bag_id: getParam(resolvedSearchParams, "bag_id") || undefined,
      operation_type: getParam(resolvedSearchParams, "operation_type") || undefined
    },
    assignedCashRegisterIds
  });

  if (!permission.allowed) {
    return <AccessDenied description={permission.reason ?? "No tenés permisos para exportar este reporte."} title="No tenés permisos para exportar este reporte" />;
  }

  const printMode = getParam(resolvedSearchParams, "print") === "true";
  const date = getParam(resolvedSearchParams, "date", getBuenosAiresDateString());
  const from = getParam(resolvedSearchParams, "from", date);
  const to = getParam(resolvedSearchParams, "to", date);
  const effectiveSearchParams = {
    ...resolvedSearchParams,
    ...permission.restrictedFilters
  };

  let exportData:
    | Awaited<ReturnType<typeof buildDailyReportExport>>
    | Awaited<ReturnType<typeof buildWeeklyClosureExport>>
    | Awaited<ReturnType<typeof buildExpensesExport>>
    | Awaited<ReturnType<typeof buildCashLoadsExport>>
    | Awaited<ReturnType<typeof buildBagsExport>>
    | null = null;

  if (tipo === "reporte-diario") {
    exportData = await buildDailyReportExport(effectiveSearchParams.date || date, { role: auth.role, userId: auth.userId });
  } else if (tipo === "cierre-semanal") {
    exportData = await buildWeeklyClosureExport(effectiveSearchParams.date || date, { role: auth.role, userId: auth.userId });
  } else if (tipo === "gastos") {
    exportData = await buildExpensesExport(
      {
        from: effectiveSearchParams.from || from,
        to: effectiveSearchParams.to || to,
        branchId: getParam(effectiveSearchParams, "branch_id") || undefined,
        status: getParam(effectiveSearchParams, "status") as any,
        category: getParam(effectiveSearchParams, "category") || undefined
      },
      { role: auth.role, userId: auth.userId }
    );
  } else if (tipo === "cargas-cajas") {
    exportData = await buildCashLoadsExport(
      {
        from: effectiveSearchParams.from || from,
        to: effectiveSearchParams.to || to,
        branchId: getParam(effectiveSearchParams, "branch_id") || undefined,
        cashRegisterId: getParam(effectiveSearchParams, "cash_register_id") || undefined,
        status: getParam(effectiveSearchParams, "status") || undefined
      },
      { role: auth.role, userId: auth.userId }
    );
  } else if (tipo === "bolsas") {
    exportData = await buildBagsExport(
      {
        from: effectiveSearchParams.from || from,
        to: effectiveSearchParams.to || to,
        bagId: getParam(effectiveSearchParams, "bag_id") || undefined,
        operationType: getParam(effectiveSearchParams, "operation_type") || undefined
      },
      { role: auth.role, userId: auth.userId }
    );
  }

  if (!exportData) {
    return <EmptyState title="Sin datos" description="No se pudieron preparar los datos de exportacion." />;
  }

  if (printMode) {
    await createAuditLog({
      actorId: auth.userId,
      action: `export.${tipo}.print`,
      entityType: "export",
      entityId: null,
      newData: { tipo, filtros: effectiveSearchParams, formato: "print" }
    });
  }

  const csvLink = buildCsvLink(tipo, effectiveSearchParams);
  const printParams = new URLSearchParams(
    Object.entries(effectiveSearchParams).flatMap(([key, value]) => (typeof value === "string" && value ? [[key, value]] : []))
  );
  printParams.set("print", "true");
  const printLink = `/exportaciones/${tipo}?${printParams.toString()}`;
  const headers = exportData.headers;

  return (
    <div className={printMode ? "space-y-4 bg-white/[0.06] text-brandWhite print:bg-white/[0.06]" : "space-y-6"}>
      <div className={printMode ? "print:hidden" : ""}>
        <SectionTitle
          description="Vista imprimible y exportacion CSV del reporte seleccionado."
          title={getKindTitle(tipo)}
          rightSlot={<Badge variant="outline">Exportacion</Badge>}
        />
      </div>

      {!printMode ? (
        <form className="grid gap-3 rounded-3xl border border-white/10 bg-darkSurface/80 p-4 shadow-soft md:grid-cols-2 xl:grid-cols-4" method="get">
          <input name="print" type="hidden" value="false" />
          {permission.restrictedFilters?.cash_register_id ? <input name="cash_register_id" type="hidden" value={permission.restrictedFilters.cash_register_id} /> : null}
          {tipo === "reporte-diario" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brandWhite" htmlFor="date">
                  Fecha
                </label>
                <Input defaultValue={date} id="date" name="date" type="date" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brandWhite" htmlFor="branch_id">
                  Sucursal
                </label>
                <select className="h-11 w-full rounded-md border border-border bg-white/[0.06] px-3 text-sm text-brandWhite shadow-sm" defaultValue={getParam(resolvedSearchParams, "branch_id")} id="branch_id" name="branch_id">
                  <option value="">Ambas</option>
                  <option value="Centro">Centro</option>
                  <option value="Terminal">Terminal</option>
                </select>
              </div>
            </>
          ) : null}

          {tipo === "cierre-semanal" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brandWhite" htmlFor="date">
                  Fecha
                </label>
                <Input defaultValue={date} id="date" name="date" type="date" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brandWhite" htmlFor="from">
                  Inicio
                </label>
                <Input defaultValue={getWeeklyCashClosureRange(date).weekStartDate} id="from" name="from" type="date" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brandWhite" htmlFor="to">
                  Fin
                </label>
                <Input defaultValue={getWeeklyCashClosureRange(date).weekEndDate} id="to" name="to" type="date" />
              </div>
            </>
          ) : null}

          {tipo !== "reporte-diario" && tipo !== "cierre-semanal" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brandWhite" htmlFor="from">
                  Desde
                </label>
                <Input defaultValue={from} id="from" name="from" type="date" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brandWhite" htmlFor="to">
                  Hasta
                </label>
                <Input defaultValue={to} id="to" name="to" type="date" />
              </div>
            </>
          ) : null}

          {tipo === "gastos" ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brandWhite" htmlFor="status">
                  Estado
                </label>
                <select className="h-11 w-full rounded-md border border-border bg-white/[0.06] px-3 text-sm text-brandWhite shadow-sm" defaultValue={getParam(resolvedSearchParams, "status")} id="status" name="status">
                  <option value="">Todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="pagado">Pagado</option>
                  <option value="imputado">Imputado</option>
                  <option value="anulado">Anulado</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brandWhite" htmlFor="category">
                  Categoría
                </label>
                <Input defaultValue={getParam(resolvedSearchParams, "category")} id="category" name="category" />
              </div>
            </>
          ) : null}

          {tipo === "cargas-cajas" ? (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-brandWhite" htmlFor="status">
                Estado
              </label>
              <select className="h-11 w-full rounded-md border border-border bg-white/[0.06] px-3 text-sm text-brandWhite shadow-sm" defaultValue={getParam(resolvedSearchParams, "status")} id="status" name="status">
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
                <option value="cargado">Cargado</option>
                <option value="revisado">Revisado</option>
              </select>
            </div>
          ) : null}

          {tipo === "bolsas" ? (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-brandWhite" htmlFor="operation_type">
                Tipo de operación
              </label>
              <select className="h-11 w-full rounded-md border border-border bg-white/[0.06] px-3 text-sm text-brandWhite shadow-sm" defaultValue={getParam(resolvedSearchParams, "operation_type")} id="operation_type" name="operation_type">
                <option value="">Todos</option>
                <option value="compra_usd">Comprar USD</option>
                <option value="venta_usd">Vender USD</option>
                <option value="ingreso_pesos_efectivo">Ingresar efectivo</option>
                <option value="egreso_pesos_efectivo">Retirar efectivo</option>
                <option value="ingreso_pesos_cuenta">Ingresar transferencia</option>
                <option value="egreso_pesos_cuenta">Retirar transferencia</option>
                <option value="prestamo_entregado">Préstamo entregado</option>
                <option value="prestamo_recibido">Préstamo recibido</option>
                <option value="devolucion_prestamo">Devolución de préstamo</option>
                <option value="ajuste_manual">Ajuste manual</option>
                <option value="anulacion_operacion">Anular operación</option>
              </select>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-4">
            <Button className="shadow-yellowGlow" type="submit">
              Ver resultado
            </Button>
            <ExportCsvButton href={csvLink} label="Exportar CSV" />
            <Button asChild variant="outline">
              <Link href={printLink}>Vista imprimible</Link>
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-soft print:border-0 print:p-0 print:shadow-none">
          <div className="mb-4 print:mb-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-lightGray/55">MAS SERVICIOS</p>
            <h1 className="font-heading text-3xl font-black text-brandWhite">{getKindTitle(tipo)}</h1>
            <p className="text-sm text-lightGray/55">{exportData.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-3 print:hidden">
            <ExportCsvButton href={csvLink} label="Descargar CSV" />
            <Button asChild variant="secondary">
              <Link href={printLink}>Recargar impresión</Link>
            </Button>
            <PrintButton />
          </div>
        </div>
      )}

      <DataCard description="Resultados de exportacion en formato tabular." title="Resultado">
        {exportData.rows.length === 0 ? (
          <EmptyState description="No hay filas para los filtros aplicados." title="Sin datos" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] border-separate border-spacing-0 text-sm">
              <thead className="bg-black/20 text-brandWhite">
                <tr>
                  {headers.map((header) => (
                    <th className="border-b border-white/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]" key={header}>
                      {header.replaceAll("_", " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exportData.rows.map((row, index) => (
                  <tr className={index % 2 === 0 ? "bg-white/[0.06]" : "bg-black/20"} key={`${tipo}-${index}`}>
                    {headers.map((header) => (
                      <td className="border-b border-white/10 px-4 py-3" key={header}>
                        {renderCell(header, (row as Record<string, unknown>)[header])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
    </div>
  );
}
