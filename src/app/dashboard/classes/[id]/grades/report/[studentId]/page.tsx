import { notFound } from "next/navigation";
import {
  Anchor,
  Badge,
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
import { getStudentPeriodReport } from "@/lib/grades";
import { gradeColor, gradeBadgeColor } from "@/lib/grade-colors";
import {
  ATTENDANCE_COLORS,
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
} from "@/lib/attendance-status";
import { PieChart } from "@/components/pie-chart";
import { PrintReportButton } from "../../print-report-button";
import { ReportObservationEditor } from "../../report-observation-editor";

function formatDate(value: string): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function formatAverage(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

export default async function StudentReportPage({
  params,
  searchParams,
}: PageProps<"/dashboard/classes/[id]/grades/report/[studentId]">) {
  const staff = await requireStaff();

  const { id, studentId } = await params;
  const schoolClass = await getClassDetail(id, staff);
  if (!schoolClass) notFound();

  const query = await searchParams;
  const yearId = typeof query.year === "string" ? query.year : "";
  const termId = typeof query.term === "string" ? query.term : "";
  if (!yearId || !termId) notFound();

  const report = await getStudentPeriodReport({
    studentId,
    termId,
    academicYearId: yearId,
  });
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
        href={`/dashboard/classes/${id}/grades/report?year=${yearId}&term=${termId}`}
        size="sm"
      >
        <Group gap={4}>
          <IconArrowLeft size={16} />
          Terug naar rapport
        </Group>
      </Anchor>

      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>
            Rapport — {report.student.firstName} {report.student.lastName}
          </Title>
          <Text c="dimmed" size="sm">
            {report.class.name} · {report.term.name} · {report.academicYear.name}
          </Text>
        </div>
        <PrintReportButton
          url={`/print/classes/${id}/report/${studentId}?year=${yearId}&term=${termId}`}
          hasObservation={Boolean(report.observation?.trim())}
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
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
            Rang in klas
          </Text>
          <Title order={3}>
            {report.rank ?? "—"}
            <Text span size="sm" c="dimmed">
              {" "}
              / {report.classSize}
            </Text>
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

      <Stack gap="sm">
        {report.subjects.map((subject) => (
          <Paper key={subject.subjectId} withBorder p="md">
            <Group justify="space-between" mb="xs">
              <Title order={4}>{subject.name}</Title>
              <Badge variant="light" size="lg" color={gradeBadgeColor(subject.average)}>
                Gemiddelde {formatAverage(subject.average)}
              </Badge>
            </Group>
            {subject.exams.length === 0 ? (
              <Text c="dimmed" size="sm">
                Nog geen toetsen in deze periode.
              </Text>
            ) : (
              <Table verticalSpacing="xs">
                <TableThead>
                  <TableTr>
                    <TableTh>Toets</TableTh>
                    <TableTh>Datum</TableTh>
                    <TableTh>Weging</TableTh>
                    <TableTh>Cijfer</TableTh>
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {subject.exams.map((exam) => (
                    <TableTr key={exam.examId}>
                      <TableTd>{exam.title}</TableTd>
                      <TableTd>{formatDate(exam.date)}</TableTd>
                      <TableTd>{exam.coefficient}×</TableTd>
                      <TableTd>
                        <Text c={gradeColor(exam.score)} fw={700}>
                          {exam.score === null ? "—" : exam.score}
                        </Text>
                      </TableTd>
                    </TableTr>
                  ))}
                </TableTbody>
              </Table>
            )}
          </Paper>
        ))}
      </Stack>

      <Card withBorder>
        <Text fw={500} mb="sm">
          Aanwezigheid in deze periode
        </Text>
        {!attendance || attendance.total === 0 ? (
          <Text c="dimmed">
            Nog geen aanwezigheid geregistreerd in deze periode.
          </Text>
        ) : (
          <PieChart data={pieData} size={150} label="Totaal" />
        )}
      </Card>

      <ReportObservationEditor
        mode="period"
        classId={id}
        studentId={studentId}
        termId={termId}
        academicYearId={yearId}
        initialObservation={report.observation}
      />
    </Stack>
  );
}
