"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { optionalInt } from "@/lib/validation";

// Manager-only CRUD for subjects. Subjects are scoped to a level ("Math" exists
// once per level). A subject with grades cannot be deleted.

const name = z.string().trim().min(1, "Naam is verplicht").max(100);

const createSchema = z.object({
  levelId: z.string().min(1),
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

const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

async function assertNameFree(levelId: string, nameValue: string, excludeId?: string) {
  const clash = await prisma.subject.findFirst({
    where: {
      levelId,
      name: nameValue,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (clash) throw new ActionError("Dit vak bestaat al voor dit niveau");
}

export async function createSubject(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireManager();
  try {
    const parsed = createSchema.parse(input);
    await assertNameFree(parsed.levelId, parsed.name);

    const subject = await prisma.subject.create({
      data: {
        levelId: parsed.levelId,
        name: parsed.name,
        sortOrder: parsed.sortOrder ?? null,
        isActive: parsed.isActive ?? true,
      },
      select: { id: true },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: { id: subject.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateSubject(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = updateSchema.parse(input);

    const existing = await prisma.subject.findUnique({
      where: { id: parsed.id },
      select: { levelId: true },
    });
    if (!existing) throw new ActionError("Vak niet gevonden");
    await assertNameFree(existing.levelId, parsed.name, parsed.id);

    await prisma.subject.update({
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

// Subjects have no unique sortOrder, so a single pass is enough.
export async function reorderSubjects(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const { orderedIds } = reorderSchema.parse(input);

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.subject.update({ where: { id }, data: { sortOrder: index + 1 } }),
      ),
    );

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteSubject(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = deleteSchema.parse(input);

    const grades = await prisma.grade.count({ where: { subjectId: parsed.id } });
    if (grades > 0) {
      throw new ActionError("Kan een vak met cijfers niet verwijderen");
    }

    await prisma.subject.delete({ where: { id: parsed.id } });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
