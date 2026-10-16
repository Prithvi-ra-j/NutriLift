/**
 * User-local calendar date helpers.
 *
 * Never use UTC ISO date extraction for user-facing day keys.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayKey(): string {
  return getLocalDateKey(new Date());
}

export function getDateDaysAgo(days: number, from: Date = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  return getLocalDateKey(date);
}
