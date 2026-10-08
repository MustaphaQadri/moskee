import { notFound } from "next/navigation";
import {
  Anchor,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
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
import { getStudentYearReport } from "@/lib/grades";
import { gradeColor } from "@/lib/grade-colors";
import {
  ATTENDANCE_COLORS,
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
} from "@/lib/attendance-status";
import { PieChart } from "@/components/pie-chart";
import { PrintReportButton } from "../../print-report-button";
import { ReportObservationEditor } from "../../report-observation-editor";

function formatAverage(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

export default async function StudentYearReportPage({
  params,
  searchParams,
}: PageProps<"/dashboard/classes/[id]/grades/year/[studentId]">) {
  const staff = await requireStaff();

  const { id, studentId } = await params;
  const schoolClass = await getClassDetail(id, staff);
  if (!schoolClass) notFound();

  const query = await searchParams;
  const yearId = typeof query.year === "string" ? query.year : "";
  if (!yearId) notFound();

  const report = await getStudentYearReport({ studentId, academicYearId: yearId });
  if (!report || report.class.id !== id) notFound();

  const attendance = report.attendance;
  const counts: Record<(typeof ATTENDANCE_STATUSES)[number], number> = {
    PRESENT: attendance?.present ?? 0,
    ABSENT: attendance?.absent ?? 0,
    LATE: attendance?.late ?? 0,
    VERY_LATE: attendance?.veryLate ?? 0,
    EXCUSED: attendance?.excused ?? 0,
  };
  const pieData = ATTENDANCE_STATUSES.map((status) => ({
    label: ATTENDANCE_LABELS[status],
    value: counts[status],
    color: ATTENDANCE_COLORS[status],
  }));

  return (
    <Stack gap="md">
      <Anchor
        component="a"
        href={`/dashboard/classes/${id}/grades/year?year=${yearId}`}
        size="sm"
      >
        <Group gap={4}>
          <IconArrowLeft size={16} />
          Terug naar jaarrapport
        </Group>
      </Anchor>

      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>
            Jaarrapport — {report.student.firstName} {report.student.lastName}
          </Title>
          <Text c="dimmed" size="sm">
            {report.class.name} · {report.academicYear.name}
          </Text>
        </div>
        <PrintReportButton
          url={`/print/classes/${id}/year/${studentId}?year=${yearId}`}
          hasObservation={Boolean(report.observation?.trim())}
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Card withBorder>
          <Text size="xs" c="dimmed">
            Totaal gemiddelde
          </Text>
          <Title order={3} c={gradeColor(report.overallAverage)}>
            {formatAverage(report.overallAverage)}
          </Title>
        </Card>
        <Card withBorder>
          <Text size="xs" c="dimmed">
            Aanwezigheid
          </Text>
          <Title order={3}>
            {attendance?.presenceRate != null
              ? `${Math.round(attendance.presenceRate * 100)}%`
              : "—"}
          </Title>
        </Card>
      </SimpleGrid>

      <Paper withBorder p="md">
        <Title order={4} mb="sm">
          Gemiddelden per vak
        </Title>
        <Table>
          <TableThead>
            <TableTr>
              <TableTh>Vak</TableTh>
              {report.periods.map((period) => (
                <TableTh key={period.id}>{period.name}</TableTh>
              ))}
              <TableTh>Jaar</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {report.subjects.map((subject) => (
              <TableTr key={subject.subjectId}>
                <TableTd>{subject.name}</TableTd>
                {subject.periods.map((period) => (
                  <TableTd key={period.termId}>
                    <Text c={gradeColor(period.average)} fw={600}>
                      {formatAverage(period.average)}
                    </Text>
                  </TableTd>
                ))}
                <TableTd>
                  <Text c={gradeColor(subject.average)} fw={700}>
                    {formatAverage(subject.average)}
                  </Text>
                </TableTd>
              </TableTr>
            ))}
          </TableTbody>
        </Table>
      </Paper>

      <Card withBorder>
        <Text fw={500} mb="sm">
          Aanwezigheid · {report.academicYear.name}
        </Text>
        {!attendance || attendance.total === 0 ? (
          <Text c="dimmed">
            Nog geen aanwezigheid geregistreerd dit schooljaar.
          </Text>
        ) : (
          <PieChart data={pieData} size={150} label="Totaal" />
        )}
      </Card>

      <ReportObservationEditor
        mode="year"
        classId={id}
        studentId={studentId}
        academicYearId={yearId}
        initialObservation={report.observation}
      />
    </Stack>
  );
}
