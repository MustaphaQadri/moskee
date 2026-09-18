"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { parseDateOnly, toDateOnly } from "@/lib/dates";

// Manager-only CRUD for academic years. A year owns terms (periods); grades
// hang off terms, so deletion is blocked while graded terms exist.

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

const name = z.string().trim().min(1).max(100);

const createSchema = z.object({
  name,
  startDate: dateOnly.nullish(),
  endDate: dateOnly.nullish(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name,
  startDate: dateOnly.nullable(),
  endDate: dateOnly.nullable(),
});

export type AcademicYearDTO = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
};

function toDTO(year: {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean;
}): AcademicYearDTO {
  return {
    id: year.id,
    name: year.name,
    startDate: toDateOnly(year.startDate),
    endDate: toDateOnly(year.endDate),
    isCurrent: year.isCurrent,
  };
}

export async function createAcademicYear(input: unknown): Promise<AcademicYearDTO> {
  const parsed = createSchema.parse(input);
  await requireManager();

  const year = await prisma.academicYear.create({
    data: {
      name: parsed.name,
      startDate: parsed.startDate ? parseDateOnly(parsed.startDate) : null,
      endDate: parsed.endDate ? parseDateOnly(parsed.endDate) : null,
    },
  });
  return toDTO(year);
}

export async function updateAcademicYear(input: unknown): Promise<AcademicYearDTO> {
  const parsed = updateSchema.parse(input);
  await requireManager();

  const year = await prisma.academicYear.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      startDate: parsed.startDate ? parseDateOnly(parsed.startDate) : null,
      endDate: parsed.endDate ? parseDateOnly(parsed.endDate) : null,
    },
  });
  return toDTO(year);
}

// Exactly one current year: unset the previous one in the same transaction.
export async function setCurrentAcademicYear(input: unknown): Promise<void> {
  const { id } = z.object({ id: z.string().min(1) }).parse(input);
  await requireManager();

  await prisma.$transaction([
    prisma.academicYear.updateMany({
      where: { isCurrent: true, NOT: { id } },
      data: { isCurrent: false },
    }),
    prisma.academicYear.update({ where: { id }, data: { isCurrent: true } }),
  ]);
}

export async function deleteAcademicYear(input: unknown): Promise<void> {
  const { id } = z.object({ id: z.string().min(1) }).parse(input);
  await requireManager();

  const [grades, donations] = await Promise.all([
    prisma.grade.count({ where: { term: { academicYearId: id } } }),
    prisma.studentDonation.count({ where: { academicYearId: id } }),
  ]);
  if (grades > 0) {
    throw new Error("Cannot delete an academic year that has grades");
  }
  if (donations > 0) {
    throw new Error("Cannot delete an academic year that has donations");
  }

  await prisma.academicYear.delete({ where: { id } });
}
