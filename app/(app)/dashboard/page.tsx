import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  BellRing,
  CalendarRange,
  CircleAlert,
  Download,
  FileBarChart2,
  Landmark,
  NotebookText,
  ReceiptText,
  Settings2,
  ShieldAlert,
  Store,
  TrendingUp,
  Boxes
} from "lucide-react";

import { AccessDenied } from "@/components/access-denied";
import { DataCard } from "@/components/data-card";
import { EmptyState } from "@/components/empty-state";
import { NotesPanel } from "@/components/notes/notes-panel";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerAuthContext } from "@/lib/auth/server";
import { canAccessPath, type Role, roleLabels } from "@/lib/auth/roles";
import { getBagsOverview } from "@/lib/bags/bag-service";
import { formatUsd } from "@/lib/bags/bag-calculations";
import { getExpensePageData } from "@/lib/finance/expense-service";
import { getDailyReportDetailedData } from "@/lib/finance/daily-report-detailed-service";
import { getWeeklyCashClosureViewData } from "@/lib/finance/weekly-cash-closure-service";
import { getWeeklyCashClosureRange } from "@/lib/finance/weekly-cash-closure-calculations";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import { formatArs } from "@/lib/operations/seed-data";
import { listImportantNotes } from "@/lib/notes/notes-service";

type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: typeof ArrowRight;
  priority?: "primary" | "secondary";
};

type DashboardAlert = {
  title: string;
  description: string;
  href: string;
  tone: "info" | "warning" | "critical";
  icon: typeof BellRing;
};

