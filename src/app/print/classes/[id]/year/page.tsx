import { notFound } from "next/navigation";
import { Anchor, Group, MantineProvider } from "@mantine/core";

import { requireStaff } from "@/lib/authorization";
import { getClassDetail } from "@/lib/classes";
import { getClassYearReport } from "@/lib/grades";
import { PrintButton } from "../../../print-button";
import { YearReportSheet } from "../../../components/year-report-sheet";
import "../../../print.css";

function formatDate(value: string): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

export default async function BulkYearPrintPage({
  params,
  searchParams,
}: PageProps<"/print/classes/[id]/year">) {
  const staff = await requireStaff();

  const { id } = await params;
  const schoolClass = await getClassDetail(id, staff);
  if (!schoolClass) notFound();

  const query = await searchParams;
  const yearId = typeof query.year === "string" ? query.year : "";
  if (!yearId) notFound();

  const report = await getClassYearReport({ classId: id, academicYearId: yearId });
  if (!report) notFound();

  const printedOn = formatDate(new Date().toISOString().slice(0, 10));

  return (
    <MantineProvider forceColorScheme="light">
      <div className="print-canvas">
        <div className="print-toolbar">
          <Group justify="space-between" align="center">
            <Anchor
              component="a"
              href={`/dashboard/classes/${id}/grades/year?year=${yearId}`}
            >
              Terug
            </Anchor>
            <PrintButton />
          </Group>
        </div>

        {report.students.map((student) => (
          <YearReportSheet
            key={student.studentId}
            data={{
              studentName: `${student.firstName} ${student.lastName}`,
              className: report.class.name,
              yearName: report.academicYear.name,
              periods: report.periods,
              subjects: report.subjects.map((subject) => ({
                id: subject.id,
                name: subject.name,
                periodAverages: student.periodAverages[subject.id] ?? [],
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
