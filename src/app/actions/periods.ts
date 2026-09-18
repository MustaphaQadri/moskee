"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { parseDateOnly, toDateOnly } from "@/lib/dates";
import type { TermDTO } from "@/lib/grades";

// Manager-only CRUD for terms ("periods" in the UI). A term owns grades, so it
// cannot be deleted while graded.

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

const createSchema = z.object({
  academicYearId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().min(1),
  startDate: dateOnly.nullish(),
  endDate: dateOnly.nullish(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().min(1),
  startDate: dateOnly.nullable(),
  endDate: dateOnly.nullable(),
});

function toDTO(term: {
  id: string;
  name: string;
  sortOrder: number;
  startDate: Date | null;
  endDate: Date | null;
}): TermDTO {
  return {
    id: term.id,
    name: term.name,
    sortOrder: term.sortOrder,
    startDate: toDateOnly(term.startDate),
    endDate: toDateOnly(term.endDate),
  };
}

export async function createTerm(input: unknown): Promise<TermDTO> {
  const parsed = createSchema.parse(input);
  await requireManager();

  const term = await prisma.term.create({
    data: {
      academicYearId: parsed.academicYearId,
      name: parsed.name,
      sortOrder: parsed.sortOrder,
      startDate: parsed.startDate ? parseDateOnly(parsed.startDate) : null,
      endDate: parsed.endDate ? parseDateOnly(parsed.endDate) : null,
    },
  });
  return toDTO(term);
}

export async function updateTerm(input: unknown): Promise<TermDTO> {
  const parsed = updateSchema.parse(input);
  await requireManager();

  const term = await prisma.term.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      sortOrder: parsed.sortOrder,
      startDate: parsed.startDate ? parseDateOnly(parsed.startDate) : null,
      endDate: parsed.endDate ? parseDateOnly(parsed.endDate) : null,
    },
  });
  return toDTO(term);
}

// Reorder all terms of a year. Runs in two passes (negative, then final) so the
// (academicYearId, sortOrder) unique constraint is never transiently violated.
export async function reorderTerms(input: unknown): Promise<void> {
  const { academicYearId, orderedIds } = z
    .object({
      academicYearId: z.string().min(1),
      orderedIds: z.array(z.string().min(1)).min(1),
    })
    .parse(input);
  await requireManager();

  const count = await prisma.term.count({ where: { academicYearId } });
  if (count !== orderedIds.length) {
    throw new Error("orderedIds must contain every term of the academic year");
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.term.update({
        where: { id: orderedIds[i] },
        data: { sortOrder: -(i + 1) },
      });
    }
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.term.update({
        where: { id: orderedIds[i] },
        data: { sortOrder: i + 1 },
      });
    }
  });
}

export async function deleteTerm(input: unknown): Promise<void> {
  const { id } = z.object({ id: z.string().min(1) }).parse(input);
  await requireManager();

  const grades = await prisma.grade.count({ where: { termId: id } });
  if (grades > 0) {
    throw new Error("Cannot delete a term that has grades");
  }

  await prisma.term.delete({ where: { id } });
}
