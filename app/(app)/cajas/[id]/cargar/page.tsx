import { cookies } from "next/headers";
import Link from "next/link";

import { AccessDenied } from "@/components/access-denied";
import { CashDailyReportForm } from "@/components/cash/cash-daily-report-form";
import { EmptyState } from "@/components/empty-state";
import { NotesPanel } from "@/components/notes/notes-panel";
import { SectionTitle } from "@/components/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/data-card";
import { getServerAuthContext } from "@/lib/auth/server";
import { getCashRegisterData } from "@/lib/cash/cash-service";
import { getDailyReportViewData, isDailyReportLockedStatus } from "@/lib/finance/daily-report-service";
import { getWeeklyCashClosureLockState } from "@/lib/finance/weekly-cash-closure-service";
import { getOperationalConfigData } from "@/lib/operations/operational-data";

function todayIsoInBuenosAires() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default async function CajaCargarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getServerAuthContext(cookies());
  const cashData = await getCashRegisterData(id, auth ? { role: auth.role, userId: auth.userId } : undefined);
  const register = cashData.register;
  const config = await getOperationalConfigData();
  const canReview = auth?.role === "admin" || auth?.role === "encargado";
  const todayReportData = await getDailyReportViewData(todayIsoInBuenosAires(), auth ? { role: auth.role, userId: auth.userId } : undefined);
  const branchSummary = todayReportData.branches.find((branch) => branch.branch.id === register?.branch_id);
  const isLocked = Boolean(branchSummary?.dailyReport?.status && isDailyReportLockedStatus(branchSummary.dailyReport.status));
  const weeklyLock = await getWeeklyCashClosureLockState(todayIsoInBuenosAires());

  if (!register || auth?.role === "viewer" || (auth?.role === "cajero" && register.responsible_user_id !== auth.userId)) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        description="Formulario mobile-first para guardar la carga diaria de una caja Pago Fácil."
        title={`Cargar día · Caja ${register.register_number ?? "?"}`}
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{register.branch_name}</Badge>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/cajas/${register.id}`}>Volver a la caja</Link>
            </Button>
          </div>
        }
      />

      <DataCard description="La fecha se toma para la carga del día y se guarda por caja." title="Encabezado">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Fecha</p>
            <p className="mt-1 font-semibold text-brandBlack">{todayIsoInBuenosAires()}</p>
          </div>
          <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Caja</p>
            <p className="mt-1 font-semibold text-brandBlack">{register.register_number ? `Caja ${register.register_number}` : register.name}</p>
          </div>
          <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Sucursal</p>
            <p className="mt-1 font-semibold text-brandBlack">{register.branch_name}</p>
          </div>
          <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Estado actual</p>
            <p className="mt-1 font-semibold text-brandBlack">{register.today_status}</p>
          </div>
        </div>
      </DataCard>

      <CashDailyReportForm
        canReview={canReview}
        categories={cashData.categories}
        isLocked={isLocked}
        register={register}
        reportDate={todayIsoInBuenosAires()}
        weekLocked={weeklyLock.locked}
      />

      {register.today_report ? (
        <NotesPanel
          description="Notas asociadas al último reporte guardado."
          entityHref={`/cajas/${register.id}`}
          entityId={register.today_report.id}
          entityLabel={`Reporte ${register.today_report.report_date}`}
          entityType="cash_daily_report"
          title="Notas de la carga"
        />
      ) : (
        <EmptyState
          description="Cuando guardes una carga diaria, acá vas a poder agregar y leer notas sobre ese reporte."
          title="Notas de la carga disponibles luego del primer guardado"
        />
      )}
    </div>
  );
}
