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
  TableScrollContainer,
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
import { getStudentDetail } from "@/lib/students";
import { SEX_LABELS } from "@/app/dashboard/guardians/options";
import { CommentsSection } from "./comments";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: PageProps<"/dashboard/students/[id]">) {
  const staff = await requireStaff();

  const { id } = await params;
  const student = await getStudentDetail(id, staff);
  if (!student) {
    notFound();
  }

  const query = await searchParams;
  const backTo =
    typeof query.from === "string" && query.from.startsWith("/dashboard/")
      ? query.from
      : "/dashboard/classes";

  return (
    <Stack gap="md">
      <Anchor component="a" href={backTo} size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} />
          Terug
        </Group>
      </Anchor>

      <Group gap="sm">
        <Title order={2}>
          {student.firstName} {student.lastName}
        </Title>
        {student.sex && (
          <Badge variant="light">{SEX_LABELS[student.sex] ?? student.sex}</Badge>
        )}
      </Group>
      <Text c="dimmed">Geboortedatum: {formatDate(student.dateOfBirth)}</Text>

      <Paper withBorder p="md">
        <Title order={5} mb="sm">
          Ouders / verzorgers
        </Title>
        {student.guardians.length === 0 ? (
          <Text c="dimmed">Geen verzorgers gekoppeld.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            {student.guardians.map((guardian) => (
              <div key={guardian.id}>
                <Anchor component="a" href={`/dashboard/guardians/${guardian.id}`}>
                  {guardian.firstName} {guardian.lastName}
                </Anchor>
                <Group gap="xs">
                  {guardian.relation && (
                    <Text size="sm" c="dimmed">
                      {guardian.relation}
                    </Text>
                  )}
                  {guardian.isPrimary && (
                    <Badge size="xs" color="green" variant="light">
                      Primair
                    </Badge>
                  )}
                </Group>
                <Text size="sm" c="dimmed">
                  {guardian.phone ?? guardian.email ?? "—"}
                </Text>
              </div>
            ))}
          </SimpleGrid>
        )}
      </Paper>

      <Card withBorder>
        <Title order={5} mb="sm">
          Klassen
        </Title>
        {student.enrollments.length === 0 ? (
          <Text c="dimmed">Nog niet in een klas ingeschreven.</Text>
        ) : (
          <TableScrollContainer minWidth={560}>
            <Table striped highlightOnHover>
              <TableThead>
                <TableTr>
                  <TableTh>Klas</TableTh>
                  <TableTh>Niveau</TableTh>
                  <TableTh>Status</TableTh>
                  <TableTh>Van</TableTh>
                  <TableTh>Tot</TableTh>
                </TableTr>
              </TableThead>
              <TableTbody>
                {student.enrollments.map((enrollment) => (
                  <TableTr key={enrollment.id}>
                    <TableTd>
                      <Anchor
                        component="a"
                        href={`/dashboard/classes/${enrollment.classId}`}
                      >
                        {enrollment.className}
                      </Anchor>
                    </TableTd>
                    <TableTd>{enrollment.levelName}</TableTd>
                    <TableTd>
                      <Badge
                        color={enrollment.status === "active" ? "green" : "gray"}
                        variant="light"
                      >
                        {enrollment.status === "active" ? "Actief" : "Uitgeschreven"}
                      </Badge>
                    </TableTd>
                    <TableTd>{formatDate(enrollment.startDate)}</TableTd>
                    <TableTd>{formatDate(enrollment.endDate)}</TableTd>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
          </TableScrollContainer>
        )}
      </Card>

      <Card withBorder>
        <Title order={5} mb="sm">
          Commentaar
        </Title>
        <CommentsSection
          studentId={student.id}
          comments={student.comments}
          isManager={!staff.isTeacher}
        />
      </Card>
    </Stack>
  );
}
