import "server-only";

import { prisma } from "@/lib/prisma";
import { getClassRoster } from "@/lib/attendance";
import { toDateOnly } from "@/lib/dates";
import type { AttendanceStatus } from "@/generated/prisma/enums";

// Read side of subjects / terms / exams / grades. Reports are computed on read —
// no averages or ranks are stored. Server-only: use from Server Components and
// Server Actions, never Client Components.
//
// A `Term` is a global period definition (month range); an `Exam` is scoped to
// an academic year. Concrete term dates are derived per year for attendance
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

export type ExamDTO = {
  id: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  termId: string;
  termName: string;
  academicYearId: string;
  academicYearName: string;
  // Teacher-chosen label, e.g. "Hoofdstuk 1".
  title: string;
  date: string; // yyyy-mm-dd
  coefficient: number;
  gradedCount: number;
};

export type ExamSheetStudentDTO = {
  studentId: string;
  firstName: string;
  lastName: string;
  image: string | null;
  score: number | null;
  remark: string | null;
};

export type ExamGradeSheetDTO = {
  exam: ExamDTO;
  class: { id: string; name: string };
  subject: { id: string; name: string };
  term: TermDTO;
  academicYear: { id: string; name: string };
  students: ExamSheetStudentDTO[];
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

export type ReportExamScoreDTO = {
  examId: string;
  title: string;
  date: string; // yyyy-mm-dd
  coefficient: number;
  score: number | null;
};

export type ReportSubjectDTO = {
  subjectId: string;
  name: string;
  exams: ReportExamScoreDTO[];
  // Coefficient-weighted mean of this subject's non-null exam scores.
  average: number | null;
};

export type StudentPeriodReportDTO = {
  student: { id: string; firstName: string; lastName: string; image: string | null };
  class: { id: string; name: string };
  term: TermDTO;
  academicYear: { id: string; name: string };
  subjects: ReportSubjectDTO[];
  overallAverage: number | null; // mean of the per-subject averages
  rank: number | null; // competition rank within the class, ties share
  classSize: number;
  attendance: AttendanceSummaryDTO | null;
  observation: string | null; // teacher's observation for this period report
};

export type ClassReportStudentDTO = {
  studentId: string;
  firstName: string;
  lastName: string;
  image: string | null;
  averages: Record<string, number | null>; // keyed by subjectId
  overallAverage: number | null;
  rank: number | null;
  attendance: AttendanceSummaryDTO | null;
  observation: string | null;
};

export type ClassPeriodReportDTO = {
  class: { id: string; name: string };
  term: TermDTO;
  academicYear: { id: string; name: string };
  subjects: { id: string; name: string }[];
  students: ClassReportStudentDTO[];
};

export type YearSubjectDTO = {
  subjectId: string;
  name: string;
  periods: { termId: string; name: string; average: number | null }[];
  // Mean of the non-null period averages.
  average: number | null;
};

export type StudentYearReportDTO = {
  student: { id: string; firstName: string; lastName: string; image: string | null };
  class: { id: string; name: string };
  academicYear: { id: string; name: string };
  periods: { id: string; name: string }[];
  subjects: YearSubjectDTO[];
  overallAverage: number | null; // mean of the per-subject year averages
  classSize: number;
  attendance: AttendanceSummaryDTO | null; // whole year
  observation: string | null; // teacher's observation for this year report
};

export type ClassYearReportStudentDTO = {
  studentId: string;
  firstName: string;
  lastName: string;
  image: string | null;
  averages: Record<string, number | null>; // keyed by subjectId
  // Per-subject period averages, aligned with `ClassYearReportDTO.periods`.
  periodAverages: Record<string, (number | null)[]>;
  overallAverage: number | null;
  rank: number | null;
  attendance: AttendanceSummaryDTO | null;
  observation: string | null;
};

export type ClassYearReportDTO = {
  class: { id: string; name: string };
  academicYear: { id: string; name: string };
  periods: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  students: ClassYearReportStudentDTO[];
};

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedMean(entries: { score: number; coefficient: number }[]): number | null {
  const scored = entries.filter((entry) => entry.coefficient > 0);
  if (scored.length === 0) return null;
  const weight = scored.reduce((sum, entry) => sum + entry.coefficient, 0);
  if (weight === 0) return null;
  return scored.reduce((sum, entry) => sum + entry.score * entry.coefficient, 0) / weight;
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

// The global periods resolved to concrete dates for one academic year, in
// order. Used by the grades/report selectors.
export async function listPeriodsForYear(
  academicYearId: string,
): Promise<AttendancePeriodDTO[]> {
  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
    select: { id: true, name: true, startDate: true, endDate: true },
  });
  if (!academicYear) return [];

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

  return periods;
}

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

  return {
    academicYear: { id: academicYear.id, name: academicYear.name },
    periods: await listPeriodsForYear(academicYear.id),
  };
}

