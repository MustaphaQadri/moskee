"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { optionalText, optionalTime } from "@/lib/validation";

// Manager-only CRUD for weekend timeslots (ClassSession). The 6 defaults are
// seeded; managers can add more.

const createSchema = z.object({
  label: z.string().trim().min(1, "Naam is verplicht").max(100),
  day: optionalText(20),
  startTime: optionalTime,
  endTime: optionalTime,
});
const updateSchema = createSchema.extend({ id: z.string().min(1) });
const deleteSchema = z.object({ id: z.string().min(1) });

async function assertLabelFree(label: string, excludeId?: string) {
  const clash = await prisma.classSession.findFirst({
    where: { label, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new ActionError("Er bestaat al een tijdslot met deze naam");
}

export async function createSession(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireManager();
  try {
    const parsed = createSchema.parse(input);
    await assertLabelFree(parsed.label);

    const session = await prisma.classSession.create({
      data: {
        label: parsed.label,
        day: parsed.day,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
      },
      select: { id: true },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: { id: session.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateSession(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = updateSchema.parse(input);
    await assertLabelFree(parsed.label, parsed.id);

    await prisma.classSession.update({
      where: { id: parsed.id },
      data: {
        label: parsed.label,
        day: parsed.day,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
      },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteSession(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = deleteSchema.parse(input);

    const [attendance, classLinks] = await Promise.all([
      prisma.attendance.count({ where: { sessionId: parsed.id } }),
      prisma.schoolClassSession.count({ where: { sessionId: parsed.id } }),
    ]);
    if (attendance > 0) {
      throw new ActionError("Kan een tijdslot met aanwezigheid niet verwijderen");
    }
    if (classLinks > 0) {
      throw new ActionError("Dit tijdslot is nog aan klassen gekoppeld");
    }

    await prisma.classSession.delete({ where: { id: parsed.id } });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
