"use client";

import { useState } from "react";
import {
  Card,
  Group,
  SegmentedControl,
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

import { LineChart, type LineChartSeries } from "@/components/line-chart";
import { PieChart, type PieSlice } from "@/components/pie-chart";
import type { AttendanceDashboardDTO } from "@/lib/dashboard";

type Mode = "summary" | "trend";
type GroupKey = "present" | "late" | "absent";

const GROUPS = [
  { key: "present", label: "Aanwezig", color: "var(--mantine-color-green-5)" },
  { key: "late", label: "Te laat", color: "var(--mantine-color-orange-5)" },
  { key: "absent", label: "Afwezig", color: "var(--mantine-color-red-5)" },
] as const satisfies readonly {
  key: GroupKey;
  label: string;
  color: string;
}[];

const SERIES: LineChartSeries[] = GROUPS.map((group) => ({
  key: group.key,
  label: group.label,
  color: group.color,
}));

function percent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

export function AttendanceWidget({
  data,
}: {
  data: AttendanceDashboardDTO | null;
}) {
  const [mode, setMode] = useState<Mode>("summary");

  if (!data) {
    return (
      <Card withBorder>
        <Title order={4} mb="md">
          Aanwezigheid
        </Title>
        <Text c="dimmed">
          Er is nog geen huidig schooljaar met startdatum ingesteld.
        </Text>
      </Card>
    );
  }

  const slices: PieSlice[] = GROUPS.map((group) => ({
    label: group.label,
    value: data.summary[group.key],
    color: group.color,
  }));

  const dailyPercent = data.days.map((day) => {
    const total = day.present + day.late + day.absent;
    const share = (value: number) => (total > 0 ? (value / total) * 100 : 0);
    return {
      date: day.date,
      present: share(day.present),
      late: share(day.late),
      absent: share(day.absent),
    };
  });

  return (
    <Card withBorder>
      <Group justify="space-between" align="flex-start" mb="md" wrap="wrap">
        <div>
          <Title order={4}>Aanwezigheid</Title>
          <Text size="sm" c="dimmed">
            {data.academicYear.name} · vanaf{" "}
            {formatDate(data.academicYear.startDate)}
          </Text>
        </div>
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as Mode)}
          data={[
            { value: "summary", label: "Verdeling" },
            { value: "trend", label: "Per dag" },
          ]}
          size="sm"
        />
      </Group>

      {data.summary.total === 0 ? (
        <Text c="dimmed">
          Nog geen aanwezigheid geregistreerd sinds de start van het
          schooljaar.
        </Text>
      ) : mode === "summary" ? (
        <SimpleGrid
          cols={{ base: 1, sm: 2 }}
          spacing="md"
          style={{ alignItems: "center" }}
        >
          <Group justify="center" w="100%">
            <PieChart
              data={slices}
              size={240}
              thickness={28}
              gap={1.5}
              label="Registraties"
              showLegend={false}
              ariaLabel="Aanwezigheid naar status"
            />
          </Group>

          <TableScrollContainer minWidth={280}>
            <Table highlightOnHover>
              <TableThead>
                <TableTr>
                  <TableTh>Status</TableTh>
                  <TableTh style={{ textAlign: "right" }}>Aantal</TableTh>
                  <TableTh style={{ textAlign: "right" }}>%</TableTh>
                </TableTr>
              </TableThead>
              <TableTbody>
                {GROUPS.map((group) => (
                  <TableTr key={group.key}>
                    <TableTd>
                      <Group gap="xs" wrap="nowrap">
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 2,
                            background: group.color,
                            display: "inline-block",
                            flexShrink: 0,
                          }}
                        />
                        <span>{group.label}</span>
                      </Group>
                    </TableTd>
                    <TableTd style={{ textAlign: "right" }}>
                      {data.summary[group.key]}
                    </TableTd>
                    <TableTd style={{ textAlign: "right" }}>
                      {percent(data.summary[group.key], data.summary.total)}%
                    </TableTd>
                  </TableTr>
                ))}
                <TableTr>
                  <TableTd fw={600}>Totaal</TableTd>
                  <TableTd style={{ textAlign: "right" }} fw={600}>
                    {data.summary.total}
                  </TableTd>
                  <TableTd style={{ textAlign: "right" }} fw={600}>
                    {percent(data.summary.total, data.summary.total)}%
                  </TableTd>
                </TableTr>
              </TableTbody>
            </Table>
          </TableScrollContainer>
        </SimpleGrid>
      ) : (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Aandeel per dag (%)
          </Text>
          <LineChart data={dailyPercent} series={SERIES} percentage />
          <Group gap="lg" justify="center" wrap="wrap">
            {GROUPS.map((group) => (
              <Group key={group.key} gap={6} wrap="nowrap">
                <span
                  style={{
                    width: 18,
                    height: 3,
                    borderRadius: 2,
                    background: group.color,
                    display: "inline-block",
                  }}
                />
                <Text size="sm">{group.label}</Text>
              </Group>
            ))}
          </Group>
        </Stack>
      )}

      {data.summary.total > 0 && (
        <Text size="xs" c="dimmed" mt="md">
          Te laat = te laat + erg laat · Afwezig = afwezig + geoorloofd
          afwezig.
        </Text>
      )}
    </Card>
  );
}