export async function getLevelSubjects(levelId: string): Promise<SubjectDTO[]> {
  return prisma.subject.findMany({
    where: { levelId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sortOrder: true, isActive: true },
  });
}

type ExamRow = {
  id: string;
  classId: string;
  subjectId: string;
  termId: string;
  academicYearId: string;
  title: string;
  date: Date;
  coefficient: number;
  subject: { name: string };
  term: { id: string; name: string; sortOrder: number; startMonth: number; endMonth: number };
  academicYear: { name: string };
  _count: { grades: number };
};

function examDTO(exam: ExamRow): ExamDTO {
  return {
    id: exam.id,
    classId: exam.classId,
    subjectId: exam.subjectId,
    subjectName: exam.subject.name,
    termId: exam.termId,
    termName: exam.term.name,
    academicYearId: exam.academicYearId,
    academicYearName: exam.academicYear.name,
    title: exam.title,
    date: toDateOnly(exam.date) ?? "",
    coefficient: exam.coefficient,
    gradedCount: exam._count.grades,
  };
}

const EXAM_INCLUDE = {
  subject: { select: { name: true } },
  term: { select: { id: true, name: true, sortOrder: true, startMonth: true, endMonth: true } },
  academicYear: { select: { name: true } },
  _count: { select: { grades: { where: { score: { not: null } } } } },
} as const;

// Exams for a class / period / year, optionally narrowed to one subject.
export async function listExams(params: {
  classId: string;
  termId: string;
  academicYearId: string;
  subjectId?: string;
}): Promise<ExamDTO[]> {
  const exams = await prisma.exam.findMany({
    where: {
      classId: params.classId,
      termId: params.termId,
      academicYearId: params.academicYearId,
      ...(params.subjectId ? { subjectId: params.subjectId } : {}),
    },
    orderBy: [
      { subject: { sortOrder: "asc" } },
      { subject: { name: "asc" } },
      { date: "asc" },
    ],
    include: EXAM_INCLUDE,
  });

  return exams.map(examDTO);
}

// Single exam plus the active roster with each student's score (null when not
// graded yet). Grade entry mirrors the attendance sheet.
export async function getExamGradeSheet(examId: string): Promise<ExamGradeSheetDTO | null> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      class: { select: { id: true, name: true } },
      ...EXAM_INCLUDE,
    },
  });
  if (!exam) return null;

  const [roster, grades] = await Promise.all([
    getClassRoster(exam.classId),
    prisma.grade.findMany({
      where: { examId },
      select: { studentId: true, score: true, remark: true },
    }),
  ]);

  const byStudent = new Map(grades.map((grade) => [grade.studentId, grade]));

  return {
    exam: examDTO(exam),
    class: exam.class,
    subject: { id: exam.subjectId, name: exam.subject.name },
    term: termDTO(exam.term),
    academicYear: { id: exam.academicYearId, name: exam.academicYear.name },
    students: roster.map((student) => {
      const grade = byStudent.get(student.studentId);
      return {
        ...student,
        score: grade?.score ?? null,
        remark: grade?.remark ?? null,
      };
    }),
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

  return summarize(groups);
}

function emptyCounts(): Record<AttendanceStatus, number> {
  return { PRESENT: 0, ABSENT: 0, LATE: 0, VERY_LATE: 0, EXCUSED: 0 };
}

