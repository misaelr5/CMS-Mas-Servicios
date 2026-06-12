import { createAuditLog } from "@/lib/audit/audit-log";
import type { Bag, BagDailySnapshot, BagOperation, BagOperationType, Note } from "@/lib/db/types";
import { getOperationalConfigData } from "@/lib/operations/operational-data";
import { seedBags } from "@/lib/operations/seed-data";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { bagStatusFromDifference, estimateTotal } from "@/lib/bags/bag-calculations";

export type BagOverview = Bag & {
  branch_name?: string | null;
  responsible_name?: string | null;
  estimated_total_ars: number;
  difference_ars: number;
  last_updated: string | null;
};

export type BagDetail = {
  bag: Bag;
  operations: BagOperation[];
  snapshots: BagDailySnapshot[];
  notes: Note[];
  estimated_total_ars: number;
  difference_ars: number;
  status_label: string;
  reference_rate: number | null;
};

function asNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function mapBagRow(row: Record<string, any>): Bag {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    base_limit_ars: asNumber(row.base_limit_ars),
    current_cash_ars: asNumber(row.current_cash_ars),
    current_account_ars: asNumber(row.current_account_ars),
    current_usd: asNumber(row.current_usd),
    borrowed_ars: asNumber(row.borrowed_ars),
    average_usd_cost: asNumber(row.average_usd_cost),
    accumulated_profit_ars: asNumber(row.accumulated_profit_ars),
    responsible_user_id: row.responsible_user_id ?? null,
    status: row.status ?? "ok",
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function getBagsOverview() {
  const admin = getSupabaseAdminClient();
  const fallback = await getOperationalConfigData();

  if (!admin) {
    return fallback.bags.map((bag) => ({
      ...bag,
      branch_name: null,
      responsible_name: null,
      estimated_total_ars: estimateTotal(bag, 0),
      difference_ars: estimateTotal(bag, 0) - Number(bag.base_limit_ars),
      last_updated: bag.updated_at ?? null
    })) satisfies BagOverview[];
  }

  try {
    const [bagsResult, assignmentsResult] = await Promise.all([
      admin
        .from("bags")
        .select("id,name,slug,base_limit_ars,current_cash_ars,current_account_ars,current_usd,borrowed_ars,average_usd_cost,accumulated_profit_ars,status,created_at,updated_at")
        .order("name"),
      admin.from("bag_assignments").select("bag_id,user_id,status,profiles(full_name)").eq("status", "active")
    ]);

    if (bagsResult.error || assignmentsResult.error) {
      throw bagsResult.error ?? assignmentsResult.error;
    }

    const assignmentMap = new Map<string, string>();
    (assignmentsResult.data ?? []).forEach((row: any) => {
      if (!assignmentMap.has(row.bag_id)) {
        assignmentMap.set(row.bag_id, row.profiles?.full_name ?? "Usuario");
      }
    });

    const bags = (bagsResult.data ?? []).map((row: any) => mapBagRow(row));
    return bags.map((bag) => {
      const estimatedTotal = estimateTotal(bag, Number(bag.average_usd_cost ?? 0) || 0);
      const difference = estimatedTotal - Number(bag.base_limit_ars);
      return {
        ...bag,
        branch_name: null,
        responsible_name: assignmentMap.get(bag.id) ?? null,
        estimated_total_ars: estimatedTotal,
        difference_ars: difference,
        last_updated: bag.updated_at ?? null
      } satisfies BagOverview;
    });
  } catch {
    return fallback.bags.map((bag) => ({
      ...bag,
      branch_name: null,
      responsible_name: null,
      estimated_total_ars: estimateTotal(bag, 0),
      difference_ars: estimateTotal(bag, 0) - Number(bag.base_limit_ars),
      last_updated: bag.updated_at ?? null
    })) satisfies BagOverview[];
  }
}

export async function getBagDetail(bagId: string): Promise<BagDetail | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const [{ data: bagData, error: bagError }, { data: operationsData, error: operationsError }, { data: snapshotsData, error: snapshotsError }, { data: notesData, error: notesError }] = await Promise.all([
    admin
      .from("bags")
      .select("id,name,slug,base_limit_ars,current_cash_ars,current_account_ars,current_usd,borrowed_ars,average_usd_cost,accumulated_profit_ars,status,created_at,updated_at")
      .eq("id", bagId)
      .maybeSingle(),
    admin
      .from("bag_operations")
      .select("*")
      .eq("bag_id", bagId)
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("bag_daily_snapshots")
      .select("*")
      .eq("bag_id", bagId)
      .order("date", { ascending: false })
      .limit(14),
    admin.from("notes").select("*").eq("entity_type", "bag").eq("entity_id", bagId).order("created_at", { ascending: false }).limit(20)
  ]);

  if (bagError || operationsError || snapshotsError || notesError || !bagData) {
    return null;
  }

  const bag = mapBagRow(bagData as Record<string, any>);
  const referenceRate = bag.average_usd_cost && bag.average_usd_cost > 0 ? bag.average_usd_cost : null;
  const estimatedTotal = estimateTotal(bag, referenceRate);
  const difference = estimatedTotal - Number(bag.base_limit_ars);
  return {
    bag,
    operations: (operationsData ?? []) as BagOperation[],
    snapshots: (snapshotsData ?? []) as BagDailySnapshot[],
    notes: (notesData ?? []) as Note[],
    estimated_total_ars: estimatedTotal,
    difference_ars: difference,
    status_label: bagStatusFromDifference(difference, Boolean(referenceRate)),
    reference_rate: referenceRate
  };
}

