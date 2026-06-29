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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerAuthContext } from "@/lib/auth/server";
import { canAccessPath, roleLabels, type Role } from "@/lib/auth/roles";
import { getBagsOverview } from "@/lib/bags/bag-service";
import { formatUsd } from "@/lib/bags/bag-calculations";
import { getExpensePageData } from "@/lib/finance/expense-service";
import { getDailyReportDetailedData } from "@/lib/finance/daily-report-detailed-service";
import { getWeeklyCashClosureViewData } from "@/lib/finance/weekly-cash-closure-service";
import { getWeeklyCashClosureRange } from "@/lib/finance/weekly-cash-closure-calculations";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import { formatArs } from "@/lib/operations/seed-data";
import { listImportantNotes } from "@/lib/notes/notes-service";
import { cn } from "@/lib/utils";

type DashboardAlert = {
  title: string;
  description: string;
  href: string;
  tone: "info" | "warning" | "critical";
  icon: typeof BellRing;
};

type QuickAction = {
  href: string;
  label: string;
  icon: typeof ArrowRight;
  priority?: "primary" | "secondary";
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

function filterVisibleActions(actions: QuickAction[], role: Role) {
  return actions.filter((action) => canAccessPath(role, action.href));
}

function MetricTile({
  label,
  value,
  helper,
  tone = "neutral"
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "ok" | "warning" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-black/20 p-3",
        tone === "ok" && "border-success/20 bg-success/5",
        tone === "warning" && "border-warning/20 bg-warning/5",
        tone === "danger" && "border-danger/20 bg-danger/5",
        tone === "neutral" && "border-white/10"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lightGray/55">{label}</p>
      <p className="mt-1 font-heading text-xl font-black leading-none text-brandWhite tabular-nums">{value}</p>
      {helper ? <p className="mt-1 text-xs text-lightGray/55">{helper}</p> : null}
    </div>
  );
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
  const centroRegisters = centro.registers;
  const terminalRegisters = terminal.registers;
  const registersTotal = [...centroRegisters, ...terminalRegisters];
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
  const registersPending = registersTotal.filter(
    (r) => r.status === "pendiente" || r.status === "parcial"
  ).length;

  const overallReportStatus =
    reportData.dailyReports.length === 0
      ? "Abierto"
      : reportData.dailyReports.every((r) => r.status === "cerrado")
        ? "Cerrado"
        : reportData.dailyReports.some((r) => r.status === "revisar")
          ? "Revisar"
          : "Abierto";

  const firstBag = activeBags[0] ?? null;
  const firstRegister =
    registersTotal.find((r) => auth.role !== "cajero" || r.register.responsible_user_id === auth.userId) ??
    registersTotal[0] ??
    null;

  const quickActions = filterVisibleActions(
    [
      {
        href: firstBag ? `/bolsas/nueva-operacion?bagId=${firstBag.id}` : "/bolsas",
        label: "Nueva operacion",
        icon: TrendingUp,
        priority: "primary"
      },
      {
        href: firstBag ? `/bolsas/${firstBag.id}/vender-a-bolsa` : "/bolsas",
        label: "Mover entre bolsas",
        icon: Boxes,
        priority: "secondary"
      },
      {
        href: firstRegister ? `/cajas/${firstRegister.register.id}/cargar` : "/cajas",
        label: "Cargar caja",
        icon: Store,
        priority: "primary"
      },
      { href: "/reporte-diario", label: "Reporte diario", icon: FileBarChart2, priority: "secondary" },
      { href: "/gastos", label: "Gastos", icon: ReceiptText, priority: "secondary" },
      { href: "/cierres", label: "Cierre semanal", icon: CalendarRange, priority: "secondary" },
      { href: "/exportaciones", label: "Exportar", icon: Download, priority: "secondary" }
    ],
    auth.role
  );

  const alerts: DashboardAlert[] = [];

  if (registersPending > 0) {
    alerts.push({
      title: "Cajas pendientes",
      description: `${registersPending} cajas siguen sin carga completa.`,
      href: "/cajas",
      tone: "warning",
      icon: BellRing
    });
  }

  if (overallReportStatus !== "Cerrado") {
    alerts.push({
      title: "Reporte diario sin cerrar",
      description: `Estado actual: ${overallReportStatus.toLowerCase()}.`,
      href: "/reporte-diario",
      tone: overallReportStatus === "Revisar" ? "critical" : "warning",
      icon: CircleAlert
    });
  }

  if (pendingExpensesToday.length > 0) {
    alerts.push({
      title: "Gastos pendientes",
      description: `${pendingExpensesToday.length} gastos todavia no fueron pagados o imputados.`,
      href: "/gastos",
      tone: "warning",
      icon: ReceiptText
    });
  }

  if (weeklyClosureData.status !== "cerrado") {
    alerts.push({
      title: "Cierre semanal pendiente",
      description: `${weekRange.weekStartDate} a ${weekRange.weekEndDate}: ${weeklyClosureData.status}.`,
      href: "/cierres",
      tone: weeklyClosureData.status === "revisar" ? "critical" : "warning",
      icon: CalendarRange
    });
  }

  if (bagsWithDifference.length > 0) {
    alerts.push({
      title: "Bolsas con diferencia negativa",
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

  const renderRegisterRows = (registers: typeof centroRegisters) =>
    registers.map((rs) => (
      <tr className="border-b border-white/10 last:border-0 hover:bg-white/[0.035]" key={rs.register.id}>
        <td className="px-3 py-3">
          <Link className="font-semibold text-brandWhite hover:text-brandYellow" href={`/cajas/${rs.register.id}`}>
            {rs.register.name}
          </Link>
          <p className="text-xs text-lightGray/55">Caja {rs.register.register_number}</p>
        </td>
        <td className="px-3 py-3 text-right font-semibold tabular-nums text-brandWhite">
          {formatArs(rs.totalOperatedArs)}
        </td>
        <td className="px-3 py-3 text-right font-semibold tabular-nums text-brandWhite">
          {formatArs(rs.pfProfitArs)}
        </td>
        <td className="px-3 py-3 text-brandWhite">{formatDateTime(rs.register.updated_at)}</td>
        <td className="px-3 py-3">
          <Badge variant={registerStatusBadge(rs.status)}>{rs.status}</Badge>
        </td>
      </tr>
    ));

  return (
    <div className="space-y-5">
      <SectionTitle
        description="Estado del dia, pendientes y accesos de trabajo."
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

      <DataCard
        description="Primero lo importante: resultado del dia y pendientes que requieren accion."
        title="Control del dia"
        rightSlot={
          <Badge
            className="uppercase tracking-[0.16em]"
            variant={alerts.some((a) => a.tone === "critical") ? "danger" : alerts.length > 0 ? "warning" : "success"}
          >
            {alerts.length === 0 ? "sin alertas" : `${alerts.length} alertas`}
          </Badge>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricTile
            helper="Bruto menos gastos"
            label="Ganancia libre"
            tone={grandTotals.freeProfitArs < 0 ? "danger" : "ok"}
            value={formatArs(grandTotals.freeProfitArs)}
          />
          <MetricTile label="Pago Facil" tone="ok" value={formatArs(grandTotals.pfProfitTotal)} />
          <MetricTile label="Divisas" tone="ok" value={formatArs(grandTotals.currencyProfitTotal)} />
          <MetricTile
            helper={`${todayExpenses.length} movimientos`}
            label="Gastos"
            value={formatArs(grandTotals.expensesArs)}
          />
          <MetricTile
            helper={`${registersTotal.length} cajas activas`}
            label="Cajas pendientes"
            tone={registersPending > 0 ? "warning" : "ok"}
            value={`${registersPending}`}
          />
          <MetricTile
            helper={`${activeBags.length} bolsas activas`}
            label="Bolsas a revisar"
            tone={bagsToReview > 0 ? "warning" : "ok"}
            value={`${bagsToReview}`}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                asChild
                key={action.label}
                size="sm"
                variant={action.priority === "primary" ? "default" : "secondary"}
              >
                <Link href={action.href}>
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </DataCard>

      <DataCard description="Acciones concretas antes del detalle." title="Alertas operativas">
        {alerts.length === 0 ? (
          <EmptyState description="No hay alertas activas para la jornada actual." title="Todo en orden" />
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <Link
                  className="group flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-3 transition hover:border-brandYellow/25 hover:bg-white/[0.04]"
                  href={alert.href}
                  key={alert.title}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-brandYellow">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-brandWhite">{alert.title}</span>
                      <span className="block truncate text-sm text-lightGray/55">{alert.description}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={toneForAlert(alert.tone)}>{alert.tone}</Badge>
                    <ArrowRight className="h-4 w-4 text-lightGray/55 transition group-hover:translate-x-0.5 group-hover:text-brandYellow" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </DataCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataCard
          description={`${centroRegisters.length} cajas - Total PF ${formatArs(centro.totals.pfProfitArs + centro.totals.manualPfAdjArs)}`}
          title="Centro - Cajas"
        >
          {centroRegisters.length === 0 ? (
            <EmptyState description="No hay cajas configuradas para Centro." title="Sin cajas" />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-lg border border-white/10 md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-black/20 text-[10px] uppercase tracking-[0.14em] text-lightGray/55">
                    <tr>
                      <th className="px-3 py-2.5 font-bold">Caja</th>
                      <th className="px-3 py-2.5 text-right font-bold">Operado</th>
                      <th className="px-3 py-2.5 text-right font-bold">Ganancia</th>
                      <th className="px-3 py-2.5 font-bold">Actualizada</th>
                      <th className="px-3 py-2.5 font-bold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/[0.035]">{renderRegisterRows(centroRegisters)}</tbody>
                </table>
              </div>
              <div className="grid gap-2 md:hidden">
                {centroRegisters.map((rs) => (
                  <Link
                    className="rounded-lg border border-white/10 bg-black/20 p-3"
                    href={`/cajas/${rs.register.id}`}
                    key={rs.register.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-brandWhite">{rs.register.name}</p>
                        <p className="text-xs text-lightGray/55">Caja {rs.register.register_number}</p>
                      </div>
                      <Badge variant={registerStatusBadge(rs.status)}>{rs.status}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MetricTile label="Operado" value={formatArs(rs.totalOperatedArs)} />
                      <MetricTile label="Ganancia" value={formatArs(rs.pfProfitArs)} />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </DataCard>

        <DataCard
          description={`${terminalRegisters.length} cajas - Total PF ${formatArs(terminal.totals.pfProfitArs + terminal.totals.manualPfAdjArs)}`}
          title="Terminal - Cajas"
        >
          {terminalRegisters.length === 0 ? (
            <EmptyState description="No hay cajas configuradas para Terminal." title="Sin cajas" />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-lg border border-white/10 md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-black/20 text-[10px] uppercase tracking-[0.14em] text-lightGray/55">
                    <tr>
                      <th className="px-3 py-2.5 font-bold">Caja</th>
                      <th className="px-3 py-2.5 text-right font-bold">Operado</th>
                      <th className="px-3 py-2.5 text-right font-bold">Ganancia</th>
                      <th className="px-3 py-2.5 font-bold">Actualizada</th>
                      <th className="px-3 py-2.5 font-bold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/[0.035]">{renderRegisterRows(terminalRegisters)}</tbody>
                </table>
              </div>
              <div className="grid gap-2 md:hidden">
                {terminalRegisters.map((rs) => (
                  <Link
                    className="rounded-lg border border-white/10 bg-black/20 p-3"
                    href={`/cajas/${rs.register.id}`}
                    key={rs.register.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-brandWhite">{rs.register.name}</p>
                        <p className="text-xs text-lightGray/55">Caja {rs.register.register_number}</p>
                      </div>
                      <Badge variant={registerStatusBadge(rs.status)}>{rs.status}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MetricTile label="Operado" value={formatArs(rs.totalOperatedArs)} />
                      <MetricTile label="Ganancia" value={formatArs(rs.pfProfitArs)} />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </DataCard>
      </div>

      <DataCard
        description={`Saldos consolidados: efectivo ${formatArs(totalCash)}, cuenta ${formatArs(totalAccount)}, USD ${formatUsd(totalUsd)}.`}
        title="Bolsas de divisas"
        rightSlot={
          <Button asChild size="sm" variant="secondary">
            <Link href="/bolsas">Ver modulo</Link>
          </Button>
        }
      >
        {activeBags.length === 0 ? (
          <EmptyState description="No hay bolsas activas configuradas." title="Sin bolsas" />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-lg border border-white/10 lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-black/20 text-[10px] uppercase tracking-[0.14em] text-lightGray/55">
                  <tr>
                    <th className="px-3 py-2.5 font-bold">Bolsa</th>
                    <th className="px-3 py-2.5 font-bold">Sucursal</th>
                    <th className="px-3 py-2.5 text-right font-bold">Efectivo</th>
                    <th className="px-3 py-2.5 text-right font-bold">Cuenta</th>
                    <th className="px-3 py-2.5 text-right font-bold">USD</th>
                    <th className="px-3 py-2.5 text-right font-bold">Hoy</th>
                    <th className="px-3 py-2.5 text-right font-bold">Diferencia</th>
                    <th className="px-3 py-2.5 font-bold">Estado</th>
                    <th className="px-3 py-2.5 text-right font-bold">Accion</th>
                  </tr>
                </thead>
                <tbody className="bg-white/[0.035]">
                  {activeBags.map((bag) => {
                    const bagSheet = reportData.bags.find((b) => b.bag.id === bag.id);
                    const difference = Number(bag.difference_ars ?? 0);
                    return (
                      <tr className="border-b border-white/10 last:border-0 hover:bg-white/[0.035]" key={bag.id}>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-brandWhite">{bag.name}</p>
                          <p className="text-xs text-lightGray/55">{bag.responsible_name ?? "Sin asignar"}</p>
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-brandYellow">
                          {bagSheet?.branchName ?? "-"}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-brandWhite">
                          {formatArs(Number(bag.current_cash_ars ?? 0))}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-brandWhite">
                          {formatArs(Number(bag.current_account_ars ?? 0))}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-brandWhite">
                          {formatUsd(Number(bag.current_usd ?? 0))}
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-lightGray/70">
                          {bagSheet
                            ? `${formatUsd(bagSheet.boughtUsdToday)} / ${formatUsd(bagSheet.soldUsdToday)}`
                            : "-"}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-3 text-right font-semibold tabular-nums",
                            difference < 0 ? "text-danger" : "text-brandWhite"
                          )}
                        >
                          {formatSignedArs(difference)}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={bagStatusBadge(bag.status)}>{bag.status}</Badge>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/bolsas/${bag.id}`}>Ver</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-2 lg:hidden">
              {activeBags.map((bag) => {
                const bagSheet = reportData.bags.find((b) => b.bag.id === bag.id);
                const difference = Number(bag.difference_ars ?? 0);
                return (
                  <Link
                    className="rounded-lg border border-white/10 bg-black/20 p-3"
                    href={`/bolsas/${bag.id}`}
                    key={bag.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-brandWhite">{bag.name}</p>
                        <p className="text-xs text-lightGray/55">{bag.responsible_name ?? "Sin asignar"}</p>
                      </div>
                      <Badge variant={bagStatusBadge(bag.status)}>{bag.status}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MetricTile label="Efectivo" value={formatArs(Number(bag.current_cash_ars ?? 0))} />
                      <MetricTile label="Cuenta" value={formatArs(Number(bag.current_account_ars ?? 0))} />
                      <MetricTile label="USD" value={formatUsd(Number(bag.current_usd ?? 0))} />
                      <MetricTile
                        label="Diferencia"
                        tone={difference < 0 ? "danger" : "neutral"}
                        value={formatSignedArs(difference)}
                      />
                    </div>
                    {bagSheet ? (
                      <p className="mt-2 text-xs text-lightGray/55">
                        Hoy: {formatUsd(bagSheet.boughtUsdToday)} comprados / {formatUsd(bagSheet.soldUsdToday)} vendidos
                      </p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </DataCard>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DataCard description="Numeros operativos que no requieren accion inmediata." title="Resumen ampliado">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricTile helper="Prestado total" label="Prestado" value={formatArs(totalBorrowed)} />
            <MetricTile helper="Ganancia acumulada" label="Bolsas" value={formatArs(totalBagProfit)} />
            <MetricTile
              helper="Base estimada"
              label="Diferencia bolsas"
              tone={totalBagDifference < 0 ? "danger" : "neutral"}
              value={formatSignedArs(totalBagDifference)}
            />
            <MetricTile helper="Semana operativa" label="Cierre semanal" value={weeklyClosureData.status.toUpperCase()} />
            <MetricTile helper="Viernes a jueves" label="Rango" value={`${weeklyClosureData.weekStartDate} / ${weeklyClosureData.weekEndDate}`} />
            <MetricTile helper="No incluye anulados" label="Gastos del dia" value={formatArs(todayExpenses.reduce((acc, e) => acc + Number(e.amount_ars ?? 0), 0))} />
          </div>
        </DataCard>

        <DataCard description="Notas importantes y urgentes abiertas." title="Notas importantes">
          {notes.length === 0 ? (
            <EmptyState
              description="No hay notas urgentes o importantes abiertas en este momento."
              title="Sin notas importantes"
            />
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <Link
                  className="block rounded-lg border border-white/10 bg-black/20 p-3 transition hover:border-brandYellow/25"
                  href={note.entity_href || "/dashboard"}
                  key={note.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-brandWhite">{note.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-lightGray/55">{note.body}</p>
                    </div>
                    <Badge variant={note.priority === "urgente" ? "danger" : "warning"}>{note.priority}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DataCard>
      </div>

      <NotesPanel
        description="Notas generales del sistema para seguimiento interno."
        entityHref="/dashboard"
        entityLabel="Dashboard"
        entityType="general"
        title="Notas generales"
      />

      <div className="flex flex-wrap gap-2">
        {canAccessPath(auth.role, "/cajas") ? (
          <Button asChild variant="secondary">
            <Link href="/cajas">
              <Landmark className="h-4 w-4" />
              Ver cajas
            </Link>
          </Button>
        ) : null}
        {canAccessPath(auth.role, "/bolsas") ? (
          <Button asChild>
            <Link href="/bolsas">
              <Boxes className="h-4 w-4" />
              Ver bolsas
            </Link>
          </Button>
        ) : null}
        {canAccessPath(auth.role, "/reporte-diario") ? (
          <Button asChild variant="outline">
            <Link href="/reporte-diario">Ver reporte diario</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
