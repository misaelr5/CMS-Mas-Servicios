import { randomUUID } from "crypto";

import { createAuditLog } from "@/lib/audit/audit-log";
import type { Bag, BagDailySnapshot, BagInternalTransfer, BagOperation, BagOperationType, Note } from "@/lib/db/types";
import { getOperationalConfigData } from "@/lib/operations/operational-data";
import { getDefaultBagOpeningBalances, seedBags } from "@/lib/operations/seed-data";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { bagStatusFromDifference, estimateTotal } from "@/lib/bags/bag-calculations";

export type BagOverview = Bag & {
  branch_name?: string | null;
  responsible_name?: string | null;
  estimated_total_ars: number;
  difference_ars: number;
  last_updated: string | null;
};

export type InternalTransferBagOption = BagOverview & {
  display_label: string;
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

const defaultBagResponsibleBySlug: Record<string, string> = {
  "bolsa-1": "Lourdes",
  "bolsa-2": "Victoria",
  "bolsa-3": "Antonella",
  "bolsa-4": "Román",
  "bolsa-5": "Rocío"
};

const bagSortOrderBySlug: Record<string, number> = {
  "bolsa-1": 1,
  "bolsa-2": 2,
  "bolsa-3": 3,
  "bolsa-4": 4,
  "bolsa-5": 5
};

export function getBagDisplayLabel(bag: Pick<BagOverview, "name" | "slug" | "responsible_name">) {
  return `${bag.name} — ${bag.responsible_name ?? defaultBagResponsibleBySlug[bag.slug] ?? "Sin responsable"}`;
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

function looksLikeMissingTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("Could not find the table") || message.includes("schema cache") || message.includes("relation");
}

function parseOperationNote(note: Note): BagOperation | null {
  try {
    const parsed = JSON.parse(note.body) as Partial<BagOperation>;
    if (!parsed.id || !parsed.operation_type) return null;
    return {
      id: parsed.id,
      bag_id: parsed.bag_id ?? note.entity_id ?? "",
      operation_type: parsed.operation_type,
      amount_usd: Number(parsed.amount_usd ?? 0),
      rate_ars: Number(parsed.rate_ars ?? 0),
      total_ars: Number(parsed.total_ars ?? 0),
      money_source: parsed.money_source ?? null,
      money_destination: parsed.money_destination ?? null,
      profit_ars: Number(parsed.profit_ars ?? 0),
      previous_cash_ars: Number(parsed.previous_cash_ars ?? 0),
      previous_account_ars: Number(parsed.previous_account_ars ?? 0),
      previous_usd: Number(parsed.previous_usd ?? 0),
      previous_borrowed_ars: Number(parsed.previous_borrowed_ars ?? 0),
      new_cash_ars: Number(parsed.new_cash_ars ?? 0),
      new_account_ars: Number(parsed.new_account_ars ?? 0),
      new_usd: Number(parsed.new_usd ?? 0),
      new_borrowed_ars: Number(parsed.new_borrowed_ars ?? 0),
      notes: parsed.notes ?? note.body,
      status: (parsed.status as BagOperation["status"]) ?? (note.status === "anulada" ? "anulada" : "confirmada"),
      created_by: parsed.created_by ?? note.created_by,
      created_at: parsed.created_at ?? note.created_at,
      updated_at: parsed.updated_at ?? note.updated_at,
      annulled_at: parsed.annulled_at ?? note.annulled_at,
      annulled_by: parsed.annulled_by ?? note.annulled_by,
      annulment_reason: parsed.annulment_reason ?? note.annul_reason,
      internal_transfer_id: parsed.internal_transfer_id ?? null,
      related_operation_id: parsed.related_operation_id ?? null,
      is_internal: Boolean(parsed.is_internal ?? false),
      affects_profit: parsed.affects_profit ?? true
    };
  } catch {
    return null;
  }
}

export async function getInternalTransferBagOptions() {
  const bags = await getBagsOverview();
  return [...bags]
    .sort((left, right) => (bagSortOrderBySlug[left.slug] ?? 999) - (bagSortOrderBySlug[right.slug] ?? 999))
    .map((bag) => ({
      ...bag,
      display_label: getBagDisplayLabel(bag)
    })) satisfies InternalTransferBagOption[];
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

  const [{ data: bagData, error: bagError }, operationsResult, snapshotsResult, notesResult, operationNotesResult] = await Promise.all([
    admin
      .from("bags")
      .select("id,name,slug,base_limit_ars,current_cash_ars,current_account_ars,current_usd,borrowed_ars,average_usd_cost,accumulated_profit_ars,status,created_at,updated_at")
      .eq("id", bagId)
      .maybeSingle(),
    admin.from("bag_operations").select("*").eq("bag_id", bagId).order("created_at", { ascending: false }).limit(100),
    admin.from("bag_daily_snapshots").select("*").eq("bag_id", bagId).order("date", { ascending: false }).limit(14),
    admin.from("notes").select("*").eq("entity_type", "bag").eq("entity_id", bagId).order("created_at", { ascending: false }).limit(20),
    admin.from("notes").select("*").eq("entity_type", "bag_operation").eq("entity_id", bagId).order("created_at", { ascending: false }).limit(30)
  ]);

  const operationsData = "data" in operationsResult ? operationsResult.data : null;
  const operationsError = "error" in operationsResult ? operationsResult.error : null;
  const snapshotsData = "data" in snapshotsResult ? snapshotsResult.data : null;
  const snapshotsError = "error" in snapshotsResult ? snapshotsResult.error : null;
  const notesData = "data" in notesResult ? notesResult.data : null;
  const notesError = "error" in notesResult ? notesResult.error : null;
  const operationNotesData = "data" in operationNotesResult ? operationNotesResult.data : null;
  const operationNotesError = "error" in operationNotesResult ? operationNotesResult.error : null;

  if (bagError || !bagData) {
    return null;
  }

  const bag = mapBagRow(bagData as Record<string, any>);
  const referenceRate = bag.average_usd_cost && bag.average_usd_cost > 0 ? bag.average_usd_cost : null;
  const estimatedTotal = estimateTotal(bag, referenceRate);
  const difference = estimatedTotal - Number(bag.base_limit_ars);
  const operations = (operationsData ?? [])
    .map((row: Record<string, any>) => row as BagOperation)
    .sort((left: BagOperation, right: BagOperation) => right.created_at.localeCompare(left.created_at));
  const fallbackOperations = (operationNotesData ?? [])
    .map((note: Note) => parseOperationNote(note))
    .filter((operation): operation is BagOperation => Boolean(operation));
  return {
    bag,
    operations: operations.length > 0 ? operations : fallbackOperations,
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

  const [{ data: assignmentData, error: assignmentError }, { data: responsibleData, error: responsibleError }] = await Promise.all([
    admin.from("bag_assignments").select("bag_id").eq("user_id", userId).eq("status", "active"),
    admin.from("bags").select("id").eq("responsible_user_id", userId)
  ]);

  if (assignmentError && responsibleError) return [] as string[];

  const assignmentIds = (assignmentData ?? []).map((row: { bag_id: string }) => row.bag_id);
  const responsibleIds = (responsibleData ?? []).map((row: { id: string }) => row.id);

  return [...new Set([...assignmentIds, ...responsibleIds])];
}

function bagStatusFromBagState(bag: Pick<Bag, "current_cash_ars" | "current_account_ars" | "current_usd" | "borrowed_ars" | "average_usd_cost" | "base_limit_ars">) {
  const estimated = estimateTotal(bag, Number(bag.average_usd_cost ?? 0) || 0);
  return bagStatusFromDifference(estimated - Number(bag.base_limit_ars), true) as Bag["status"];
}

export type InternalBagTransferInput = {
  originBagId: string;
  destinationBagId: string;
  amountUsd: number;
  internalRateArs: number;
  transferMode: "venta" | "compra";
  destinationPaymentSource: "efectivo" | "cuenta";
  originReceiveDestination: "efectivo" | "cuenta";
  reason: string;
  note: string;
};

export async function createInternalBagTransfer({
  actorId,
  originBagId,
  destinationBagId,
  amountUsd,
  internalRateArs,
  transferMode,
  destinationPaymentSource,
  originReceiveDestination,
  reason,
  note
}: InternalBagTransferInput & { actorId: string }) {
  const admin = getSupabaseAdminClient();
  if (!admin) return { ok: false, message: "Falta configurar Supabase." };

  if (originBagId === destinationBagId) {
    return { ok: false, message: "No se puede elegir la misma bolsa como destino." };
  }

  if (amountUsd <= 0) {
    return { ok: false, message: "USD a vender debe ser mayor a 0." };
  }

  if (internalRateArs <= 0) {
    return { ok: false, message: "Cotizacion interna debe ser mayor a 0." };
  }

  if (!reason || !note) {
    return { ok: false, message: "Motivo y nota son obligatorios." };
  }

  if (transferMode !== "venta" && transferMode !== "compra") {
    return { ok: false, message: "Elegí si la bolsa origen vende o compra USD." };
  }

  const [{ data: originData, error: originError }, { data: destinationData, error: destinationError }] = await Promise.all([
    (admin.from("bags") as any).select("*").eq("id", originBagId).maybeSingle(),
    (admin.from("bags") as any).select("*").eq("id", destinationBagId).maybeSingle()
  ]);

  if (originError || !originData) return { ok: false, message: "No se pudo encontrar la bolsa origen." };
  if (destinationError || !destinationData) return { ok: false, message: "No se pudo encontrar la bolsa destino." };

  const origin = mapBagRow(originData);
  const destination = mapBagRow(destinationData);
  const totalArs = amountUsd * internalRateArs;

  const originCashBalance = Number(origin.current_cash_ars ?? 0);
  const originAccountBalance = Number(origin.current_account_ars ?? 0);
  const originUsdBalance = Number(origin.current_usd ?? 0);
  const destinationCashBalance = Number(destination.current_cash_ars ?? 0);
  const destinationAccountBalance = Number(destination.current_account_ars ?? 0);
  const destinationUsdBalance = Number(destination.current_usd ?? 0);

  if (transferMode === "venta") {
    if (originUsdBalance < amountUsd) {
      return { ok: false, message: "No hay USD suficientes en la bolsa origen." };
    }

    const destinationPaymentBalance = destinationPaymentSource === "efectivo" ? destinationCashBalance : destinationAccountBalance;
    if (destinationPaymentBalance < totalArs) {
      return { ok: false, message: "La bolsa destino no tiene saldo suficiente en el origen de pago seleccionado." };
    }
  } else {
    if (destinationUsdBalance < amountUsd) {
      return { ok: false, message: "No hay USD suficientes en la bolsa destino para completar la compra." };
    }

    const originPaymentBalance = originReceiveDestination === "efectivo" ? originCashBalance : originAccountBalance;
    if (originPaymentBalance < totalArs) {
      return { ok: false, message: "La bolsa origen no tiene saldo suficiente en el origen de pago seleccionado." };
    }
  }

  const originPrevious = {
    cash: originCashBalance,
    account: originAccountBalance,
    usd: originUsdBalance,
    borrowed: Number(origin.borrowed_ars ?? 0),
    average: Number(origin.average_usd_cost ?? 0)
  };
  const destinationPrevious = {
    cash: destinationCashBalance,
    account: destinationAccountBalance,
    usd: destinationUsdBalance,
    borrowed: Number(destination.borrowed_ars ?? 0),
    average: Number(destination.average_usd_cost ?? 0)
  };

  const originNextUsd = transferMode === "venta" ? originPrevious.usd - amountUsd : originPrevious.usd + amountUsd;
  const destinationNextUsd = transferMode === "venta" ? destinationPrevious.usd + amountUsd : destinationPrevious.usd - amountUsd;
  const originNextAverage =
    transferMode === "compra" && originNextUsd > 0
      ? (originPrevious.usd * originPrevious.average + amountUsd * internalRateArs) / originNextUsd
      : transferMode === "venta" && originNextUsd <= 0
        ? 0
        : originPrevious.average;
  const destinationNextAverage =
    transferMode === "venta"
      ? destinationNextUsd > 0
        ? (destinationPrevious.usd * destinationPrevious.average + amountUsd * internalRateArs) / destinationNextUsd
        : 0
      : destinationNextUsd > 0
        ? destinationPrevious.average
        : 0;
  const originNext = {
    cash: originPrevious.cash + (transferMode === "venta" ? (originReceiveDestination === "efectivo" ? totalArs : 0) : -(originReceiveDestination === "efectivo" ? totalArs : 0)),
    account: originPrevious.account + (transferMode === "venta" ? (originReceiveDestination === "cuenta" ? totalArs : 0) : -(originReceiveDestination === "cuenta" ? totalArs : 0)),
    usd: originNextUsd,
    borrowed: originPrevious.borrowed,
    average: originNextAverage
  };
  const destinationNext = {
    cash: destinationPrevious.cash + (transferMode === "venta" ? -(destinationPaymentSource === "efectivo" ? totalArs : 0) : (destinationPaymentSource === "efectivo" ? totalArs : 0)),
    account: destinationPrevious.account + (transferMode === "venta" ? -(destinationPaymentSource === "cuenta" ? totalArs : 0) : (destinationPaymentSource === "cuenta" ? totalArs : 0)),
    usd: destinationNextUsd,
    borrowed: destinationPrevious.borrowed,
    average: destinationNextAverage
  };

  const { data: transfer, error: transferError } = await (admin.from("bag_internal_transfers") as any)
    .insert({
      origin_bag_id: originBagId,
      destination_bag_id: destinationBagId,
      amount_usd: amountUsd,
      internal_rate_ars: internalRateArs,
      total_ars: totalArs,
      destination_payment_source: destinationPaymentSource,
      origin_receive_destination: originReceiveDestination,
      reason,
      note,
      status: "confirmada",
      created_by: actorId
    })
    .select("*")
    .single();

  if (transferError || !transfer) {
    return { ok: false, message: `No se pudo crear la transferencia interna: ${transferError?.message ?? "error desconocido"}` };
  }

  const transferId = transfer.id as string;
  const originLabel = getBagDisplayLabel({ ...origin, responsible_name: null });
  const destinationLabel = getBagDisplayLabel({ ...destination, responsible_name: null });

  const originOperationPayload = {
    bag_id: originBagId,
    operation_type: transferMode === "venta" ? "venta_interna_bolsa" : "compra_interna_bolsa",
    amount_usd: amountUsd,
    rate_ars: internalRateArs,
    total_ars: totalArs,
    money_source: transferMode === "compra" ? originReceiveDestination : null,
    money_destination: transferMode === "venta" ? originReceiveDestination : null,
    profit_ars: 0,
    previous_cash_ars: originPrevious.cash,
    previous_account_ars: originPrevious.account,
    previous_usd: originPrevious.usd,
    previous_borrowed_ars: originPrevious.borrowed,
    new_cash_ars: originNext.cash,
    new_account_ars: originNext.account,
    new_usd: originNext.usd,
    new_borrowed_ars: originNext.borrowed,
    notes: transferMode === "venta" ? `Venta interna a ${destinationLabel}. ${note}` : `Compra interna desde ${destinationLabel}. ${note}`,
    status: "confirmada",
    created_by: actorId,
    internal_transfer_id: transferId,
    is_internal: true,
    affects_profit: false
  };
  const destinationOperationPayload = {
    bag_id: destinationBagId,
    operation_type: transferMode === "venta" ? "compra_interna_bolsa" : "venta_interna_bolsa",
    amount_usd: amountUsd,
    rate_ars: internalRateArs,
    total_ars: totalArs,
    money_source: transferMode === "venta" ? destinationPaymentSource : null,
    money_destination: transferMode === "compra" ? destinationPaymentSource : null,
    profit_ars: 0,
    previous_cash_ars: destinationPrevious.cash,
    previous_account_ars: destinationPrevious.account,
    previous_usd: destinationPrevious.usd,
    previous_borrowed_ars: destinationPrevious.borrowed,
    new_cash_ars: destinationNext.cash,
    new_account_ars: destinationNext.account,
    new_usd: destinationNext.usd,
    new_borrowed_ars: destinationNext.borrowed,
    notes: transferMode === "venta" ? `Compra interna desde ${originLabel}. ${note}` : `Venta interna a ${originLabel}. ${note}`,
    status: "confirmada",
    created_by: actorId,
    internal_transfer_id: transferId,
    is_internal: true,
    affects_profit: false
  };

  const [{ data: originOperation, error: originOperationError }, { data: destinationOperation, error: destinationOperationError }] = await Promise.all([
    (admin.from("bag_operations") as any).insert(originOperationPayload).select("*").single(),
    (admin.from("bag_operations") as any).insert(destinationOperationPayload).select("*").single()
  ]);

  if (originOperationError || destinationOperationError || !originOperation || !destinationOperation) {
    return { ok: false, message: `No se pudieron crear las operaciones internas: ${originOperationError?.message ?? destinationOperationError?.message ?? "error desconocido"}` };
  }

  await Promise.all([
    (admin.from("bag_operations") as any).update({ related_operation_id: destinationOperation.id }).eq("id", originOperation.id),
    (admin.from("bag_operations") as any).update({ related_operation_id: originOperation.id }).eq("id", destinationOperation.id),
    (admin.from("bag_internal_transfers") as any)
      .update({
        origin_operation_id: originOperation.id,
        destination_operation_id: destinationOperation.id
      })
      .eq("id", transferId)
  ]);

  const originNextBag = {
    current_cash_ars: originNext.cash,
    current_account_ars: originNext.account,
    current_usd: originNext.usd,
    borrowed_ars: originNext.borrowed,
    average_usd_cost: originNext.average,
    status: bagStatusFromBagState({
      ...origin,
      current_cash_ars: originNext.cash,
      current_account_ars: originNext.account,
      current_usd: originNext.usd,
      borrowed_ars: originNext.borrowed,
      average_usd_cost: originNext.average
    })
  };
  const destinationNextBag = {
    current_cash_ars: destinationNext.cash,
    current_account_ars: destinationNext.account,
    current_usd: destinationNext.usd,
    borrowed_ars: destinationNext.borrowed,
    average_usd_cost: destinationNext.average,
    status: bagStatusFromBagState({
      ...destination,
      current_cash_ars: destinationNext.cash,
      current_account_ars: destinationNext.account,
      current_usd: destinationNext.usd,
      borrowed_ars: destinationNext.borrowed,
      average_usd_cost: destinationNext.average
    })
  };

  const [{ error: originUpdateError }, { error: destinationUpdateError }] = await Promise.all([
    (admin.from("bags") as any).update(originNextBag).eq("id", originBagId),
    (admin.from("bags") as any).update(destinationNextBag).eq("id", destinationBagId)
  ]);

  if (originUpdateError || destinationUpdateError) {
    return { ok: false, message: `Se creo la transferencia pero fallo actualizar saldos: ${originUpdateError?.message ?? destinationUpdateError?.message}` };
  }

  await Promise.all([
    (admin.from("notes") as any).insert({
      entity_type: "bag_internal_transfer",
      entity_id: transferId,
      entity_label: `Venta interna: ${originLabel} a ${destinationLabel}`,
      entity_href: `/bolsas/${originBagId}`,
      title: "Venta interna a otra bolsa",
      body: note,
      priority: "normal",
      status: "abierta",
      created_by: actorId
    }),
    (admin.from("notes") as any).insert({
      entity_type: "bag",
      entity_id: originBagId,
      entity_label: originLabel,
      entity_href: `/bolsas/${originBagId}`,
      title: "Venta interna a otra bolsa",
      body: `${destinationLabel}. ${note}`,
      priority: "normal",
      status: "abierta",
      created_by: actorId
    }),
    (admin.from("notes") as any).insert({
      entity_type: "bag",
      entity_id: destinationBagId,
      entity_label: destinationLabel,
      entity_href: `/bolsas/${destinationBagId}`,
      title: "Compra interna desde otra bolsa",
      body: `${originLabel}. ${note}`,
      priority: "normal",
      status: "abierta",
      created_by: actorId
    }),
    createAuditLog({
      actorId,
      action: "crear_transferencia_interna",
      entityType: "bag_internal_transfer",
      entityId: transferId,
      newData: transfer as Record<string, unknown>,
      reason
    }),
    createAuditLog({
      actorId,
      action: "venta_interna_bolsa",
      entityType: "bag_operation",
      entityId: originOperation.id,
      oldData: originPrevious,
      newData: originNextBag,
      reason
    }),
    createAuditLog({
      actorId,
      action: "compra_interna_bolsa",
      entityType: "bag_operation",
      entityId: destinationOperation.id,
      oldData: destinationPrevious,
      newData: destinationNextBag,
      reason
    })
  ]);

  return {
    ok: true,
    message: "Movimiento interno guardado.",
    transfer: transfer as BagInternalTransfer,
    originOperation: originOperation as BagOperation,
    destinationOperation: destinationOperation as BagOperation
  };
}

export async function annulInternalBagTransfer({
  transferId,
  actorId,
  reason,
  note
}: {
  transferId: string;
  actorId: string;
  reason: string;
  note: string;
}) {
  const admin = getSupabaseAdminClient();
  if (!admin) return { ok: false, message: "Falta configurar Supabase." };

  if (!reason || !note) {
    return { ok: false, message: "Motivo y nota son obligatorios." };
  }

  const { data: transfer, error: transferError } = await (admin.from("bag_internal_transfers") as any)
    .select("*")
    .eq("id", transferId)
    .maybeSingle();

  if (transferError || !transfer) return { ok: false, message: "No se encontro la transferencia interna." };
  if (transfer.status === "anulada") return { ok: false, message: "La transferencia interna ya estaba anulada." };

  const [{ data: originData }, { data: destinationData }, { data: originOperation }, { data: destinationOperation }] = await Promise.all([
    (admin.from("bags") as any).select("*").eq("id", transfer.origin_bag_id).maybeSingle(),
    (admin.from("bags") as any).select("*").eq("id", transfer.destination_bag_id).maybeSingle(),
    (admin.from("bag_operations") as any).select("*").eq("id", transfer.origin_operation_id).maybeSingle(),
    (admin.from("bag_operations") as any).select("*").eq("id", transfer.destination_operation_id).maybeSingle()
  ]);

  if (!originData || !destinationData || !originOperation || !destinationOperation) {
    return { ok: false, message: "No se pudo cargar la transferencia completa para anular." };
  }

  const origin = mapBagRow(originData);
  const destination = mapBagRow(destinationData);
  const amountUsd = Number(transfer.amount_usd ?? 0);
  const totalArs = Number(transfer.total_ars ?? 0);
  const originOperationType = originOperation.operation_type as BagOperationType;
  const destinationOperationType = destinationOperation.operation_type as BagOperationType;
  const originWasSale = originOperationType === "venta_interna_bolsa" && destinationOperationType === "compra_interna_bolsa";
  const originWasPurchase = originOperationType === "compra_interna_bolsa" && destinationOperationType === "venta_interna_bolsa";
  if (!originWasSale && !originWasPurchase) {
    return { ok: false, message: "La transferencia interna no tiene una direccion valida para anular." };
  }

  const originMoneyLocation = (originWasSale ? originOperation.money_destination : originOperation.money_source) as "efectivo" | "cuenta" | null;
  const destinationMoneyLocation = (originWasSale ? destinationOperation.money_source : destinationOperation.money_destination) as "efectivo" | "cuenta" | null;
  if ((originMoneyLocation !== "efectivo" && originMoneyLocation !== "cuenta") || (destinationMoneyLocation !== "efectivo" && destinationMoneyLocation !== "cuenta")) {
    return { ok: false, message: "No se pudieron identificar los saldos afectados por la transferencia." };
  }

  const originCurrentCash = Number(origin.current_cash_ars ?? 0);
  const originCurrentAccount = Number(origin.current_account_ars ?? 0);
  const originCurrentUsd = Number(origin.current_usd ?? 0);
  const destinationCurrentUsd = Number(destination.current_usd ?? 0);
  const originSelectedBalance = originMoneyLocation === "efectivo" ? originCurrentCash : originCurrentAccount;
  const destinationSelectedBalance = destinationMoneyLocation === "efectivo" ? Number(destination.current_cash_ars ?? 0) : Number(destination.current_account_ars ?? 0);

  if (originWasSale && originSelectedBalance < totalArs) {
    return { ok: false, message: "La bolsa origen no tiene saldo suficiente para compensar la anulacion." };
  }

  if (originWasSale && destinationCurrentUsd < amountUsd) {
    return { ok: false, message: "La bolsa destino no tiene USD suficientes para compensar la anulacion." };
  }

  if (originWasPurchase && originCurrentUsd < amountUsd) {
    return { ok: false, message: "La bolsa origen no tiene USD suficientes para compensar la anulacion." };
  }

  if (originWasPurchase && destinationSelectedBalance < totalArs) {
    return { ok: false, message: "La bolsa destino no tiene saldo suficiente para compensar la anulacion." };
  }

  const originPrevious = {
    cash: originCurrentCash,
    account: originCurrentAccount,
    usd: Number(origin.current_usd ?? 0),
    borrowed: Number(origin.borrowed_ars ?? 0),
    average: Number(origin.average_usd_cost ?? 0)
  };
  const destinationPrevious = {
    cash: Number(destination.current_cash_ars ?? 0),
    account: Number(destination.current_account_ars ?? 0),
    usd: destinationCurrentUsd,
    borrowed: Number(destination.borrowed_ars ?? 0),
    average: Number(destination.average_usd_cost ?? 0)
  };

  const returnedUsdRate = Number(originOperation.previous_usd ?? 0) > 0 ? Number(originData.average_usd_cost ?? origin.average_usd_cost ?? 0) : Number(transfer.internal_rate_ars ?? 0);
  const originNextUsd = originWasSale ? originPrevious.usd + amountUsd : originPrevious.usd - amountUsd;
  const destinationNextUsd = originWasSale ? destinationPrevious.usd - amountUsd : destinationPrevious.usd + amountUsd;
  const originNextAverage = originNextUsd > 0 ? (originWasSale ? (originPrevious.usd * originPrevious.average + amountUsd * returnedUsdRate) / originNextUsd : originPrevious.average) : 0;
  const destinationNextAverage = destinationNextUsd > 0 ? (originWasPurchase ? destinationPrevious.average : (destinationPrevious.usd * destinationPrevious.average + amountUsd * returnedUsdRate) / destinationNextUsd) : 0;

  const originNext = {
    cash: originPrevious.cash + (originMoneyLocation === "efectivo" ? (originWasSale ? -totalArs : totalArs) : 0),
    account: originPrevious.account + (originMoneyLocation === "cuenta" ? (originWasSale ? -totalArs : totalArs) : 0),
    usd: originNextUsd,
    borrowed: originPrevious.borrowed,
    average: originNextAverage
  };
  const destinationNext = {
    cash: destinationPrevious.cash + (destinationMoneyLocation === "efectivo" ? (originWasSale ? totalArs : -totalArs) : 0),
    account: destinationPrevious.account + (destinationMoneyLocation === "cuenta" ? (originWasSale ? totalArs : -totalArs) : 0),
    usd: destinationNextUsd,
    borrowed: destinationPrevious.borrowed,
    average: destinationNextAverage
  };

  const originLabel = getBagDisplayLabel({ ...origin, responsible_name: null });
  const destinationLabel = getBagDisplayLabel({ ...destination, responsible_name: null });
  const originCompensationTitle = originWasSale ? "Venta interna anulada" : "Compra interna anulada";
  const destinationCompensationTitle = originWasSale ? "Compra interna anulada" : "Venta interna anulada";
  const originCompensationBody = originWasSale ? `Compensacion por anulacion de venta interna a ${destinationLabel}. ${note}` : `Compensacion por anulacion de compra interna desde ${destinationLabel}. ${note}`;
  const destinationCompensationBody = originWasSale ? `Compensacion por anulacion de compra interna desde ${originLabel}. ${note}` : `Compensacion por anulacion de venta interna a ${originLabel}. ${note}`;

  const [{ data: originCompensation, error: originCompensationError }, { data: destinationCompensation, error: destinationCompensationError }] = await Promise.all([
    (admin.from("bag_operations") as any).insert({
      bag_id: transfer.origin_bag_id,
      operation_type: "anulacion_operacion",
      amount_usd: amountUsd,
      rate_ars: Number(transfer.internal_rate_ars ?? 0),
      total_ars: totalArs,
      money_source: originWasSale ? originMoneyLocation : null,
      money_destination: originWasSale ? null : originMoneyLocation,
      profit_ars: 0,
      previous_cash_ars: originPrevious.cash,
      previous_account_ars: originPrevious.account,
      previous_usd: originPrevious.usd,
      previous_borrowed_ars: originPrevious.borrowed,
      new_cash_ars: originNext.cash,
      new_account_ars: originNext.account,
      new_usd: originNext.usd,
      new_borrowed_ars: originNext.borrowed,
      notes: originCompensationBody,
      status: "confirmada",
      created_by: actorId,
      internal_transfer_id: transferId,
      related_operation_id: transfer.origin_operation_id,
      is_internal: true,
      affects_profit: false
    }).select("*").single(),
    (admin.from("bag_operations") as any).insert({
      bag_id: transfer.destination_bag_id,
      operation_type: "anulacion_operacion",
      amount_usd: amountUsd,
      rate_ars: Number(transfer.internal_rate_ars ?? 0),
      total_ars: totalArs,
      money_source: originWasSale ? null : destinationMoneyLocation,
      money_destination: originWasSale ? destinationMoneyLocation : null,
      profit_ars: 0,
      previous_cash_ars: destinationPrevious.cash,
      previous_account_ars: destinationPrevious.account,
      previous_usd: destinationPrevious.usd,
      previous_borrowed_ars: destinationPrevious.borrowed,
      new_cash_ars: destinationNext.cash,
      new_account_ars: destinationNext.account,
      new_usd: destinationNext.usd,
      new_borrowed_ars: destinationNext.borrowed,
      notes: destinationCompensationBody,
      status: "confirmada",
      created_by: actorId,
      internal_transfer_id: transferId,
      related_operation_id: transfer.destination_operation_id,
      is_internal: true,
      affects_profit: false
    }).select("*").single()
  ]);

  if (originCompensationError || destinationCompensationError || !originCompensation || !destinationCompensation) {
    return { ok: false, message: `No se pudieron crear operaciones compensatorias: ${originCompensationError?.message ?? destinationCompensationError?.message ?? "error desconocido"}` };
  }

  const originNextBag = {
    current_cash_ars: originNext.cash,
    current_account_ars: originNext.account,
    current_usd: originNext.usd,
    borrowed_ars: originNext.borrowed,
    average_usd_cost: originNext.average,
    status: bagStatusFromBagState({ ...origin, current_cash_ars: originNext.cash, current_account_ars: originNext.account, current_usd: originNext.usd, borrowed_ars: originNext.borrowed, average_usd_cost: originNext.average })
  };
  const destinationNextBag = {
    current_cash_ars: destinationNext.cash,
    current_account_ars: destinationNext.account,
    current_usd: destinationNext.usd,
    borrowed_ars: destinationNext.borrowed,
    average_usd_cost: destinationNext.average,
    status: bagStatusFromBagState({ ...destination, current_cash_ars: destinationNext.cash, current_account_ars: destinationNext.account, current_usd: destinationNext.usd, borrowed_ars: destinationNext.borrowed, average_usd_cost: destinationNext.average })
  };

  await Promise.all([
    (admin.from("bags") as any).update(originNextBag).eq("id", transfer.origin_bag_id),
    (admin.from("bags") as any).update(destinationNextBag).eq("id", transfer.destination_bag_id),
    (admin.from("bag_internal_transfers") as any)
      .update({
        status: "anulada",
        annulled_at: new Date().toISOString(),
        annulled_by: actorId,
        annulment_reason: reason
      })
      .eq("id", transferId),
    (admin.from("bag_operations") as any)
      .update({
        status: "anulada",
        annulled_at: new Date().toISOString(),
        annulled_by: actorId,
        annulment_reason: reason
      })
      .in("id", [transfer.origin_operation_id, transfer.destination_operation_id]),
    (admin.from("notes") as any).insert({
      entity_type: "bag_internal_transfer",
      entity_id: transferId,
      entity_label: `Anulacion transferencia interna: ${originLabel} a ${destinationLabel}`,
      entity_href: `/bolsas/${transfer.origin_bag_id}`,
      title: originCompensationTitle,
      body: note,
      priority: "importante",
      status: "abierta",
      created_by: actorId
    }),
    (admin.from("notes") as any).insert({
      entity_type: "bag",
      entity_id: transfer.origin_bag_id,
      entity_label: originLabel,
      entity_href: `/bolsas/${transfer.origin_bag_id}`,
      title: originCompensationTitle,
      body: `${destinationLabel}. ${note}`,
      priority: "importante",
      status: "abierta",
      created_by: actorId
    }),
    (admin.from("notes") as any).insert({
      entity_type: "bag",
      entity_id: transfer.destination_bag_id,
      entity_label: destinationLabel,
      entity_href: `/bolsas/${transfer.destination_bag_id}`,
      title: destinationCompensationTitle,
      body: `${originLabel}. ${note}`,
      priority: "importante",
      status: "abierta",
      created_by: actorId
    }),
    createAuditLog({
      actorId,
      action: "anular_transferencia_interna",
      entityType: "bag_internal_transfer",
      entityId: transferId,
      oldData: transfer as Record<string, unknown>,
      newData: { status: "anulada", reason, originCompensationId: originCompensation.id, destinationCompensationId: destinationCompensation.id },
      reason
    })
  ]);

  return {
    ok: true,
    message: "Venta interna anulada.",
    originBagId: transfer.origin_bag_id as string,
    destinationBagId: transfer.destination_bag_id as string
  };
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
  const { count: existingOperationsCount } = await (admin.from("bag_operations") as any)
    .select("id", { count: "exact", head: true })
    .eq("bag_id", bagId)
    .neq("status", "anulada");
  const shouldUseOpeningCash =
    existingOperationsCount === 0 &&
    (bag.current_cash_ars ?? 0) === 0 &&
    (bag.current_account_ars ?? 0) === 0 &&
    (bag.current_usd ?? 0) === 0 &&
    (bag.borrowed_ars ?? 0) === 0;

  const openingBalances = getDefaultBagOpeningBalances(bag.base_limit_ars);
  const previousCash = shouldUseOpeningCash ? openingBalances.current_cash_ars : bag.current_cash_ars ?? 0;
  const previousAccount = shouldUseOpeningCash ? openingBalances.current_account_ars : bag.current_account_ars ?? 0;
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
  if (hasNegativeBalance) {
    return { ok: false, message: "La operacion dejaria saldos negativos." };
  }

  const nextBag = {
    current_cash_ars: nextCash,
    current_account_ars: nextAccount,
    current_usd: nextUsd,
    borrowed_ars: nextBorrowed,
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
  const fallbackOperationId = randomUUID();
  if (insertError && looksLikeMissingTableError(insertError)) {
    const fallbackNotePayload = {
      ...operationPayload,
      id: fallbackOperationId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: noteError } = await (admin.from("notes") as any).insert({
      entity_type: "bag_operation",
      entity_id: bagId,
      entity_label: "Operacion de bolsa",
      entity_href: `/bolsas/${bagId}`,
      title: `Operacion ${operationType}`,
      body: JSON.stringify(fallbackNotePayload),
      priority: "normal",
      status: confirmAsReview ? "abierta" : "resuelta",
      created_by: actorId
    });

    if (noteError) {
      return { ok: false, message: `No se pudo crear la operacion: ${noteError.message}` };
    }
  } else if (insertError) {
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
    entityId: inserted?.id ?? fallbackOperationId,
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
    operation:
      inserted ??
      ({
        id: fallbackOperationId,
        ...operationPayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as BagOperation),
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
