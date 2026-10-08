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
import { getClassPeriodReport, listPeriodsForYear } from "@/lib/grades";
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

export default async function ClassReportPage({
  params,
  searchParams,
}: PageProps<"/dashboard/classes/[id]/grades/report">) {
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

  const periods = yearId ? await listPeriodsForYear(yearId) : [];
  const termId =
    ((typeof query.term === "string" &&
      periods.some((period) => period.termId === query.term) &&
      query.term) ||
      periods.find((period) => period.isCurrent)?.termId ||
      periods[0]?.termId) ??
    "";

  const report =
    yearId && termId
      ? await getClassPeriodReport({
          classId: id,
          termId,
          academicYearId: yearId,
        })
      : null;

  const basePath = `/dashboard/classes/${id}/grades/report`;

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
        <Title order={2}>Rapport — {schoolClass.name}</Title>
        {report && report.students.length > 0 && yearId && termId && (
          <BulkPrintButton
            mode="period"
            classId={id}
            yearId={yearId}
            termId={termId}
            className={report.class.name}
            yearName={report.academicYear.name}
            termName={report.term.name}
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
            }))}
          />
        )}
      </Group>

      <GradesFilters
        basePath={basePath}
        years={years.map((year) => ({ value: year.id, label: year.name }))}
        periods={periods.map((period) => ({
          value: period.termId,
          label: period.name,
        }))}
        yearId={yearId}
        termId={termId}
      />

      {!report ? (
        <Text c="dimmed">
          Nog geen periodes ingesteld voor dit schooljaar.
        </Text>
      ) : report.students.length === 0 ? (
        <Text c="dimmed">Nog geen leerlingen in deze klas.</Text>
      ) : (
        <>
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={500}>
                {report.term.name} · {report.academicYear.name}
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
                          href={`${basePath}/${student.studentId}?year=${yearId}&term=${termId}`}
                        >
                          {student.lastName}, {student.firstName}
                        </Anchor>
                      </TableTd>
                      {report.subjects.map((subject) => (
                        <TableTd key={subject.id}>
                          <Text
                            c={gradeColor(student.averages[subject.id] ?? null)}
                            fw={600}
                          >
                            {formatAverage(student.averages[subject.id] ?? null)}
                          </Text>
                        </TableTd>
                      ))}
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
                Aanwezigheid van de klas in {report.term.name}
              </Text>
              <PieChart data={pieData} size={150} label="Totaal" />
            </Card>
          )}
        </>
      )}
    </Stack>
  );
}
