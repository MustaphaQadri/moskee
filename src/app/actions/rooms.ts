"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { optionalInt, optionalText } from "@/lib/validation";

// Manager-only CRUD for physical classrooms (rooms).

const createSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht").max(100),
  capacity: optionalInt(0),
  description: optionalText(500),
});
const updateSchema = createSchema.extend({ id: z.string().min(1) });
const deleteSchema = z.object({ id: z.string().min(1) });

async function assertNameFree(nameValue: string, excludeId?: string) {
  const clash = await prisma.room.findFirst({
    where: { name: nameValue, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new ActionError("Er bestaat al een lokaal met deze naam");
}

export async function createRoom(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireManager();
  try {
    const parsed = createSchema.parse(input);
    await assertNameFree(parsed.name);

    const room = await prisma.room.create({
      data: {
        name: parsed.name,
        capacity: parsed.capacity ?? null,
        description: parsed.description,
      },
      select: { id: true },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: { id: room.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateRoom(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = updateSchema.parse(input);
    await assertNameFree(parsed.name, parsed.id);

    await prisma.room.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        capacity: parsed.capacity ?? null,
        description: parsed.description,
      },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteRoom(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = deleteSchema.parse(input);
    // Classes reference the room with onDelete: SetNull — safe to delete.
    await prisma.room.delete({ where: { id: parsed.id } });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
