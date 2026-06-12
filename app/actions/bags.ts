"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit/audit-log";
import { getServerAuthContext } from "@/lib/auth/server";
import { type Role } from "@/lib/auth/roles";
import type { BagOperationType } from "@/lib/db/types";
import { createDailySnapshot, annullBagOperation, getAssignedBagIdsForUser, processBagOperation } from "@/lib/bags/bag-service";
import { bagOperationTypes } from "@/lib/bags/bag-calculations";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type ActionState = {
  ok: boolean;
  message: string;
  operationId?: string;
};

const canOperate = (role: Role) => role === "admin" || role === "encargado" || role === "cajero";
const canManage = (role: Role) => role === "admin" || role === "encargado";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) ? value : 0;
}

function getOperationType(value: string): BagOperationType | null {
  return bagOperationTypes.includes(value as BagOperationType) ? (value as BagOperationType) : null;
}

async function createBagNote({
  bagId,
  entityType,
  entityId,
  title,
  content,
  actorId
}: {
  bagId: string;
  entityType: "bag" | "bag_operation";
  entityId: string;
  title: string;
  content: string;
  actorId: string;
}) {
  const admin = getSupabaseAdminClient();
  if (!admin) return;

  const { data, error } = await (admin.from("notes") as any)
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityType === "bag" ? "Bolsa" : "Operacion de bolsa",
      entity_href: entityType === "bag" ? `/bolsas/${bagId}` : `/bolsas/${bagId}`,
      title,
      body: content,
      priority: "normal",
      status: "abierta",
      created_by: actorId
    })
    .select("*")
    .single();

  if (!error && data) {
    await createAuditLog({
      actorId,
      action: "note.created",
      entityType: "note",
      entityId: data.id,
      newData: data as Record<string, unknown>
    });
  }
}

export async function createBagOperationAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canOperate(auth.role)) {
    return { ok: false, message: "No tenes permiso para cargar operaciones." };
  }

  const bagId = getString(formData, "bag_id");
  const operationType = getOperationType(getString(formData, "operation_type"));
  const amountUsd = getNumber(formData, "amount_usd");
  const rateArs = getNumber(formData, "rate_ars");
  const moneySource = getString(formData, "money_source") as "efectivo" | "cuenta" | "";
  const moneyDestination = getString(formData, "money_destination") as "efectivo" | "cuenta" | "";
  const notes = getString(formData, "notes");
  const confirmAsReview = getString(formData, "confirm_review") === "on";
  const cashDelta = getNumber(formData, "cash_delta");
  const accountDelta = getNumber(formData, "account_delta");
  const usdDelta = getNumber(formData, "usd_delta");
  const borrowedDelta = getNumber(formData, "borrowed_delta");
  const profitDelta = getNumber(formData, "profit_delta");
  const baseLimitAdjustment = getNumber(formData, "base_limit_adjustment");

  if (!bagId || !operationType) {
    return { ok: false, message: "Elegí bolsa y tipo de operacion." };
  }

  if (auth.role === "cajero") {
    const assignedBagIds = await getAssignedBagIdsForUser(auth.userId);
    if (!assignedBagIds.includes(bagId)) {
      return { ok: false, message: "Como cajero solo podes operar tu bolsa asignada." };
    }
  }

  if ((operationType === "compra_usd" || operationType === "venta_usd") && (amountUsd <= 0 || rateArs <= 0)) {
    return { ok: false, message: "USD y cotizacion deben ser mayores a 0." };
  }

  if (
    ["ingreso_pesos_efectivo", "egreso_pesos_efectivo", "ingreso_pesos_cuenta", "egreso_pesos_cuenta", "prestamo_entregado", "prestamo_recibido", "devolucion_prestamo", "ajuste_manual"].includes(operationType) &&
    amountUsd <= 0 &&
    cashDelta <= 0 &&
    accountDelta <= 0 &&
    usdDelta <= 0 &&
    borrowedDelta <= 0 &&
    profitDelta <= 0 &&
    baseLimitAdjustment <= 0
  ) {
    return { ok: false, message: "La operacion necesita un importe o ajuste mayor a 0." };
  }

  if ((operationType === "prestamo_entregado" || operationType === "prestamo_recibido" || operationType === "devolucion_prestamo" || operationType === "ajuste_manual" || operationType === "anulacion_operacion" || operationType === "egreso_pesos_efectivo" || operationType === "egreso_pesos_cuenta") && !notes) {
    return { ok: false, message: "Esta operacion requiere nota o motivo." };
  }

  const result = await processBagOperation({
    actorId: auth.userId,
    bagId,
    operationType,
    amountUsd,
    rateArs,
    moneySource: moneySource || null,
    moneyDestination: moneyDestination || null,
    notes: notes || null,
    confirmAsReview,
    baseLimitAdjustment,
    cashDelta,
    accountDelta,
    usdDelta,
    borrowedDelta,
    profitDelta
  });

  if (!result.ok) {
    return { ok: false, message: result.message ?? "No se pudo guardar la operacion." };
  }

  if (notes) {
    await createBagNote({
      bagId,
      entityType: "bag_operation",
      entityId: result.operation.id,
      title: `Operacion ${operationType}`,
      content: notes,
      actorId: auth.userId
    });
  }

  revalidatePath("/bolsas");
  revalidatePath(`/bolsas/${bagId}`);
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: result.message,
    operationId: result.operation.id
  };
}

export async function createBagSnapshotAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canManage(auth.role)) {
    return { ok: false, message: "No tenes permiso para crear cierres diarios." };
  }

  const bagId = getString(formData, "bag_id");
  const note = getString(formData, "note");
  if (!bagId) {
    return { ok: false, message: "Elegí una bolsa." };
  }

  const result = await createDailySnapshot({ bagId, actorId: auth.userId, note: note || null });
  if (!result.ok) {
    return { ok: false, message: result.message ?? "No se pudo guardar el cierre diario." };
  }

  if (note) {
    await createBagNote({
      bagId,
      entityType: "bag",
      entityId: bagId,
      title: "Cierre diario",
      content: note,
      actorId: auth.userId
    });
  }

  revalidatePath("/bolsas");
  revalidatePath(`/bolsas/${bagId}`);
  revalidatePath(`/bolsas/${bagId}/cierre-diario`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Cierre diario guardado." };
}

export async function annulBagOperationAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getServerAuthContext(cookies());
  if (!auth || !canManage(auth.role)) {
    return { ok: false, message: "No tenes permiso para anular operaciones." };
  }

  const operationId = getString(formData, "operation_id");
  const reason = getString(formData, "reason");
  const bagId = getString(formData, "bag_id");
  if (!operationId || !reason || !bagId) {
    return { ok: false, message: "Falta operacion, motivo o bolsa." };
  }

  const result = await annullBagOperation({ operationId, actorId: auth.userId, reason });
  if (!result.ok) {
    return { ok: false, message: result.message ?? "No se pudo anular la operacion." };
  }

  await createBagNote({
    bagId,
    entityType: "bag_operation",
    entityId: operationId,
    title: "Operacion anulada",
    content: reason,
    actorId: auth.userId
  });

  revalidatePath("/bolsas");
  revalidatePath(`/bolsas/${bagId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Operacion anulada." };
}
