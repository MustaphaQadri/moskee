import type { GuardianStatus } from "@/generated/prisma/enums";

export const GUARDIAN_STATUSES = ["ACTIVE", "ARCHIVED"] as const;

export const GUARDIAN_STATUS_LABELS: Record<GuardianStatus, string> = {
  ACTIVE: "Actief",
  ARCHIVED: "Gearchiveerd",
};

export const GUARDIAN_STATUS_COLORS: Record<GuardianStatus, string> = {
  ACTIVE: "green",
  ARCHIVED: "gray",
};

export function isGuardianStatus(value: unknown): value is GuardianStatus {
  return (GUARDIAN_STATUSES as readonly string[]).includes(value as string);
}