function summarize(
  groups: { status: AttendanceStatus; _count: { _all: number } }[],
): AttendanceSummaryDTO {
  const counts = emptyCounts();
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

// Attendance summaries for many students at once, keyed by studentId.
async function attendanceSummaries(
  studentIds: string[],
  from: Date | null,
  to: Date | null,
): Promise<Map<string, AttendanceSummaryDTO> | null> {
  if (!from || !to || studentIds.length === 0) return null;

  const groups = await prisma.attendance.groupBy({
    by: ["studentId", "status"],
    where: { studentId: { in: studentIds }, date: { gte: from, lte: to } },
    _count: { _all: true },
  });

  const byStudent = new Map<string, { status: AttendanceStatus; _count: { _all: number } }[]>();
  for (const group of groups) {
    const list = byStudent.get(group.studentId) ?? [];
    list.push({ status: group.status, _count: group._count });
    byStudent.set(group.studentId, list);
  }

  const result = new Map<string, AttendanceSummaryDTO>();
  for (const studentId of studentIds) {
    result.set(studentId, summarize(byStudent.get(studentId) ?? []));
  }
  return result;
}

// Resolves the class a report belongs to: prefer the class that has exams the
// student is graded on for the term/year, otherwise their current active
// enrollment.
async function resolveReportClass(
  studentId: string,
  termId: string,
  academicYearId: string,
): Promise<{ id: string; name: string } | null> {
  const graded = await prisma.exam.findFirst({
    where: {
      termId,
      academicYearId,
      grades: { some: { studentId, score: { not: null } } },
    },
    select: { class: { select: { id: true, name: true } } },
  });
  if (graded) return graded.class;

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId, status: "active" },
    select: { class: { select: { id: true, name: true } } },
    orderBy: { startDate: "desc" },
  });
  return enrollment?.class ?? null;
}

type ExamWithScore = {
  id: string;
  subjectId: string;
  title: string;
  date: Date;
  coefficient: number;
  score: number | null;
};

type SubjectGradeRow = {
  subjectId: string;
  name: string;
  exams: ExamWithScore[];
  average: number | null;
};

function buildSubjectRows(
  subjects: { id: string; name: string }[],
  exams: ExamWithScore[],
): SubjectGradeRow[] {
  const bySubject = new Map<string, ExamWithScore[]>();
  for (const exam of exams) {
    const list = bySubject.get(exam.subjectId) ?? [];
    list.push(exam);
    bySubject.set(exam.subjectId, list);
  }

  return subjects.map((subject) => {
    const subjectExams = (bySubject.get(subject.id) ?? []).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
    const average = weightedMean(
      subjectExams
        .filter((exam): exam is ExamWithScore & { score: number } => exam.score !== null)
        .map((exam) => ({ score: exam.score, coefficient: exam.coefficient })),
    );
    return { subjectId: subject.id, name: subject.name, exams: subjectExams, average };
  });
}

