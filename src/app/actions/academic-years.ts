"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { parseDateOnly } from "@/lib/dates";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { optionalDate } from "@/lib/validation";

// Manager-only CRUD for academic years. Terms (periods) are global; a year owns
// the grades and donations recorded in it.

const name = z.string().trim().min(1, "Naam is verplicht").max(100);

const createSchema = z.object({
  name,
  startDate: optionalDate,
  endDate: optionalDate,
});

const updateSchema = z.object({
  id: z.string().min(1),
  name,
  startDate: optionalDate,
  endDate: optionalDate,
});

async function assertNameFree(nameValue: string, excludeId?: string) {
  const clash = await prisma.academicYear.findFirst({
    where: { name: nameValue, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new ActionError("Er bestaat al een schooljaar met deze naam");
}

function parseBounds(startDate?: string | null, endDate?: string | null) {
  return {
    startDate: startDate ? parseDateOnly(startDate) : null,
    endDate: endDate ? parseDateOnly(endDate) : null,
  };
}

export async function createAcademicYear(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireManager();
  try {
    const parsed = createSchema.parse(input);
    await assertNameFree(parsed.name);

    const year = await prisma.academicYear.create({
      data: {
        name: parsed.name,
        ...parseBounds(parsed.startDate, parsed.endDate),
      },
      select: { id: true },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: { id: year.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateAcademicYear(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = updateSchema.parse(input);
    await assertNameFree(parsed.name, parsed.id);

    await prisma.academicYear.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        ...parseBounds(parsed.startDate, parsed.endDate),
      },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// Exactly one current year: unset the previous one in the same transaction.
export async function setCurrentAcademicYear(
  input: unknown,
): Promise<ActionResult> {
  await requireManager();
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(input);

    await prisma.$transaction([
      prisma.academicYear.updateMany({
        where: { isCurrent: true, NOT: { id } },
        data: { isCurrent: false },
      }),
      prisma.academicYear.update({ where: { id }, data: { isCurrent: true } }),
    ]);

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteAcademicYear(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(input);

    const [grades, donations] = await Promise.all([
      prisma.grade.count({ where: { academicYearId: id } }),
      prisma.studentDonation.count({ where: { academicYearId: id } }),
    ]);
    if (grades > 0) {
      throw new ActionError("Kan een schooljaar met cijfers niet verwijderen");
    }
    if (donations > 0) {
      throw new ActionError("Kan een schooljaar met donaties niet verwijderen");
    }

    await prisma.academicYear.delete({ where: { id } });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
