"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { requiredInt } from "@/lib/validation";

// Manager-only CRUD for terms ("periodes" in the UI). Terms are **global**
// period definitions (name, order, month range) applied to every academic year;
// concrete dates are derived per year. A term with grades cannot be deleted.

const name = z.string().trim().min(1, "Naam is verplicht").max(100);

// Mantine Select/NumberInput emit strings; coerce to a 1-12 month number.
const month = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? undefined : Number(value),
  z
    .number({ error: "Kies een maand" })
    .int()
    .min(1, "Kies een maand")
    .max(12, "Kies een maand"),
);

const rangeSchema = z
  .object({
    startMonth: month,
    endMonth: month,
  })
  .refine((value) => value.endMonth >= value.startMonth, {
    message: "Eindmaand mag niet voor de startmaand liggen",
    path: ["endMonth"],
  });

const createSchema = rangeSchema.and(
  z.object({
    name,
    sortOrder: requiredInt(1),
  }),
);

const updateSchema = rangeSchema.and(
  z.object({
    id: z.string().min(1),
    name,
    sortOrder: requiredInt(1),
  }),
);

// (name) and (sortOrder) are globally unique.
async function assertFree(nameValue: string, sortOrder: number, excludeId?: string) {
  const clash = await prisma.term.findFirst({
    where: {
      OR: [{ name: nameValue }, { sortOrder }],
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { name: true, sortOrder: true },
  });
  if (clash) {
    throw new ActionError("Er bestaat al een periode met deze naam of volgorde");
  }
}

// Periods stay within one calendar year, so month ranges overlap when both
// boundaries fall inside each other's span.
async function assertNoOverlap(
  startMonth: number,
  endMonth: number,
  excludeId?: string,
) {
  const terms = await prisma.term.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    select: { name: true, startMonth: true, endMonth: true },
  });
  const clash = terms.find(
    (term) => startMonth <= term.endMonth && term.startMonth <= endMonth,
  );
  if (clash) {
    throw new ActionError(`Deze maanden overlappen met "${clash.name}"`);
  }
}

export async function createTerm(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireManager();
  try {
    const parsed = createSchema.parse(input);
    await assertFree(parsed.name, parsed.sortOrder);
    await assertNoOverlap(parsed.startMonth, parsed.endMonth);

    const term = await prisma.term.create({
      data: {
        name: parsed.name,
        sortOrder: parsed.sortOrder,
        startMonth: parsed.startMonth,
        endMonth: parsed.endMonth,
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
    await assertFree(parsed.name, parsed.sortOrder, parsed.id);
    await assertNoOverlap(parsed.startMonth, parsed.endMonth, parsed.id);

    await prisma.term.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        sortOrder: parsed.sortOrder,
        startMonth: parsed.startMonth,
        endMonth: parsed.endMonth,
      },
    });

    revalidatePath("/dashboard/manage");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// Reorder all periods. Runs in two passes (negative, then final) so the
// (sortOrder) unique constraint is never transiently violated.
export async function reorderTerms(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const { orderedIds } = z
      .object({ orderedIds: z.array(z.string().min(1)).min(1) })
      .parse(input);

    const count = await prisma.term.count();
    if (count !== orderedIds.length) {
      throw new ActionError("Geef alle periodes door");
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
