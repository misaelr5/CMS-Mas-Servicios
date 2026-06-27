export function toFiniteNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function roundTo(value: number | string | null | undefined, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((toFiniteNumber(value) + Number.EPSILON) * factor) / factor;
}

export function roundArs(value: number | string | null | undefined) {
  return roundTo(value, 2);
}

export function roundUsd(value: number | string | null | undefined) {
  return roundTo(value, 4);
}

export function roundRate(value: number | string | null | undefined) {
  return roundTo(value, 4);
}

export function isNegativeMoney(value: number, decimals = 2) {
  return value < -(0.5 / 10 ** decimals);
}