function formatSignedArs(value: number) {
  const abs = formatArs(Math.abs(value));
  return value < 0 ? `-${abs}` : `+${abs}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function toneForAlert(tone: DashboardAlert["tone"]) {
  if (tone === "critical") return "danger" as const;
  if (tone === "warning") return "warning" as const;
  return "neutral" as const;
}

function filterVisibleActions(actions: QuickAction[], role: Role) {
  return actions.filter((action) => canAccessPath(role, action.href));
}

function registerStatusBadge(status: string) {
  if (status === "cargado" || status === "revisado") return "success" as const;
  if (status === "parcial") return "warning" as const;
  return "neutral" as const;
}

function bagStatusBadge(status: string) {
  if (status === "ok") return "success" as const;
  if (status === "revisar" || status === "pendiente_cierre") return "warning" as const;
  return "danger" as const;
}

export default async function DashboardPage() {
  const auth = await getServerAuthContext(cookies());
  if (!auth) {
    return <AccessDenied />;
  }

  const today = getBuenosAiresDateString();
  const weekRange = getWeeklyCashClosureRange(today);

  const [reportData, bags, expenseData, weeklyClosureData, notes] = await Promise.all([
    getDailyReportDetailedData(today, { role: auth.role, userId: auth.userId }),
    getBagsOverview(),
    getExpensePageData({ date: today }, { role: auth.role, userId: auth.userId }),
    getWeeklyCashClosureViewData(today, { role: auth.role, userId: auth.userId }),
    listImportantNotes(8)
  ]);

  const { grandTotals, centro, terminal } = reportData;

  const todayExpenses = expenseData.expenses.filter((e) => e.status !== "anulado");
  const pendingExpensesToday = expenseData.expenses.filter((e) => e.status === "pendiente");

  const activeBags = [...bags].sort((a, b) => a.name.localeCompare(b.name));
  const totalCash = bags.reduce((acc, b) => acc + Number(b.current_cash_ars ?? 0), 0);
  const totalAccount = bags.reduce((acc, b) => acc + Number(b.current_account_ars ?? 0), 0);
  const totalUsd = bags.reduce((acc, b) => acc + Number(b.current_usd ?? 0), 0);
  const totalBorrowed = bags.reduce((acc, b) => acc + Number(b.borrowed_ars ?? 0), 0);
  const totalBagProfit = bags.reduce((acc, b) => acc + Number(b.accumulated_profit_ars ?? 0), 0);
  const totalBagDifference = bags.reduce((acc, b) => acc + Number(b.difference_ars ?? 0), 0);
  const bagsToReview = bags.filter((b) => b.status !== "ok").length;
  const bagsWithDifference = activeBags.filter((b) => Number(b.difference_ars ?? 0) < 0);

  const overallReportStatus =
    reportData.dailyReports.length === 0
      ? "Abierto"
      : reportData.dailyReports.every((r) => r.status === "cerrado")
        ? "Cerrado"
        : reportData.dailyReports.some((r) => r.status === "revisar")
          ? "Revisar"
          : "Abierto";

  const centroRegisters = centro.registers;
  const terminalRegisters = terminal.registers;
  const registersTotal = [...centroRegisters, ...terminalRegisters];
  const registersPending = registersTotal.filter(
    (r) => r.status === "pendiente" || r.status === "parcial"
  ).length;

  const firstBag = activeBags[0] ?? null;
  const firstRegister =
    registersTotal.find((r) => auth.role !== "cajero" || r.register.responsible_user_id === auth.userId) ??
    registersTotal[0] ??
    null;

  const bagActions: QuickAction[] = [
    {
      href: firstBag ? `/bolsas/nueva-operacion?bagId=${firstBag.id}` : "/bolsas",
      label: "Cargar operacion",
      description: "Compra, venta o movimiento de una bolsa.",
      icon: TrendingUp,
      priority: "primary"
    },
    {
      href: firstBag ? `/bolsas/${firstBag.id}/vender-a-bolsa` : "/bolsas",
      label: "Mover entre bolsas",
      description: "Operacion interna entre dos bolsas.",
      icon: Boxes,
      priority: "secondary"
    }
  ];

  const operationalActions: QuickAction[] = [
    {
      href: firstRegister ? `/cajas/${firstRegister.register.id}/cargar` : "/cajas",
      label: "Cargar caja",
      description: "Registrar la carga diaria de la caja.",
      icon: Store,
      priority: "primary"
    },
    { href: "/reporte-diario", label: "Ver reporte", description: "Planilla diaria por sucursal.", icon: FileBarChart2, priority: "primary" },
    { href: "/gastos", label: "Cargar gasto", description: "Registrar o revisar gastos.", icon: ReceiptText, priority: "primary" },
    { href: "/cajas", label: "Ver cajas", description: "Listado de cajas Pago Facil.", icon: Landmark, priority: "secondary" },
    { href: "/cierres", label: "Cierre semanal", description: "Control de semana operativa.", icon: CalendarRange, priority: "secondary" },
    { href: "/exportaciones", label: "Exportar", description: "CSV e impresion de reportes.", icon: Download, priority: "secondary" },
    { href: "/configuracion", label: "Ajustes", description: "Roles y datos generales.", icon: Settings2, priority: "secondary" }
  ];

  const visibleBagActions = filterVisibleActions(bagActions, auth.role);
  const visiblePagoFacilActions = filterVisibleActions(operationalActions, auth.role);

  const alerts: DashboardAlert[] = [];

  if (registersPending > 0) {
    alerts.push({
      title: "Hay cajas pendientes hoy",
      description: `${registersPending} cajas siguen sin carga completa.`,
      href: "/cajas",
      tone: "warning",
      icon: BellRing
    });
  }

  if (overallReportStatus !== "Cerrado") {
    alerts.push({
      title: "Reporte diario sin cerrar",
      description: `El reporte de hoy sigue en estado ${overallReportStatus.toLowerCase()}.`,
      href: "/reporte-diario",
      tone: overallReportStatus === "Revisar" ? "critical" : "warning",
      icon: CircleAlert
    });
  }

  if (pendingExpensesToday.length > 0) {
    alerts.push({
      title: "Hay gastos pendientes",
      description: `${pendingExpensesToday.length} gastos todavia no fueron pagados o imputados.`,
      href: "/gastos",
      tone: "warning",
      icon: ReceiptText
    });
  }

  if (weeklyClosureData.status !== "cerrado") {
    alerts.push({
      title: "Cierre semanal pendiente",
      description: `La semana ${weekRange.weekStartDate} a ${weekRange.weekEndDate} sigue en estado ${weeklyClosureData.status}.`,
      href: "/cierres",
      tone: weeklyClosureData.status === "revisar" ? "critical" : "warning",
      icon: CalendarRange
    });
  }

  if (bagsWithDifference.length > 0) {
    alerts.push({
      title: "Hay bolsas con diferencia negativa",
      description: `${bagsWithDifference.length} bolsas estan por debajo de la base estimada.`,
      href: "/bolsas",
      tone: "critical",
      icon: ShieldAlert
    });
  }

  if (notes.length > 0) {
    alerts.push({
      title: "Notas urgentes abiertas",
      description: `${notes.length} notas importantes o urgentes siguen abiertas.`,
      href: "/dashboard",
      tone: "warning",
      icon: NotebookText
    });
  }

  if (grandTotals.freeProfitArs < 0) {
    alerts.push({
      title: "Ganancia libre negativa",
      description: "Los gastos superan la ganancia bruta del dia.",
      href: "/reporte-diario",
      tone: "critical",
      icon: CircleAlert
    });
  }

  if (weeklyClosureData.branches.some((b) => b.status === "revisar")) {
    alerts.push({
      title: "Cierre semanal marcado para revisar",
      description: "Una o mas cajas quedaron con estado revisar durante la semana.",
      href: "/cierres",
      tone: "warning",
      icon: CalendarRange
    });
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Estado del dia, cajas, bolsas y alertas operativas."
        title="Dashboard"
        rightSlot={
          <>
            <Badge className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]" variant="outline">
              {roleLabels[auth.role]}
            </Badge>
            <Badge className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]" variant="neutral">
              {today}
            </Badge>
          </>
        }
      />

      {/* Summary StatCards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          helper="Comisiones PF hoy"
          label="Ganancia PF"
          status={grandTotals.pfProfitTotal >= 0 ? "ok" : "error"}
          value={formatArs(grandTotals.pfProfitTotal)}
        />
        <StatCard
          helper="Divisas hoy"
          label="Ganancia divisas"
          status={grandTotals.currencyProfitTotal >= 0 ? "ok" : "error"}
          value={formatArs(grandTotals.currencyProfitTotal)}
        />
        <StatCard
          helper="No incluye anulados"
          label="Gastos"
          status="neutral"
          value={formatArs(grandTotals.expensesArs)}
        />
        <StatCard
          helper="Bruto menos gastos"
          label="Ganancia libre"
          status={grandTotals.freeProfitArs < 0 ? "error" : "ok"}
          value={formatArs(grandTotals.freeProfitArs)}
        />
      </div>

      {/* Per-branch register summary */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Centro cajas */}
        <DataCard
          description="Estado de las cajas Centro para el dia."
          title="Centro — Cajas"
        >
          {centroRegisters.length === 0 ? (
            <EmptyState description="No hay cajas configuradas para Centro." title="Sin cajas" />
          ) : (
            <div className="space-y-3">
              {centroRegisters.map((rs) => (
                <div
                  className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-soft"
                  key={rs.register.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-lightGray/55">
                        Caja {rs.register.register_number}
                      </p>
                      <h3 className="mt-0.5 font-heading text-lg font-black text-brandWhite">
                        {rs.register.name}
                      </h3>
                    </div>
                    <Badge variant={registerStatusBadge(rs.status)}>{rs.status}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-xl bg-black/20 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-lightGray/55">Operado</p>
                      <p className="mt-1 text-sm font-bold text-brandWhite tabular-nums">{formatArs(rs.totalOperatedArs)}</p>
                    </div>
                    <div className="rounded-xl bg-black/20 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-lightGray/55">Ganancia</p>
                      <p className="mt-1 text-sm font-bold text-brandWhite tabular-nums">{formatArs(rs.pfProfitArs)}</p>
                    </div>
                    <div className="rounded-xl bg-black/20 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-lightGray/55">Ultima actualizacion</p>
                      <p className="mt-1 text-sm font-bold text-brandWhite">{formatDateTime(rs.register.updated_at)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm">
                      <Link href={`/cajas/${rs.register.id}`}>Ver caja</Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/cajas/${rs.register.id}/cargar`}>Cargar dia</Link>
                    </Button>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl border border-brandYellow/25 bg-brandYellow/10 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-brandYellow">Total Centro PF</p>
                <p className="mt-1 text-xl font-black text-brandWhite">
                  {formatArs(centro.totals.pfProfitArs + centro.totals.manualPfAdjArs)}
                </p>
              </div>
            </div>
          )}
        </DataCard>

        {/* Terminal cajas */}
        <DataCard
          description="Estado de las cajas Terminal para el dia."
          title="Terminal — Cajas"
        >
          {terminalRegisters.length === 0 ? (
            <EmptyState description="No hay cajas configuradas para Terminal." title="Sin cajas" />
          ) : (
            <div className="space-y-3">
              {terminalRegisters.map((rs) => (
                <div
                  className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-soft"
                  key={rs.register.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-lightGray/55">
                        Caja {rs.register.register_number}
                      </p>
                      <h3 className="mt-0.5 font-heading text-lg font-black text-brandWhite">
                        {rs.register.name}
                      </h3>
                    </div>
                    <Badge variant={registerStatusBadge(rs.status)}>{rs.status}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-xl bg-black/20 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-lightGray/55">Operado</p>
                      <p className="mt-1 text-sm font-bold text-brandWhite tabular-nums">{formatArs(rs.totalOperatedArs)}</p>
                    </div>
                    <div className="rounded-xl bg-black/20 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-lightGray/55">Ganancia</p>
                      <p className="mt-1 text-sm font-bold text-brandWhite tabular-nums">{formatArs(rs.pfProfitArs)}</p>
                    </div>
                    <div className="rounded-xl bg-black/20 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-lightGray/55">Ultima actualizacion</p>
                      <p className="mt-1 text-sm font-bold text-brandWhite">{formatDateTime(rs.register.updated_at)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm">
                      <Link href={`/cajas/${rs.register.id}`}>Ver caja</Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/cajas/${rs.register.id}/cargar`}>Cargar dia</Link>
                    </Button>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl border border-brandYellow/25 bg-brandYellow/10 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-brandYellow">Total Terminal PF</p>
                <p className="mt-1 text-xl font-black text-brandWhite">
                  {formatArs(terminal.totals.pfProfitArs + terminal.totals.manualPfAdjArs)}
                </p>
              </div>
            </div>
          )}
        </DataCard>
      </div>

      {/* Bolsas per bag */}
      <div className="rounded-[28px] border border-brandYellow/20 bg-brandYellow/10 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-brandYellow">Modulo Bolsas</p>
        <h2 className="mt-1 font-heading text-2xl font-black text-brandWhite">Divisas y saldos separados</h2>
      </div>

      <DataCard description="Estado operativo de cada bolsa para el dia." title="Bolsas de divisas">
        <div className="grid gap-4 xl:grid-cols-2">
          {activeBags.map((bag) => {
            const bagSheet = reportData.bags.find((b) => b.bag.id === bag.id);
            const difference = Number(bag.difference_ars ?? 0);
            return (
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-soft" key={bag.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-lightGray/55">Bolsa</p>
                    <h3 className="mt-1 font-heading text-xl font-black text-brandWhite">{bag.name}</h3>
                    <p className="text-sm text-lightGray/55">{bag.responsible_name ?? "Sin asignar"}</p>
                    {bagSheet?.branchName ? (
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brandYellow/80">
                        {bagSheet.branchName}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={bagStatusBadge(bag.status)}>{bag.status}</Badge>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-lightGray/55">Efectivo</p>
                    <p className="mt-1 text-sm font-semibold text-brandWhite tabular-nums">
                      {formatArs(Number(bag.current_cash_ars ?? 0))}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-lightGray/55">Cuenta</p>
                    <p className="mt-1 text-sm font-semibold text-brandWhite tabular-nums">
                      {formatArs(Number(bag.current_account_ars ?? 0))}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-lightGray/55">USD</p>
                    <p className="mt-1 text-sm font-semibold text-brandWhite tabular-nums">
                      {formatUsd(Number(bag.current_usd ?? 0))}
                    </p>
                  </div>
                  {bagSheet ? (
                    <div className="rounded-xl border border-white/10 bg-brandYellow/10 p-2.5 sm:col-span-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-brandYellow">Resumen de hoy</p>
                      <p className="mt-1 text-sm font-semibold text-brandWhite">
                        {formatUsd(bagSheet.boughtUsdToday)} comprados · {formatUsd(bagSheet.soldUsdToday)} vendidos ·{" "}
                        {formatArs(bagSheet.currencyProfitArs)} de ganancia
                      </p>
                    </div>
                  ) : null}
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2.5 sm:col-span-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-lightGray/55">Diferencia estimada</p>
                    <p className={`mt-1 text-sm font-semibold tabular-nums ${difference < 0 ? "text-danger" : "text-brandWhite"}`}>
                      {formatSignedArs(difference)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild className="shadow-yellowGlow" size="sm">
                    <Link href={`/bolsas/${bag.id}`}>Ver detalles</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/bolsas/nueva-operacion?bagId=${bag.id}`}>Nueva operacion</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/bolsas/${bag.id}/vender-a-bolsa`}>Vender a otra bolsa</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DataCard>

      <DataCard description="Ganancia consolidada sin tabla pesada." title="Totales del dia">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="PF total" status="ok" value={formatArs(grandTotals.pfProfitTotal)} />
          <StatCard label="Divisas total" status="ok" value={formatArs(grandTotals.currencyProfitTotal)} />
          <StatCard label="Gastos" status="neutral" value={formatArs(grandTotals.expensesArs)} />
          <StatCard label="Ganancia libre" status={grandTotals.freeProfitArs < 0 ? "error" : "ok"} value={formatArs(grandTotals.freeProfitArs)} />
        </div>
      </DataCard>


      {/* Alerts */}
      <DataCard description="Alertas que requieren revision operativa." title="Alertas operativas">
        {alerts.length === 0 ? (
          <EmptyState description="No hay alertas activas para la jornada actual." title="Todo en orden" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <Link
                  className="group rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-medium"
                  href={alert.href}
                  key={alert.title}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brandYellow/20 text-brandWhite">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-base font-bold text-brandWhite">{alert.title}</h3>
                        <Badge variant={toneForAlert(alert.tone)}>{alert.tone}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-lightGray/55">{alert.description}</p>
                      <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-brandWhite">
                        Ir a revisar
                        <ArrowRight className="h-3.5 w-3.5" />
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </DataCard>

      {/* Expenses + weekly closure */}
      <div className="grid gap-4 xl:grid-cols-2">
        <DataCard description="Gastos de hoy y su estado de pago." title="Pago Facil — gastos">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              className="shadow-none"
              helper="No se cuentan anulados"
              label="Gastos del dia"
              value={formatArs(todayExpenses.reduce((acc, e) => acc + Number(e.amount_ars ?? 0), 0))}
            />
            <StatCard
              className="shadow-none"
              helper="Aun no resueltos"
              label="Pendientes"
              value={formatArs(pendingExpensesToday.reduce((acc, e) => acc + Number(e.amount_ars ?? 0), 0))}
            />
            <StatCard
              className="shadow-none"
              helper="Cantidad de registros"
              label="Movimientos"
              value={`${todayExpenses.length}`}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/gastos">Ir a gastos</Link>
            </Button>
          </div>
        </DataCard>

        <DataCard description="Estado del cierre semanal de Pago Facil." title="Pago Facil — cierre semanal">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              className="shadow-none"
              helper="Viernes a jueves"
              label="Semana"
              value={`${weeklyClosureData.weekStartDate} / ${weeklyClosureData.weekEndDate}`}
            />
            <StatCard
              className="shadow-none"
              helper="Estado general"
              label="Cierre"
              status={weeklyClosureData.status === "cerrado" ? "ok" : weeklyClosureData.status === "revisar" ? "revisar" : "pendiente"}
              value={weeklyClosureData.status.toUpperCase()}
            />
            <StatCard
              className="shadow-none"
              helper="Total operado"
              label="Operado"
              value={formatArs(weeklyClosureData.totals.totalOperatedArs)}
            />
            <StatCard
              className="shadow-none"
              helper="Ganancia Pago Facil"
              label="Ganancia"
              value={formatArs(weeklyClosureData.totals.totalProfitArs)}
            />
          </div>
          <div className="mt-4">
            <Button asChild>
              <Link href="/cierres">Ver cierre semanal</Link>
            </Button>
          </div>
        </DataCard>
      </div>

      {/* Resumen operativo + notas */}
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DataCard description="Estado general de bolsas y saldos." title="Resumen operativo">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard className="shadow-none" helper="Con diferencia estimada" label="Bolsas para revisar" value={`${bagsToReview}`} />
            <StatCard className="shadow-none" helper="Prestado total" label="Total prestado" value={formatArs(totalBorrowed)} />
            <StatCard className="shadow-none" helper="Efectivo total" label="Efectivo" value={formatArs(totalCash)} />
            <StatCard className="shadow-none" helper="Cuenta total" label="Cuenta" value={formatArs(totalAccount)} />
            <StatCard className="shadow-none" helper="USD total disponible" label="USD" value={formatUsd(totalUsd)} />
            <StatCard className="shadow-none" helper="Ganancia acumulada" label="Bolsas" value={formatArs(totalBagProfit)} />
          </div>
        </DataCard>

        <div className="space-y-4">
          <DataCard description="Notas importantes y urgentes abiertas." title="Notas importantes">
            {notes.length === 0 ? (
              <EmptyState
                description="No hay notas urgentes o importantes abiertas en este momento."
                title="Sin notas importantes"
              />
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <Link
                    className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-black/20"
                    href={note.entity_href || "/dashboard"}
                    key={note.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-brandWhite">{note.title}</p>
                        <p className="mt-1 text-sm text-lightGray/55">{note.body}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-lightGray/55">
                          {note.entity_label ?? note.entity_type}
                        </p>
                      </div>
                      <Badge variant={note.priority === "urgente" ? "danger" : "warning"}>
                        {note.priority}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </DataCard>

          <NotesPanel
            description="Notas generales del sistema para seguimiento interno."
            entityHref="/dashboard"
            entityLabel="Dashboard"
            entityType="general"
            title="Notas generales"
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        {canAccessPath(auth.role, "/bolsas") ? (
          <Button asChild>
            <Link href="/bolsas">Ir a bolsas</Link>
          </Button>
        ) : null}
        {canAccessPath(auth.role, "/cajas") ? (
          <Button asChild variant="secondary">
            <Link href="/cajas">Ir a cajas</Link>
          </Button>
        ) : null}
        {canAccessPath(auth.role, "/reporte-diario") ? (
          <Button asChild variant="outline">
            <Link href="/reporte-diario">Ver reporte diario</Link>
          </Button>
        ) : null}
        {canAccessPath(auth.role, "/exportaciones") ? (
          <Button asChild variant="outline">
            <Link href="/exportaciones">Exportaciones</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
