import { notFound } from "next/navigation";
import {
  ActionIcon,
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
import {
  IconArrowLeft,
  IconCash,
  IconHeart,
  IconPencil,
} from "@tabler/icons-react";

import { AddPaymentButton } from "@/app/dashboard/donations/[studentId]/payment-dialogs";
import { requireRole } from "@/lib/dal";
import { toDateOnly, todayDateOnly } from "@/lib/dates";
import { getGuardianDonationOverview } from "@/lib/donations";
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

function euro(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function InfoItem({
  label,
  value,
  green,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text c={green ? "green" : undefined}>{value || "—"}</Text>
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

  const [activeRegistrationLink, donationOverview] = await Promise.all([
    getActiveRegistrationLink(guardian.id),
    getGuardianDonationOverview(guardian.id),
  ]);

  const donationByStudent = new Map(
    (donationOverview?.rows ?? []).map((row) => [row.studentId, row]),
  );
  const donationTotals = donationOverview?.totals ?? null;
  const donationValue = donationTotals
    ? `${euro(donationTotals.paid)} / ${euro(donationTotals.expected)}`
    : "";
  const donationPaid = donationTotals
    ? donationTotals.expected > 0 && donationTotals.paid >= donationTotals.expected
    : false;
  const today = toDateOnly(todayDateOnly()) ?? "";

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
            <AddStudentButton guardianId={guardian.id} />
          )}
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
          <InfoItem label="Donatie" value={donationValue} green={donationPaid} />
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
        <Title order={4} mb="md">
          Leerlingen
        </Title>

        {guardian.students.length === 0 ? (
          <Text c="dimmed">Nog geen leerlingen gekoppeld.</Text>
        ) : (
          <TableScrollContainer minWidth={720}>
            <Table striped highlightOnHover>
              <TableThead>
                <TableTr>
                  <TableTh>Naam</TableTh>
                  <TableTh>Geboortedatum</TableTh>
                  <TableTh>Geslacht</TableTh>
                  <TableTh>Relatie</TableTh>
                  <TableTh>Donatie</TableTh>
                  <TableTh style={{ textAlign: "right" }}>Acties</TableTh>
                </TableTr>
              </TableThead>
              <TableTbody>
                {guardian.students.map((student) => {
                  const donation = donationByStudent.get(student.id);
                  const paid = donation?.status === "PAID";
                  return (
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
                        {student.sex
                          ? SEX_LABELS[student.sex] ?? student.sex
                          : "—"}
                      </TableTd>
                      <TableTd>{student.relation ?? "—"}</TableTd>
                      <TableTd>
                        <Anchor
                          component="a"
                          href={`/dashboard/donations/${student.id}`}
                          underline="never"
                          c="inherit"
                          aria-label={`Donatie van ${student.firstName} ${student.lastName}`}
                        >
                          <Group gap={6} wrap="nowrap">
                            <Text size="sm" c={paid ? "green" : undefined}>
                              {donation
                                ? `${euro(donation.paidAmount)} / ${euro(donation.expectedAmount)}`
                                : "—"}
                            </Text>
                            <IconHeart
                              size={16}
                              color="var(--mantine-color-gray-6)"
                            />
                          </Group>
                        </Anchor>
                      </TableTd>
                      <TableTd>
                        <Group gap="xs" justify="flex-end" wrap="nowrap">
                          {donationOverview ? (
                            <AddPaymentButton
                              studentId={student.id}
                              academicYearId={donationOverview.academicYear.id}
                              suggestedAmount={Math.max(
                                donation?.balance ?? 0,
                                0,
                              )}
                              today={today}
                              iconOnly
                            />
                          ) : (
                            <ActionIcon
                              component="a"
                              href={`/dashboard/donations/${student.id}`}
                              variant="subtle"
                              size="sm"
                              aria-label="Donatie toevoegen"
                              title="Donatie toevoegen"
                            >
                              <IconCash size={16} />
                            </ActionIcon>
                          )}
                          <EditStudentButton
                            guardianId={guardian.id}
                            student={student}
                          />
                        </Group>
                      </TableTd>
                    </TableTr>
                  );
                })}
              </TableTbody>
            </Table>
          </TableScrollContainer>
        )}
      </Card>
    </Stack>
  );
}
