export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new RangeError(`Invalid local date: ${value}`);
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new RangeError(`Invalid local date: ${value}`);
  }
  return date;
}

export function isLocalDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    parseLocalDate(value);
    return true;
  } catch {
    return false;
  }
}

export function localDateParam(value: unknown, fallback: string): string {
  return isLocalDateString(value) ? value : fallback;
}

export function addDays(value: string, days: number): string {
  if (!Number.isInteger(days)) {
    throw new RangeError("The number of days must be an integer.");
  }
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

export function dayOfWeek(value: string): number {
  return parseLocalDate(value).getDay();
}

export function startOfWeekMonday(value: string): string {
  return addDays(value, -((dayOfWeek(value) + 6) % 7));
}

export function daysBetween(start: string, end: string): number {
  const toUtcDay = (value: string) => {
    const date = parseLocalDate(value);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };
  return Math.round((toUtcDay(end) - toUtcDay(start)) / 86_400_000);
}
