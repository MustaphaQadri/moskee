import { notFound } from "next/navigation";
import { Anchor, Group, MantineProvider } from "@mantine/core";

import { requireStaff } from "@/lib/authorization";
import { getClassDetail } from "@/lib/classes";
import { getStudentPeriodReport } from "@/lib/grades";
import { PrintButton } from "../../../../print-button";
import { PeriodReportSheet } from "../../../../components/period-report-sheet";
import "../../../../print.css";

function formatDate(value: string): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

export default async function PrintableReportPage({
  params,
  searchParams,
}: PageProps<"/print/classes/[id]/report/[studentId]">) {
  const staff = await requireStaff();

  const { id, studentId } = await params;
  const schoolClass = await getClassDetail(id, staff);
  if (!schoolClass) notFound();

  const query = await searchParams;
  const yearId = typeof query.year === "string" ? query.year : "";
  const termId = typeof query.term === "string" ? query.term : "";
  if (!yearId || !termId) notFound();
  const embed = query.embed === "1";

  const report = await getStudentPeriodReport({
    studentId,
    termId,
    academicYearId: yearId,
  });
  if (!report || report.class.id !== id) notFound();

  return (
    <MantineProvider forceColorScheme="light">
      <div className="print-canvas">
        {!embed && (
          <div className="print-toolbar">
            <Group justify="space-between" align="center">
              <Anchor
                component="a"
                href={`/dashboard/classes/${id}/grades/report/${studentId}?year=${yearId}&term=${termId}`}
              >
                Terug
              </Anchor>
              <PrintButton />
            </Group>
          </div>
        )}

        <PeriodReportSheet
          data={{
            studentName: `${report.student.firstName} ${report.student.lastName}`,
            className: report.class.name,
            yearName: report.academicYear.name,
            termName: report.term.name,
            subjects: report.subjects.map((subject) => ({
              id: subject.subjectId,
              name: subject.name,
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
