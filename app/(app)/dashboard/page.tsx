import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, BellRing, Boxes, CalendarRange, CircleAlert, Download, FileBarChart2, Landmark, NotebookText, ReceiptText, Settings2, ShieldAlert, Store, TrendingUp } from "lucide-react";

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
import { getCashModuleData } from "@/lib/cash/cash-service";
import { getExpensePageData } from "@/lib/finance/expense-service";
import { getDailyReportViewData } from "@/lib/finance/daily-report-service";
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
};

type DashboardAlert = {
  title: string;
  description: string;
  href: string;
  tone: "info" | "warning" | "critical";
  icon: typeof BellRing;
};

function resolveReportStatus(branches: Awaited<ReturnType<typeof getDailyReportViewData>>["branches"]) {
  if (branches.length === 0) return "Sin datos";
  if (branches.some((branch) => branch.hasNegativeAvailable)) return "Revisar";
  if (branches.some((branch) => branch.dailyReport?.status === "revisar")) return "Revisar";
  if (branches.every((branch) => branch.dailyReport?.status === "cerrado")) return "Cerrado";
  return "Abierto";
}

function formatSignedArs(value: number) {
  const abs = formatArs(Math.abs(value));
  return value < 0 ? `-${abs}` : `+${abs}`;
}

function toneForAlert(tone: DashboardAlert["tone"]) {
  if (tone === "critical") return "danger";
  if (tone === "warning") return "warning";
  return "neutral";
}

function toneForBag(difference: number, status: string) {
  if (difference < 0) return "error";
  if (status === "revisar" || status === "pendiente_cierre") return "revisar";
  return "ok";
}

function filterVisibleActions(actions: QuickAction[], role: Role) {
  return actions.filter((action) => canAccessPath(role, action.href));
}

