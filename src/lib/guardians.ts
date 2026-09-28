import "server-only";

import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import type { Sex } from "@/generated/prisma/enums";

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
  studentCount: number;
};

export type GuardianStudentDTO = {
  id: string;
  firstName: string;
  lastName: string;
  sex: Sex | null;
  dateOfBirth: string | null; // ISO yyyy-mm-dd
  relation: string | null;
  isPrimary: boolean;
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
  createdAt: string; // ISO
  students: GuardianStudentDTO[];
};

const SEARCH_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "donationNumber",
  "educationNumber",
] as const;

// List/search guardians. `search` matches name, email, phone or either number.
export async function listGuardians(params: {
  search?: string;
} = {}): Promise<GuardianListItemDTO[]> {
  const search = params.search?.trim();

  const guardians = await prisma.guardian.findMany({
    where: search
      ? {
          OR: SEARCH_FIELDS.map((field) => ({
            [field]: { contains: search, mode: "insensitive" as const },
          })),
        }
      : undefined,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      donationNumber: true,
      educationNumber: true,
      _count: { select: { children: true } },
    },
  });

  return guardians.map((guardian) => ({
    id: guardian.id,
    firstName: guardian.firstName,
    lastName: guardian.lastName,
    email: guardian.email,
    phone: guardian.phone,
    donationNumber: guardian.donationNumber,
    educationNumber: guardian.educationNumber,
    studentCount: guardian._count.children,
  }));
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
      createdAt: true,
      children: {
        orderBy: [{ isPrimary: "desc" }, { student: { firstName: "asc" } }],
        select: {
          relation: true,
          isPrimary: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              sex: true,
              dateOfBirth: true,
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
    createdAt: guardian.createdAt.toISOString(),
    students: guardian.children.map((link) => ({
      id: link.student.id,
      firstName: link.student.firstName,
      lastName: link.student.lastName,
      sex: link.student.sex,
      dateOfBirth: toDateOnly(link.student.dateOfBirth),
      relation: link.relation,
      isPrimary: link.isPrimary,
    })),
  };
}
