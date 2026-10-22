import "server-only";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

// Self-registration links. A manager generates a one-time link for a guardian;
// the parent opens it (public page), fills in their own details and adds
// children. Server-only.

const REGISTRATION_SETTING_ID = "default";
export const DEFAULT_LINK_VALIDITY_DAYS = 30;
export const MIN_LINK_VALIDITY_DAYS = 1;
export const MAX_LINK_VALIDITY_DAYS = 365;
export const DEFAULT_ARCHIVE_RETENTION_MONTHS = 24;
export const MIN_ARCHIVE_RETENTION_MONTHS = 1;
export const MAX_ARCHIVE_RETENTION_MONTHS = 120;

export type RegistrationSettingDTO = {
  linkValidityDays: number;
  archiveRetentionMonths: number;
};

export type RegistrationLinkDTO = {
  token: string;
  url: string;
  expiresAt: string; // ISO
};

export type RegistrationGuardianDTO = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  donationNumber: string | null;
  educationNumber: string | null;
};

export type RegistrationTokenResolution =
  | {
      status: "valid";
      expiresAt: string; // ISO
      guardian: RegistrationGuardianDTO;
    }
  | { status: "expired" | "used" | "unknown" };

// Validity (in days) for links created from now on. Falls back to 30 when the
// setting row does not exist yet.
export async function getRegistrationSetting(): Promise<RegistrationSettingDTO> {
  const setting = await prisma.registrationSetting.findUnique({
    where: { id: REGISTRATION_SETTING_ID },
    select: { linkValidityDays: true, archiveRetentionMonths: true },
  });
  return {
    linkValidityDays: setting?.linkValidityDays ?? DEFAULT_LINK_VALIDITY_DAYS,
    archiveRetentionMonths:
      setting?.archiveRetentionMonths ?? DEFAULT_ARCHIVE_RETENTION_MONTHS,
  };
}

export async function saveRegistrationSetting(input: {
  linkValidityDays: number;
  archiveRetentionMonths: number;
}): Promise<RegistrationSettingDTO> {
  const setting = await prisma.registrationSetting.upsert({
    where: { id: REGISTRATION_SETTING_ID },
    update: input,
    create: { id: REGISTRATION_SETTING_ID, ...input },
    select: { linkValidityDays: true, archiveRetentionMonths: true },
  });
  return {
    linkValidityDays: setting.linkValidityDays,
    archiveRetentionMonths: setting.archiveRetentionMonths,
  };
}

// Generate a fresh link and revoke any unused links the guardian already has.
export async function createRegistrationLink(
  guardianId: string,
  createdById: string | null,
): Promise<RegistrationLinkDTO> {
  const { linkValidityDays } = await getRegistrationSetting();
  const expiresAt = new Date(
    Date.now() + linkValidityDays * 24 * 60 * 60 * 1000,
  );
  const token = randomBytes(32).toString("base64url");

  await prisma.$transaction([
    prisma.guardianRegistrationToken.deleteMany({
      where: { guardianId, usedAt: null },
    }),
    prisma.guardianRegistrationToken.create({
      data: { guardianId, token, expiresAt, createdById },
    }),
  ]);

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    url: await buildRegistrationUrl(token),
  };
}

// The current usable link (if any), for display on the guardian detail page.
export async function getActiveRegistrationLink(
  guardianId: string,
): Promise<RegistrationLinkDTO | null> {
  const link = await prisma.guardianRegistrationToken.findFirst({
    where: {
      guardianId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: { token: true, expiresAt: true },
  });

  if (!link) {
    return null;
  }

  return {
    token: link.token,
    expiresAt: link.expiresAt.toISOString(),
    url: await buildRegistrationUrl(link.token),
  };
}

// Resolve a token for the public page. Only a valid token reveals guardian
// details; used/expired/unknown tokens deliberately return no personal data.
export async function resolveRegistrationToken(
  token: string,
): Promise<RegistrationTokenResolution> {
  const row = await prisma.guardianRegistrationToken.findUnique({
    where: { token },
    select: {
      expiresAt: true,
      usedAt: true,
      guardian: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          address: true,
          donationNumber: true,
          educationNumber: true,
        },
      },
    },
  });

  if (!row) {
    return { status: "unknown" };
  }
  if (row.usedAt) {
    return { status: "used" };
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return { status: "expired" };
  }

  return {
    status: "valid",
    expiresAt: row.expiresAt.toISOString(),
    guardian: row.guardian,
  };
}

// Absolute URL for the public form. Uses the request host (behind the proxy)
// so generated links work both locally and on the VPS; BETTER_AUTH_URL is the
// fallback when no host header is available.
async function buildRegistrationUrl(token: string): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const forwardedProto = headerList.get("x-forwarded-proto");
  const proto =
    forwardedProto ??
    (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");

  const base = host
    ? `${proto}://${host}`
    : (process.env.BETTER_AUTH_URL ?? "http://localhost:3000");

  return new URL(`/register/${token}`, base).toString();
}
