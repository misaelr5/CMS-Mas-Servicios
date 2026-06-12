import Link from "next/link";
import { cookies } from "next/headers";

import { annulExpenseAction } from "@/app/actions/finance";
import { AccessDenied } from "@/components/access-denied";
import { DataCard } from "@/components/data-card";
import { EmptyState } from "@/components/empty-state";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { NotesPanel } from "@/components/notes/notes-panel";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getServerAuthContext } from "@/lib/auth/server";
import type { ExpenseStatus } from "@/lib/db/types";
import { expenseStatusLabels, getExpenseStatusTone } from "@/lib/finance/daily-report-calculations";
import { getExpensePageData } from "@/lib/finance/expense-service";
import { getBuenosAiresDateString } from "@/lib/finance/report-dates";
import { formatArs } from "@/lib/operations/seed-data";
import { ExpenseAnnulForm } from "@/components/expenses/expense-annul-form";

type SearchParams = Promise<{
  date?: string;
  branch_id?: string;
  status?: ExpenseStatus | "all";
  category?: string;
}>;

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function normalizeStatus(value?: string) {
  return value === "pendiente" || value === "pagado" || value === "imputado" || value === "anulado" || value === "all"
    ? value
    : "all";
}

function badgeVariantFromStatusTone(tone: "ok" | "error" | "pendiente" | "revisar") {
  if (tone === "ok") return "success" as const;
  if (tone === "error") return "danger" as const;
  if (tone === "revisar") return "warning" as const;
  return "neutral" as const;
}

export default async function GastosPage({ searchParams }: { searchParams?: SearchParams }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedDate = resolvedSearchParams.date || getBuenosAiresDateString();
  const selectedBranchId = resolvedSearchParams.branch_id || "";
  const selectedStatus = normalizeStatus(resolvedSearchParams.status);
  const selectedCategory = resolvedSearchParams.category || "";
  const auth = await getServerAuthContext(cookies());

  if (!auth) {
    return <AccessDenied />;
  }

  const canWrite = auth.role === "admin" || auth.role === "encargado";
  const expenseData = await getExpensePageData(
    {
      date: selectedDate,
      branchId: selectedBranchId || undefined,
      status: selectedStatus,
      category: selectedCategory || undefined
    },
    { role: auth.role, userId: auth.userId }
  );

  const statuses: Array<ExpenseStatus | "all"> = ["all", "pendiente", "pagado", "imputado", "anulado"];

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Seguimiento de gastos, imputaciones y estado operativo por fecha."
        title="Gastos"
        rightSlot={<Badge variant="outline">{formatDateLabel(selectedDate)}</Badge>}
      />

      <form className="grid gap-3 rounded-3xl border border-white/10 bg-darkSurface/80 p-4 shadow-soft md:grid-cols-2 xl:grid-cols-4" method="get">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandWhite" htmlFor="date">
            Fecha
          </label>
          <Input defaultValue={selectedDate} id="date" name="date" type="date" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandWhite" htmlFor="branch_id">
            Sucursal
          </label>
          <select className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-brandBlack shadow-sm" defaultValue={selectedBranchId} id="branch_id" name="branch_id">
            <option value="">Todas</option>
            {expenseData.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandWhite" htmlFor="status">
            Estado
          </label>
          <select className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-brandBlack shadow-sm" defaultValue={selectedStatus} id="status" name="status">
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "Todos" : expenseStatusLabels[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-brandWhite" htmlFor="category">
            Categoría
          </label>
          <select className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-brandBlack shadow-sm" defaultValue={selectedCategory} id="category" name="category">
            <option value="">Todas</option>
            {expenseData.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-4">
          <Button className="shadow-yellowGlow" type="submit">
            Filtrar
          </Button>
          <Button asChild variant="outline">
            <Link href="/reporte-diario">Ir a reporte diario</Link>
          </Button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gastos cargados" value={`${expenseData.totals.count}`} />
        <StatCard label="Total gastos" status="neutral" value={formatArs(expenseData.totals.amount_ars)} />
        <StatCard label="Pendientes" status="pendiente" value={formatArs(expenseData.totals.pending_amount_ars)} />
        <StatCard label="Pagados e imputados" status="ok" value={formatArs(expenseData.totals.paid_amount_ars + expenseData.totals.imputed_amount_ars)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <DataCard description="Alta manual de gastos con validaciones básicas." title="Crear gasto">
          <ExpenseForm branches={expenseData.branches} canWrite={canWrite} date={selectedDate} />
        </DataCard>

        <DataCard description="Resumen del corte de gastos para esta fecha." title="Resumen">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-lightGray/80 bg-lightGray/25 px-4 py-3">
              <span className="text-sm text-mediumGray">Pendientes</span>
              <span className="font-semibold text-brandBlack">{formatArs(expenseData.totals.pending_amount_ars)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-lightGray/80 bg-lightGray/25 px-4 py-3">
              <span className="text-sm text-mediumGray">Pagados</span>
              <span className="font-semibold text-brandBlack">{formatArs(expenseData.totals.paid_amount_ars)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-lightGray/80 bg-lightGray/25 px-4 py-3">
              <span className="text-sm text-mediumGray">Imputados</span>
              <span className="font-semibold text-brandBlack">{formatArs(expenseData.totals.imputed_amount_ars)}</span>
            </div>
          </div>
        </DataCard>
      </div>

      <div className="space-y-4">
        {expenseData.expenses.length === 0 ? (
          <EmptyState description="No hay gastos para los filtros seleccionados." title="Sin gastos" />
        ) : (
          expenseData.expenses.map((expense) => {
            const canAnnul = canWrite && expense.status !== "anulado";
            return (
              <DataCard
                className="bg-white text-brandBlack"
                description={`${expense.branch_name} · ${expense.date} · ${expense.paid_from}`}
                key={expense.id}
                title={expense.category}
              >
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-2xl font-black">{formatArs(Number(expense.amount_ars ?? 0))}</p>
                      <p className="mt-1 text-sm text-mediumGray">{expense.detail}</p>
                    </div>
                    <Badge variant={badgeVariantFromStatusTone(getExpenseStatusTone(expense.status))}>
                      {expenseStatusLabels[expense.status]}
                    </Badge>
                  </div>

                  {expense.annulment_reason ? (
                    <p className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                      Anulado: {expense.annulment_reason}
                    </p>
                  ) : null}

                  {canAnnul ? (
                    <ExpenseAnnulForm branchId={expense.branch_id} currentPath="/gastos" date={selectedDate} expenseId={expense.id} />
                  ) : null}
                </div>
              </DataCard>
            );
          })
        )}
      </div>

      <NotesPanel
        description="Notas vinculadas a gastos operativos."
        entityHref="/gastos"
        entityType="expense"
        title="Notas de gastos"
      />
    </div>
  );
}
