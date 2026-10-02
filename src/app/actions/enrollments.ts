"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";

// Manager-only enrollment. A student has at most one active class: enrolling in
// a new class automatically withdraws the previous one (a "move").

const linkSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1),
});

const bulkRemoveSchema = z.object({
  classId: z.string().min(1),
  studentIds: z.array(z.string().min(1)).min(1, "Selecteer minstens één leerling"),
});

const bulkMoveSchema = z
  .object({
    fromClassId: z.string().min(1),
    toClassId: z.string().min(1),
    studentIds: z.array(z.string().min(1)).min(1, "Selecteer minstens één leerling"),
  })
  .refine((value) => value.fromClassId !== value.toClassId, {
    message: "Kies een andere klas dan de huidige",
    path: ["toClassId"],
  });

// All selected students must be actively enrolled in the source class.
async function assertActiveInClass(classId: string, studentIds: string[]) {
  const active = await prisma.enrollment.findMany({
    where: { classId, status: "active", studentId: { in: studentIds } },
    select: { studentId: true },
  });
  if (active.length !== studentIds.length) {
    throw new ActionError("Niet alle geselecteerde leerlingen zitten in deze klas");
  }
}

function revalidate(classId: string) {
  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/classes/${classId}`);
}

export async function enrollStudent(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = linkSchema.parse(input);

    const [schoolClass, student] = await Promise.all([
      prisma.schoolClass.findUnique({
        where: { id: parsed.classId },
        select: { id: true },
      }),
      prisma.student.findUnique({
        where: { id: parsed.studentId },
        select: { id: true },
      }),
    ]);
    if (!schoolClass) throw new ActionError("Klas niet gevonden");
    if (!student) throw new ActionError("Leerling niet gevonden");

    await prisma.$transaction(async (tx) => {
      const active = await tx.enrollment.findFirst({
        where: { studentId: parsed.studentId, status: "active" },
        select: { id: true, classId: true },
      });

      if (active?.classId === parsed.classId) return;

      if (active) {
        await tx.enrollment.update({
          where: { id: active.id },
          data: { status: "withdrawn", endDate: new Date() },
        });
      }

      await tx.enrollment.upsert({
        where: {
          studentId_classId: {
            studentId: parsed.studentId,
            classId: parsed.classId,
          },
        },
        create: {
          studentId: parsed.studentId,
          classId: parsed.classId,
          status: "active",
        },
        update: { status: "active", endDate: null },
      });
    });

    revalidate(parsed.classId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// Withdraw a student from a class (keeps the historical row).
export async function unenrollStudent(input: unknown): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = linkSchema.parse(input);

    await prisma.enrollment.updateMany({
      where: {
        studentId: parsed.studentId,
        classId: parsed.classId,
        status: "active",
      },
      data: { status: "withdrawn", endDate: new Date() },
    });

    revalidate(parsed.classId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// Move several students from one class to another. Each student's active
// enrollment in the source class is withdrawn and the target class is made
// active (creating the row if it was previously withdrawn).
export async function moveStudents(
  input: unknown,
): Promise<ActionResult<{ moved: number }>> {
  await requireManager();
  try {
    const parsed = bulkMoveSchema.parse(input);

    const [from, to] = await Promise.all([
      prisma.schoolClass.findUnique({
        where: { id: parsed.fromClassId },
        select: { id: true },
      }),
      prisma.schoolClass.findUnique({
        where: { id: parsed.toClassId },
        select: { id: true },
      }),
    ]);
    if (!from) throw new ActionError("Klas niet gevonden");
    if (!to) throw new ActionError("Doelklas niet gevonden");

    await assertActiveInClass(parsed.fromClassId, parsed.studentIds);

    await prisma.$transaction(async (tx) => {
      await tx.enrollment.updateMany({
        where: {
          classId: parsed.fromClassId,
          status: "active",
          studentId: { in: parsed.studentIds },
        },
        data: { status: "withdrawn", endDate: new Date() },
      });

      for (const studentId of parsed.studentIds) {
        await tx.enrollment.upsert({
          where: {
            studentId_classId: { studentId, classId: parsed.toClassId },
          },
          create: {
            studentId,
            classId: parsed.toClassId,
            status: "active",
          },
          update: { status: "active", endDate: null },
        });
      }
    });

    revalidate(parsed.fromClassId);
    revalidate(parsed.toClassId);
    return { ok: true, data: { moved: parsed.studentIds.length } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// Remove several students from a class. They are withdrawn and left without a
// class (no new enrollment is created).
export async function removeStudentsFromClass(
  input: unknown,
): Promise<ActionResult<{ removed: number }>> {
  await requireManager();
  try {
    const parsed = bulkRemoveSchema.parse(input);
    await assertActiveInClass(parsed.classId, parsed.studentIds);

    await prisma.enrollment.updateMany({
      where: {
        classId: parsed.classId,
        status: "active",
        studentId: { in: parsed.studentIds },
      },
      data: { status: "withdrawn", endDate: new Date() },
    });

    revalidate(parsed.classId);
    return { ok: true, data: { removed: parsed.studentIds.length } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
