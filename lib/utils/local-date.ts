/**
 * Calendar-date helpers for values stored as YYYY-MM-DD.
 *
 * Date-only keys are calendar labels, not UTC instants. Never derive them by
 * slicing toISOString(), which can move the date across local midnight.
 */
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse a date-only key into local midnight (not UTC midnight). */
export function fromLocalDateKey(dateKey: string): Date {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) {
    throw new RangeError(`Invalid calendar date "${dateKey}"; expected YYYY-MM-DD`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  // JavaScript normalizes invalid dates such as February 31; reject those.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new RangeError(`Invalid calendar date "${dateKey}"`);
  }
  return date;
}

export function addCalendarDays(dateKey: string, days: number): string {
  if (!Number.isInteger(days)) {
    throw new RangeError("Calendar-day offset must be an integer");
  }
  const date = fromLocalDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}

/** Monday-start week range, returned as inclusive date-only keys. */
export function getMondayWeekRange(dateKey: string): { start: string; end: string } {
  const date = fromLocalDateKey(dateKey);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  const start = toLocalDateKey(date);
  date.setDate(date.getDate() + 6);
  return { start, end: toLocalDateKey(date) };
}

export function isSameLocalCalendarDay(left: Date, right: Date): boolean {
  return toLocalDateKey(left) === toLocalDateKey(right);
}
