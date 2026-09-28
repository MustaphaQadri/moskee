"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { optionalInt } from "@/lib/validation";

// Manager-only CRUD for competencies ("vaardigheden") within a subject. These
// are the units that get graded.

const name = z.string().trim().min(1, "Naam is verplicht").max(150);

const createSchema = z.object({
  subjectId: z.string().min(1),
  name,
  sortOrder: optionalInt(0),
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name,
  sortOrder: optionalInt(0),
  isActive: z.boolean(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

async function assertNameFree(subjectId: string, nameValue: string, excludeId?: string) {
  const clash = await prisma.competency.findFirst({
    where: {
      subjectId,
      name: nameValue,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (clash) throw new ActionError("Deze vaardigheid bestaat al voor dit vak");
}

export async function createCompetency(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireManager();
  try {
    const parsed = createSchema.parse(input);
    await assertNameFree(parsed.subjectId, parsed.name);

    const competency = await prisma.competency.create({
      data: {
        subjectId: parsed.subjectId,
        name: parsed.name,
        sortOrder: parsed.sortOrder ?? null,
        isActive: parsed.isActive ?? true,
      },
      select: { id: true },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: { id: competency.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateCompetency(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = updateSchema.parse(input);

    const existing = await prisma.competency.findUnique({
      where: { id: parsed.id },
      select: { subjectId: true },
    });
    if (!existing) throw new ActionError("Vaardigheid niet gevonden");
    await assertNameFree(existing.subjectId, parsed.name, parsed.id);

    await prisma.competency.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        sortOrder: parsed.sortOrder ?? null,
        isActive: parsed.isActive,
      },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteCompetency(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = deleteSchema.parse(input);
    // Competencies are not referenced by stored grades yet; safe to delete.
    await prisma.competency.delete({ where: { id: parsed.id } });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
