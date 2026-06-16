import type { WeeklyCashClosureStatus } from "@/lib/db/types";

export const weeklyCashClosureStatusLabels: Record<WeeklyCashClosureStatus, string> = {
  abierto: "Abierto",
  cerrado: "Cerrado",
  revisar: "Revisar"
};

export const weeklyCashClosureStatusOptions: WeeklyCashClosureStatus[] = ["abierto", "cerrado", "revisar"];

export function getWeeklyCashClosureStatusTone(status: WeeklyCashClosureStatus) {
  if (status === "abierto") return "pendiente" as const;
  if (status === "revisar") return "revisar" as const;
  return "ok" as const;
}

function toBuenosAiresDate(date: string | Date) {
  if (typeof date === "string") {
    const [year, month, day] = date.split("-").map((part) => Number(part));
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
  const [year, month, day] = parts.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function formatBuenosAiresDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function getWeeklyCashClosureRange(date: string | Date) {
  const anchor = toBuenosAiresDate(date);
  const dayOfWeek = anchor.getUTCDay();
  const friday = 5;
  const offsetToStart = (dayOfWeek - friday + 7) % 7;

  const weekStart = new Date(anchor);
  weekStart.setUTCDate(weekStart.getUTCDate() - offsetToStart);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  return {
    weekStartDate: formatBuenosAiresDate(weekStart),
    weekEndDate: formatBuenosAiresDate(weekEnd)
  };
}

export function getWeeklyCashClosureLabel(date: string | Date) {
  const { weekStartDate, weekEndDate } = getWeeklyCashClosureRange(date);
  return `${weekStartDate} a ${weekEndDate}`;
}

export function getWeeklyCashClosureWeekAnchor(date: string | Date) {
  return getWeeklyCashClosureRange(date).weekStartDate;
}