export default async function DashboardPage() {
  const auth = await getServerAuthContext(cookies());
  if (!auth) {
    return <AccessDenied />;
  }

  const today = getBuenosAiresDateString();
  const weekRange = getWeeklyCashClosureRange(today);
  const [bags, cashData, reportData, expenseData, weeklyClosureData, notes] = await Promise.all([
    getBagsOverview(),
    getCashModuleData({ role: auth.role, userId: auth.userId }),
    getDailyReportViewData(today, { role: auth.role, userId: auth.userId }),
    getExpensePageData({ date: today }, { role: auth.role, userId: auth.userId }),
    getWeeklyCashClosureViewData(today, { role: auth.role, userId: auth.userId }),
    listImportantNotes(8)
  ]);

  const visibleNotes = notes.filter((note) => note.status === "abierta");
  const reportStatus = resolveReportStatus(reportData.branches);
  const reportAvailableToday = reportData.totals.availableProfitArs;
  const totalCurrencyProfitToday = reportData.totals.automaticCurrencyProfitArs + reportData.totals.manualCurrencyAdjustmentArs;
  const todayExpenses = expenseData.expenses.filter((expense) => expense.status !== "anulado");
  const pendingExpensesToday = expenseData.expenses.filter((expense) => expense.status === "pendiente");
  const activeBags = [...bags].sort((left, right) => left.name.localeCompare(right.name));
  const bagsWithDifference = activeBags.filter((bag) => Number(bag.difference_ars ?? 0) < 0);
  const boxes = [...cashData.registers].sort((left, right) => Number(left.register_number ?? 0) - Number(right.register_number ?? 0));
  const firstBag = activeBags[0] ?? null;
  const firstRegister = boxes.find((register) => auth.role !== "cajero" || register.responsible_user_id === auth.userId) ?? boxes[0] ?? null;

  const bagActions: QuickAction[] = [
    {
      href: firstBag ? `/bolsas/${firstBag.id}/nueva-operacion` : "/bolsas",
      label: "Nueva operacion de bolsa",
      description: "Abrir una carga o venta sobre la bolsa disponible.",
      icon: TrendingUp
    },
    {
      href: firstBag ? `/bolsas/${firstBag.id}/vender-a-bolsa` : "/bolsas",
      label: "Vender a otra bolsa",
      description: "Mover USD entre bolsas con control interno.",
      icon: Boxes
    }
  ];

  const operationalActions: QuickAction[] = [
    { href: firstRegister ? `/cajas/${firstRegister.id}/cargar` : "/cajas", label: "Cargar caja", description: "Registrar la carga diaria de la caja activa.", icon: Store },
    { href: "/cajas", label: "Ver cajas", description: "Abrir el listado de las 5 cajas Pago Facil.", icon: Landmark },
    { href: "/reporte-diario", label: "Ver reporte diario", description: "Revisar el estado consolidado del dia.", icon: FileBarChart2 },
    { href: "/gastos", label: "Crear gasto", description: "Cargar o revisar gastos operativos.", icon: ReceiptText },
    { href: "/cierres", label: "Ver cierre semanal", description: "Controlar la semana operativa.", icon: CalendarRange },
    { href: "/exportaciones", label: "Exportaciones", description: "Abrir CSV e impresion de reportes.", icon: Download },
    { href: "/configuracion", label: "Configuracion", description: "Ver roles y datos generales.", icon: Settings2 }
  ];

  const quickActions = filterVisibleActions([...bagActions, ...operationalActions], auth.role);

  const alerts: DashboardAlert[] = [];

  if (cashData.summary.registers_pending_today > 0) {
    alerts.push({
      title: "Hay cajas pendientes hoy",
      description: `${cashData.summary.registers_pending_today} cajas siguen sin carga completa.`,
      href: "/cajas",
      tone: "warning",
      icon: BellRing
    });
  }

  if (reportStatus !== "Cerrado") {
    alerts.push({
      title: "Reporte diario sin cerrar",
      description: `El reporte de hoy sigue en estado ${reportStatus.toLowerCase()}.`,
      href: "/reporte-diario",
      tone: reportStatus === "Revisar" ? "critical" : "warning",
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

  if (visibleNotes.length > 0) {
    alerts.push({
      title: "Notas urgentes abiertas",
      description: `${visibleNotes.length} notas importantes o urgentes siguen abiertas.`,
      href: "/dashboard",
      tone: "warning",
      icon: NotebookText
    });
  }

  if (reportData.branches.some((branch) => branch.hasNegativeAvailable)) {
    alerts.push({
      title: "Hay sucursales para revisar",
      description: "Al menos una sucursal tiene ganancia libre negativa.",
      href: "/reporte-diario",
      tone: "critical",
      icon: CircleAlert
    });
  }

  if (weeklyClosureData.branches.some((branch) => branch.status === "revisar")) {
    alerts.push({
      title: "Cierre semanal marcado para revisar",
      description: "Una o mas cajas quedaron con estado revisar durante la semana.",
      href: "/cierres",
      tone: "warning",
      icon: CalendarRange
    });
  }

  const totalCash = bags.reduce((acc, bag) => acc + Number(bag.current_cash_ars ?? 0), 0);
  const totalAccount = bags.reduce((acc, bag) => acc + Number(bag.current_account_ars ?? 0), 0);
  const totalUsd = bags.reduce((acc, bag) => acc + Number(bag.current_usd ?? 0), 0);
  const totalBorrowed = bags.reduce((acc, bag) => acc + Number(bag.borrowed_ars ?? 0), 0);
  const totalBagProfit = bags.reduce((acc, bag) => acc + Number(bag.accumulated_profit_ars ?? 0), 0);
  const totalBagDifference = bags.reduce((acc, bag) => acc + Number(bag.difference_ars ?? 0), 0);
  const bagsToReview = bags.filter((bag) => bag.status !== "ok").length;

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Pantalla principal de MAS SERVICIOS con el estado del dia, alertas operativas y accesos rapidos."
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Estado del reporte" value={reportStatus} helper="Reporte diario de hoy" status={reportStatus === "Cerrado" ? "ok" : reportStatus === "Revisar" ? "revisar" : "pendiente"} />
        <StatCard label="Ganancia PF hoy" value={formatArs(cashData.summary.total_profit_today)} helper="Suma de cajas cargadas" status={cashData.summary.total_profit_today >= 0 ? "ok" : "error"} />
        <StatCard label="Ganancia divisas hoy" value={formatArs(totalCurrencyProfitToday)} helper="Ventas reales del dia" status={totalCurrencyProfitToday >= 0 ? "ok" : "error"} />
        <StatCard label="Ganancia libre hoy" value={formatArs(reportAvailableToday)} helper="Ganancia menos gastos" status={reportAvailableToday >= 0 ? "ok" : "error"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cajas cargadas" value={`${cashData.summary.registers_loaded_today}`} helper="Hoy" status={cashData.summary.registers_pending_today === 0 ? "ok" : "revisar"} />
        <StatCard label="Cajas pendientes" value={`${cashData.summary.registers_pending_today}`} helper="Faltan cargar" status={cashData.summary.registers_pending_today > 0 ? "revisar" : "ok"} />
        <StatCard label="Gastos hoy" value={formatArs(todayExpenses.reduce((acc, expense) => acc + Number(expense.amount_ars ?? 0), 0))} helper="No incluye anulados" status={pendingExpensesToday.length > 0 ? "revisar" : "ok"} />
        <StatCard label="Gastos pendientes" value={formatArs(pendingExpensesToday.reduce((acc, expense) => acc + Number(expense.amount_ars ?? 0), 0))} helper="Pendientes de pago o imputacion" status={pendingExpensesToday.length > 0 ? "revisar" : "ok"} />
      </div>

      <DataCard description="Alertas que requieren revision operativa." title="Alertas operativas">
        {alerts.length === 0 ? (
          <EmptyState description="No hay alertas activas para la jornada actual." title="Todo en orden" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <Link className="group rounded-3xl border border-lightGray bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-medium" href={alert.href} key={alert.title}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brandYellow/20 text-brandBlack">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-base font-bold text-brandBlack">{alert.title}</h3>
                        <Badge variant={toneForAlert(alert.tone)}>{alert.tone}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-mediumGray">{alert.description}</p>
                      <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-brandBlack">
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

      <DataCard description="Atajos visibles segun permisos." title="Accesos rapidos">
        {quickActions.length === 0 ? (
          <EmptyState description="Tu rol no tiene accesos rapidos configurados en esta vista." title="Sin accesos" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button asChild className="h-auto justify-start rounded-3xl py-4 shadow-soft" key={action.href} variant="secondary">
                  <Link href={action.href}>
                    <div className="flex w-full items-start gap-3 text-left">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brandYellow/18 text-brandBlack">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-brandBlack">{action.label}</p>
                        <p className="mt-1 text-xs font-normal text-mediumGray">{action.description}</p>
                      </div>
                    </div>
                  </Link>
                </Button>
              );
            })}
          </div>
        )}
      </DataCard>

      <DataCard description="Estado actual del cierre semanal de Pago Facil." title="Resumen semanal">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard className="shadow-none" helper="Semana operativa viernes a jueves" label="Semana actual" value={`${weeklyClosureData.weekStartDate} / ${weeklyClosureData.weekEndDate}`} />
          <StatCard className="shadow-none" helper="Total operado" label="Operado semanal" value={formatArs(weeklyClosureData.totals.totalOperatedArs)} />
          <StatCard className="shadow-none" helper="Ganancia Pago Facil" label="Ganancia semanal" value={formatArs(weeklyClosureData.totals.totalProfitArs)} />
          <StatCard className="shadow-none" helper="Estado general" label="Cierre semanal" value={weeklyClosureData.status.toUpperCase()} status={weeklyClosureData.status === "cerrado" ? "ok" : weeklyClosureData.status === "revisar" ? "revisar" : "pendiente"} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[900px] border-separate border-spacing-0 text-sm">
            <thead className="bg-lightGray text-brandBlack">
              <tr>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Sucursal</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Estado</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Cajas revisadas</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Cajas pendientes</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Ganancia</th>
                <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Operado</th>
              </tr>
            </thead>
            <tbody>
              {weeklyClosureData.branches.map((branch, index) => (
                <tr className={index % 2 === 0 ? "bg-white" : "bg-lightGray/15"} key={branch.branch.id}>
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">{branch.branch.name}</td>
                  <td className="border-b border-lightGray px-4 py-4">
                    <Badge variant={branch.status === "cerrado" ? "success" : branch.status === "revisar" ? "warning" : "neutral"}>{branch.status}</Badge>
                  </td>
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">{branch.reviewedDaysCount}</td>
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">{branch.pendingDaysCount}</td>
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(branch.totalProfitArs)}</td>
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">{formatArs(branch.totalOperatedArs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>

      <DataCard description="Resumen operativo de las cinco bolsas con diferencia estimada." title="Bolsas de divisas">
        <div className="grid gap-4 xl:grid-cols-2">
          {activeBags.map((bag) => {
            const difference = Number(bag.difference_ars ?? 0);
            return (
              <div className="rounded-3xl border border-lightGray bg-white p-4 shadow-soft" key={bag.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-mediumGray">Bolsa</p>
                    <h3 className="mt-1 font-heading text-xl font-black text-brandBlack">{bag.name}</h3>
                    <p className="text-sm text-mediumGray">{bag.responsible_name ?? "Sin asignar"}</p>
                  </div>
                  <Badge variant={toneForBag(difference, bag.status) === "ok" ? "success" : toneForBag(difference, bag.status) === "revisar" ? "warning" : "danger"}>
                    {toneForBag(difference, bag.status)}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-lightGray bg-lightGray/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Efectivo disponible</p>
                    <p className="mt-1 font-semibold text-brandBlack">{formatArs(Number(bag.current_cash_ars ?? 0))}</p>
                  </div>
                  <div className="rounded-2xl border border-lightGray bg-lightGray/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Cuenta disponible</p>
                    <p className="mt-1 font-semibold text-brandBlack">{formatArs(Number(bag.current_account_ars ?? 0))}</p>
                  </div>
                  <div className="rounded-2xl border border-lightGray bg-lightGray/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">USD disponibles</p>
                    <p className="mt-1 font-semibold text-brandBlack">{formatUsd(Number(bag.current_usd ?? 0))}</p>
                  </div>
                  <div className="rounded-2xl border border-lightGray bg-lightGray/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Ganancia acumulada</p>
                    <p className="mt-1 font-semibold text-brandBlack">{formatArs(Number(bag.accumulated_profit_ars ?? 0))}</p>
                  </div>
                  <div className="rounded-2xl border border-lightGray bg-lightGray/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Diferencia estimada</p>
                    <p className="mt-1 font-semibold text-brandBlack">{formatSignedArs(difference)}</p>
                  </div>
                  <div className="rounded-2xl border border-lightGray bg-lightGray/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Estado</p>
                    <p className="mt-1 font-semibold text-brandBlack">{bag.status}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild className="shadow-yellowGlow" size="sm">
                    <Link href={`/bolsas/${bag.id}`}>Ver detalles</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/bolsas/${bag.id}/nueva-operacion`}>Nueva operacion</Link>
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

      <DataCard description="Cargas y estados por caja Pago Facil." title="Cajas Pago Facil">
        <div className="grid gap-4 xl:grid-cols-2">
          {boxes.map((register) => (
            <div className="rounded-3xl border border-lightGray bg-white p-4 shadow-soft" key={register.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-mediumGray">Caja {register.register_number}</p>
                  <h3 className="mt-1 font-heading text-xl font-black text-brandBlack">{register.name}</h3>
                  <p className="text-sm text-mediumGray">{register.branch_name}</p>
                </div>
                <Badge variant={register.today_status === "revisado" || register.today_status === "cargado" ? "success" : register.today_status === "parcial" ? "warning" : "neutral"}>
                  {register.today_status}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-lightGray bg-lightGray/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Total operado hoy</p>
                  <p className="mt-1 font-semibold text-brandBlack">{formatArs(Number(register.today_operated_ars ?? 0))}</p>
                </div>
                <div className="rounded-2xl border border-lightGray bg-lightGray/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Ganancia hoy</p>
                  <p className="mt-1 font-semibold text-brandBlack">{formatArs(Number(register.today_profit_ars ?? 0))}</p>
                </div>
                <div className="rounded-2xl border border-lightGray bg-lightGray/20 p-3 sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Estado de carga</p>
                  <p className="mt-1 font-semibold text-brandBlack">{register.today_report ? register.today_report.status : "pendiente"}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild className="shadow-yellowGlow" size="sm">
                  <Link href={`/cajas/${register.id}`}>Ver caja</Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/cajas/${register.id}/cargar`}>Cargar dia</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DataCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataCard description="Gastos de hoy y su estado de pago." title="Gastos">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard className="shadow-none" helper="No se cuentan anulados" label="Gastos del dia" value={formatArs(todayExpenses.reduce((acc, expense) => acc + Number(expense.amount_ars ?? 0), 0))} />
            <StatCard className="shadow-none" helper="Aun no resueltos" label="Pendientes" value={formatArs(pendingExpensesToday.reduce((acc, expense) => acc + Number(expense.amount_ars ?? 0), 0))} />
            <StatCard className="shadow-none" helper="Cantidad de registros" label="Movimientos" value={`${todayExpenses.length}`} />
            <StatCard className="shadow-none" helper="Acceso rapido" label="Modulo gastos" value="Abrir" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/gastos">Ir a gastos</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/gastos">Ver detalle</Link>
            </Button>
          </div>
        </DataCard>

        <DataCard description="Ultimas notas importantes y urgentes." title="Notas importantes">
          {visibleNotes.length === 0 ? (
            <EmptyState description="No hay notas urgentes o importantes abiertas en este momento." title="Sin notas importantes" />
          ) : (
            <div className="space-y-3">
              {visibleNotes.map((note) => (
                <Link className="block rounded-2xl border border-lightGray bg-lightGray/20 p-4 transition hover:bg-lightGray/30" href={note.entity_href || "/dashboard"} key={note.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-brandBlack">{note.title}</p>
                      <p className="mt-1 text-sm text-mediumGray">{note.body}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-mediumGray">{note.entity_label ?? note.entity_type}</p>
                    </div>
                    <Badge variant={note.priority === "urgente" ? "danger" : "warning"}>{note.priority}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DataCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DataCard description="Cruce rapido de cifras principales." title="Revision general">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] border-separate border-spacing-0 text-sm">
              <thead className="bg-lightGray text-brandBlack">
                <tr>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Indicador</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Valor</th>
                  <th className="border-b border-lightGray px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.2em]">Detalle</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">Ganancia libre</td>
                  <td className="border-b border-lightGray px-4 py-4 font-black">{formatArs(reportAvailableToday)}</td>
                  <td className="border-b border-lightGray px-4 py-4 text-mediumGray">Ganancia menos gastos</td>
                </tr>
                <tr className="bg-lightGray/15">
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">Ganancia semanal</td>
                  <td className="border-b border-lightGray px-4 py-4 font-black">{formatArs(weeklyClosureData.totals.totalProfitArs)}</td>
                  <td className="border-b border-lightGray px-4 py-4 text-mediumGray">Solo Pago Facil</td>
                </tr>
                <tr className="bg-white">
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">Total operado semanal</td>
                  <td className="border-b border-lightGray px-4 py-4 font-black">{formatArs(weeklyClosureData.totals.totalOperatedArs)}</td>
                  <td className="border-b border-lightGray px-4 py-4 text-mediumGray">Caja consolidada</td>
                </tr>
                <tr className="bg-lightGray/15">
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">Diferencia total bolsas</td>
                  <td className="border-b border-lightGray px-4 py-4 font-black">{formatSignedArs(totalBagDifference)}</td>
                  <td className="border-b border-lightGray px-4 py-4 text-mediumGray">No incluye transferencias internas</td>
                </tr>
                <tr className="bg-white">
                  <td className="border-b border-lightGray px-4 py-4 font-semibold">Notas urgentes abiertas</td>
                  <td className="border-b border-lightGray px-4 py-4 font-black">{visibleNotes.length}</td>
                  <td className="border-b border-lightGray px-4 py-4 text-mediumGray">Seguimiento operativo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DataCard>

        <div className="space-y-4">
          <DataCard description="Estado general de bolsas y cajas para lectura rapida." title="Resumen operativo">
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard className="shadow-none" helper="Con diferencia estimada" label="Bolsas para revisar" value={`${bagsToReview}`} />
              <StatCard className="shadow-none" helper="Prestado total" label="Total prestado" value={formatArs(totalBorrowed)} />
              <StatCard className="shadow-none" helper="Efectivo total" label="Efectivo" value={formatArs(totalCash)} />
              <StatCard className="shadow-none" helper="Cuenta total" label="Cuenta" value={formatArs(totalAccount)} />
              <StatCard className="shadow-none" helper="USD total" label="USD" value={formatUsd(totalUsd)} />
              <StatCard className="shadow-none" helper="Ganancia acumulada" label="Bolsas" value={formatArs(totalBagProfit)} />
            </div>
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