export async function getBagByIdOrSeed(bagId: string) {
  const detail = await getBagDetail(bagId);
  if (detail) return detail.bag;
  return seedBags.find((bag) => bag.id === bagId) ?? null;
}

export async function getAssignedBagIdsForUser(userId: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) return [] as string[];

  const { data, error } = await admin
    .from("bag_assignments")
    .select("bag_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    return [] as string[];
  }

  return (data ?? []).map((row: { bag_id: string }) => row.bag_id);
}

export type BagOperationInput = {
  bagId: string;
  operationType: BagOperationType;
  amountUsd?: number;
  rateArs?: number;
  moneySource?: "efectivo" | "cuenta" | null;
  moneyDestination?: "efectivo" | "cuenta" | null;
  notes?: string | null;
  confirmAsReview?: boolean;
  baseLimitAdjustment?: number;
  cashDelta?: number;
  accountDelta?: number;
  usdDelta?: number;
  borrowedDelta?: number;
  profitDelta?: number;
};

export async function processBagOperation({
  actorId,
  bagId,
  operationType,
  amountUsd = 0,
  rateArs = 0,
  moneySource = null,
  moneyDestination = null,
  notes = null,
  confirmAsReview = false,
  baseLimitAdjustment = 0,
  cashDelta = 0,
  accountDelta = 0,
  usdDelta = 0,
  borrowedDelta = 0,
  profitDelta = 0
}: BagOperationInput & { actorId: string }) {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { ok: false, message: "Falta configurar Supabase." };
  }

  const { data: bagData, error: bagError } = await (admin.from("bags") as any).select("*").eq("id", bagId).maybeSingle();
  if (bagError || !bagData) {
    return { ok: false, message: "No se pudo encontrar la bolsa." };
  }

  const bag = mapBagRow(bagData);
  const previousCash = bag.current_cash_ars ?? 0;
  const previousAccount = bag.current_account_ars ?? 0;
  const previousUsd = bag.current_usd ?? 0;
  const previousBorrowed = bag.borrowed_ars ?? 0;
  const previousAverage = bag.average_usd_cost ?? 0;
  const previousBaseLimit = bag.base_limit_ars;

  let nextCash = previousCash;
  let nextAccount = previousAccount;
  let nextUsd = previousUsd;
  let nextBorrowed = previousBorrowed;
  let profitArs = profitDelta;
  let totalArs = amountUsd * rateArs;
  let status: "confirmada" | "revisar" | "anulada" = confirmAsReview ? "revisar" : "confirmada";
  let nextBaseLimit = previousBaseLimit;

  switch (operationType) {
    case "compra_usd": {
      totalArs = amountUsd * rateArs;
      if (moneySource === "efectivo") nextCash -= totalArs;
      if (moneySource === "cuenta") nextAccount -= totalArs;
      const totalBefore = previousUsd * previousAverage;
      const totalAfter = totalBefore + totalArs;
      nextUsd += amountUsd;
      const totalUsd = nextUsd;
      const newAverage = totalUsd > 0 ? totalAfter / totalUsd : 0;
      bag.average_usd_cost = newAverage;
      break;
    }
    case "venta_usd": {
      if (amountUsd > previousUsd) {
        return { ok: false, message: "No hay USD suficientes para vender." };
      }
      totalArs = amountUsd * rateArs;
      if (moneyDestination === "efectivo") nextCash += totalArs;
      if (moneyDestination === "cuenta") nextAccount += totalArs;
      nextUsd -= amountUsd;
      profitArs = (rateArs - previousAverage) * amountUsd;
      bag.accumulated_profit_ars = (bag.accumulated_profit_ars ?? 0) + profitArs;
      if (previousAverage <= 0) {
        status = "revisar";
      }
      break;
    }
    case "ingreso_pesos_efectivo":
      nextCash += totalArs || cashDelta;
      break;
    case "egreso_pesos_efectivo":
      nextCash -= totalArs || cashDelta;
      break;
    case "ingreso_pesos_cuenta":
      nextAccount += totalArs || accountDelta;
      break;
    case "egreso_pesos_cuenta":
      nextAccount -= totalArs || accountDelta;
      break;
    case "prestamo_entregado":
      nextCash -= totalArs || cashDelta;
      nextBorrowed += totalArs || cashDelta;
      break;
    case "prestamo_recibido":
      nextCash += totalArs || cashDelta;
      nextBorrowed -= totalArs || cashDelta;
      break;
    case "devolucion_prestamo":
      nextCash += cashDelta;
      nextBorrowed -= borrowedDelta || cashDelta;
      break;
    case "ajuste_manual":
      nextCash += cashDelta;
      nextAccount += accountDelta;
      nextUsd += usdDelta;
      nextBorrowed += borrowedDelta;
      bag.accumulated_profit_ars = (bag.accumulated_profit_ars ?? 0) + profitDelta;
      nextBaseLimit += baseLimitAdjustment;
      break;
    case "anulacion_operacion":
      break;
  }

  const hasNegativeBalance = nextCash < 0 || nextAccount < 0 || nextUsd < 0 || nextBorrowed < 0;
  if (hasNegativeBalance && bag.status !== "ok") {
    return { ok: false, message: "La operacion dejaria saldos negativos." };
  }

  const nextBag = {
    current_cash_ars: Math.max(0, nextCash),
    current_account_ars: Math.max(0, nextAccount),
    current_usd: Math.max(0, nextUsd),
    borrowed_ars: Math.max(0, nextBorrowed),
    average_usd_cost: bag.average_usd_cost ?? previousAverage,
    accumulated_profit_ars: bag.accumulated_profit_ars ?? 0,
    status: bag.status,
    base_limit_ars: nextBaseLimit
  };
  const estimatedTotal = estimateTotal(nextBag, nextBag.average_usd_cost);
  const difference = estimatedTotal - Number(nextBaseLimit);
  nextBag.status = bagStatusFromDifference(difference, true) as Bag["status"];

  const operationPayload = {
    bag_id: bagId,
    operation_type: operationType,
    amount_usd: amountUsd,
    rate_ars: rateArs,
    total_ars: totalArs,
    money_source: moneySource,
    money_destination: moneyDestination,
    profit_ars: profitArs,
    previous_cash_ars: previousCash,
    previous_account_ars: previousAccount,
    previous_usd: previousUsd,
    previous_borrowed_ars: previousBorrowed,
    new_cash_ars: nextBag.current_cash_ars,
    new_account_ars: nextBag.current_account_ars,
    new_usd: nextBag.current_usd,
    new_borrowed_ars: nextBag.borrowed_ars,
    notes,
    status,
    created_by: actorId
  };

  const { data: inserted, error: insertError } = await (admin.from("bag_operations") as any).insert(operationPayload).select("*").single();
  if (insertError) {
    return { ok: false, message: `No se pudo crear la operacion: ${insertError.message}` };
  }

  const { error: updateError } = await (admin.from("bags") as any)
    .update({
      current_cash_ars: nextBag.current_cash_ars,
      current_account_ars: nextBag.current_account_ars,
      current_usd: nextBag.current_usd,
      borrowed_ars: nextBag.borrowed_ars,
      average_usd_cost: nextBag.average_usd_cost,
      accumulated_profit_ars: nextBag.accumulated_profit_ars,
      base_limit_ars: nextBag.base_limit_ars,
      status: nextBag.status
    })
    .eq("id", bagId);

  if (updateError) {
    return { ok: false, message: `Se guardo la operacion pero fallo la bolsa: ${updateError.message}` };
  }

  await createAuditLog({
    actorId,
    action: `bag_operation.${operationType}`,
    entityType: "bag_operation",
    entityId: inserted.id,
    oldData: {
      current_cash_ars: previousCash,
      current_account_ars: previousAccount,
      current_usd: previousUsd,
      borrowed_ars: previousBorrowed,
      average_usd_cost: previousAverage
    },
    newData: {
      current_cash_ars: nextBag.current_cash_ars,
      current_account_ars: nextBag.current_account_ars,
      current_usd: nextBag.current_usd,
      borrowed_ars: nextBag.borrowed_ars,
      average_usd_cost: nextBag.average_usd_cost,
      base_limit_ars: nextBag.base_limit_ars,
      status: nextBag.status
    },
    reason: notes
  });

  return {
    ok: true,
    message: "Operacion guardada.",
    operation: inserted,
    bag: {
      ...bag,
      ...nextBag,
      base_limit_ars: nextBaseLimit,
      accumulated_profit_ars: nextBag.accumulated_profit_ars
    },
    estimated_total_ars: estimatedTotal,
    difference_ars: difference
  };
}

