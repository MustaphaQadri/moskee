import { notFound } from "next/navigation";
import {
  Anchor,
  Card,
  Group,
  Stack,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

import { requireStaff } from "@/lib/authorization";
import { getClassDetail } from "@/lib/classes";
import { getClassYearReport } from "@/lib/grades";
import { listAcademicYears } from "@/lib/lookups";
import { gradeColor } from "@/lib/grade-colors";
import {
  ATTENDANCE_COLORS,
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
} from "@/lib/attendance-status";
import { PieChart } from "@/components/pie-chart";
import { GradesFilters } from "../period-selector";
import { BulkPrintButton } from "../bulk-print-button";

function formatAverage(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

function formatPresence(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

export default async function ClassYearReportPage({
  params,
  searchParams,
}: PageProps<"/dashboard/classes/[id]/grades/year">) {
  const staff = await requireStaff();

  const { id } = await params;
  const schoolClass = await getClassDetail(id, staff);
  if (!schoolClass) notFound();

  const query = await searchParams;
  const years = await listAcademicYears();

  const yearId =
    ((typeof query.year === "string" &&
      years.some((year) => year.id === query.year) &&
      query.year) ||
      years.find((year) => year.isCurrent)?.id ||
      years[0]?.id) ??
    "";

  const report = yearId
    ? await getClassYearReport({ classId: id, academicYearId: yearId })
    : null;

  const basePath = `/dashboard/classes/${id}/grades/year`;

  const attendanceCounts: Record<(typeof ATTENDANCE_STATUSES)[number], number> = {
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    VERY_LATE: 0,
    EXCUSED: 0,
  };
  for (const student of report?.students ?? []) {
    if (!student.attendance) continue;
    attendanceCounts.PRESENT += student.attendance.present;
    attendanceCounts.ABSENT += student.attendance.absent;
    attendanceCounts.LATE += student.attendance.late;
    attendanceCounts.VERY_LATE += student.attendance.veryLate;
    attendanceCounts.EXCUSED += student.attendance.excused;
  }
  const attendanceTotal = ATTENDANCE_STATUSES.reduce(
    (sum, status) => sum + attendanceCounts[status],
    0,
  );
  const pieData = ATTENDANCE_STATUSES.map((status) => ({
    label: ATTENDANCE_LABELS[status],
    value: attendanceCounts[status],
    color: ATTENDANCE_COLORS[status],
  }));

  return (
    <Stack gap="md">
      <Anchor component="a" href={`/dashboard/classes/${id}/grades`} size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} />
          Terug naar cijfers
        </Group>
      </Anchor>

      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Title order={2}>Jaarrapport — {schoolClass.name}</Title>
        {report && report.students.length > 0 && yearId && (
          <BulkPrintButton
            mode="year"
            classId={id}
            yearId={yearId}
            className={report.class.name}
            yearName={report.academicYear.name}
            periods={report.periods}
            subjects={report.subjects.map((subject) => ({
              id: subject.id,
              name: subject.name,
            }))}
            students={report.students.map((student) => ({
              studentId: student.studentId,
              firstName: student.firstName,
              lastName: student.lastName,
              observation: student.observation,
              overallAverage: student.overallAverage,
              attendance: student.attendance,
              averages: student.averages,
              periodAverages: student.periodAverages,
            }))}
          />
        )}
      </Group>

      <GradesFilters
        basePath={basePath}
        years={years.map((year) => ({ value: year.id, label: year.name }))}
        yearId={yearId}
      />

      {!report ? (
        <Text c="dimmed">Geen schooljaar gekozen.</Text>
      ) : report.students.length === 0 ? (
        <Text c="dimmed">Nog geen leerlingen in deze klas.</Text>
      ) : (
        <>
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={500}>
                Gemiddelden per vak · {report.academicYear.name}
              </Text>
            </Group>

            <TableScrollContainer minWidth={760}>
              <Table striped highlightOnHover>
                <TableThead>
                  <TableTr>
                    <TableTh>Leerling</TableTh>
                    {report.subjects.map((subject) => (
                      <TableTh key={subject.id}>{subject.name}</TableTh>
                    ))}
                    <TableTh>Totaal</TableTh>
                    <TableTh>Rang</TableTh>
                    <TableTh>Aanwezigheid</TableTh>
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {report.students.map((student) => (
                    <TableTr key={student.studentId}>
                      <TableTd>
                        <Anchor
                          component="a"
                          href={`${basePath}/${student.studentId}?year=${yearId}`}
                        >
                          {student.lastName}, {student.firstName}
                        </Anchor>
                      </TableTd>
                      {report.subjects.map((subject) => {
                        const value = student.averages[subject.id] ?? null;
                        return (
                          <TableTd key={subject.id}>
                            <Text c={gradeColor(value)} fw={600}>
                              {formatAverage(value)}
                            </Text>
                          </TableTd>
                        );
                      })}
                      <TableTd>
                        <Text c={gradeColor(student.overallAverage)} fw={700}>
                          {formatAverage(student.overallAverage)}
                        </Text>
                      </TableTd>
                      <TableTd>{student.rank ?? "—"}</TableTd>
                      <TableTd>
                        {formatPresence(student.attendance?.presenceRate ?? null)}
                      </TableTd>
                    </TableTr>
                  ))}
                </TableTbody>
              </Table>
            </TableScrollContainer>
          </Card>

          {attendanceTotal > 0 && (
            <Card withBorder>
              <Text fw={500} mb="sm">
                Aanwezigheid van de klas · {report.academicYear.name}
              </Text>
              <PieChart data={pieData} size={150} label="Totaal" />
            </Card>
          )}
        </>
      )}
    </Stack>
  );
}
