import { notFound } from "next/navigation";
import { Anchor, Group, MantineProvider } from "@mantine/core";

import { requireStaff } from "@/lib/authorization";
import { getClassDetail } from "@/lib/classes";
import { getClassPeriodReport } from "@/lib/grades";
import { PrintButton } from "../../../print-button";
import { PeriodReportSheet } from "../../../components/period-report-sheet";
import "../../../print.css";

function formatDate(value: string): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

export default async function BulkPeriodPrintPage({
  params,
  searchParams,
}: PageProps<"/print/classes/[id]/report">) {
  const staff = await requireStaff();

  const { id } = await params;
  const schoolClass = await getClassDetail(id, staff);
  if (!schoolClass) notFound();

  const query = await searchParams;
  const yearId = typeof query.year === "string" ? query.year : "";
  const termId = typeof query.term === "string" ? query.term : "";
  if (!yearId || !termId) notFound();

  const report = await getClassPeriodReport({
    classId: id,
    termId,
    academicYearId: yearId,
  });
  if (!report) notFound();

  const printedOn = formatDate(new Date().toISOString().slice(0, 10));

  return (
    <MantineProvider forceColorScheme="light">
      <div className="print-canvas">
        <div className="print-toolbar">
          <Group justify="space-between" align="center">
            <Anchor
              component="a"
              href={`/dashboard/classes/${id}/grades/report?year=${yearId}&term=${termId}`}
            >
              Terug
            </Anchor>
            <PrintButton />
          </Group>
        </div>

        {report.students.map((student) => (
          <PeriodReportSheet
            key={student.studentId}
            data={{
              studentName: `${student.firstName} ${student.lastName}`,
              className: report.class.name,
              yearName: report.academicYear.name,
              termName: report.term.name,
              subjects: report.subjects.map((subject) => ({
                id: subject.id,
                name: subject.name,
                average: student.averages[subject.id] ?? null,
              })),
              overallAverage: student.overallAverage,
              attendance: student.attendance,
              observation: student.observation,
              printedOn,
            }}
          />
        ))}
      </div>
    </MantineProvider>
  );
}
