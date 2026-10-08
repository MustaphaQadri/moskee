"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  assertActiveEnrollments,
  assertCanManageClass,
  requireStaff,
} from "@/lib/authorization";
import { getExamGradeSheet, type ExamGradeSheetDTO } from "@/lib/grades";
import { parseDateOnly } from "@/lib/dates";

// Server Actions are public endpoints: validate input, then re-check auth and
// authorization against the database before writing.

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");
const score = z.number().int().min(1).max(10);
const coefficient = z.number().int().min(1).max(100);

const examSchema = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  termId: z.string().min(1),
  academicYearId: z.string().min(1),
  title: z.string().trim().min(1, "Geef een naam").max(100),
  date: dateOnly,
  coefficient,
});

const saveSchema = z.object({
  examId: z.string().min(1),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        // null/undefined clears the score.
        score: score.nullish(),
        remark: z.string().trim().max(500).nullish(),
      }),
    )
    .min(1),
});

function revalidateGrades(classId: string): void {
  revalidatePath(`/dashboard/classes/${classId}`);
  revalidatePath(`/dashboard/classes/${classId}/grades`);
}

async function assertSubjectBelongsToClassLevel(
  classId: string,
  subjectId: string,
): Promise<void> {
  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: { levelId: true },
  });
  if (!schoolClass) throw new Error("Class not found or not accessible");

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, levelId: schoolClass.levelId },
    select: { id: true },
  });
  if (!subject) {
    throw new Error("One or more subjects do not belong to this class's level");
  }
}

// Create an exam for a class + subject + period + academic year. The display
// title is derived (subject · period · year) so no title is stored.
export async function createExam(input: unknown): Promise<ExamGradeSheetDTO | null> {
  const parsed = examSchema.parse(input);
  const staff = await requireStaff();

  await assertCanManageClass(parsed.classId, staff);
  await assertSubjectBelongsToClassLevel(parsed.classId, parsed.subjectId);

  const [term, academicYear] = await Promise.all([
    prisma.term.findUnique({ where: { id: parsed.termId }, select: { id: true } }),
    prisma.academicYear.findUnique({
      where: { id: parsed.academicYearId },
      select: { id: true },
    }),
  ]);
  if (!term) throw new Error("Term not found");
  if (!academicYear) throw new Error("Academic year not found");

  const exam = await prisma.exam.create({
    data: {
      classId: parsed.classId,
      subjectId: parsed.subjectId,
      termId: parsed.termId,
      academicYearId: parsed.academicYearId,
      title: parsed.title,
      date: parseDateOnly(parsed.date),
      coefficient: parsed.coefficient,
      recordedById: staff.userId,
    },
    select: { id: true },
  });

  revalidateGrades(parsed.classId);
  return getExamGradeSheet(exam.id);
}

// Update an exam's title, date and coefficient. The class/subject/period are
// fixed once grades exist.
export async function updateExam(input: unknown): Promise<ExamGradeSheetDTO | null> {
  const parsed = z
    .object({
      examId: z.string().min(1),
      title: z.string().trim().min(1, "Geef een naam").max(100),
      date: dateOnly,
      coefficient,
    })
    .parse(input);
  const staff = await requireStaff();

  const exam = await prisma.exam.findUnique({
    where: { id: parsed.examId },
    select: { classId: true },
  });
  if (!exam) throw new Error("Exam not found or not accessible");

  await assertCanManageClass(exam.classId, staff);

  await prisma.exam.update({
    where: { id: parsed.examId },
    data: {
      title: parsed.title,
      date: parseDateOnly(parsed.date),
      coefficient: parsed.coefficient,
      recordedById: staff.userId,
    },
  });

  revalidateGrades(exam.classId);
  return getExamGradeSheet(parsed.examId);
}

// Remove an exam and its grades (cascade). Authorization is checked against the
// class the exam belongs to.
export async function deleteExam(input: unknown): Promise<void> {
  const parsed = z.object({ examId: z.string().min(1) }).parse(input);
  const staff = await requireStaff();

  const exam = await prisma.exam.findUnique({
    where: { id: parsed.examId },
    select: { classId: true },
  });
  if (!exam) return;

  await assertCanManageClass(exam.classId, staff);

  await prisma.exam.delete({ where: { id: parsed.examId } });
  revalidateGrades(exam.classId);
}

// Bulk upsert the roster's scores for one exam. Idempotent thanks to the
// (student, exam) unique key. Empty cells (no score, no remark) are deleted so
// the sheet can be cleared.
export async function saveExamGrades(
  input: unknown,
): Promise<ExamGradeSheetDTO | null> {
  const parsed = saveSchema.parse(input);
  const staff = await requireStaff();

  const exam = await prisma.exam.findUnique({
    where: { id: parsed.examId },
    select: { classId: true },
  });
  if (!exam) throw new Error("Exam not found or not accessible");

  await assertCanManageClass(exam.classId, staff);
  await assertActiveEnrollments(
    exam.classId,
    [...new Set(parsed.entries.map((entry) => entry.studentId))],
  );

  await prisma.$transaction(
    parsed.entries.map((entry) => {
      const remark = entry.remark?.length ? entry.remark : null;
      if (entry.score == null && !remark) {
        return prisma.grade.deleteMany({
          where: { studentId: entry.studentId, examId: parsed.examId },
        });
      }
      return prisma.grade.upsert({
        where: {
          studentId_examId: {
            studentId: entry.studentId,
            examId: parsed.examId,
          },
        },
        create: {
          studentId: entry.studentId,
          examId: parsed.examId,
          score: entry.score ?? null,
          remark,
          recordedById: staff.userId,
        },
        update: {
          score: entry.score ?? null,
          remark,
          recordedById: staff.userId,
        },
      });
    }),
  );

  revalidateGrades(exam.classId);
  return getExamGradeSheet(parsed.examId);
}
