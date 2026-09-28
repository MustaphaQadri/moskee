"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { optionalInt } from "@/lib/validation";

// Manager-only CRUD for teaching levels (e.g. "Beginners", "Groep 1").

const name = z.string().trim().min(1, "Naam is verplicht").max(100);

const createSchema = z.object({ name, sortOrder: optionalInt(0) });
const updateSchema = z.object({
  id: z.string().min(1),
  name,
  sortOrder: optionalInt(0),
});
const deleteSchema = z.object({ id: z.string().min(1) });

async function assertNameFree(nameValue: string, excludeId?: string) {
  const clash = await prisma.level.findFirst({
    where: { name: nameValue, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new ActionError("Er bestaat al een niveau met deze naam");
}

export async function createLevel(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireManager();
  try {
    const parsed = createSchema.parse(input);
    await assertNameFree(parsed.name);

    const level = await prisma.level.create({
      data: { name: parsed.name, sortOrder: parsed.sortOrder ?? null },
      select: { id: true },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: { id: level.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateLevel(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = updateSchema.parse(input);
    await assertNameFree(parsed.name, parsed.id);

    await prisma.level.update({
      where: { id: parsed.id },
      data: { name: parsed.name, sortOrder: parsed.sortOrder ?? null },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteLevel(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = deleteSchema.parse(input);

    const [classes, subjects] = await Promise.all([
      prisma.schoolClass.count({ where: { levelId: parsed.id } }),
      prisma.subject.count({ where: { levelId: parsed.id } }),
    ]);
    if (classes > 0 || subjects > 0) {
      throw new ActionError(
        "Kan een niveau met klassen of vakken niet verwijderen",
      );
    }

    await prisma.level.delete({ where: { id: parsed.id } });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
