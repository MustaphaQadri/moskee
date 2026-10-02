import "server-only";

import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import { sortRows, type SortDir } from "@/lib/sort";
import type { Sex } from "@/generated/prisma/enums";

// Read side of a single student: identity, guardians, class history and the
// comments kept for the whole study. Server-only.

export type StudentStaffScope = { userId: string; isTeacher: boolean };

export type StudentListItemDTO = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  image: string | null;
  class: { id: string; name: string } | null;
  guardians: {
    id: string;
    firstName: string;
    lastName: string;
    relation: string | null;
  }[];
};

export const STUDENT_SORT_KEYS = ["name", "class", "guardian"] as const;

export type StudentSortKey = (typeof STUDENT_SORT_KEYS)[number];

export function isStudentSortKey(value: unknown): value is StudentSortKey {
  return (STUDENT_SORT_KEYS as readonly string[]).includes(value as string);
}

function studentSortValue(
  student: StudentListItemDTO,
  key: StudentSortKey,
): string | number | null {
  switch (key) {
    case "class":
      return student.class?.name ?? null;
    case "guardian": {
      const guardian = student.guardians[0];
      return guardian ? `${guardian.lastName} ${guardian.firstName}` : null;
    }
    default:
      return `${student.lastName} ${student.firstName}`;
  }
}

// List/search all students with their current class and linked guardians. Used
// by the "Inschrijvingen" overview. `search` matches first/last name.
export async function listStudents(params: {
  search?: string;
  sort?: StudentSortKey;
  dir?: SortDir;
} = {}): Promise<StudentListItemDTO[]> {
  const search = params.search?.trim();

  const students = await prisma.student.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : undefined,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      image: true,
      enrollments: {
        where: { status: "active" },
        take: 1,
        select: { class: { select: { id: true, name: true } } },
      },
      guardians: {
        select: {
          relation: true,
          guardian: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  const rows = students.map((student) => ({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    dateOfBirth: toDateOnly(student.dateOfBirth),
    image: student.image,
    class: student.enrollments[0]?.class ?? null,
    guardians: student.guardians.map((link) => ({
      id: link.guardian.id,
      firstName: link.guardian.firstName,
      lastName: link.guardian.lastName,
      relation: link.relation,
    })),
  }));

  return sortRows(rows, params.dir ?? "asc", (student) =>
    studentSortValue(student, params.sort ?? "name"),
  );
}

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
  image: string | null;
  guardians: {
    id: string;
    firstName: string;
    lastName: string;
    relation: string | null;
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
      image: true,
      guardians: {
        select: {
          relation: true,
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
    image: student.image,
    guardians: student.guardians.map((link) => ({
      id: link.guardian.id,
      firstName: link.guardian.firstName,
      lastName: link.guardian.lastName,
      relation: link.relation,
      phone: link.guardian.phone,
      email: link.guardian.email,
    })),
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
