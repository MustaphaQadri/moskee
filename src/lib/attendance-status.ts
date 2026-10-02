// Client-safe attendance status metadata. Mirrors the Prisma `AttendanceStatus`
// enum but avoids importing the generated client into Client Components.

export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "LATE",
  "VERY_LATE",
  "ABSENT",
  "EXCUSED",
] as const;

export type AttendanceStatusValue = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_LABELS: Record<AttendanceStatusValue, string> = {
  PRESENT: "Aanwezig",
  LATE: "Te laat",
  VERY_LATE: "Erg laat",
  ABSENT: "Afwezig",
  EXCUSED: "Geoorloofd afwezig",
};

// Short labels for compact controls (segmented control).
export const ATTENDANCE_SHORT_LABELS: Record<AttendanceStatusValue, string> = {
  PRESENT: "Aanwezig",
  LATE: "Te laat",
  VERY_LATE: "Erg laat",
  ABSENT: "Afwezig",
  EXCUSED: "Geoorloofd",
};

// Mantine color names for badges.
export const ATTENDANCE_BADGE_COLORS: Record<AttendanceStatusValue, string> = {
  PRESENT: "green",
  LATE: "yellow",
  VERY_LATE: "orange",
  ABSENT: "red",
  EXCUSED: "blue",
};

// CSS colors for the chart swatches / strokes.
export const ATTENDANCE_COLORS: Record<AttendanceStatusValue, string> = {
  PRESENT: "var(--mantine-color-green-6)",
  LATE: "var(--mantine-color-yellow-6)",
  VERY_LATE: "var(--mantine-color-orange-6)",
  ABSENT: "var(--mantine-color-red-6)",
  EXCUSED: "var(--mantine-color-blue-5)",
};
