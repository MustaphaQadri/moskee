import { notFound } from "next/navigation";
import {
  Anchor,
  Avatar,
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
import { getStudentAttendanceDetail } from "@/lib/attendance";
import { listAttendancePeriods } from "@/lib/grades";
import { parseDateOnly, toDateOnly } from "@/lib/dates";
import {
  ATTENDANCE_BADGE_COLORS,
  ATTENDANCE_COLORS,
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
} from "@/lib/attendance-status";
import { PieChart } from "@/components/pie-chart";
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
  const studentId = student.id;

  const query = await searchParams;
  const backTo =
    typeof query.from === "string" && query.from.startsWith("/dashboard/")
      ? query.from
      : "/dashboard/classes";

  const { periods } = await listAttendancePeriods();
  const today = toDateOnly(new Date()) ?? "";
  const requestedTermId =
    typeof query.period === "string" ? query.period : "";

  // Show the current period by default; otherwise the most recent past period.
  const selectedPeriod =
    periods.find((period) => period.termId === requestedTermId) ??
    periods.find((period) => period.isCurrent) ??
    [...periods].reverse().find((period) => period.endDate < today) ??
    periods[0] ??
    null;

  const attendance = selectedPeriod
    ? await getStudentAttendanceDetail(studentId, {
        from: parseDateOnly(selectedPeriod.startDate),
        to: parseDateOnly(selectedPeriod.endDate),
      })
    : null;

  const pieData = attendance
    ? ATTENDANCE_STATUSES.map((status) => ({
        label: ATTENDANCE_LABELS[status],
        value: attendance.summary[status],
        color: ATTENDANCE_COLORS[status],
      }))
    : [];

  function periodHref(termId: string): string {
    const params = new URLSearchParams();
    if (typeof query.from === "string" && query.from.startsWith("/dashboard/")) {
      params.set("from", query.from);
    }
    params.set("period", termId);
    return `/dashboard/students/${studentId}?${params.toString()}`;
  }

  return (
    <Stack gap="md">
      <Anchor component="a" href={backTo} size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} />
          Terug
        </Group>
      </Anchor>

      <Group gap="md" align="flex-start">
        <Avatar
          src={student.image}
          alt={`${student.firstName} ${student.lastName}`}
          size={72}
          radius="md"
        />
        <div>
          <Group gap="sm">
            <Title order={2}>
              {student.firstName} {student.lastName}
            </Title>
            {student.sex && (
              <Badge variant="light">
                {SEX_LABELS[student.sex] ?? student.sex}
              </Badge>
            )}
          </Group>
          <Text c="dimmed">Geboortedatum: {formatDate(student.dateOfBirth)}</Text>
        </div>
      </Group>

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
                {guardian.relation && (
                  <Text size="sm" c="dimmed">
                    {guardian.relation}
                  </Text>
                )}
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
        <Stack gap="lg">
          <div>
            <Title order={5}>Aanwezigheid per periode</Title>
            {selectedPeriod && (
              <Text size="sm" c="dimmed">
                {selectedPeriod.name} · {formatDate(selectedPeriod.startDate)} t/m{" "}
                {formatDate(selectedPeriod.endDate)}
              </Text>
            )}
          </div>

          {!selectedPeriod ? (
            <Text c="dimmed">
              Nog geen periodes ingesteld voor het huidige schooljaar.
            </Text>
          ) : !attendance || attendance.summary.total === 0 ? (
            <Text c="dimmed">
              Nog geen aanwezigheid geregistreerd in deze periode.
            </Text>
          ) : (
            <Stack gap="lg">
              <PieChart data={pieData} label="Totaal" />

              <div>
                <Text fw={500} mb="xs">
                  Afwezig / te laat ({attendance.records.length})
                </Text>
                {attendance.records.length === 0 ? (
                  <Text c="dimmed" size="sm">
                    Altijd aanwezig geweest in deze periode.
                  </Text>
                ) : (
                  <TableScrollContainer minWidth={640}>
                    <Table striped highlightOnHover>
                      <TableThead>
                        <TableTr>
                          <TableTh>Datum</TableTh>
                          <TableTh>Klas</TableTh>
                          <TableTh>Tijdslot</TableTh>
                          <TableTh>Status</TableTh>
                          <TableTh>Notitie</TableTh>
                        </TableTr>
                      </TableThead>
                      <TableTbody>
                        {attendance.records.map((record) => (
                          <TableTr key={record.id}>
                            <TableTd>{formatDate(record.date)}</TableTd>
                            <TableTd>{record.className}</TableTd>
                            <TableTd>{record.sessionLabel}</TableTd>
                            <TableTd>
                              <Badge
                                color={ATTENDANCE_BADGE_COLORS[record.status]}
                                variant="light"
                              >
                                {ATTENDANCE_LABELS[record.status]}
                              </Badge>
                            </TableTd>
                            <TableTd>{record.note ?? "—"}</TableTd>
                          </TableTr>
                        ))}
                      </TableTbody>
                    </Table>
                  </TableScrollContainer>
                )}
              </div>
            </Stack>
          )}

          {periods.length > 0 && (
            <div>
              <Text fw={500} mb="xs">
                Periode
              </Text>
              <TableScrollContainer minWidth={520}>
                <Table highlightOnHover>
                  <TableThead>
                    <TableTr>
                      <TableTh>Periode</TableTh>
                      <TableTh>Van</TableTh>
                      <TableTh>Tot</TableTh>
                      <TableTh />
                    </TableTr>
                  </TableThead>
                  <TableTbody>
                    {periods.map((period) => {
                      const active = period.termId === selectedPeriod?.termId;
                      return (
                        <TableTr
                          key={period.termId}
                          bg={
                            active
                              ? "var(--mantine-color-blue-light)"
                              : undefined
                          }
                        >
                          <TableTd>
                            <Anchor
                              component="a"
                              href={periodHref(period.termId)}
                              fw={active ? 600 : undefined}
                            >
                              {period.name}
                            </Anchor>
                          </TableTd>
                          <TableTd>{formatDate(period.startDate)}</TableTd>
                          <TableTd>{formatDate(period.endDate)}</TableTd>
                          <TableTd>
                            {period.isCurrent && (
                              <Badge color="green" variant="light" size="sm">
                                Huidig
                              </Badge>
                            )}
                          </TableTd>
                        </TableTr>
                      );
                    })}
                  </TableTbody>
                </Table>
              </TableScrollContainer>
            </div>
          )}
        </Stack>
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
