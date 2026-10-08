import { notFound } from "next/navigation";
import { Anchor, Group, MantineProvider } from "@mantine/core";

import { requireStaff } from "@/lib/authorization";
import { getClassDetail } from "@/lib/classes";
import { getStudentYearReport } from "@/lib/grades";
import { PrintButton } from "../../../../print-button";
import { YearReportSheet } from "../../../../components/year-report-sheet";
import "../../../../print.css";

function formatDate(value: string): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

export default async function PrintableYearReportPage({
  params,
  searchParams,
}: PageProps<"/print/classes/[id]/year/[studentId]">) {
  const staff = await requireStaff();

  const { id, studentId } = await params;
  const schoolClass = await getClassDetail(id, staff);
  if (!schoolClass) notFound();

  const query = await searchParams;
  const yearId = typeof query.year === "string" ? query.year : "";
  if (!yearId) notFound();
  const embed = query.embed === "1";

  const report = await getStudentYearReport({ studentId, academicYearId: yearId });
  if (!report || report.class.id !== id) notFound();

  return (
    <MantineProvider forceColorScheme="light">
      <div className="print-canvas">
        {!embed && (
          <div className="print-toolbar">
            <Group justify="space-between" align="center">
              <Anchor
                component="a"
                href={`/dashboard/classes/${id}/grades/year/${studentId}?year=${yearId}`}
              >
                Terug
              </Anchor>
              <PrintButton />
            </Group>
          </div>
        )}

        <YearReportSheet
          data={{
            studentName: `${report.student.firstName} ${report.student.lastName}`,
            className: report.class.name,
            yearName: report.academicYear.name,
            periods: report.periods,
            subjects: report.subjects.map((subject) => ({
              id: subject.subjectId,
              name: subject.name,
              periodAverages: subject.periods.map((period) => period.average),
              average: subject.average,
            })),
            overallAverage: report.overallAverage,
            attendance: report.attendance,
            observation: report.observation,
            printedOn: formatDate(new Date().toISOString().slice(0, 10)),
          }}
        />
      </div>
    </MantineProvider>
  );
}
