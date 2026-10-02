import "server-only";

import { prisma } from "@/lib/prisma";
import { getClassRoster } from "@/lib/attendance";
import { toDateOnly } from "@/lib/dates";
import type { AttendanceStatus } from "@/generated/prisma/enums";

// Read side of subjects / terms / grades. Reports are computed on read — no
// averages or ranks are stored. Server-only: use from Server Components and
// Server Actions, never Client Components.
//
// Terms are global period definitions (month ranges); a grade is scoped to an
// academic year. Concrete term dates are derived per year for attendance
// scoping.

export type SubjectDTO = {
  id: string;
  name: string;
  sortOrder: number | null;
  isActive: boolean;
};

export type TermDTO = {
  id: string;
  name: string;
  sortOrder: number;
  startMonth: number;
  endMonth: number;
};

export type GradeSheetCellDTO = { score: number | null; remark: string | null };

export type GradeSheetStudentDTO = {
  studentId: string;
  firstName: string;
  lastName: string;
  cells: Record<string, GradeSheetCellDTO>; // keyed by subjectId
};

export type ClassGradeSheetDTO = {
  class: { id: string; name: string };
  level: { id: string; name: string };
  term: TermDTO;
  academicYear: { id: string; name: string };
  subjects: SubjectDTO[];
  students: GradeSheetStudentDTO[];
};

export type AttendanceSummaryDTO = {
  present: number;
  absent: number;
  late: number;
  veryLate: number;
  excused: number;
  total: number;
  // (present + late + very late) / total, or null when there is no attendance.
  presenceRate: number | null;
};

export type PeriodReportDTO = {
  student: { id: string; firstName: string; lastName: string };
  class: { id: string; name: string };
  level: { id: string; name: string };
  term: TermDTO;
  academicYear: { id: string; name: string };
  subjects: { subjectId: string; name: string; score: number | null; remark: string | null }[];
  average: number | null; // mean of graded subjects
  gradedCount: number;
  rank: number | null; // competition rank within the class, ties share
  classSize: number;
  attendance: AttendanceSummaryDTO | null;
};

export type YearlyReportDTO = {
  student: { id: string; firstName: string; lastName: string };
  class: { id: string; name: string };
  level: { id: string; name: string };
  academicYear: { id: string; name: string };
  terms: TermDTO[];
  subjects: {
    subjectId: string;
    name: string;
    scores: { termId: string; score: number | null; remark: string | null }[];
    average: number | null; // mean of the term scores that exist
  }[];
  overallAverage: number | null; // mean of the per-subject averages
  attendance: AttendanceSummaryDTO | null;
};

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

type TermMonths = {
  id: string;
  name: string;
  sortOrder: number;
  startMonth: number;
  endMonth: number;
};

function termDTO(term: TermMonths): TermDTO {
  return {
    id: term.id,
    name: term.name,
    sortOrder: term.sortOrder,
    startMonth: term.startMonth,
    endMonth: term.endMonth,
  };
}

// Terms do not cross the calendar-year boundary. Resolve which calendar year a
// term falls in for a given academic year (which usually spans two years): a
// term starting on/after the year's start month is in the start year, otherwise
// in the end year. Returns null when the year has no bounds.
export function resolveTermDates(
  term: { startMonth: number; endMonth: number },
  academicYear: { startDate: Date | null; endDate: Date | null },
): { startDate: Date; endDate: Date } | null {
  if (!academicYear.startDate || !academicYear.endDate) return null;

  const startYear = academicYear.startDate.getUTCFullYear();
  const endYear = academicYear.endDate.getUTCFullYear();
  const yearStartMonth = academicYear.startDate.getUTCMonth() + 1;
  const calendarYear = term.startMonth >= yearStartMonth ? startYear : endYear;

  return {
    startDate: new Date(Date.UTC(calendarYear, term.startMonth - 1, 1)),
    endDate: new Date(Date.UTC(calendarYear, term.endMonth, 0)),
  };
}

