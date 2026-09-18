"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import type { SubjectDTO } from "@/lib/grades";

// Manager-only CRUD for subjects. Subjects are scoped to a level ("Math" exists
// once per level). A subject with grades cannot be deleted.

const createSchema = z.object({
  levelId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().nullish(),
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().nullable(),
  isActive: z.boolean(),
});

function toDTO(subject: {
  id: string;
  name: string;
  sortOrder: number | null;
  isActive: boolean;
}): SubjectDTO {
  return {
    id: subject.id,
    name: subject.name,
    sortOrder: subject.sortOrder,
    isActive: subject.isActive,
  };
}

export async function createSubject(input: unknown): Promise<SubjectDTO> {
  const parsed = createSchema.parse(input);
  await requireManager();

  const subject = await prisma.subject.create({
    data: {
      levelId: parsed.levelId,
      name: parsed.name,
      sortOrder: parsed.sortOrder ?? null,
      isActive: parsed.isActive ?? true,
    },
  });
  return toDTO(subject);
}

export async function updateSubject(input: unknown): Promise<SubjectDTO> {
  const parsed = updateSchema.parse(input);
  await requireManager();

  const subject = await prisma.subject.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      sortOrder: parsed.sortOrder,
      isActive: parsed.isActive,
    },
  });
  return toDTO(subject);
}

// Subjects have no unique sortOrder, so a single pass is enough.
export async function reorderSubjects(input: unknown): Promise<void> {
  const { orderedIds } = z
    .object({ orderedIds: z.array(z.string().min(1)).min(1) })
    .parse(input);
  await requireManager();

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.subject.update({ where: { id }, data: { sortOrder: index + 1 } }),
    ),
  );
}

export async function deleteSubject(input: unknown): Promise<void> {
  const { id } = z.object({ id: z.string().min(1) }).parse(input);
  await requireManager();

  const grades = await prisma.grade.count({ where: { subjectId: id } });
  if (grades > 0) {
    throw new Error("Cannot delete a subject that has grades");
  }

  await prisma.subject.delete({ where: { id } });
}
