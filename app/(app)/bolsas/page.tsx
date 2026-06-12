import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DataCard } from "@/components/data-card";
import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/section-title";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerAuthContext } from "@/lib/auth/server";
import { getAssignedBagIdsForUser, getBagsOverview } from "@/lib/bags/bag-service";
import { formatUsd } from "@/lib/bags/bag-calculations";
import { formatArs } from "@/lib/operations/seed-data";

export default async function BolsasPage() {
  const auth = await getServerAuthContext(cookies());
  const bags = await getBagsOverview();
  const assignedBagIds = auth?.role === "cajero" ? await getAssignedBagIdsForUser(auth.userId) : [];
  const visibleBags = auth?.role === "cajero" ? bags.filter((bag) => assignedBagIds.includes(bag.id)) : bags;
  const isCashier = auth?.role === "cajero";

  if (isCashier && visibleBags.length === 1) {
    redirect(`/bolsas/${visibleBags[0].id}`);
  }

  const totals = visibleBags.reduce(
    (acc, bag) => {
      acc.cash += Number(bag.current_cash_ars ?? 0);
      acc.account += Number(bag.current_account_ars ?? 0);
      acc.usd += Number(bag.current_usd ?? 0);
      acc.borrowed += Number(bag.borrowed_ars ?? 0);
      acc.profit += Number(bag.accumulated_profit_ars ?? 0);
      if (bag.status === "ok") acc.ok += 1;
      if (bag.status === "revisar" || bag.status === "diferencia" || bag.status === "pendiente_cierre") acc.review += 1;
      return acc;
    },
    { cash: 0, account: 0, usd: 0, borrowed: 0, profit: 0, ok: 0, review: 0 }
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        description={isCashier ? "Vista limitada a la bolsa asignada. Sin paneo general." : "Control operativo de las cinco bolsas de divisas con saldos, diferencias y acceso a movimientos."}
        title="Bolsas de divisas"
        rightSlot={<Badge variant="outline">{visibleBags.length} bolsas</Badge>}
      />

      <div className={isCashier ? "grid gap-4 md:grid-cols-2 xl:grid-cols-4" : "grid gap-4 md:grid-cols-2 xl:grid-cols-6"}>
        <StatCard label="Total efectivo" value={formatArs(totals.cash)} />
        <StatCard label="Total cuenta" value={formatArs(totals.account)} />
        <StatCard label="Total USD" value={formatUsd(totals.usd)} />
        <StatCard label="Total prestado" value={formatArs(totals.borrowed)} />
        {!isCashier ? <StatCard label="Ganancia acumulada" value={formatArs(totals.profit)} /> : null}
        {!isCashier ? <StatCard helper={`${totals.review} para revisar`} label="Bolsas OK" value={`${totals.ok}`} /> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {visibleBags.map((bag) => (
          <DataCard key={bag.id} description={`Responsable: ${bag.responsible_name ?? "Sin asignar"}`} title={bag.name}>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4 text-sm">
                  <p className="text-mediumGray">Base</p>
                  <p className="font-semibold text-brandBlack">{formatArs(Number(bag.base_limit_ars ?? 0))}</p>
                </div>
                <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4 text-sm">
                  <p className="text-mediumGray">Efectivo</p>
                  <p className="font-semibold text-brandBlack">{formatArs(Number(bag.current_cash_ars ?? 0))}</p>
                </div>
                <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4 text-sm">
                  <p className="text-mediumGray">Cuenta</p>
                  <p className="font-semibold text-brandBlack">{formatArs(Number(bag.current_account_ars ?? 0))}</p>
                </div>
                <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4 text-sm">
                  <p className="text-mediumGray">USD</p>
                  <p className="font-semibold text-brandBlack">{formatUsd(Number(bag.current_usd ?? 0))}</p>
                </div>
                <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4 text-sm">
                  <p className="text-mediumGray">Prestado</p>
                  <p className="font-semibold text-brandBlack">{formatArs(Number(bag.borrowed_ars ?? 0))}</p>
                </div>
                <div className="rounded-2xl border border-lightGray bg-lightGray/30 p-4 text-sm">
                  <p className="text-mediumGray">Ganancia</p>
                  <p className="font-semibold text-brandBlack">{formatArs(Number(bag.accumulated_profit_ars ?? 0))}</p>
                </div>
              </div>

              {!isCashier ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={bag.status === "ok" ? "success" : bag.status === "revisar" ? "warning" : "danger"}>{bag.status}</Badge>
                  <Badge variant="neutral">Diferencia: {formatArs(Number(bag.difference_ars ?? 0))}</Badge>
                  {bag.responsible_name ? <Badge variant="outline">{bag.responsible_name}</Badge> : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={`/bolsas/${bag.id}`}>Ver detalles</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={`/bolsas/nueva-operacion?bagId=${bag.id}`}>Nueva operacion</Link>
                </Button>
              </div>
            </div>
          </DataCard>
        ))}
      </div>

      {visibleBags.length === 0 ? (
        <EmptyState
          description={isCashier ? "No tenes una bolsa asignada para ver." : "No hay bolsas cargadas."}
          title={isCashier ? "Sin bolsa asignada" : "Sin bolsas"}
        />
      ) : null}
    </div>
  );
}