export type AttendancePeriodDTO = {
  termId: string;
  name: string;
  sortOrder: number;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  isCurrent: boolean; // today falls within the period
};

export type AttendancePeriodsDTO = {
  academicYear: { id: string; name: string } | null;
  periods: AttendancePeriodDTO[];
};

// The global periods resolved to concrete dates for the current academic year,
// in order. Used to scope attendance per period.
export async function listAttendancePeriods(): Promise<AttendancePeriodsDTO> {
  const academicYear =
    (await prisma.academicYear.findFirst({
      where: { isCurrent: true },
      select: { id: true, name: true, startDate: true, endDate: true },
    })) ??
    (await prisma.academicYear.findFirst({
      orderBy: { name: "desc" },
      select: { id: true, name: true, startDate: true, endDate: true },
    }));

  if (!academicYear) return { academicYear: null, periods: [] };

  const terms = await prisma.term.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      sortOrder: true,
      startMonth: true,
      endMonth: true,
    },
  });

  const today = toDateOnly(new Date()) ?? "";
  const periods: AttendancePeriodDTO[] = [];
  for (const term of terms) {
    const dates = resolveTermDates(term, academicYear);
    if (!dates) continue;
    const startDate = toDateOnly(dates.startDate);
    const endDate = toDateOnly(dates.endDate);
    if (!startDate || !endDate) continue;
    periods.push({
      termId: term.id,
      name: term.name,
      sortOrder: term.sortOrder,
      startDate,
      endDate,
      isCurrent: today >= startDate && today <= endDate,
    });
  }

  return {
    academicYear: { id: academicYear.id, name: academicYear.name },
    periods,
  };
}

export async function getLevelSubjects(levelId: string): Promise<SubjectDTO[]> {
  return prisma.subject.findMany({
    where: { levelId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sortOrder: true, isActive: true },
  });
}

// Grid to enter grades: roster (rows) × level subjects (columns) for one term of
// one academic year.
export async function getClassGradeSheet(params: {
  classId: string;
  termId: string;
  academicYearId: string;
}): Promise<ClassGradeSheetDTO | null> {
  const [schoolClass, term, academicYear] = await Promise.all([
    prisma.schoolClass.findUnique({
      where: { id: params.classId },
      select: { id: true, name: true, level: { select: { id: true, name: true } } },
    }),
    prisma.term.findUnique({
      where: { id: params.termId },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        startMonth: true,
        endMonth: true,
      },
    }),
    prisma.academicYear.findUnique({
      where: { id: params.academicYearId },
      select: { id: true, name: true },
    }),
  ]);

  if (!schoolClass || !term || !academicYear) return null;

  const [subjects, roster, grades] = await Promise.all([
    getLevelSubjects(schoolClass.level.id),
    getClassRoster(params.classId),
    prisma.grade.findMany({
      where: {
        classId: params.classId,
        termId: params.termId,
        academicYearId: params.academicYearId,
      },
      select: { studentId: true, subjectId: true, score: true, remark: true },
    }),
  ]);

  const byStudent = new Map<string, Record<string, GradeSheetCellDTO>>();
  for (const grade of grades) {
    const cells = byStudent.get(grade.studentId) ?? {};
    cells[grade.subjectId] = { score: grade.score, remark: grade.remark };
    byStudent.set(grade.studentId, cells);
  }

  return {
    class: { id: schoolClass.id, name: schoolClass.name },
    level: schoolClass.level,
    term: termDTO(term),
    academicYear,
    subjects,
    students: roster.map((student) => ({
      ...student,
      cells: byStudent.get(student.studentId) ?? {},
    })),
  };
}

