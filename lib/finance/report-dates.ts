export function getBuenosAiresDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function isSameBuenosAiresDate(left: string, right: string | Date) {
  const rightValue = typeof right === "string" ? right : getBuenosAiresDateString(right);
  return left === rightValue;
}
