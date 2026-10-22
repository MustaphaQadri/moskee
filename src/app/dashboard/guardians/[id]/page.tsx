import { notFound } from "next/navigation";
import {
  Anchor,
  Avatar,
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
} from "@mantine/core";
import { IconArrowLeft, IconPencil } from "@tabler/icons-react";

import { requireRole } from "@/lib/dal";
import { getGuardianDetail } from "@/lib/guardians";
import { getActiveRegistrationLink } from "@/lib/registration";
import { EditStudentButton, AddStudentButton } from "../student-dialogs";
import { SEX_LABELS } from "../options";
import { RegistrationLinkButton } from "./registration-link-button";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text>{value || "—"}</Text>
    </div>
  );
}

export default async function GuardianDetailPage({
  params,
}: PageProps<"/dashboard/guardians/[id]">) {
  await requireRole("manager");

  const { id } = await params;
  const guardian = await getGuardianDetail(id);
  if (!guardian) {
    notFound();
  }

  const activeRegistrationLink = await getActiveRegistrationLink(guardian.id);

  return (
    <Stack gap="md">
      <Anchor component="a" href="/dashboard/guardians" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} />
          Terug naar overzicht
        </Group>
      </Anchor>

      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>
            {guardian.firstName} {guardian.lastName}
          </Title>
          <Text c="dimmed" size="sm">
            Ouder / verzorger
          </Text>
        </div>
        <Group gap="xs">
          {guardian.status !== "ARCHIVED" && (
            <RegistrationLinkButton
              guardianId={guardian.id}
              initialLink={activeRegistrationLink}
            />
          )}
          <Button
            component="a"
            href={`/dashboard/guardians/${guardian.id}/edit`}
            variant="light"
            leftSection={<IconPencil size={16} />}
          >
            Bewerken
          </Button>
        </Group>
      </Group>

      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          <InfoItem label="E-mailadres" value={guardian.email ?? ""} />
          <InfoItem label="Telefoon" value={guardian.phone ?? ""} />
          <InfoItem label="Chartnummer" value={guardian.donationNumber ?? ""} />
          <InfoItem
            label="Onderwijsnummer"
            value={guardian.educationNumber ?? ""}
          />
          <InfoItem label="Adres" value={guardian.address ?? ""} />
          <InfoItem
            label="Inschrijfdatum"
            value={formatDate(guardian.enrolledAt)}
          />
          {guardian.status === "ARCHIVED" && (
            <InfoItem
              label="Gearchiveerd op"
              value={formatDate(guardian.archivedAt)}
            />
          )}
        </SimpleGrid>
      </Paper>

      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Title order={4}>Leerlingen</Title>
          {guardian.status !== "ARCHIVED" && (
            <AddStudentButton guardianId={guardian.id} />
          )}
        </Group>

        {guardian.students.length === 0 ? (
          <Text c="dimmed">Nog geen leerlingen gekoppeld.</Text>
        ) : (
          <TableScrollContainer minWidth={640}>
            <Table striped highlightOnHover>
              <TableThead>
                <TableTr>
                  <TableTh>Naam</TableTh>
                  <TableTh>Geboortedatum</TableTh>
                  <TableTh>Geslacht</TableTh>
                  <TableTh>Relatie</TableTh>
                  <TableTh />
                </TableTr>
              </TableThead>
              <TableTbody>
                {guardian.students.map((student) => (
                  <TableTr key={student.id}>
                    <TableTd>
                      <Group gap="xs" wrap="nowrap">
                        <Avatar
                          src={student.image}
                          alt={`${student.firstName} ${student.lastName}`}
                          size={32}
                          radius="sm"
                        />
                        <Anchor
                          component="a"
                          href={`/dashboard/students/${student.id}?from=${encodeURIComponent(
                            `/dashboard/guardians/${guardian.id}`,
                          )}`}
                        >
                          {student.firstName} {student.lastName}
                        </Anchor>
                      </Group>
                    </TableTd>
                    <TableTd>{formatDate(student.dateOfBirth)}</TableTd>
                    <TableTd>
                      {student.sex ? SEX_LABELS[student.sex] ?? student.sex : "—"}
                    </TableTd>
                    <TableTd>{student.relation ?? "—"}</TableTd>
                    <TableTd>
                      <EditStudentButton
                        guardianId={guardian.id}
                        student={student}
                      />
                    </TableTd>
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
