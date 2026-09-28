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
