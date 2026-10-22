// Helpers for `@db.Date` columns. Dates are stored at UTC midnight so that a
// date-only value is stable regardless of server timezone.

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

// UTC date for "today", independent of the server timezone.
export function todayDateOnly(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

// Adds calendar months, clamping the day to the last day of the target month
// (e.g. 31 Jan + 1 month => 28/29 Feb). Used for archive deletion dates.
export function addMonths(value: Date, months: number): Date {
  const result = new Date(value.getTime());
  const day = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

// Adds months to an ISO yyyy-mm-dd date and returns the same format.
export function addMonthsToDateOnly(value: string, months: number): string {
  return toDateOnly(addMonths(parseDateOnly(value), months))!;
}
