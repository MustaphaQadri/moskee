import "server-only";

import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import { sortRows, type SortDir } from "@/lib/sort";
import type { PersonSearchBy } from "@/lib/search";
import type { Prisma } from "@/generated/prisma/client";
import type { GuardianStatus, Sex } from "@/generated/prisma/enums";

// Data access for guardians and their students. Server-only: import these in
// Server Components and Server Actions, never in Client Components. Return
// DTOs (only the fields the client needs).

export type GuardianListItemDTO = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  donationNumber: string | null;
  educationNumber: string | null;
  status: GuardianStatus;
  enrolledAt: string | null; // ISO yyyy-mm-dd
  archivedAt: string | null; // ISO yyyy-mm-dd
  studentCount: number;
  students: { id: string; firstName: string; lastName: string }[];
};

export type GuardianStudentDTO = {
  id: string;
  firstName: string;
  lastName: string;
  sex: Sex | null;
  dateOfBirth: string | null; // ISO yyyy-mm-dd
  relation: string | null;
  image: string | null;
};

export type GuardianDetailDTO = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  donationNumber: string | null;
  educationNumber: string | null;
  status: GuardianStatus;
  enrolledAt: string | null; // ISO yyyy-mm-dd
  archivedAt: string | null; // ISO yyyy-mm-dd
  createdAt: string; // ISO
  students: GuardianStudentDTO[];
};

const SEARCH_FIELDS = [
  "firstName",
  "lastName",
  "donationNumber",
  "educationNumber",
] as const;

export const GUARDIAN_SORT_KEYS = [
  "name",
  "email",
  "phone",
  "donationNumber",
  "educationNumber",
  "studentCount",
  "enrolledAt",
  "archivedAt",
] as const;

export type GuardianSortKey = (typeof GUARDIAN_SORT_KEYS)[number];

export function isGuardianSortKey(value: unknown): value is GuardianSortKey {
  return (GUARDIAN_SORT_KEYS as readonly string[]).includes(value as string);
}

function guardianSortValue(
  guardian: GuardianListItemDTO,
  key: GuardianSortKey,
): string | number | null {
  switch (key) {
    case "name":
      return `${guardian.lastName} ${guardian.firstName}`;
    case "studentCount":
      return guardian.studentCount;
    case "enrolledAt":
      return guardian.enrolledAt;
    case "archivedAt":
      return guardian.archivedAt;
    default:
      return guardian[key];
  }
}

// List/search guardians. `search` matches first/last name, chart number
// (donationNumber) or education number only.
// `hasEducationNumber` filters on presence of the (auto-assigned) education
// number.
export async function listGuardians(params: {
  search?: string;
  searchBy?: PersonSearchBy;
  sort?: GuardianSortKey;
  dir?: SortDir;
  hasEducationNumber?: boolean;
  status?: GuardianStatus;
} = {}): Promise<GuardianListItemDTO[]> {
  const search = params.search?.trim();
  const searchBy = params.searchBy ?? "all";

  const searchWhere: Prisma.GuardianWhereInput | null = search
    ? searchBy === "chart"
      ? { donationNumber: { contains: search, mode: "insensitive" } }
      : searchBy === "education"
        ? { educationNumber: { contains: search, mode: "insensitive" } }
        : {
            OR: SEARCH_FIELDS.map((field) => ({
              [field]: { contains: search, mode: "insensitive" as const },
            })),
          }
    : null;

  const where: Prisma.GuardianWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(searchWhere ?? {}),
    ...(params.hasEducationNumber === true
      ? { educationNumber: { not: null } }
      : {}),
    ...(params.hasEducationNumber === false
      ? { educationNumber: null }
      : {}),
  };

  const guardians = await prisma.guardian.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      donationNumber: true,
      educationNumber: true,
      status: true,
      enrolledAt: true,
      archivedAt: true,
      children: {
        select: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  const rows = guardians.map((guardian) => {
    const students = guardian.children.map((link) => link.student);
    return {
      id: guardian.id,
      firstName: guardian.firstName,
      lastName: guardian.lastName,
      email: guardian.email,
      phone: guardian.phone,
      donationNumber: guardian.donationNumber,
      educationNumber: guardian.educationNumber,
      status: guardian.status,
      enrolledAt: toDateOnly(guardian.enrolledAt),
      archivedAt: toDateOnly(guardian.archivedAt),
      studentCount: students.length,
      students,
    };
  });

  return sortRows(rows, params.dir ?? "asc", (guardian) =>
    guardianSortValue(guardian, params.sort ?? "name"),
  );
}

// Smallest positive integer education number that no guardian uses yet.
// Non-numeric values (legacy/free text) are ignored for numbering.
export async function pickNextEducationNumber(
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> {
  const rows = await db.guardian.findMany({
    select: { educationNumber: true },
  });

  const used = new Set<number>();
  for (const row of rows) {
    if (!row.educationNumber) continue;
    const value = Number(row.educationNumber);
    if (Number.isInteger(value) && value > 0) {
      used.add(value);
    }
  }

  let next = 1;
  while (used.has(next)) {
    next += 1;
  }
  return String(next);
}

// One guardian with all linked students (and the relation of each link).
export async function getGuardianDetail(
  id: string,
): Promise<GuardianDetailDTO | null> {
  const guardian = await prisma.guardian.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      donationNumber: true,
      educationNumber: true,
      status: true,
      enrolledAt: true,
      archivedAt: true,
      createdAt: true,
      children: {
        orderBy: { student: { firstName: "asc" } },
        select: {
          relation: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              sex: true,
              dateOfBirth: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!guardian) return null;

  return {
    id: guardian.id,
    firstName: guardian.firstName,
    lastName: guardian.lastName,
    email: guardian.email,
    phone: guardian.phone,
    address: guardian.address,
    donationNumber: guardian.donationNumber,
    educationNumber: guardian.educationNumber,
    status: guardian.status,
    enrolledAt: toDateOnly(guardian.enrolledAt),
    archivedAt: toDateOnly(guardian.archivedAt),
    createdAt: guardian.createdAt.toISOString(),
    students: guardian.children.map((link) => ({
      id: link.student.id,
      firstName: link.student.firstName,
      lastName: link.student.lastName,
      sex: link.student.sex,
      dateOfBirth: toDateOnly(link.student.dateOfBirth),
      relation: link.relation,
      image: link.student.image,
    })),
  };
}
