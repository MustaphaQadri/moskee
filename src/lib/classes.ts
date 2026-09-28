import "server-only";

import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import type { Sex } from "@/generated/prisma/enums";

// Read side of classes. Server-only. Teachers are scoped to their own classes;
// managers see everything.

export type StaffScope = { userId: string; isTeacher: boolean };

export type ClassCardDTO = {
  id: string;
  name: string;
  description: string | null;
  level: { id: string; name: string } | null;
  room: { id: string; name: string } | null;
  teacher: { id: string; name: string } | null;
  sessions: { id: string; label: string }[];
  studentCount: number;
  subjectCount: number;
};

export type ClassStudentDTO = {
  studentId: string;
  firstName: string;
  lastName: string;
  sex: Sex | null;
  dateOfBirth: string | null;
};

export type ClassDetailDTO = {
  id: string;
  name: string;
  description: string | null;
  level: {
    id: string;
    name: string;
    subjects: {
      id: string;
      name: string;
      competencies: { id: string; name: string }[];
    }[];
  } | null;
  room: { id: string; name: string } | null;
  teacher: { id: string; name: string } | null;
  sessions: {
    id: string;
    label: string;
    day: string | null;
    startTime: string | null;
    endTime: string | null;
  }[];
  students: ClassStudentDTO[];
};

export type EnrollableStudentDTO = {
  id: string;
  firstName: string;
  lastName: string;
  currentClass: { id: string; name: string } | null;
};

// Grid of classes, filtered to the teacher's own classes when applicable.
export async function listClasses(params: {
  staff: StaffScope;
  search?: string;
}): Promise<ClassCardDTO[]> {
  const search = params.search?.trim();

  const classes = await prisma.schoolClass.findMany({
    where: {
      ...(params.staff.isTeacher ? { teacherId: params.staff.userId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              {
                level: {
                  name: { contains: search, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      level: {
        select: {
          id: true,
          name: true,
          _count: { select: { subjects: true } },
        },
      },
      room: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      sessions: { select: { session: { select: { id: true, label: true } } } },
      _count: {
        select: { enrollments: { where: { status: "active" } } },
      },
    },
  });

  return classes.map((schoolClass) => ({
    id: schoolClass.id,
    name: schoolClass.name,
    description: schoolClass.description,
    level: schoolClass.level
      ? { id: schoolClass.level.id, name: schoolClass.level.name }
      : null,
    room: schoolClass.room,
    teacher: schoolClass.teacher,
    sessions: schoolClass.sessions.map((link) => link.session),
    studentCount: schoolClass._count.enrollments,
    subjectCount: schoolClass.level?._count.subjects ?? 0,
  }));
}

// One class with level subjects, timeslots and the active roster. Returns null
// when the class does not exist or is not visible to the given staff member.
export async function getClassDetail(
  id: string,
  staff: StaffScope,
): Promise<ClassDetailDTO | null> {
  const schoolClass = await prisma.schoolClass.findFirst({
    where: {
      id,
      ...(staff.isTeacher ? { teacherId: staff.userId } : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      level: {
        select: {
          id: true,
          name: true,
          subjects: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              competencies: {
                where: { isActive: true },
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                select: { id: true, name: true },
              },
            },
          },
        },
      },
      room: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      sessions: {
        select: {
          session: {
            select: {
              id: true,
              label: true,
              day: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      },
      enrollments: {
        where: { status: "active" },
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              sex: true,
              dateOfBirth: true,
            },
          },
        },
      },
    },
  });

  if (!schoolClass) return null;

  const students = schoolClass.enrollments
    .map(({ student }) => ({
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      sex: student.sex,
      dateOfBirth: toDateOnly(student.dateOfBirth),
    }))
    .sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
      ),
    );

  return {
    id: schoolClass.id,
    name: schoolClass.name,
    description: schoolClass.description,
    level: schoolClass.level
      ? {
          id: schoolClass.level.id,
          name: schoolClass.level.name,
          subjects: schoolClass.level.subjects,
        }
      : null,
    room: schoolClass.room,
    teacher: schoolClass.teacher,
    sessions: schoolClass.sessions.map((link) => link.session),
    students,
  };
}

// Students who can be enrolled in the given class: everyone not already active
// in it (students active elsewhere are included so they can be moved).
export async function listStudentsForEnrollment(params: {
  classId: string;
  search?: string;
}): Promise<EnrollableStudentDTO[]> {
  const search = params.search?.trim();

  const students = await prisma.student.findMany({
    where: {
      enrollments: {
        none: { status: "active", classId: params.classId },
      },
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 50,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      enrollments: {
        where: { status: "active" },
        take: 1,
        select: { class: { select: { id: true, name: true } } },
      },
    },
  });

  return students.map((student) => ({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    currentClass: student.enrollments[0]?.class ?? null,
  }));
}
