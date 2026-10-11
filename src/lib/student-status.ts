import type { StudentStatus } from "@/generated/prisma/enums";

// Shared labels/colors for a student's lifecycle state. Plain module (no
// server-only import) so both server and client components can use it.

export const STUDENT_STATUSES = ["WAITING_LIST", "ACTIVE", "ARCHIVED"] as const;

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  WAITING_LIST: "Wachtlijst",
  ACTIVE: "Actief",
  ARCHIVED: "Gearchiveerd",
};

export const STUDENT_STATUS_COLORS: Record<StudentStatus, string> = {
  WAITING_LIST: "yellow",
  ACTIVE: "green",
  ARCHIVED: "gray",
};

export function isStudentStatus(value: unknown): value is StudentStatus {
  return (
    typeof value === "string" &&
    (STUDENT_STATUSES as readonly string[]).includes(value)
  );
}
