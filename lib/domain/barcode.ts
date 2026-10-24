export function num(value: unknown): number | null {
  const parsed =
    typeof value === "string"
      ? Number.parseFloat(value)
      : typeof value === "number"
        ? value
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}