export async function createDailySnapshot({ bagId, actorId, note }: { bagId: string; actorId: string; note?: string | null }) {
  const admin = getSupabaseAdminClient();
  if (!admin) return { ok: false, message: "Falta configurar Supabase." };

  const { data: bagData, error: bagError } = await (admin.from("bags") as any).select("*").eq("id", bagId).maybeSingle();
  if (bagError || !bagData) return { ok: false, message: "No se pudo encontrar la bolsa." };

  const bag = mapBagRow(bagData);
  const totalEstimated = estimateTotal(bag, bag.average_usd_cost);
  const difference = totalEstimated - Number(bag.base_limit_ars);
  const dayProfit = bag.accumulated_profit_ars ?? 0;
  const status = bagStatusFromDifference(difference, true);

  const { data, error } = await (admin.from("bag_daily_snapshots") as any)
    .insert({
      bag_id: bagId,
      date: new Date().toISOString().slice(0, 10),
      cash_ars: bag.current_cash_ars ?? 0,
      account_ars: bag.current_account_ars ?? 0,
      usd_amount: bag.current_usd ?? 0,
      borrowed_ars: bag.borrowed_ars ?? 0,
      average_usd_cost: bag.average_usd_cost ?? 0,
      total_estimated_ars: totalEstimated,
      base_limit_ars: bag.base_limit_ars,
      difference_ars: difference,
      profit_day_ars: dayProfit,
      status,
      created_by: actorId
    })
    .select("*")
    .single();

  if (error) return { ok: false, message: `No se pudo guardar el cierre: ${error.message}` };

  await createAuditLog({
    actorId,
    action: "bag.daily_snapshot.created",
    entityType: "bag_daily_snapshot",
    entityId: data.id,
    newData: data as Record<string, unknown>,
    reason: note ?? null
  });

  return { ok: true, snapshot: data as BagDailySnapshot };
}

