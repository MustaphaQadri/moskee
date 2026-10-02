"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Card,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { saveAttendance } from "@/app/actions/attendance";
import {
  ATTENDANCE_COLORS,
  ATTENDANCE_LABELS,
  ATTENDANCE_SHORT_LABELS,
  ATTENDANCE_STATUSES,
  type AttendanceStatusValue,
} from "@/lib/attendance-status";
import { PieChart } from "@/components/pie-chart";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type AttendanceSessionOption = {
  id: string;
  label: string;
  day: string | null;
  startTime: string | null;
  endTime: string | null;
};

export type AttendanceRosterStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  image: string | null;
};

export type AttendanceExistingEntry = {
  studentId: string;
  status: AttendanceStatusValue;
  note: string | null;
};

export function AttendanceSheet({
  classId,
  sessions,
  roster,
  sessionId,
  date,
  existing,
}: {
  classId: string;
  sessions: AttendanceSessionOption[];
  roster: AttendanceRosterStudent[];
  sessionId: string;
  date: string;
  existing: AttendanceExistingEntry[];
}) {
  const router = useRouter();
  const [selectedSession, setSelectedSession] = useState(sessionId);
  const [selectedDate, setSelectedDate] = useState(date);
  const [loading, setLoading] = useState(false);
  const [marks, setMarks] = useState<Record<string, AttendanceStatusValue>>(() => {
    const initial: Record<string, AttendanceStatusValue> = {};
    for (const student of roster) initial[student.studentId] = "PRESENT";
    for (const entry of existing) initial[entry.studentId] = entry.status;
    return initial;
  });
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const student of roster) initial[student.studentId] = "";
    for (const entry of existing) initial[entry.studentId] = entry.note ?? "";
    return initial;
  });

  const sessionOptions = sessions.map((session) => ({
    value: session.id,
    label: `${session.label}${
      session.startTime && session.endTime
        ? ` (${session.startTime}–${session.endTime})`
        : ""
    }`,
  }));

  function navigate(nextSessionId: string, nextDate: string | null) {
    const params = new URLSearchParams();
    params.set("sessionId", nextSessionId);
    if (nextDate) params.set("date", nextDate);
    router.push(
      `/dashboard/classes/${classId}/attendance?${params.toString()}`,
    );
  }

  function setStatus(studentId: string, status: AttendanceStatusValue) {
    setMarks((prev) => ({ ...prev, [studentId]: status }));
  }

  function setNote(studentId: string, note: string) {
    setNotes((prev) => ({ ...prev, [studentId]: note }));
  }

  function allPresent() {
    const next: Record<string, AttendanceStatusValue> = {};
    for (const student of roster) next[student.studentId] = "PRESENT";
    setMarks(next);
  }

  const counts = useMemo(() => {
    const result: Record<AttendanceStatusValue, number> = {
      PRESENT: 0,
      LATE: 0,
      VERY_LATE: 0,
      ABSENT: 0,
      EXCUSED: 0,
    };
    for (const student of roster) result[marks[student.studentId]] += 1;
    return result;
  }, [marks, roster]);

  const pieData = ATTENDANCE_STATUSES.map((status) => ({
    label: ATTENDANCE_LABELS[status],
    value: counts[status],
    color: ATTENDANCE_COLORS[status],
  }));

  async function handleSave() {
    setLoading(true);
    try {
      await saveAttendance({
        classId,
        sessionId: selectedSession,
        date: selectedDate,
        entries: roster.map((student) => {
          const note = notes[student.studentId]?.trim();
          return {
            studentId: student.studentId,
            status: marks[student.studentId],
            note: note ? note : undefined,
          };
        }),
      });
      notifications.show({
        title: "Opgeslagen",
        message: "De aanwezigheid is opgeslagen.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Opslaan mislukt",
        message: "Probeer het opnieuw.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack>
      <Paper withBorder p="md">
        <Group align="flex-end" gap="md">
          <Select
            label="Tijdslot"
            data={sessionOptions}
            value={selectedSession}
            onChange={(value) => {
              if (!value) return;
              setSelectedSession(value);
              navigate(value, null);
            }}
            allowDeselect={false}
            style={{ flex: 1, minWidth: 220 }}
          />
          <TextInput
            label="Datum"
            type="date"
            value={selectedDate}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setSelectedDate(value);
              if (DATE_RE.test(value)) navigate(selectedSession, value);
            }}
          />
        </Group>
      </Paper>

      {roster.length === 0 ? (
        <Text c="dimmed">Nog geen leerlingen in deze klas.</Text>
      ) : (
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={500}>Leerlingen ({roster.length})</Text>
            <Button variant="subtle" size="xs" onClick={allPresent}>
              Alles aanwezig
            </Button>
          </Group>

          <TableScrollContainer minWidth={760}>
            <Table verticalSpacing="xs">
              <TableThead>
                <TableTr>
                  <TableTh>Leerling</TableTh>
                  <TableTh>Status</TableTh>
                  <TableTh>Notitie</TableTh>
                </TableTr>
              </TableThead>
              <TableTbody>
                {roster.map((student) => (
                  <TableTr key={student.studentId}>
                    <TableTd>
                      <Group gap="xs" wrap="nowrap">
                        <Avatar
                          src={student.image}
                          alt={`${student.firstName} ${student.lastName}`}
                          size={32}
                          radius="sm"
                        />
                        {student.lastName}, {student.firstName}
                      </Group>
                    </TableTd>
                    <TableTd>
                      <SegmentedControl
                        size="xs"
                        fullWidth
                        data={ATTENDANCE_STATUSES.map((status) => ({
                          label: ATTENDANCE_SHORT_LABELS[status],
                          value: status,
                        }))}
                        value={marks[student.studentId]}
                        onChange={(value) =>
                          setStatus(
                            student.studentId,
                            value as AttendanceStatusValue,
                          )
                        }
                      />
                    </TableTd>
                    <TableTd>
                      <TextInput
                        size="xs"
                        placeholder="Optioneel"
                        value={notes[student.studentId] ?? ""}
                        onChange={(event) =>
                          setNote(student.studentId, event.currentTarget.value)
                        }
                      />
                    </TableTd>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
          </TableScrollContainer>

          <Group justify="space-between" align="center" mt="lg" wrap="wrap">
            <PieChart data={pieData} size={150} label="Totaal" />
            <Button onClick={handleSave} loading={loading}>
              Opslaan
            </Button>
          </Group>
        </Card>
      )}
    </Stack>
  );
}
