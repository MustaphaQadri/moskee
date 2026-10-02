// Small helpers for sorting already-fetched rows by a column. Empty/null values
// always sort last, regardless of direction.

export type SortDir = "asc" | "desc";

export function isSortDir(value: unknown): value is SortDir {
  return value === "asc" || value === "desc";
}

export function sortRows<T>(
  rows: T[],
  dir: SortDir,
  value: (row: T) => string | number | null,
): T[] {
  const mul = dir === "desc" ? -1 : 1;

  return [...rows].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    const aEmpty = av === null || av === "";
    const bEmpty = bv === null || bv === "";

    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    if (typeof av === "number" && typeof bv === "number") {
      return mul * (av - bv);
    }
    return mul * String(av).localeCompare(String(bv), "nl");
  });
}