async function attendanceSummary(
  studentId: string,
  from: Date | null,
  to: Date | null,
): Promise<AttendanceSummaryDTO | null> {
  if (!from || !to) return null;

  const groups = await prisma.attendance.groupBy({
    by: ["status"],
    where: { studentId, date: { gte: from, lte: to } },
    _count: { _all: true },
  });

  const counts: Record<AttendanceStatus, number> = {
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    VERY_LATE: 0,
    EXCUSED: 0,
  };
  for (const group of groups) counts[group.status] = group._count._all;

  const total =
    counts.PRESENT + counts.ABSENT + counts.LATE + counts.VERY_LATE + counts.EXCUSED;
  const attended = counts.PRESENT + counts.LATE + counts.VERY_LATE;
  return {
    present: counts.PRESENT,
    absent: counts.ABSENT,
    late: counts.LATE,
    veryLate: counts.VERY_LATE,
    excused: counts.EXCUSED,
    total,
    presenceRate: total > 0 ? attended / total : null,
  };
}

// Resolves the class a report belongs to: prefer the class recorded on the
// student's grades for the term/year, otherwise their current active enrollment.
async function resolveReportClass(
  studentId: string,
  termId: string,
  academicYearId: string,
): Promise<{ id: string; name: string; level: { id: string; name: string } } | null> {
  const graded = await prisma.grade.findFirst({
    where: { studentId, termId, academicYearId },
    select: { class: { select: { id: true, name: true, level: { select: { id: true, name: true } } } } },
  });
  if (graded) return graded.class;

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId, status: "active" },
    select: { class: { select: { id: true, name: true, level: { select: { id: true, name: true } } } } },
    orderBy: { startDate: "desc" },
  });
  return enrollment?.class ?? null;
}

