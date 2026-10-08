import {
  Divider,
  Group,
  SimpleGrid,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  Title,
} from "@mantine/core";

import { gradeColor } from "@/lib/grade-colors";
import {
  ATTENDANCE_LABELS_BILINGUAL,
  REPORT_LABELS,
} from "@/lib/report-labels";
import { ATTENDANCE_COLORS, ATTENDANCE_STATUSES } from "@/lib/attendance-status";
import { PieChart } from "@/components/pie-chart";
import { Bilingual } from "../bilingual";

export type SheetAttendance = {
  present: number;
  absent: number;
  late: number;
  veryLate: number;
  excused: number;
  total: number;
  presenceRate: number | null;
};

export type PeriodSheetData = {
  studentName: string;
  className: string;
  yearName: string;
  termName: string;
  subjects: { id: string; name: string; average: number | null }[];
  overallAverage: number | null;
  attendance: SheetAttendance | null;
  observation: string | null;
  printedOn: string;
};

function formatAverage(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

export function PeriodReportSheet({
  data,
  variant = "print",
}: {
  data: PeriodSheetData;
  variant?: "print" | "preview";
}) {
  const attendance = data.attendance;
  const counts: Record<(typeof ATTENDANCE_STATUSES)[number], number> = {
    PRESENT: attendance?.present ?? 0,
    ABSENT: attendance?.absent ?? 0,
    LATE: attendance?.late ?? 0,
    VERY_LATE: attendance?.veryLate ?? 0,
    EXCUSED: attendance?.excused ?? 0,
  };
  const pieData = ATTENDANCE_STATUSES.map((status) => ({
    label: ATTENDANCE_LABELS_BILINGUAL[status].nl,
    value: counts[status],
    color: ATTENDANCE_COLORS[status],
  }));

  return (
    <div
      className={variant === "print" ? "print-sheet" : undefined}
      style={
        variant === "preview"
          ? {
              background: "var(--mantine-color-body)",
              border: "1px solid var(--mantine-color-gray-3)",
              borderRadius: 8,
              padding: 16,
            }
          : undefined
      }
    >
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>
            <Bilingual label={REPORT_LABELS.report} />
          </Title>
          <Text c="dimmed" size="sm">
            {data.yearName} · {data.termName}
          </Text>
        </div>
        <div style={{ textAlign: "right" }}>
          <Text size="xs" c="dimmed">
            <Bilingual label={REPORT_LABELS.printedOn} />
          </Text>
          <Text size="sm">{data.printedOn}</Text>
        </div>
      </Group>

      <Divider my="md" />

      <SimpleGrid cols={2} mb="lg">
        <div>
          <Text size="xs" c="dimmed">
            <Bilingual label={REPORT_LABELS.student} />
          </Text>
          <Title order={4}>{data.studentName}</Title>
        </div>
        <div style={{ textAlign: "right" }}>
          <Text size="xs" c="dimmed">
            <Bilingual label={REPORT_LABELS.className} />
          </Text>
          <Title order={4}>{data.className}</Title>
        </div>
      </SimpleGrid>

      <Table>
        <TableThead>
          <TableTr>
            <TableTh>
              <Bilingual label={REPORT_LABELS.subject} />
            </TableTh>
            <TableTh style={{ textAlign: "right" }}>
              <Bilingual label={REPORT_LABELS.average} />
            </TableTh>
          </TableTr>
        </TableThead>
        <TableTbody>
          {data.subjects.map((subject) => (
            <TableTr key={subject.id}>
              <TableTd>{subject.name}</TableTd>
              <TableTd style={{ textAlign: "right" }}>
                <Text span c={gradeColor(subject.average)} fw={600}>
                  {formatAverage(subject.average)}
                </Text>
              </TableTd>
            </TableTr>
          ))}
        </TableTbody>
      </Table>

      <Divider my="lg" />

      <SimpleGrid cols={2} mb="lg">
        <div>
          <Text size="xs" c="dimmed">
            <Bilingual label={REPORT_LABELS.totalAverage} />
          </Text>
          <Title order={3} c={gradeColor(data.overallAverage)}>
            {formatAverage(data.overallAverage)}
          </Title>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            <Bilingual label={REPORT_LABELS.attendance} />
          </Text>
          <Title order={3}>
            {attendance?.presenceRate != null
              ? `${Math.round(attendance.presenceRate * 100)}%`
              : "—"}
          </Title>
        </div>
      </SimpleGrid>

      {data.observation && (
        <>
          <Divider my="lg" />
          <div
            style={{
              border: "1px solid #adb5bd",
              borderRadius: 8,
              padding: "10px 12px",
            }}
          >
            <Text fw={500} mb="xs">
              <Bilingual label={REPORT_LABELS.observation} />
            </Text>
            <Text style={{ whiteSpace: "pre-wrap" }}>{data.observation}</Text>
          </div>
        </>
      )}

      <Divider my="lg" />

      <div>
        <Text fw={500} mb="sm">
          <Bilingual label={REPORT_LABELS.attendance} />
        </Text>
        {!attendance || attendance.total === 0 ? (
          <Text c="dimmed" size="sm">
            <Bilingual label={REPORT_LABELS.noAttendance} />
          </Text>
        ) : (
          <PieChart data={pieData} size={150} label="Totaal" />
        )}
      </div>
    </div>
  );
}
