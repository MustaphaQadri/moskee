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
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconClipboardCheck,
  IconPencil,
  IconReport,
} from "@tabler/icons-react";

import { requireStaff } from "@/lib/authorization";
import {
  getClassDetail,
  listClassOptions,
  listStudentsForEnrollment,
} from "@/lib/classes";
import { AddStudentButton } from "./roster-dialogs";
import { RosterTable } from "./roster-table";
import { DeleteClassButton } from "./class-actions";

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
  const moveTargets = staff.isTeacher
    ? []
    : await listClassOptions(schoolClass.id);

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
          <Button
            component="a"
            href={`/dashboard/classes/${schoolClass.id}/attendance`}
            variant="light"
            leftSection={<IconClipboardCheck size={16} />}
          >
            Aanwezigheid
          </Button>
          <Button
            component="a"
            href={`/dashboard/classes/${schoolClass.id}/grades`}
            variant="light"
            leftSection={<IconReport size={16} />}
          >
            Cijfers
          </Button>
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
          <InfoItem label="Vakken">
            {schoolClass.level?.subjects.length ? (
              <Group gap={6}>
                {schoolClass.level.subjects.map((subject) => (
                  <Badge key={subject.id} variant="light" color="grape">
                    {subject.name}
                  </Badge>
                ))}
              </Group>
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
          <RosterTable
            classId={schoolClass.id}
            students={schoolClass.students}
            moveTargets={moveTargets}
            canManage={!staff.isTeacher}
          />
        )}
      </Card>
    </Stack>
  );
}
