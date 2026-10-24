import type { DonationCategory } from "@/generated/prisma/enums";

// Shared donation labels/colors and derived-status helpers. Plain module (no
// server-only import) so both server and client components can use it.

export type DonationStatus = "PAID" | "PARTIAL" | "UNPAID" | "EXEMPT";

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  PAID: "Betaald",
  PARTIAL: "Deels betaald",
  UNPAID: "Niet betaald",
  EXEMPT: "Vrijgesteld",
};

export const DONATION_STATUS_COLORS: Record<DonationStatus, string> = {
  PAID: "green",
  PARTIAL: "orange",
  UNPAID: "red",
  EXEMPT: "gray",
};

// CSS colors for chart swatches / strokes.
export const DONATION_COLORS: Record<DonationStatus, string> = {
  PAID: "var(--mantine-color-green-5)",
  PARTIAL: "var(--mantine-color-orange-5)",
  UNPAID: "var(--mantine-color-red-5)",
  EXEMPT: "var(--mantine-color-gray-4)",
};

export const DONATION_CATEGORY_LABELS: Record<DonationCategory, string> = {
  FULL: "Verschuldigd",
  REDUCED: "Deels verschuldigd",
  EXEMPT: "Vrijgesteld",
};

export const DONATION_CATEGORY_COLORS: Record<DonationCategory, string> = {
  FULL: "blue",
  REDUCED: "orange",
  EXEMPT: "gray",
};

// Derive status from expected vs paid. Kept as a single source of truth.
export function statusOf(expected: number, paid: number): DonationStatus {
  if (expected <= 0) return "EXEMPT";
  if (paid >= expected) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "UNPAID";
}

// Green (fully paid) → red (nothing paid); neutral for exempt expectations.
export function paidRatioColor(paid: number, expected: number): string {
  if (expected <= 0) return "gray";
  const ratio = Math.min(paid / expected, 1);
  if (ratio >= 1) return "green";
  if (ratio >= 0.66) return "lime";
  if (ratio >= 0.34) return "yellow";
  if (ratio > 0) return "orange";
  return "red";
}
