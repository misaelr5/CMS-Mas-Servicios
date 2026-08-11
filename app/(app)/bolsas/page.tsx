import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
          <article
            key={bag.id}
            className="group/bolsa overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] text-brandWhite shadow-lift backdrop-blur-xl transition-all duration-200 hover:border-brandYellow/25 hover:bg-white/[0.06]"
          >
            <div className="flex items-start justify-between gap-3 p-5 pb-4">
              <div className="min-w-0">
                <h3 className="font-heading text-xl font-black text-brandWhite">{bag.name}</h3>
                <p className="text-sm text-lightGray/55">Responsable: {bag.responsible_name ?? "Sin asignar"}</p>
              </div>
              {!isCashier ? (
                <Badge variant={bag.status === "ok" ? "success" : bag.status === "revisar" ? "warning" : "danger"}>{bag.status}</Badge>
              ) : null}
            </div>

            <div className="space-y-4 border-t border-white/10 p-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                  <p className="text-lightGray/50">Base</p>
                  <p className="font-semibold text-brandWhite tabular-nums">{formatArs(Number(bag.base_limit_ars ?? 0))}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                  <p className="text-lightGray/50">Efectivo</p>
                  <p className="font-semibold text-brandWhite tabular-nums">{formatArs(Number(bag.current_cash_ars ?? 0))}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                  <p className="text-lightGray/50">Cuenta</p>
                  <p className="font-semibold text-brandWhite tabular-nums">{formatArs(Number(bag.current_account_ars ?? 0))}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                  <p className="text-lightGray/50">USD</p>
                  <p className="font-semibold text-brandWhite tabular-nums">{formatUsd(Number(bag.current_usd ?? 0))}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                  <p className="text-lightGray/50">Prestado</p>
                  <p className="font-semibold text-brandWhite tabular-nums">{formatArs(Number(bag.borrowed_ars ?? 0))}</p>
                </div>
                <div className="rounded-2xl border border-brandYellow/20 bg-brandYellow/[0.07] p-4 text-sm">
                  <p className="text-lightGray/50">Ganancia</p>
                  <p className="font-semibold text-brandYellow tabular-nums">{formatArs(Number(bag.accumulated_profit_ars ?? 0))}</p>
                </div>
              </div>

              {!isCashier ? (
                <div className="flex flex-wrap items-center gap-2">
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
          </article>
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