// Per-student period report: every subject with its exams and weighted average,
// an overall average, competition rank in the class, and attendance.
export async function getStudentPeriodReport(params: {
  studentId: string;
  termId: string;
  academicYearId: string;
}): Promise<StudentPeriodReportDTO | null> {
  const [student, term, academicYear] = await Promise.all([
    prisma.student.findUnique({
      where: { id: params.studentId },
      select: { id: true, firstName: true, lastName: true, image: true },
    }),
    prisma.term.findUnique({
      where: { id: params.termId },
      select: { id: true, name: true, sortOrder: true, startMonth: true, endMonth: true },
    }),
    prisma.academicYear.findUnique({
      where: { id: params.academicYearId },
      select: { id: true, name: true, startDate: true, endDate: true },
    }),
  ]);
  if (!student || !term || !academicYear) return null;

  const schoolClass = await resolveReportClass(student.id, term.id, academicYear.id);
  if (!schoolClass) return null;

  const [subjects, exams, grades, classGrades, classSize, observationRow] = await Promise.all([
    getLevelSubjects(await classLevelId(schoolClass.id)),
    prisma.exam.findMany({
      where: {
        classId: schoolClass.id,
        termId: term.id,
        academicYearId: academicYear.id,
      },
      select: { id: true, subjectId: true, title: true, date: true, coefficient: true },
      orderBy: { date: "asc" },
    }),
    prisma.grade.findMany({
      where: {
        studentId: student.id,
        exam: { classId: schoolClass.id, termId: term.id, academicYearId: academicYear.id },
      },
      select: { examId: true, score: true },
    }),
    prisma.grade.findMany({
      where: {
        exam: { classId: schoolClass.id, termId: term.id, academicYearId: academicYear.id },
        score: { not: null },
      },
      select: { studentId: true, score: true, exam: { select: { subjectId: true, coefficient: true } } },
    }),
    prisma.enrollment.count({ where: { classId: schoolClass.id, status: "active" } }),
    prisma.periodReportObservation.findUnique({
      where: {
        studentId_termId_academicYearId: {
          studentId: student.id,
          termId: term.id,
          academicYearId: academicYear.id,
        },
      },
      select: { body: true },
    }),
  ]);

  const scoreByExam = new Map(grades.map((grade) => [grade.examId, grade.score]));
  const studentExams: ExamWithScore[] = exams.map((exam) => ({
    id: exam.id,
    subjectId: exam.subjectId,
    title: exam.title,
    date: exam.date,
    coefficient: exam.coefficient,
    score: scoreByExam.get(exam.id) ?? null,
  }));

  const subjectRows = buildSubjectRows(subjects, studentExams);
  const overallAverage = mean(
    subjectRows
      .map((row) => row.average)
      .filter((value): value is number => value !== null),
  );

  const rank = computeRank(classGrades, subjects, student.id);

  const dates = resolveTermDates(term, academicYear);

  return {
    student,
    class: { id: schoolClass.id, name: schoolClass.name },
    term: termDTO(term),
    academicYear: { id: academicYear.id, name: academicYear.name },
    subjects: subjectRows.map((row) => ({
      subjectId: row.subjectId,
      name: row.name,
      exams: row.exams.map((exam) => ({
        examId: exam.id,
        title: exam.title,
        date: toDateOnly(exam.date) ?? "",
        coefficient: exam.coefficient,
        score: exam.score,
      })),
      average: row.average,
    })),
    overallAverage,
    rank,
    classSize,
    attendance: await attendanceSummary(
      student.id,
      dates?.startDate ?? null,
      dates?.endDate ?? null,
    ),
    observation: observationRow?.body ?? null,
  };
}

async function classLevelId(classId: string): Promise<string> {
  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: { levelId: true },
  });
  return schoolClass?.levelId ?? "";
}

// Competition ranking among the class: students with a strictly higher overall
// average rank above; ties share the position.
function computeRank(
  classGrades: {
    studentId: string;
    score: number | null;
    exam: { subjectId: string; coefficient: number };
  }[],
  subjects: { id: string }[],
  studentId: string,
): number | null {
  const overallByStudent = new Map<string, number>();
  const subjectIds = subjects.map((subject) => subject.id);
  const byStudentGrades = new Map<string, typeof classGrades>();
  for (const grade of classGrades) {
    const list = byStudentGrades.get(grade.studentId) ?? [];
    list.push(grade);
    byStudentGrades.set(grade.studentId, list);
  }

  for (const [id, grades] of byStudentGrades) {
    const averages: number[] = [];
    for (const subjectId of subjectIds) {
      const subjectGrades = grades.filter(
        (grade) => grade.exam.subjectId === subjectId && grade.score !== null,
      );
      const average = weightedMean(
        subjectGrades.map((grade) => ({ score: grade.score as number, coefficient: grade.exam.coefficient })),
      );
      if (average !== null) averages.push(average);
    }
    const overall = mean(averages);
    if (overall !== null) overallByStudent.set(id, overall);
  }

  const mine = overallByStudent.get(studentId);
  if (mine === undefined) return null;

  let better = 0;
  for (const value of overallByStudent.values()) {
    if (value > mine + 1e-9) better += 1;
  }
  return better + 1;
}

