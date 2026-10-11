import {
  Anchor,
  Badge,
  Card,
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
  IconArrowsSort,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";

import { requireRole } from "@/lib/dal";
import { getDonationReport } from "@/lib/donations";
import { listAcademicYears } from "@/lib/lookups";
import {
  DONATION_STATUS_COLORS,
  DONATION_STATUS_LABELS,
  paidRatioColor,
  type DonationStatus,
} from "@/lib/donation-status";
import { sortRows, type SortDir } from "@/lib/sort";
import { DonationFilters } from "./donation-filters";

const BASE_PATH = "/dashboard/donations";
const SORT_KEYS = ["name", "expected", "paid", "balance"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const STATUS_VALUES = ["PAID", "PARTIAL", "UNPAID", "EXEMPT"] as const;

function isSortKey(value: unknown): value is SortKey {
  return typeof value === "string" && (SORT_KEYS as readonly string[]).includes(value);
}

function isStatus(value: unknown): value is DonationStatus {
  return typeof value === "string" && (STATUS_VALUES as readonly string[]).includes(value);
}

function euro(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function SortHeader({
  label,
  column,
  yearId,
  status,
  sort,
  dir,
  align,
}: {
  label: string;
  column: SortKey;
  yearId: string;
  status: string;
  sort: SortKey;
  dir: SortDir;
  align?: "right";
}) {
  const active = sort === column;
  const nextDir: SortDir = active && dir === "asc" ? "desc" : "asc";

  const params = new URLSearchParams();
  params.set("year", yearId);
  if (status) params.set("status", status);
  params.set("sort", column);
  params.set("dir", nextDir);

  return (
    <TableTh style={align ? { textAlign: align } : undefined}>
      <Anchor href={`${BASE_PATH}?${params.toString()}`} c="inherit" underline="never">
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            justifyContent: align === "right" ? "flex-end" : undefined,
          }}
        >
          {label}
          {active ? (
            dir === "asc" ? (
              <IconChevronUp size={14} />
            ) : (
              <IconChevronDown size={14} />
            )
          ) : (
            <IconArrowsSort size={14} color="var(--mantine-color-gray-5)" />
          )}
        </span>
      </Anchor>
    </TableTh>
  );
}

export default async function DonationsPage({
  searchParams,
}: PageProps<"/dashboard/donations">) {
  await requireRole("manager");

  const params = await searchParams;
  const years = await listAcademicYears();

  const yearId =
    ((typeof params.year === "string" &&
      years.some((year) => year.id === params.year) &&
      params.year) ||
      years.find((year) => year.isCurrent)?.id ||
      years[0]?.id) ??
    "";

  const statusParam = params.status;
  const status = isStatus(statusParam) ? statusParam : "";
  const sortParam = params.sort;
  const sort: SortKey = isSortKey(sortParam) ? sortParam : "name";
  const dir: SortDir = params.dir === "desc" ? "desc" : "asc";

  const report = yearId
    ? await getDonationReport({ academicYearId: yearId })
    : null;

  const rows = (report?.rows ?? []).filter((row) =>
    status ? row.status === status : true,
  );

  const sorted = sortRows(rows, dir, (row) => {
    switch (sort) {
      case "expected":
        return row.expectedAmount;
      case "paid":
        return row.paidAmount;
      case "balance":
        return row.balance;
      default:
        return `${row.lastName} ${row.firstName}`;
    }
  });

  const totals = sorted.reduce(
    (acc, row) => {
      acc.expected += row.expectedAmount;
      acc.paid += row.paidAmount;
      acc.outstanding += Math.max(row.balance, 0);
      return acc;
    },
    { expected: 0, paid: 0, outstanding: 0 },
  );

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Donaties</Title>
        <Text c="dimmed" size="sm">
          Jaarlijkse donaties per leerling — wie heeft betaald en wie niet.
        </Text>
      </div>

      {years.length === 0 ? (
        <Text c="dimmed">
          Er zijn nog geen schooljaren ingesteld. Stel eerst een schooljaar in bij
          Beheer.
        </Text>
      ) : (
        <>
          <DonationFilters
            basePath={BASE_PATH}
            years={years.map((year) => ({ value: year.id, label: year.name }))}
            yearId={yearId}
            status={status}
          />

          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Paper withBorder p="md">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Verwachting
              </Text>
              <Text fw={600} size="xl">
                {euro(totals.expected)}
              </Text>
            </Paper>
            <Paper withBorder p="md">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Betaald
              </Text>
              <Text fw={600} size="xl" c="brand">
                {euro(totals.paid)}
              </Text>
            </Paper>
            <Paper withBorder p="md">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Openstaand
              </Text>
              <Text fw={600} size="xl" c="red">
                {euro(totals.outstanding)}
              </Text>
            </Paper>
          </SimpleGrid>

          <Card withBorder>
            {sorted.length === 0 ? (
              <Text c="dimmed">Geen leerlingen voor deze filter.</Text>
            ) : (
              <TableScrollContainer minWidth={720}>
                <Table striped highlightOnHover verticalSpacing="sm">
                  <TableThead>
                    <TableTr>
                      <SortHeader
                        label="Leerling"
                        column="name"
                        yearId={yearId}
                        status={status}
                        sort={sort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Verwachting"
                        column="expected"
                        yearId={yearId}
                        status={status}
                        sort={sort}
                        dir={dir}
                        align="right"
                      />
                      <SortHeader
                        label="Betaald"
                        column="paid"
                        yearId={yearId}
                        status={status}
                        sort={sort}
                        dir={dir}
                        align="right"
                      />
                      <SortHeader
                        label="Openstaand"
                        column="balance"
                        yearId={yearId}
                        status={status}
                        sort={sort}
                        dir={dir}
                        align="right"
                      />
                      <TableTh>Status</TableTh>
                    </TableTr>
                  </TableThead>
                  <TableTbody>
                    {sorted.map((row) => (
                      <TableTr key={row.studentId}>
                        <TableTd>
                          <Anchor
                            component="a"
                            href={`${BASE_PATH}/${row.studentId}`}
                            fw={500}
                          >
                            {row.lastName}, {row.firstName}
                          </Anchor>
                        </TableTd>
                        <TableTd style={{ textAlign: "right" }}>
                          {euro(row.expectedAmount)}
                        </TableTd>
                        <TableTd style={{ textAlign: "right" }}>
                          <Badge
                            variant="light"
                            color={paidRatioColor(
                              row.paidAmount,
                              row.expectedAmount,
                            )}
                          >
                            {euro(row.paidAmount)}
                          </Badge>
                        </TableTd>
                        <TableTd style={{ textAlign: "right" }}>
                          {euro(Math.max(row.balance, 0))}
                        </TableTd>
                        <TableTd>
                          <Badge
                            variant="light"
                            color={DONATION_STATUS_COLORS[row.status]}
                          >
                            {DONATION_STATUS_LABELS[row.status]}
                          </Badge>
                        </TableTd>
                      </TableTr>
                    ))}
                  </TableTbody>
                </Table>
              </TableScrollContainer>
            )}
          </Card>
        </>
      )}
    </Stack>
  );
}
