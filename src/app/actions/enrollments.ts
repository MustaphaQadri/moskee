"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authorization";
import { getDonationSetting } from "@/lib/donations";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import type { Prisma } from "@/generated/prisma/client";
import type { StudentStatus } from "@/generated/prisma/enums";

// Manager-only enrollment. A student has at most one active class: enrolling in
// a new class automatically withdraws the previous one (a "move"). Assigning a
// class sets the student lifecycle state to ACTIVE; removing the last class sets
// it to ARCHIVED. State changes are recorded in StudentStatusEvent.

const donationSchema = z.object({
  category: z.enum(["FULL", "REDUCED", "EXEMPT"]),
  expectedAmount: z.number().min(0).max(1_000_000).optional(),
});

const linkSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1),
});

const enrollSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1),
  // Present on a first-time class assignment (prompted in the UI).
  donation: donationSchema.optional(),
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

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

// Record a lifecycle-state change (no-op when already in the target state).
async function setStudentStatus(
  tx: Prisma.TransactionClient,
  studentId: string,
  toStatus: StudentStatus,
  actorId: string,
) {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { status: true },
  });
  if (!student || student.status === toStatus) return;

  await tx.student.update({
    where: { id: studentId },
    data: { status: toStatus },
  });
  await tx.studentStatusEvent.create({
    data: {
      studentId,
      fromStatus: student.status,
      toStatus,
      changedById: actorId,
    },
  });
}

// After a class is withdrawn, archive any student left without a class.
async function archiveIfNoClass(
  tx: Prisma.TransactionClient,
  studentIds: string[],
  actorId: string,
) {
  for (const studentId of studentIds) {
    const active = await tx.enrollment.findFirst({
      where: { studentId, status: "active" },
      select: { id: true },
    });
    if (!active) {
      await setStudentStatus(tx, studentId, "ARCHIVED", actorId);
    }
  }
}

function revalidate(classId: string) {
  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/classes/${classId}`);
  revalidatePath("/dashboard/guardians");
  revalidatePath("/dashboard/donations");
}

export async function enrollStudent(input: unknown): Promise<ActionResult> {
  const session = await requireManager();
  try {
    const parsed = enrollSchema.parse(input);

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

    const defaultAmount =
      parsed.donation?.category === "FULL"
        ? (await getDonationSetting()).defaultAmount
        : 0;

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

      await setStudentStatus(tx, parsed.studentId, "ACTIVE", session.user.id);

      // First-time assignment: create the yearly donation expectation once.
      if (parsed.donation) {
        const year = await tx.academicYear.findFirst({
          where: { isCurrent: true },
          select: { id: true },
        });
        if (!year) {
          throw new ActionError("Stel eerst een huidig schooljaar in");
        }

        const existing = await tx.studentDonation.findUnique({
          where: {
            studentId_academicYearId: {
              studentId: parsed.studentId,
              academicYearId: year.id,
            },
          },
          select: { id: true },
        });

        if (!existing) {
          const { category } = parsed.donation;
          const expectedAmount =
            category === "EXEMPT"
              ? 0
              : category === "REDUCED"
                ? (parsed.donation.expectedAmount ?? 0)
                : defaultAmount;

          await tx.studentDonation.create({
            data: {
              studentId: parsed.studentId,
              academicYearId: year.id,
              expectedAmount: round2(expectedAmount),
              category,
              recordedById: session.user.id,
            },
          });
        }
      }
    });

    revalidate(parsed.classId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// Withdraw a student from a class (keeps the historical row).
export async function unenrollStudent(input: unknown): Promise<ActionResult> {
  const session = await requireManager();
  try {
    const parsed = linkSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      await tx.enrollment.updateMany({
        where: {
          studentId: parsed.studentId,
          classId: parsed.classId,
          status: "active",
        },
        data: { status: "withdrawn", endDate: new Date() },
      });
      await archiveIfNoClass(tx, [parsed.studentId], session.user.id);
    });

    revalidate(parsed.classId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// Move several students from one class to another. Each student's active
// enrollment in the source class is withdrawn and the target class is made
// active (creating the row if it was previously withdrawn). A move keeps the
// student ACTIVE — it is not a departure.
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
// class (no new enrollment is created) and archived.
export async function removeStudentsFromClass(
  input: unknown,
): Promise<ActionResult<{ removed: number }>> {
  const session = await requireManager();
  try {
    const parsed = bulkRemoveSchema.parse(input);
    await assertActiveInClass(parsed.classId, parsed.studentIds);

    await prisma.$transaction(async (tx) => {
      await tx.enrollment.updateMany({
        where: {
          classId: parsed.classId,
          status: "active",
          studentId: { in: parsed.studentIds },
        },
        data: { status: "withdrawn", endDate: new Date() },
      });
      await archiveIfNoClass(tx, parsed.studentIds, session.user.id);
    });

    revalidate(parsed.classId);
    return { ok: true, data: { removed: parsed.studentIds.length } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
