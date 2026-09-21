export function formatCalories(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "0";
}

export function formatGrams(value: number | null | undefined, decimals = 0): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0g";
  return `${n.toFixed(decimals)}g`;
}

export function formatKg(value: number | null | undefined, decimals = 1): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(decimals)} kg`;
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `${n.toFixed(decimals)}%` : "0%";
}
