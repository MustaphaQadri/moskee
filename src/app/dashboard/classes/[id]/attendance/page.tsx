import { notFound } from "next/navigation";
import { Anchor, Group, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

import { requireStaff } from "@/lib/authorization";
import { getClassDetail } from "@/lib/classes";
import {
  getClassRoster,
  getMeetingAttendance,
  nearestDateForDay,
} from "@/lib/attendance";
import { parseDateOnly, toDateOnly } from "@/lib/dates";
import { AttendanceSheet } from "./attendance-sheet";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// The class session whose nearest meeting day is closest to today.
function defaultSession<T extends { day: string | null }>(
  sessions: T[],
  today: string,
): T | undefined {
  let best: T | undefined;
  let bestDiff = Infinity;
  for (const session of sessions) {
    const date = nearestDateForDay(session.day, today);
    const diff = Math.abs(
      parseDateOnly(date).getTime() - parseDateOnly(today).getTime(),
    );
    if (diff < bestDiff) {
      bestDiff = diff;
      best = session;
    }
  }
  return best;
}

export default async function ClassAttendancePage({
  params,
  searchParams,
}: PageProps<"/dashboard/classes/[id]/attendance">) {
  const staff = await requireStaff();

  const { id } = await params;
  const schoolClass = await getClassDetail(id, staff);
  if (!schoolClass) {
    notFound();
  }

  const query = await searchParams;
  const today = toDateOnly(new Date()) ?? "";
  const sessions = schoolClass.sessions;

  const selected =
    (typeof query.sessionId === "string"
      ? sessions.find((session) => session.id === query.sessionId)
      : undefined) ?? defaultSession(sessions, today);

  const dateFromQuery =
    typeof query.date === "string" && DATE_RE.test(query.date)
      ? query.date
      : null;
  const date = dateFromQuery ?? (selected ? nearestDateForDay(selected.day, today) : today);

  const [roster, existing] = selected
    ? await Promise.all([
        getClassRoster(schoolClass.id),
        getMeetingAttendance({
          classId: schoolClass.id,
          sessionId: selected.id,
          date: parseDateOnly(date),
        }),
      ])
    : [[], []];

  return (
    <Stack gap="md">
      <Anchor component="a" href={`/dashboard/classes/${schoolClass.id}`} size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} />
          Terug naar klas
        </Group>
      </Anchor>

      <Title order={2}>Aanwezigheid — {schoolClass.name}</Title>

      {sessions.length === 0 ? (
        <Text c="dimmed">
          Deze klas heeft nog geen tijdsloten. Voeg eerst een tijdslot toe aan de
          klas.
        </Text>
      ) : (
        <AttendanceSheet
          key={`${selected?.id}|${date}`}
          classId={schoolClass.id}
          sessions={sessions}
          roster={roster}
          sessionId={selected?.id ?? ""}
          date={date}
          existing={existing}
        />
      )}
    </Stack>
  );
}