// Period report for a whole class: subject averages, overall average, rank and
// attendance per student. Rendered as the class report card table.
export async function getClassPeriodReport(params: {
  classId: string;
  termId: string;
  academicYearId: string;
}): Promise<ClassPeriodReportDTO | null> {
  const [schoolClass, term, academicYear] = await Promise.all([
    prisma.schoolClass.findUnique({
      where: { id: params.classId },
      select: { id: true, name: true, levelId: true },
    }),
    prisma.term.findUnique({
      where: { id: params.termId },
      select: { id: true, name: true, sortOrder: true, startMonth: true, endMonth: true },
    }),
    prisma.academicYear.findUnique({
      where: { id: params.academicYearId },
      select: { id: true, name: true, startDate: true, endDate: true },
    }),
  ]);
  if (!schoolClass || !term || !academicYear) return null;

  const [subjects, roster, grades, observations] = await Promise.all([
    getLevelSubjects(schoolClass.levelId),
    getClassRoster(schoolClass.id),
    prisma.grade.findMany({
      where: {
        exam: { classId: schoolClass.id, termId: term.id, academicYearId: academicYear.id },
      },
      select: { studentId: true, score: true, exam: { select: { subjectId: true, coefficient: true } } },
    }),
    prisma.periodReportObservation.findMany({
      where: { termId: term.id, academicYearId: academicYear.id },
      select: { studentId: true, body: true },
    }),
  ]);

  const observationByStudent = new Map(observations.map((row) => [row.studentId, row.body]));

  const gradesByStudent = new Map<string, typeof grades>();
  for (const grade of grades) {
    const list = gradesByStudent.get(grade.studentId) ?? [];
    list.push(grade);
    gradesByStudent.set(grade.studentId, list);
  }

  const averagesByStudent = new Map<string, Record<string, number | null>>();
  const overallByStudent = new Map<string, number | null>();
  for (const student of roster) {
    const studentGrades = gradesByStudent.get(student.studentId) ?? [];
    const averages: Record<string, number | null> = {};
    for (const subject of subjects) {
      const subjectGrades = studentGrades.filter(
        (grade) => grade.exam.subjectId === subject.id && grade.score !== null,
      );
      averages[subject.id] = weightedMean(
        subjectGrades.map((grade) => ({ score: grade.score as number, coefficient: grade.exam.coefficient })),
      );
    }
    averagesByStudent.set(student.studentId, averages);
    overallByStudent.set(
      student.studentId,
      mean(
        subjects
          .map((subject) => averages[subject.id])
          .filter((value): value is number => value !== null),
      ),
    );
  }

  const ranked = [...overallByStudent.entries()].filter(
    (entry): entry is [string, number] => entry[1] !== null,
  );
  const rankByStudent = new Map<string, number>();
  for (const [studentId, value] of ranked) {
    let better = 0;
    for (const [, other] of ranked) {
      if (other > value + 1e-9) better += 1;
    }
    rankByStudent.set(studentId, better + 1);
  }

  const dates = resolveTermDates(term, academicYear);
  const attendance = await attendanceSummaries(
    roster.map((student) => student.studentId),
    dates?.startDate ?? null,
    dates?.endDate ?? null,
  );

  return {
    class: { id: schoolClass.id, name: schoolClass.name },
    term: termDTO(term),
    academicYear: { id: academicYear.id, name: academicYear.name },
    subjects: subjects.map((subject) => ({ id: subject.id, name: subject.name })),
    students: roster.map((student) => ({
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      image: student.image,
      averages: averagesByStudent.get(student.studentId) ?? {},
      overallAverage: overallByStudent.get(student.studentId) ?? null,
      rank: rankByStudent.get(student.studentId) ?? null,
      attendance: attendance?.get(student.studentId) ?? null,
      observation: observationByStudent.get(student.studentId) ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Year reports. Terms are global, so every academic year uses the same ordered
// period list. A subject's year average is the mean of its (non-null) period
// averages; the overall average is the mean of the subject year averages.
// ---------------------------------------------------------------------------

async function listGlobalTerms(): Promise<TermMonths[]> {
  return prisma.term.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, sortOrder: true, startMonth: true, endMonth: true },
  });
}

// Whole-year attendance window: earliest period start → latest period end.
function yearBounds(
  terms: TermMonths[],
  academicYear: { startDate: Date | null; endDate: Date | null },
): { from: Date | null; to: Date | null } {
  const resolved = terms
    .map((term) => resolveTermDates(term, academicYear))
    .filter((dates): dates is { startDate: Date; endDate: Date } => dates !== null);
  if (resolved.length === 0) return { from: null, to: null };
  return {
    from: new Date(Math.min(...resolved.map((dates) => dates.startDate.getTime()))),
    to: new Date(Math.max(...resolved.map((dates) => dates.endDate.getTime()))),
  };
}

// Prefer the class the student has graded exams in that year, else their
// current active enrollment.
async function resolveReportClassForYear(
  studentId: string,
  academicYearId: string,
): Promise<{ id: string; name: string } | null> {
  const graded = await prisma.exam.findFirst({
    where: {
      academicYearId,
      grades: { some: { studentId, score: { not: null } } },
    },
    select: { class: { select: { id: true, name: true } } },
  });
  if (graded) return graded.class;

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId, status: "active" },
    select: { class: { select: { id: true, name: true } } },
    orderBy: { startDate: "desc" },
  });
  return enrollment?.class ?? null;
}