export async function annullBagOperation({ operationId, actorId, reason }: { operationId: string; actorId: string; reason: string }) {
  const admin = getSupabaseAdminClient();
  if (!admin) return { ok: false, message: "Falta configurar Supabase." };

  const { data: opData, error: opError } = await (admin.from("bag_operations") as any).select("*").eq("id", operationId).maybeSingle();
  if (opError || !opData) return { ok: false, message: "No se encontro la operacion." };
  if (opData.status === "anulada") return { ok: false, message: "La operacion ya estaba anulada." };

  const { data: bagData, error: bagError } = await (admin.from("bags") as any).select("*").eq("id", opData.bag_id).maybeSingle();
  if (bagError || !bagData) return { ok: false, message: "No se pudo cargar la bolsa." };

  const bag = mapBagRow(bagData);
  const revertedCash = Number(opData.previous_cash_ars ?? 0);
  const revertedAccount = Number(opData.previous_account_ars ?? 0);
  const revertedUsd = Number(opData.previous_usd ?? 0);
  const revertedBorrowed = Number(opData.previous_borrowed_ars ?? 0);

  const { error: updateError } = await (admin.from("bags") as any)
    .update({
      current_cash_ars: revertedCash,
      current_account_ars: revertedAccount,
      current_usd: revertedUsd,
      borrowed_ars: revertedBorrowed
    })
    .eq("id", bag.id);

  if (updateError) return { ok: false, message: `No se pudo revertir la bolsa: ${updateError.message}` };

  const { error: opUpdateError } = await (admin.from("bag_operations") as any)
    .update({
      status: "anulada",
      annulled_at: new Date().toISOString(),
      annulled_by: actorId,
      annulment_reason: reason
    })
    .eq("id", operationId);

  if (opUpdateError) return { ok: false, message: `No se pudo anular la operacion: ${opUpdateError.message}` };

  await createAuditLog({
    actorId,
    action: "bag_operation.annulled",
    entityType: "bag_operation",
    entityId: operationId,
    oldData: opData as Record<string, unknown>,
    newData: {
      status: "anulada",
      annulled_at: new Date().toISOString(),
      annulled_by: actorId,
      annulment_reason: reason
    },
    reason
  });

  return { ok: true };
}
