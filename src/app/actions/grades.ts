"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  assertActiveEnrollments,
  assertCanManageClass,
  requireStaff,
} from "@/lib/authorization";
import { getClassGradeSheet, type ClassGradeSheetDTO } from "@/lib/grades";

// Server Actions are public endpoints: validate input, then re-check auth and
// authorization against the database before writing.

const score = z.number().int().min(1).max(10);

const saveSchema = z.object({
  classId: z.string().min(1),
  termId: z.string().min(1),
  academicYearId: z.string().min(1),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        subjectId: z.string().min(1),
        // null/undefined clears the cell.
        score: score.nullish(),
        remark: z.string().trim().max(500).nullish(),
      }),
    )
    .min(1),
});

// Bulk upsert the grade sheet for one class + term + academic year. Idempotent
// thanks to the (student, subject, term, year) unique key. Empty cells (no
// score, no remark) are deleted so the sheet can be cleared.
export async function saveGrades(
  input: unknown,
): Promise<ClassGradeSheetDTO | null> {
  const parsed = saveSchema.parse(input);
  const staff = await requireStaff();

  await assertCanManageClass(parsed.classId, staff);

  const [schoolClass, term, academicYear] = await Promise.all([
    prisma.schoolClass.findUnique({
      where: { id: parsed.classId },
      select: { levelId: true },
    }),
    prisma.term.findUnique({ where: { id: parsed.termId }, select: { id: true } }),
    prisma.academicYear.findUnique({
      where: { id: parsed.academicYearId },
      select: { id: true },
    }),
  ]);
  if (!schoolClass) throw new Error("Class not found or not accessible");
  if (!term) throw new Error("Term not found");
  if (!academicYear) throw new Error("Academic year not found");

  // Every subject must belong to the class's level.
  const subjectIds = [...new Set(parsed.entries.map((entry) => entry.subjectId))];
  const validSubjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds }, levelId: schoolClass.levelId },
    select: { id: true },
  });
  if (validSubjects.length !== subjectIds.length) {
    throw new Error("One or more subjects do not belong to this class's level");
  }

  await assertActiveEnrollments(
    parsed.classId,
    [...new Set(parsed.entries.map((entry) => entry.studentId))],
  );

  await prisma.$transaction(
    parsed.entries.map((entry) => {
      const remark = entry.remark?.length ? entry.remark : null;
      if (entry.score == null && !remark) {
        return prisma.grade.deleteMany({
          where: {
            studentId: entry.studentId,
            subjectId: entry.subjectId,
            termId: parsed.termId,
            academicYearId: parsed.academicYearId,
          },
        });
      }
      return prisma.grade.upsert({
        where: {
          studentId_subjectId_termId_academicYearId: {
            studentId: entry.studentId,
            subjectId: entry.subjectId,
            termId: parsed.termId,
            academicYearId: parsed.academicYearId,
          },
        },
        create: {
          studentId: entry.studentId,
          classId: parsed.classId,
          subjectId: entry.subjectId,
          termId: parsed.termId,
          academicYearId: parsed.academicYearId,
          score: entry.score ?? null,
          remark,
          recordedById: staff.userId,
        },
        update: {
          classId: parsed.classId,
          score: entry.score ?? null,
          remark,
          recordedById: staff.userId,
        },
      });
    }),
  );

  return getClassGradeSheet({
    classId: parsed.classId,
    termId: parsed.termId,
    academicYearId: parsed.academicYearId,
  });
}

// Remove a single grade. Authorization is checked against the class the grade
// was recorded in.
export async function deleteGrade(input: unknown): Promise<void> {
  const parsed = z
    .object({
      studentId: z.string().min(1),
      subjectId: z.string().min(1),
      termId: z.string().min(1),
      academicYearId: z.string().min(1),
    })
    .parse(input);
  const staff = await requireStaff();

  const grade = await prisma.grade.findUnique({
    where: {
      studentId_subjectId_termId_academicYearId: {
        studentId: parsed.studentId,
        subjectId: parsed.subjectId,
        termId: parsed.termId,
        academicYearId: parsed.academicYearId,
      },
    },
    select: { classId: true },
  });
  if (!grade) return;

  await assertCanManageClass(grade.classId, staff);

  await prisma.grade.delete({
    where: {
      studentId_subjectId_termId_academicYearId: {
        studentId: parsed.studentId,
        subjectId: parsed.subjectId,
        termId: parsed.termId,
        academicYearId: parsed.academicYearId,
      },
    },
  });
}
