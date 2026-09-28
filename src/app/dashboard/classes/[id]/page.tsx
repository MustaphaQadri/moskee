import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Paper,
  SimpleGrid,
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
  Tooltip,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconClipboardCheck,
  IconPencil,
  IconReport,
} from "@tabler/icons-react";

import { requireStaff } from "@/lib/authorization";
import { getClassDetail, listStudentsForEnrollment } from "@/lib/classes";
import { SEX_LABELS } from "@/app/dashboard/guardians/options";
import { AddStudentButton, RemoveStudentButton } from "./roster-dialogs";
import { DeleteClassButton } from "./class-actions";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <div>{children}</div>
    </div>
  );
}

export default async function ClassDetailPage({
  params,
}: PageProps<"/dashboard/classes/[id]">) {
  const staff = await requireStaff();

  const { id } = await params;
  const schoolClass = await getClassDetail(id, staff);
  if (!schoolClass) {
    notFound();
  }

  const enrollable = staff.isTeacher
    ? []
    : await listStudentsForEnrollment({ classId: schoolClass.id });

  return (
    <Stack gap="md">
      <Anchor component="a" href="/dashboard/classes" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} />
          Terug naar klassen
        </Group>
      </Anchor>

      <Group justify="space-between" align="flex-start">
        <div>
          <Group gap="sm">
            <Title order={2}>{schoolClass.name}</Title>
            {schoolClass.level && (
              <Badge variant="light">{schoolClass.level.name}</Badge>
            )}
          </Group>
          {schoolClass.description && (
            <Text c="dimmed" size="sm">
              {schoolClass.description}
            </Text>
          )}
        </div>

        <Group gap="xs">
          <Tooltip label="Binnenkort beschikbaar">
            <span>
              <Button
                variant="default"
                disabled
                leftSection={<IconClipboardCheck size={16} />}
              >
                Aanwezigheid
              </Button>
            </span>
          </Tooltip>
          <Tooltip label="Binnenkort beschikbaar">
            <span>
              <Button
                variant="default"
                disabled
                leftSection={<IconReport size={16} />}
              >
                Cijfers
              </Button>
            </span>
          </Tooltip>
          {!staff.isTeacher && (
            <>
              <Button
                component="a"
                href={`/dashboard/classes/${schoolClass.id}/edit`}
                variant="light"
                leftSection={<IconPencil size={16} />}
              >
                Bewerken
              </Button>
              <DeleteClassButton
                classId={schoolClass.id}
                name={schoolClass.name}
              />
            </>
          )}
        </Group>
      </Group>

      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <InfoItem label="Docent">
            <Text>{schoolClass.teacher?.name ?? "—"}</Text>
          </InfoItem>
          <InfoItem label="Lokaal">
            <Text>{schoolClass.room?.name ?? "—"}</Text>
          </InfoItem>
          <InfoItem label="Tijdsloten">
            <Group gap={4} wrap="wrap">
              {schoolClass.sessions.length === 0 ? (
                <Text>—</Text>
              ) : (
                schoolClass.sessions.map((session) => (
                  <Badge key={session.id} variant="outline">
                    {session.label}
                    {session.startTime && session.endTime
                      ? ` · ${session.startTime}–${session.endTime}`
                      : ""}
                  </Badge>
                ))
              )}
            </Group>
          </InfoItem>
          <InfoItem label="Vakken & vaardigheden">
            {schoolClass.level?.subjects.length ? (
              <Stack gap={6}>
                {schoolClass.level.subjects.map((subject) => (
                  <div key={subject.id}>
                    <Badge variant="light" color="grape">
                      {subject.name}
                    </Badge>
                    {subject.competencies.length > 0 && (
                      <Text size="xs" c="dimmed">
                        {subject.competencies.map((c) => c.name).join(", ")}
                      </Text>
                    )}
                  </div>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" size="sm">
                Nog geen vakken voor dit niveau
              </Text>
            )}
          </InfoItem>
        </SimpleGrid>
      </Paper>

      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>Leerlingen ({schoolClass.students.length})</Title>
          {!staff.isTeacher && (
            <AddStudentButton
              classId={schoolClass.id}
              students={enrollable}
            />
          )}
        </Group>

        {schoolClass.students.length === 0 ? (
          <Text c="dimmed">Nog geen leerlingen in deze klas.</Text>
        ) : (
          <TableScrollContainer minWidth={640}>
            <Table striped highlightOnHover>
              <TableThead>
                <TableTr>
                  <TableTh>Naam</TableTh>
                  <TableTh>Geboortedatum</TableTh>
                  <TableTh>Geslacht</TableTh>
                  {!staff.isTeacher && <TableTh />}
                </TableTr>
              </TableThead>
              <TableTbody>
                {schoolClass.students.map((student) => (
                  <TableTr key={student.studentId}>
                    <TableTd>
                      <Anchor
                        component="a"
                        href={`/dashboard/students/${student.studentId}?from=${encodeURIComponent(
                          `/dashboard/classes/${schoolClass.id}`,
                        )}`}
                      >
                        {student.firstName} {student.lastName}
                      </Anchor>
                    </TableTd>
                    <TableTd>{formatDate(student.dateOfBirth)}</TableTd>
                    <TableTd>
                      {student.sex
                        ? SEX_LABELS[student.sex] ?? student.sex
                        : "—"}
                    </TableTd>
                    {!staff.isTeacher && (
                      <TableTd>
                        <Group justify="flex-end">
                          <RemoveStudentButton
                            classId={schoolClass.id}
                            studentId={student.studentId}
                            studentName={`${student.firstName} ${student.lastName}`}
                          />
                        </Group>
                      </TableTd>
                    )}
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
          </TableScrollContainer>
        )}
      </Card>
    </Stack>
  );
}
