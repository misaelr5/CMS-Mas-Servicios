import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import type { CashRegisterOverview } from "@/lib/cash/cash-service";
import { formatArs } from "@/lib/operations/seed-data";
import { getCashReportStatusTone, getCashRegisterDisplayLabel } from "@/lib/cash/cash-calculations";

export function CashRegisterCard({
  register,
  canWrite,
  isLocked
}: {
  register: CashRegisterOverview;
  canWrite: boolean;
  isLocked?: boolean;
}) {
  const statusTone = getCashReportStatusTone(register.today_status);

  return (
    <Card className="overflow-hidden bg-white text-brandBlack shadow-medium">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-mediumGray">Sucursal {register.branch_name}</p>
            <CardTitle className="mt-2 text-2xl font-black">{getCashRegisterDisplayLabel(register)}</CardTitle>
          </div>
          <StatusBadge status={statusTone} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Estado de hoy</p>
            <p className="mt-1 text-lg font-semibold text-brandBlack">{register.today_report ? register.today_status : "pendiente"}</p>
          </div>
          <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Responsable</p>
            <p className="mt-1 text-lg font-semibold text-brandBlack">{register.responsible_name ?? register.name}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Operado hoy</p>
            <p className="mt-1 font-heading text-2xl font-black">{formatArs(register.today_operated_ars)}</p>
          </div>
          <div className="rounded-2xl border border-lightGray bg-lightGray/25 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mediumGray">Ganancia hoy</p>
            <p className="mt-1 font-heading text-2xl font-black">{formatArs(register.today_profit_ars)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild className="shadow-yellowGlow" size="sm">
            <Link href={`/cajas/${register.id}`}>Ver caja</Link>
          </Button>
          {canWrite && !isLocked ? (
            <Button asChild size="sm" variant="secondary">
              <Link href={`/cajas/${register.id}/cargar`}>Cargar día</Link>
            </Button>
          ) : (
            <Button disabled size="sm" variant="secondary">
              {isLocked ? "Cerrado" : "Cargar día"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