type YearExamRow = {
  id: string;
  subjectId: string;
  termId: string;
  coefficient: number;
};

function buildYearSubjectRows(
  subjects: { id: string; name: string }[],
  exams: YearExamRow[],
  terms: { id: string; name: string }[],
  scoreByExam: Map<string, number | null>,
): YearSubjectDTO[] {
  return subjects.map((subject) => {
    const periods = terms.map((term) => {
      const entries: { score: number; coefficient: number }[] = [];
      for (const exam of exams) {
        if (exam.subjectId !== subject.id || exam.termId !== term.id) continue;
        const score = scoreByExam.get(exam.id);
        if (score !== null && score !== undefined) {
          entries.push({ score, coefficient: exam.coefficient });
        }
      }
      return { termId: term.id, name: term.name, average: weightedMean(entries) };
    });
    const average = mean(
      periods
        .map((period) => period.average)
        .filter((value): value is number => value !== null),
    );
    return { subjectId: subject.id, name: subject.name, periods, average };
  });
}

// Per-student year report: for every subject the three period averages and the
// year average, the overall average, and attendance across the whole year.
export async function getStudentYearReport(params: {
  studentId: string;
  academicYearId: string;
}): Promise<StudentYearReportDTO | null> {
  const [student, academicYear] = await Promise.all([
    prisma.student.findUnique({
      where: { id: params.studentId },
      select: { id: true, firstName: true, lastName: true, image: true },
    }),
    prisma.academicYear.findUnique({
      where: { id: params.academicYearId },
      select: { id: true, name: true, startDate: true, endDate: true },
    }),
  ]);
  if (!student || !academicYear) return null;

  const schoolClass = await resolveReportClassForYear(student.id, academicYear.id);
  if (!schoolClass) return null;

  const [subjects, terms, exams, grades, classSize, observationRow] = await Promise.all([
    getLevelSubjects(await classLevelId(schoolClass.id)),
    listGlobalTerms(),
    prisma.exam.findMany({
      where: { classId: schoolClass.id, academicYearId: academicYear.id },
      select: { id: true, subjectId: true, termId: true, coefficient: true },
    }),
    prisma.grade.findMany({
      where: {
        studentId: student.id,
        exam: { classId: schoolClass.id, academicYearId: academicYear.id },
      },
      select: { examId: true, score: true },
    }),
    prisma.enrollment.count({ where: { classId: schoolClass.id, status: "active" } }),
    prisma.yearReportObservation.findUnique({
      where: {
        studentId_academicYearId: {
          studentId: student.id,
          academicYearId: academicYear.id,
        },
      },
      select: { body: true },
    }),
  ]);

  const scoreByExam = new Map(grades.map((grade) => [grade.examId, grade.score]));
  const subjectRows = buildYearSubjectRows(subjects, exams, terms, scoreByExam);
  const overallAverage = mean(
    subjectRows
      .map((row) => row.average)
      .filter((value): value is number => value !== null),
  );

  const bounds = yearBounds(terms, academicYear);

  return {
    student,
    class: { id: schoolClass.id, name: schoolClass.name },
    academicYear: { id: academicYear.id, name: academicYear.name },
    periods: terms.map((term) => ({ id: term.id, name: term.name })),
    subjects: subjectRows,
    overallAverage,
    classSize,
    attendance: await attendanceSummary(student.id, bounds.from, bounds.to),
    observation: observationRow?.body ?? null,
  };
}

