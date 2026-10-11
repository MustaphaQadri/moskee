import { notFound } from "next/navigation";
import {
  Anchor,
  Badge,
  Card,
  Divider,
  Group,
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

import { requireRole } from "@/lib/dal";
import { getStudentDonationHistory } from "@/lib/donations";
import {
  DONATION_CATEGORY_COLORS,
  DONATION_CATEGORY_LABELS,
  DONATION_STATUS_COLORS,
  DONATION_STATUS_LABELS,
} from "@/lib/donation-status";
import { toDateOnly } from "@/lib/dates";
import {
  AddPaymentButton,
  DeletePaymentButton,
  EditPaymentButton,
  ExpectationButton,
} from "./payment-dialogs";

const LOG_ACTION_LABELS: Record<string, string> = {
  CREATED: "Toegevoegd",
  UPDATED: "Gewijzigd",
  DELETED: "Verwijderd",
};

const LOG_ACTION_COLORS: Record<string, string> = {
  CREATED: "green",
  UPDATED: "blue",
  DELETED: "red",
};

function euro(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function DonationDetailPage({
  params,
}: PageProps<"/dashboard/donations/[studentId]">) {
  await requireRole("manager");

  const { studentId } = await params;
  const history = await getStudentDonationHistory(studentId);
  if (!history) notFound();

  const today = toDateOnly(new Date()) ?? "";

  return (
    <Stack gap="md">
      <Anchor component="a" href="/dashboard/donations" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} />
          Terug naar donaties
        </Group>
      </Anchor>

      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>
            {history.student.firstName} {history.student.lastName}
          </Title>
          <Text c="dimmed" size="sm">
            Donatiegeschiedenis — verwachting en betalingen per schooljaar.
          </Text>
        </div>
        <Anchor
          component="a"
          href={`/dashboard/students/${history.student.id}`}
          size="sm"
        >
          Leerlingprofiel
        </Anchor>
      </Group>

      {history.years.length === 0 ? (
        <Text c="dimmed">
          Er is nog geen huidig schooljaar ingesteld. Stel eerst een schooljaar
          in bij Beheer om donaties te registreren.
        </Text>
      ) : (
        history.years.map((year) => (
          <Card key={year.academicYear.id} withBorder>
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <Group gap="sm">
                <Title order={4}>{year.academicYear.name}</Title>
                {year.academicYear.isCurrent && (
                  <Badge color="green" variant="light" size="sm">
                    Huidig
                  </Badge>
                )}
                <Badge
                  variant="light"
                  color={DONATION_STATUS_COLORS[year.status]}
                >
                  {DONATION_STATUS_LABELS[year.status]}
                </Badge>
                <Badge
                  variant="outline"
                  color={DONATION_CATEGORY_COLORS[year.category]}
                >
                  {DONATION_CATEGORY_LABELS[year.category]}
                </Badge>
              </Group>
              <Group gap="xs">
                <ExpectationButton
                  studentId={history.student.id}
                  academicYearId={year.academicYear.id}
                  category={year.category}
                  expectedAmount={year.expectedAmount}
                  note={year.note}
                  defaultAmount={history.defaultAmount}
                />
                <AddPaymentButton
                  studentId={history.student.id}
                  academicYearId={year.academicYear.id}
                  suggestedAmount={Math.max(year.balance, 0)}
                  today={today}
                />
              </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} mt="md">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Verwachting
                </Text>
                <Text fw={600}>{euro(year.expectedAmount)}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Betaald
                </Text>
                <Text fw={600} c="brand">
                  {euro(year.paidAmount)}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Openstaand
                </Text>
                <Text fw={600} c={year.balance > 0 ? "red" : undefined}>
                  {euro(Math.max(year.balance, 0))}
                </Text>
              </div>
            </SimpleGrid>

            {year.note && (
              <Text size="sm" c="dimmed" mt="sm">
                Opmerking: {year.note}
              </Text>
            )}

            <Divider my="md" />

            <Text fw={500} mb="xs">
              Betalingen ({year.payments.length})
            </Text>
            {year.payments.length === 0 ? (
              <Text c="dimmed" size="sm">
                Nog geen betalingen geregistreerd.
              </Text>
            ) : (
              <TableScrollContainer minWidth={640}>
                <Table striped highlightOnHover>
                  <TableThead>
                    <TableTr>
                      <TableTh>Datum</TableTh>
                      <TableTh>Bedrag</TableTh>
                      <TableTh>Opgenomen door</TableTh>
                      <TableTh>Opmerking</TableTh>
                      <TableTh />
                    </TableTr>
                  </TableThead>
                  <TableTbody>
                    {year.payments.map((payment) => (
                      <TableTr key={payment.id}>
                        <TableTd>{formatDate(payment.paidAt)}</TableTd>
                        <TableTd>{euro(payment.amount)}</TableTd>
                        <TableTd>{payment.recordedByName ?? "—"}</TableTd>
                        <TableTd>{payment.note ?? "—"}</TableTd>
                        <TableTd>
                          <Group gap="xs" justify="flex-end">
                            <EditPaymentButton payment={payment} />
                            <DeletePaymentButton paymentId={payment.id} />
                          </Group>
                        </TableTd>
                      </TableTr>
                    ))}
                  </TableTbody>
                </Table>
              </TableScrollContainer>
            )}

            {year.logs.length > 0 && (
              <>
                <Text fw={500} mt="md" mb="xs">
                  Mutaties
                </Text>
                <Stack gap={6}>
                  {year.logs.map((log) => (
                    <Group key={log.id} gap="xs" wrap="nowrap">
                      <Badge
                        size="sm"
                        variant="light"
                        color={LOG_ACTION_COLORS[log.action] ?? "gray"}
                      >
                        {LOG_ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                      <Text size="sm">
                        {log.action === "DELETED"
                          ? `${euro(log.amountBefore ?? 0)} verwijderd`
                          : log.action === "UPDATED"
                            ? `${euro(log.amountBefore ?? 0)} → ${euro(log.amountAfter ?? 0)}`
                            : `${euro(log.amountAfter ?? 0)} op ${formatDate(log.paidAtAfter)}`}
                      </Text>
                      <Text size="xs" c="dimmed">
                        door {log.actorName ?? "onbekend"} · {formatDateTime(log.createdAt)}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </>
            )}
          </Card>
        ))
      )}
    </Stack>
  );
}
