"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";

// Manager-only CRUD for classes. A class belongs to a level and runs in one or
// more timeslots.

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const createSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht").max(120),
  description: optionalText(500),
  levelId: z.string().min(1, "Niveau is verplicht"),
  roomId: z.string().min(1).nullish(),
  teacherId: z.string().min(1).nullish(),
  sessionIds: z.array(z.string().min(1)).min(1, "Kies minstens één tijdslot"),
});

const updateSchema = createSchema.extend({ id: z.string().min(1) });
const deleteSchema = z.object({ id: z.string().min(1) });

async function assertReferences(levelId: string, roomId?: string | null, teacherId?: string | null) {
  const level = await prisma.level.findUnique({
    where: { id: levelId },
    select: { id: true },
  });
  if (!level) throw new ActionError("Niveau niet gevonden");

  if (roomId) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true },
    });
    if (!room) throw new ActionError("Lokaal niet gevonden");
  }

  if (teacherId) {
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { id: true },
    });
    if (!teacher) throw new ActionError("Docent niet gevonden");
  }
}

export async function createClass(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireManager();
  try {
    const parsed = createSchema.parse(input);
    await assertReferences(parsed.levelId, parsed.roomId, parsed.teacherId);

    const schoolClass = await prisma.schoolClass.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        levelId: parsed.levelId,
        roomId: parsed.roomId ?? null,
        teacherId: parsed.teacherId ?? null,
        sessions: {
          create: parsed.sessionIds.map((sessionId) => ({ sessionId })),
        },
      },
      select: { id: true },
    });

    revalidatePath("/dashboard/classes");
    return { ok: true, data: { id: schoolClass.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateClass(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = updateSchema.parse(input);
    await assertReferences(parsed.levelId, parsed.roomId, parsed.teacherId);

    await prisma.schoolClass.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        description: parsed.description,
        levelId: parsed.levelId,
        roomId: parsed.roomId ?? null,
        teacherId: parsed.teacherId ?? null,
        sessions: {
          deleteMany: {},
          create: parsed.sessionIds.map((sessionId) => ({ sessionId })),
        },
      },
    });

    revalidatePath("/dashboard/classes");
    revalidatePath(`/dashboard/classes/${parsed.id}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteClass(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = deleteSchema.parse(input);
    // Cascades enrollments (and attendance/grades if any).
    await prisma.schoolClass.delete({ where: { id: parsed.id } });

    revalidatePath("/dashboard/classes");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
