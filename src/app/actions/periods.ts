"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { parseDateOnly } from "@/lib/dates";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { optionalDate, requiredInt } from "@/lib/validation";

// Manager-only CRUD for terms ("periodes" in the UI). A term owns grades, so it
// cannot be deleted while graded. Terms are unique per year by name and order.

const createSchema = z.object({
  academicYearId: z.string().min(1),
  name: z.string().trim().min(1, "Naam is verplicht").max(100),
  sortOrder: requiredInt(1),
  startDate: optionalDate,
  endDate: optionalDate,
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Naam is verplicht").max(100),
  sortOrder: requiredInt(1),
  startDate: optionalDate,
  endDate: optionalDate,
});

function parseBounds(startDate?: string | null, endDate?: string | null) {
  return {
    startDate: startDate ? parseDateOnly(startDate) : null,
    endDate: endDate ? parseDateOnly(endDate) : null,
  };
}

// (academicYearId, name) and (academicYearId, sortOrder) are unique.
async function assertFree(
  academicYearId: string,
  nameValue: string,
  sortOrder: number,
  excludeId?: string,
) {
  const clash = await prisma.term.findFirst({
    where: {
      academicYearId,
      OR: [{ name: nameValue }, { sortOrder }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { name: true, sortOrder: true },
  });
  if (clash) {
    throw new ActionError(
      "Er bestaat al een periode met deze naam of volgorde in dit schooljaar",
    );
  }
}

export async function createTerm(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireManager();
  try {
    const parsed = createSchema.parse(input);
    await assertFree(parsed.academicYearId, parsed.name, parsed.sortOrder);

    const term = await prisma.term.create({
      data: {
        academicYearId: parsed.academicYearId,
        name: parsed.name,
        sortOrder: parsed.sortOrder,
        ...parseBounds(parsed.startDate, parsed.endDate),
      },
      select: { id: true },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: { id: term.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function updateTerm(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = updateSchema.parse(input);

    const existing = await prisma.term.findUnique({
      where: { id: parsed.id },
      select: { academicYearId: true },
    });
    if (!existing) throw new ActionError("Periode niet gevonden");
    await assertFree(
      existing.academicYearId,
      parsed.name,
      parsed.sortOrder,
      parsed.id,
    );

    await prisma.term.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        sortOrder: parsed.sortOrder,
        ...parseBounds(parsed.startDate, parsed.endDate),
      },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// Reorder all terms of a year. Runs in two passes (negative, then final) so the
// (academicYearId, sortOrder) unique constraint is never transiently violated.
export async function reorderTerms(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const { academicYearId, orderedIds } = z
      .object({
        academicYearId: z.string().min(1),
        orderedIds: z.array(z.string().min(1)).min(1),
      })
      .parse(input);

    const count = await prisma.term.count({ where: { academicYearId } });
    if (count !== orderedIds.length) {
      throw new ActionError("Geef alle periodes van het schooljaar door");
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

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteTerm(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(input);

    const grades = await prisma.grade.count({ where: { termId: id } });
    if (grades > 0) {
      throw new ActionError("Kan een periode met cijfers niet verwijderen");
    }

    await prisma.term.delete({ where: { id } });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