// Year report for a whole class: subject year averages, overall average, rank
// and whole-year attendance per student. Backs the class year overview table.
export async function getClassYearReport(params: {
  classId: string;
  academicYearId: string;
}): Promise<ClassYearReportDTO | null> {
  const [schoolClass, academicYear] = await Promise.all([
    prisma.schoolClass.findUnique({
      where: { id: params.classId },
      select: { id: true, name: true, levelId: true },
    }),
    prisma.academicYear.findUnique({
      where: { id: params.academicYearId },
      select: { id: true, name: true, startDate: true, endDate: true },
    }),
  ]);
  if (!schoolClass || !academicYear) return null;

  const [subjects, roster, terms, exams, grades, observations] = await Promise.all([
    getLevelSubjects(schoolClass.levelId),
    getClassRoster(schoolClass.id),
    listGlobalTerms(),
    prisma.exam.findMany({
      where: { classId: schoolClass.id, academicYearId: academicYear.id },
      select: { id: true, subjectId: true, termId: true, coefficient: true },
    }),
    prisma.grade.findMany({
      where: {
        exam: { classId: schoolClass.id, academicYearId: academicYear.id },
      },
      select: { studentId: true, examId: true, score: true },
    }),
    prisma.yearReportObservation.findMany({
      where: { academicYearId: academicYear.id },
      select: { studentId: true, body: true },
    }),
  ]);

  const observationByStudent = new Map(observations.map((row) => [row.studentId, row.body]));

  const scoresByStudent = new Map<string, Map<string, number | null>>();
  for (const grade of grades) {
    const perStudent = scoresByStudent.get(grade.studentId) ?? new Map<string, number | null>();
    perStudent.set(grade.examId, grade.score);
    scoresByStudent.set(grade.studentId, perStudent);
  }

  const averagesByStudent = new Map<string, Record<string, number | null>>();
  const periodAveragesByStudent = new Map<string, Record<string, (number | null)[]>>();
  const overallByStudent = new Map<string, number | null>();
  for (const student of roster) {
    const scoreByExam = scoresByStudent.get(student.studentId) ?? new Map<string, number | null>();
    const subjectRows = buildYearSubjectRows(subjects, exams, terms, scoreByExam);
    const averages: Record<string, number | null> = {};
    const periodAverages: Record<string, (number | null)[]> = {};
    for (const row of subjectRows) {
      averages[row.subjectId] = row.average;
      periodAverages[row.subjectId] = row.periods.map((period) => period.average);
    }
    averagesByStudent.set(student.studentId, averages);
    periodAveragesByStudent.set(student.studentId, periodAverages);
    overallByStudent.set(
      student.studentId,
      mean(
        subjectRows
          .map((row) => row.average)
          .filter((value): value is number => value !== null),
      ),
    );
  }

  const ranked = [...overallByStudent.entries()].filter(
    (entry): entry is [string, number] => entry[1] !== null,
  );
  const rankByStudent = new Map<string, number>();
  for (const [studentId, value] of ranked) {
    let better = 0;
    for (const [, other] of ranked) {
      if (other > value + 1e-9) better += 1;
    }
    rankByStudent.set(studentId, better + 1);
  }

  const bounds = yearBounds(terms, academicYear);
  const attendance = await attendanceSummaries(
    roster.map((student) => student.studentId),
    bounds.from,
    bounds.to,
  );

  return {
    class: { id: schoolClass.id, name: schoolClass.name },
    academicYear: { id: academicYear.id, name: academicYear.name },
    periods: terms.map((term) => ({ id: term.id, name: term.name })),
    subjects: subjects.map((subject) => ({ id: subject.id, name: subject.name })),
    students: roster.map((student) => ({
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      image: student.image,
      averages: averagesByStudent.get(student.studentId) ?? {},
      periodAverages: periodAveragesByStudent.get(student.studentId) ?? {},
      overallAverage: overallByStudent.get(student.studentId) ?? null,
      rank: rankByStudent.get(student.studentId) ?? null,
      attendance: attendance?.get(student.studentId) ?? null,
      observation: observationByStudent.get(student.studentId) ?? null,
    })),
  };
}
