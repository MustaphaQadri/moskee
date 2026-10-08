// Grade colour scale shared by reports, printables and the entry sheet. Pure and
// dependency-free, so it is safe in both Server and Client Components.

// The minimal passing grade. Anything below is failing.
export const PASSING_GRADE = 5.5;

// Mantine text colour for a graded value (used with `c={gradeColor(x)}`).
export function gradeColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "gray";
  if (value >= 9) return "green.9";
  if (value >= 8) return "green.7";
  if (value >= 7) return "green.6";
  if (value >= 6) return "teal.6";
  if (value >= PASSING_GRADE) return "lime.7";
  if (value >= 4.5) return "orange.6";
  if (value >= 3.5) return "red.5";
  return "red.7";
}

// Base Mantine palette name for light-filled badges (`color={gradeBadgeColor(x)}`).
export function gradeBadgeColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return "gray";
  if (value >= 6) return "green";
  if (value >= PASSING_GRADE) return "lime";
  if (value >= 4) return "orange";
  return "red";
}
