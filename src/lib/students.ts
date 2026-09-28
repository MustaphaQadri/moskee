import "server-only";

import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import type { Sex } from "@/generated/prisma/enums";

// Read side of a single student: identity, guardians, class history and the
// comments kept for the whole study. Server-only.

export type StudentStaffScope = { userId: string; isTeacher: boolean };

export type StudentCommentDTO = {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string;
  createdAt: string; // ISO
};

export type StudentDetailDTO = {
  id: string;
  firstName: string;
  lastName: string;
  sex: Sex | null;
  dateOfBirth: string | null;
  guardians: {
    id: string;
    firstName: string;
    lastName: string;
    relation: string | null;
    isPrimary: boolean;
    phone: string | null;
    email: string | null;
  }[];
  enrollments: {
    id: string;
    classId: string;
    className: string;
    levelName: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
  }[];
  comments: StudentCommentDTO[];
};

// Returns null when the student does not exist or is not visible to a teacher
// (a teacher only sees students actively enrolled in one of their classes).
export async function getStudentDetail(
  id: string,
  staff: StudentStaffScope,
): Promise<StudentDetailDTO | null> {
  const student = await prisma.student.findFirst({
    where: {
      id,
      ...(staff.isTeacher
        ? {
            enrollments: {
              some: {
                status: "active",
                class: { teacherId: staff.userId },
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      sex: true,
      dateOfBirth: true,
      guardians: {
        select: {
          relation: true,
          isPrimary: true,
          guardian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        },
      },
      enrollments: {
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          class: {
            select: {
              id: true,
              name: true,
              level: { select: { name: true } },
            },
          },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          body: true,
          authorId: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      },
    },
  });

  if (!student) return null;

  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    sex: student.sex,
    dateOfBirth: toDateOnly(student.dateOfBirth),
    guardians: student.guardians
      .map((link) => ({
        id: link.guardian.id,
        firstName: link.guardian.firstName,
        lastName: link.guardian.lastName,
        relation: link.relation,
        isPrimary: link.isPrimary,
        phone: link.guardian.phone,
        email: link.guardian.email,
      }))
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
    enrollments: student.enrollments.map((enrollment) => ({
      id: enrollment.id,
      classId: enrollment.class.id,
      className: enrollment.class.name,
      levelName: enrollment.class.level.name,
      status: enrollment.status,
      startDate: toDateOnly(enrollment.startDate),
      endDate: toDateOnly(enrollment.endDate),
    })),
    comments: student.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      authorId: comment.authorId,
      authorName: comment.author?.name ?? "Onbekend",
      createdAt: comment.createdAt.toISOString(),
    })),
  };
}