export async function getStudentPeriodReport(params: {
  studentId: string;
  termId: string;
  academicYearId: string;
}): Promise<PeriodReportDTO | null> {
  const [student, term, academicYear] = await Promise.all([
    prisma.student.findUnique({
      where: { id: params.studentId },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.term.findUnique({
      where: { id: params.termId },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        startMonth: true,
        endMonth: true,
      },
    }),
    prisma.academicYear.findUnique({
      where: { id: params.academicYearId },
      select: { id: true, name: true, startDate: true, endDate: true },
    }),
  ]);
  if (!student || !term || !academicYear) return null;

  const schoolClass = await resolveReportClass(
    student.id,
    term.id,
    academicYear.id,
  );
  if (!schoolClass) return null;

  const [subjects, grades, classGrades, classSize] = await Promise.all([
    getLevelSubjects(schoolClass.level.id),
    prisma.grade.findMany({
      where: {
        studentId: student.id,
        termId: term.id,
        academicYearId: academicYear.id,
      },
      select: { subjectId: true, score: true, remark: true },
    }),
    prisma.grade.findMany({
      where: {
        classId: schoolClass.id,
        termId: term.id,
        academicYearId: academicYear.id,
        score: { not: null },
      },
      select: { studentId: true, score: true },
    }),
    prisma.enrollment.count({ where: { classId: schoolClass.id, status: "active" } }),
  ]);

  const gradeBySubject = new Map(grades.map((grade) => [grade.subjectId, grade]));
  const subjectRows = subjects.map((subject) => {
    const grade = gradeBySubject.get(subject.id);
    return {
      subjectId: subject.id,
      name: subject.name,
      score: grade?.score ?? null,
      remark: grade?.remark ?? null,
    };
  });

  const scores = subjectRows
    .map((row) => row.score)
    .filter((score): score is number => score !== null);
  const average = mean(scores);

  // Competition ranking among the class: students with a strictly higher
  // average rank above; ties share the position.
  let rank: number | null = null;
  if (average !== null) {
    const totals = new Map<string, { sum: number; count: number }>();
    for (const grade of classGrades) {
      if (grade.score === null) continue;
      const total = totals.get(grade.studentId) ?? { sum: 0, count: 0 };
      total.sum += grade.score;
      total.count += 1;
      totals.set(grade.studentId, total);
    }
    let better = 0;
    for (const total of totals.values()) {
      const studentAverage = total.sum / total.count;
      if (studentAverage > average + 1e-9) better += 1;
    }
    rank = better + 1;
  }

  const dates = resolveTermDates(term, academicYear);

  return {
    student,
    class: { id: schoolClass.id, name: schoolClass.name },
    level: schoolClass.level,
    term: termDTO(term),
    academicYear: { id: academicYear.id, name: academicYear.name },
    subjects: subjectRows,
    average,
    gradedCount: scores.length,
    rank,
    classSize,
    attendance: await attendanceSummary(
      student.id,
      dates?.startDate ?? null,
      dates?.endDate ?? null,
    ),
  };
}

export async function getStudentYearlyReport(params: {
  studentId: string;
  academicYearId: string;
}): Promise<YearlyReportDTO | null> {
  const [student, academicYear] = await Promise.all([
    prisma.student.findUnique({
      where: { id: params.studentId },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.academicYear.findUnique({
      where: { id: params.academicYearId },
      select: { id: true, name: true, startDate: true, endDate: true },
    }),
  ]);
  if (!student || !academicYear) return null;

  // Terms are global; every year uses the same ordered list.
  const terms = await prisma.term.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      sortOrder: true,
      startMonth: true,
      endMonth: true,
    },
  });
  if (terms.length === 0) return null;

  const termIds = terms.map((term) => term.id);

  // Same class resolution as the period report, across any of the terms.
  let schoolClass = null as Awaited<ReturnType<typeof resolveReportClass>>;
  for (const term of terms) {
    schoolClass = await resolveReportClass(student.id, term.id, academicYear.id);
    if (schoolClass) break;
  }
  if (!schoolClass) return null;

  const [subjects, grades] = await Promise.all([
    getLevelSubjects(schoolClass.level.id),
    prisma.grade.findMany({
      where: {
        studentId: student.id,
        academicYearId: academicYear.id,
        termId: { in: termIds },
      },
      select: { subjectId: true, termId: true, score: true, remark: true },
    }),
  ]);

  const bySubject = new Map<string, Map<string, { score: number | null; remark: string | null }>>();
  for (const grade of grades) {
    const perTerm = bySubject.get(grade.subjectId) ?? new Map();
    perTerm.set(grade.termId, { score: grade.score, remark: grade.remark });
    bySubject.set(grade.subjectId, perTerm);
  }

  const subjectRows = subjects.map((subject) => {
    const perTerm = bySubject.get(subject.id);
    const scores = terms.map((term) => {
      const grade = perTerm?.get(term.id);
      return { termId: term.id, score: grade?.score ?? null, remark: grade?.remark ?? null };
    });
    const present = scores
      .map((entry) => entry.score)
      .filter((score): score is number => score !== null);
    return { subjectId: subject.id, name: subject.name, scores, average: mean(present) };
  });

  const subjectAverages = subjectRows
    .map((row) => row.average)
    .filter((value): value is number => value !== null);

  // Overall attendance spans the earliest start to the latest end of the terms
  // whose dates can be resolved.
  const resolvedDates = terms
    .map((term) => resolveTermDates(term, academicYear))
    .filter((dates): dates is { startDate: Date; endDate: Date } => dates !== null);
  const from = resolvedDates.length > 0
    ? new Date(Math.min(...resolvedDates.map((dates) => dates.startDate.getTime())))
    : null;
  const to = resolvedDates.length > 0
    ? new Date(Math.max(...resolvedDates.map((dates) => dates.endDate.getTime())))
    : null;

  return {
    student,
    class: { id: schoolClass.id, name: schoolClass.name },
    level: schoolClass.level,
    academicYear: { id: academicYear.id, name: academicYear.name },
    terms: terms.map(termDTO),
    subjects: subjectRows,
    overallAverage: mean(subjectAverages),
    attendance: await attendanceSummary(student.id, from, to),
  };
}
