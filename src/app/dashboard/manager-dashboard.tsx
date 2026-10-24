import {
  Anchor,
  Badge,
  Card,
  Grid,
  GridCol,
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

import { PieChart, type PieSlice } from "@/components/pie-chart";
import {
  getDonationDashboardSummary,
  getStudentGenderDistribution,
  getStudentLevelDistribution,
  type DonationDashboardSummaryDTO,
  type StudentGenderDistributionDTO,
  type StudentLevelDistributionDTO,
} from "@/lib/dashboard";
import {
  DONATION_COLORS,
  DONATION_STATUS_LABELS,
} from "@/lib/donation-status";

const LEVEL_COLORS = [
  "var(--mantine-color-blue-5)",
  "var(--mantine-color-teal-5)",
  "var(--mantine-color-grape-5)",
  "var(--mantine-color-cyan-5)",
  "var(--mantine-color-indigo-5)",
  "var(--mantine-color-pink-5)",
  "var(--mantine-color-lime-5)",
  "var(--mantine-color-violet-5)",
];

const UNASSIGNED_COLOR = "var(--mantine-color-gray-4)";
const WAITING_LIST_COLOR = "var(--mantine-color-yellow-5)";
const BOYS_COLOR = "var(--mantine-color-blue-5)";
const GIRLS_COLOR = "var(--mantine-color-pink-5)";

function percent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function DonationStatusWidget({
  summary,
}: {
  summary: DonationDashboardSummaryDTO | null;
}) {
  if (!summary) {
    return (
      <Card withBorder h="100%">
        <Title order={4} mb="md">
          Donaties
        </Title>
        <Text c="dimmed">
          Er is nog geen huidig schooljaar ingesteld. Stel er eerst een in bij
          Beheer.
        </Text>
      </Card>
    );
  }

  const slices: PieSlice[] = [
    {
      label: DONATION_STATUS_LABELS.PAID,
      value: summary.paidAmount,
      color: DONATION_COLORS.PAID,
    },
    {
      label: DONATION_STATUS_LABELS.PARTIAL,
      value: summary.partialAmount,
      color: DONATION_COLORS.PARTIAL,
    },
    {
      label: DONATION_STATUS_LABELS.UNPAID,
      value: summary.unpaidAmount,
      color: DONATION_COLORS.UNPAID,
    },
  ];

  return (
    <Card withBorder h="100%">
      <Group justify="space-between" align="flex-start" mb="md">
        <div>
          <Title order={4}>Donaties</Title>
          <Text size="sm" c="dimmed">
            {summary.academicYear.name}
          </Text>
        </div>
        <Anchor component="a" href="/dashboard/donations" size="sm">
          Bekijk donaties
        </Anchor>
      </Group>

      {summary.requiredAmount <= 0 ? (
        <Stack gap="xs">
          <Text c="dimmed">Geen verplichte donaties voor dit schooljaar.</Text>
          <Badge variant="light" color="gray">
            Vrijgesteld: {summary.exemptCount}
          </Badge>
        </Stack>
      ) : (
        <Stack align="center" gap="md">
          <PieChart
            data={slices}
            size={200}
            thickness={24}
            gap={1.5}
            legendGap="xl"
            label="Verplicht"
            showTotal={false}
            showValues={false}
            ariaLabel="Donatiestatus naar verwacht bedrag"
          />
          <Group gap="xs">
            <Badge variant="light" color="gray">
              Vrijgesteld: {summary.exemptCount}
            </Badge>
          </Group>
        </Stack>
      )}
    </Card>
  );
}

function GenderWidget({
  distribution,
}: {
  distribution: StudentGenderDistributionDTO;
}) {
  const slices: PieSlice[] = [
    { label: "Jongens", value: distribution.male, color: BOYS_COLOR },
    { label: "Meisjes", value: distribution.female, color: GIRLS_COLOR },
    ...(distribution.unknown > 0
      ? [
          {
            label: "Onbekend",
            value: distribution.unknown,
            color: UNASSIGNED_COLOR,
          },
        ]
      : []),
  ];

  return (
    <Card withBorder h="100%">
      <Group justify="space-between" align="flex-start" mb="md">
        <div>
          <Title order={4}>Jongens vs meisjes</Title>
          <Text size="sm" c="dimmed">
            {distribution.total} leerlingen
          </Text>
        </div>
      </Group>

      {distribution.total === 0 ? (
        <Text c="dimmed">Nog geen leerlingen.</Text>
      ) : (
        <Stack align="center" gap="md">
          <PieChart
            data={slices}
            size={200}
            thickness={24}
            gap={1.5}
            legendGap="xl"
            label="Leerlingen"
            showValues={false}
            ariaLabel="Percentage jongens en meisjes"
          />
        </Stack>
      )}
    </Card>
  );
}

function StudentLevelWidget({
  distribution,
}: {
  distribution: StudentLevelDistributionDTO;
}) {
  const items = [
    ...distribution.levels.map((level, index) => ({
      key: level.id,
      label: level.name,
      count: level.count,
      color: LEVEL_COLORS[index % LEVEL_COLORS.length],
    })),
    {
      key: "unassigned",
      label: "Niet ingedeeld",
      count: distribution.unassigned,
      color: UNASSIGNED_COLOR,
    },
    {
      key: "waiting",
      label: "Wachtlijst",
      count: distribution.waitingList,
      color: WAITING_LIST_COLOR,
    },
  ];

  const slices: PieSlice[] = items.map((item) => ({
    label: item.label,
    value: item.count,
    color: item.color,
  }));

  const rows = [...items].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );

  return (
    <Card withBorder>
      <Group justify="space-between" align="flex-start" mb="md">
        <div>
          <Title order={4}>Leerlingen per niveau</Title>
          <Text size="sm" c="dimmed">
            {distribution.total} leerlingen
          </Text>
        </div>
        <Anchor component="a" href="/dashboard/classes" size="sm">
          Bekijk klassen
        </Anchor>
      </Group>

      <SimpleGrid
        cols={{ base: 1, sm: 2 }}
        spacing="md"
        style={{ alignItems: "center" }}
      >
        <Group justify="center" align="center" h="100%" w="100%">
          <PieChart
            data={slices}
            size={320}
            thickness={30}
            gap={1.5}
            label="Leerlingen"
            showLegend={false}
            ariaLabel="Verdeling leerlingen per niveau"
          />
        </Group>

        <TableScrollContainer minWidth={260}>
          <Table highlightOnHover>
            <TableThead>
              <TableTr>
                <TableTh>Indeling</TableTh>
                <TableTh style={{ textAlign: "right" }}>Aantal</TableTh>
                <TableTh style={{ textAlign: "right" }}>%</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {rows.map((row) => (
                <TableTr key={row.key}>
                  <TableTd>
                    <Group gap="xs" wrap="nowrap">
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 2,
                          background: row.color,
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      <span>{row.label}</span>
                    </Group>
                  </TableTd>
                  <TableTd style={{ textAlign: "right" }}>{row.count}</TableTd>
                  <TableTd style={{ textAlign: "right" }}>
                    {percent(row.count, distribution.total)}%
                  </TableTd>
                </TableTr>
              ))}
              <TableTr>
                <TableTd fw={600}>Totaal</TableTd>
                <TableTd style={{ textAlign: "right" }} fw={600}>
                  {distribution.total}
                </TableTd>
                <TableTd style={{ textAlign: "right" }} fw={600}>
                  {percent(distribution.total, distribution.total)}%
                </TableTd>
              </TableTr>
            </TableTbody>
          </Table>
        </TableScrollContainer>
      </SimpleGrid>
    </Card>
  );
}

// Static "no active lessons" dashboard for now. A later iteration will detect
// active ClassSession times and render an active-lessons widget set instead.
export async function ManagerDashboard() {
  const [donations, gender, distribution] = await Promise.all([
    getDonationDashboardSummary(),
    getStudentGenderDistribution(),
    getStudentLevelDistribution(),
  ]);

  return (
    <Grid gap="md">
      <GridCol span={{ base: 12, md: 6 }}>
        <DonationStatusWidget summary={donations} />
      </GridCol>
      <GridCol span={{ base: 12, md: 6 }}>
        <GenderWidget distribution={gender} />
      </GridCol>
      <GridCol span={12}>
        <StudentLevelWidget distribution={distribution} />
      </GridCol>
    </Grid>
  );
}
