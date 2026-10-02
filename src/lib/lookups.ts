import "server-only";

import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";

// Read side of the managed lookup sets: levels, rooms (classrooms), weekend
// timeslots, academic years, terms and subjects. Server-only.

export type LevelDTO = {
  id: string;
  name: string;
  sortOrder: number | null;
};

export type RoomDTO = {
  id: string;
  name: string;
  capacity: number | null;
  description: string | null;
};

export type SessionDTO = {
  id: string;
  label: string;
  day: string | null;
  startTime: string | null;
  endTime: string | null;
};

export type AcademicYearDTO = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
};

export type TermRowDTO = {
  id: string;
  name: string;
  sortOrder: number;
  startMonth: number;
  endMonth: number;
};

export type SubjectOptionDTO = {
  id: string;
  levelId: string;
  name: string;
  description: string | null;
  image: string | null;
  sortOrder: number | null;
  isActive: boolean;
};

const DAY_ORDER = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

function rank(order: string[], value: string | null): number {
  const index = value ? order.indexOf(value) : -1;
  return index === -1 ? order.length : index;
}

export async function listLevels(): Promise<LevelDTO[]> {
  return prisma.level.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sortOrder: true },
  });
}

export async function listRooms(): Promise<RoomDTO[]> {
  return prisma.room.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, capacity: true, description: true },
  });
}

// Timeslots sorted by day, then start time (not alphabetically).
export async function listSessions(): Promise<SessionDTO[]> {
  const sessions = await prisma.classSession.findMany({
    select: { id: true, label: true, day: true, startTime: true, endTime: true },
  });

  return sessions.sort((a, b) => {
    const day = rank(DAY_ORDER, a.day) - rank(DAY_ORDER, b.day);
    if (day !== 0) return day;
    const start = (a.startTime ?? "").localeCompare(b.startTime ?? "");
    if (start !== 0) return start;
    return a.label.localeCompare(b.label);
  });
}

export type TeacherOptionDTO = { id: string; name: string; email: string };

// Staff who can be assigned to a class.
export async function listTeachers(): Promise<TeacherOptionDTO[]> {
  return prisma.user.findMany({
    where: { role: "teacher" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

// Every subject (all levels), for the management screen.
export async function listAllSubjects(): Promise<SubjectOptionDTO[]> {
  return prisma.subject.findMany({
    orderBy: [{ levelId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      levelId: true,
      name: true,
      description: true,
      image: true,
      sortOrder: true,
      isActive: true,
    },
  });
}

export async function listAcademicYears(): Promise<AcademicYearDTO[]> {
  const years = await prisma.academicYear.findMany({
    orderBy: { name: "desc" },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
    },
  });

  return years.map((year) => ({
    id: year.id,
    name: year.name,
    startDate: toDateOnly(year.startDate),
    endDate: toDateOnly(year.endDate),
    isCurrent: year.isCurrent,
  }));
}

export async function listTerms(): Promise<TermRowDTO[]> {
  return prisma.term.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      sortOrder: true,
      startMonth: true,
      endMonth: true,
    },
  });
}
