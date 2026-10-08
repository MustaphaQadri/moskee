import { notFound } from "next/navigation";
import {
  Anchor,
  Badge,
  Button,
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
import { IconArrowLeft, IconReport } from "@tabler/icons-react";

import { requireStaff } from "@/lib/authorization";
import { getClassDetail } from "@/lib/classes";
import { listExams, listPeriodsForYear } from "@/lib/grades";
import { listAcademicYears } from "@/lib/lookups";
import { toDateOnly } from "@/lib/dates";
import { GradesFilters } from "./period-selector";
import { NewExamButton } from "./new-exam-dialog";
import { DeleteExamButton } from "./exam-actions";

function formatDate(value: string): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

export default async function ClassGradesPage({
  params,
  searchParams,
}: PageProps<"/dashboard/classes/[id]/grades">) {
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

  const subjects = schoolClass.level?.subjects ?? [];
  const subjectId =
    typeof query.subject === "string" &&
    subjects.some((subject) => subject.id === query.subject)
      ? query.subject
      : undefined;

  const exams =
    yearId && termId
      ? await listExams({
          classId: id,
          termId,
          academicYearId: yearId,
          subjectId,
        })
      : [];

  const basePath = `/dashboard/classes/${id}/grades`;
  const reportHref = `${basePath}/report?year=${yearId}&term=${termId}`;
  const today = toDateOnly(new Date()) ?? "";
  const rosterSize = schoolClass.students.length;

  return (
    <Stack gap="md">
      <Anchor component="a" href={`/dashboard/classes/${id}`} size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} />
          Terug naar klas
        </Group>
      </Anchor>

      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Title order={2}>Cijfers — {schoolClass.name}</Title>
        <Group gap="xs">
          <Button
            component="a"
            href={reportHref}
            variant="light"
            leftSection={<IconReport size={16} />}
            disabled={!yearId || !termId}
          >
            Rapport
          </Button>
          <Button
            component="a"
            href={`${basePath}/year?year=${yearId}`}
            variant="light"
            leftSection={<IconReport size={16} />}
            disabled={!yearId}
          >
            Jaarrapport
          </Button>
          <NewExamButton
            classId={id}
            subjects={subjects}
            terms={periods.map((period) => ({
              id: period.termId,
              name: period.name,
            }))}
            years={years.map((year) => ({ id: year.id, name: year.name }))}
            defaultTermId={termId}
            defaultYearId={yearId}
            defaultDate={today}
          />
        </Group>
      </Group>

      <GradesFilters
        basePath={basePath}
        years={years.map((year) => ({ value: year.id, label: year.name }))}
        periods={periods.map((period) => ({
          value: period.termId,
          label: period.name,
        }))}
        subjects={subjects.map((subject) => ({
          value: subject.id,
          label: subject.name,
        }))}
        yearId={yearId}
        termId={termId}
        subjectId={subjectId}
      />

      {years.length === 0 ? (
        <Text c="dimmed">
          Er zijn nog geen schooljaren ingesteld. Stel eerst een schooljaar en
          periodes in.
        </Text>
      ) : periods.length === 0 ? (
        <Text c="dimmed">
          Er zijn nog geen periodes ingesteld voor dit schooljaar.
        </Text>
      ) : subjects.length === 0 ? (
        <Text c="dimmed">
          Dit niveau heeft nog geen vakken. Voeg eerst vakken toe aan het niveau.
        </Text>
      ) : (
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={500}>Toetsen ({exams.length})</Text>
          </Group>

          {exams.length === 0 ? (
            <Text c="dimmed">
              Nog geen toetsen voor deze periode. Voeg een toets toe om cijfers
              in te vullen.
            </Text>
          ) : (
            <TableScrollContainer minWidth={720}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <TableThead>
                  <TableTr>
                    <TableTh>Toets</TableTh>
                    <TableTh>Datum</TableTh>
                    <TableTh>Weging</TableTh>
                    <TableTh>Ingevuld</TableTh>
                    <TableTh />
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {exams.map((exam) => (
                    <TableTr key={exam.id}>
                      <TableTd>
                        <Anchor
                          component="a"
                          href={`${basePath}/${exam.id}`}
                          fw={500}
                        >
                          {exam.title}
                        </Anchor>
                        <Text size="xs" c="dimmed">
                          {exam.subjectName}
                        </Text>
                      </TableTd>
                      <TableTd>{formatDate(exam.date)}</TableTd>
                      <TableTd>
                        <Badge variant="light" color="gray">
                          {exam.coefficient}×
                        </Badge>
                      </TableTd>
                      <TableTd>
                        {exam.gradedCount} / {rosterSize}
                      </TableTd>
                      <TableTd>
                        <Group gap="xs" justify="flex-end">
                          <Button
                            component="a"
                            href={`${basePath}/${exam.id}`}
                            size="xs"
                            variant="light"
                          >
                            Invoeren
                          </Button>
                          <DeleteExamButton examId={exam.id} title={exam.title} />
                        </Group>
                      </TableTd>
                    </TableTr>
                  ))}
                </TableTbody>
              </Table>
            </TableScrollContainer>
          )}
        </Card>
      )}
    </Stack>
  );
}
