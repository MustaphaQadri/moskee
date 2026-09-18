// Helpers for `@db.Date` columns. Dates are stored at UTC midnight so that a
// date-only value is stable regardless of server timezone.

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}
