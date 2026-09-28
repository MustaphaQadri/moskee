"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager, requireStaff } from "@/lib/authorization";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";

// Comments on a student are kept for the whole study (StudentComment). Teachers
// may add comments for students in their own classes; managers may add for any
// student, and only managers may delete.

const addSchema = z.object({
  studentId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(1, "Commentaar mag niet leeg zijn")
    .max(2000, "Commentaar is te lang"),
});

const deleteSchema = z.object({ id: z.string().min(1) });

export async function addStudentComment(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const staff = await requireStaff();
  try {
    const parsed = addSchema.parse(input);

    const student = await prisma.student.findUnique({
      where: { id: parsed.studentId },
      select: { id: true },
    });
    if (!student) throw new ActionError("Leerling niet gevonden");

    if (staff.isTeacher) {
      const inOwnClass = await prisma.enrollment.findFirst({
        where: {
          studentId: parsed.studentId,
          status: "active",
          class: { teacherId: staff.userId },
        },
        select: { id: true },
      });
      if (!inOwnClass) {
        throw new ActionError(
          "Je kunt alleen commentaar geven op leerlingen in je eigen klassen",
        );
      }
    }

    const comment = await prisma.studentComment.create({
      data: {
        studentId: parsed.studentId,
        authorId: staff.userId,
        body: parsed.body,
      },
      select: { id: true },
    });

    revalidatePath(`/dashboard/students/${parsed.studentId}`);
    return { ok: true, data: { id: comment.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteStudentComment(
  input: unknown,
): Promise<ActionResult> {
  await requireManager();
  try {
    const parsed = deleteSchema.parse(input);

    const comment = await prisma.studentComment.findUnique({
      where: { id: parsed.id },
      select: { studentId: true },
    });
    if (!comment) return { ok: true, data: undefined };

    await prisma.studentComment.delete({ where: { id: parsed.id } });

    revalidatePath(`/dashboard/students/${comment.studentId}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
