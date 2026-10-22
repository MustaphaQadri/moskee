import { after } from "next/server";
import {
  Anchor,
  Avatar,
  Badge,
  Button,
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
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";

import { requireRole } from "@/lib/dal";
import { purgeExpiredArchived } from "@/lib/archive";
import {
  addMonthsToDateOnly,
  toDateOnly,
  todayDateOnly,
} from "@/lib/dates";
import {
  isGuardianSortKey,
  listGuardians,
} from "@/lib/guardians";
import { getRegistrationSetting } from "@/lib/registration";
import {
  getStudentCounts,
  isStudentSortKey,
  listStudents,
  type StudentListItemDTO,
} from "@/lib/students";
import { isStudentStatus } from "@/lib/student-status";
import { isPersonSearchBy, type PersonSearchBy } from "@/lib/search";
import type { GuardianStatus } from "@/generated/prisma/enums";
import type { SortDir } from "@/lib/sort";
import {
  DeleteGuardianButton,
  DeleteStudentButton,
} from "./delete-buttons";
import { SearchTarget } from "./search-target";

type TabValue = "guardians" | "students";

const STUDENT_STATUS_OPTIONS = [
  { value: "", label: "Alle" },
  { value: "WAITING_LIST", label: "Wachtlijst" },
  { value: "ACTIVE", label: "Actief" },
  { value: "ARCHIVED", label: "Gearchiveerd" },
] as const;

const EDUCATION_FILTER_OPTIONS = [
  { value: "", label: "Alle" },
  { value: "with", label: "Met onderwijsNr." },
  { value: "without", label: "Zonder onderwijsNr." },
] as const;

const GUARDIAN_STATUS_OPTIONS = [
  { value: "active", label: "Actief" },
  { value: "archived", label: "Gearchiveerd" },
  { value: "all", label: "Alle" },
] as const;

type EducationFilter = "" | "with" | "without";
type GuardianStatusFilter = GuardianStatus | "all";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function deletionDate(
  archivedAt: string | null,
  retentionMonths: number,
): string | null {
  return archivedAt ? addMonthsToDateOnly(archivedAt, retentionMonths) : null;
}

function guardianNumbers(
  student: StudentListItemDTO,
  key: "donationNumber" | "educationNumber",
): string {
  const values = [
    ...new Set(
      student.guardians
        .map((guardian) => guardian[key])
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  return values.length > 0 ? values.join(", ") : "—";
}

function SearchBar({
  tab,
  placeholder,
  search,
  searchBy = "all",
  education = "",
  gstatus = "",
}: {
  tab: TabValue;
  placeholder: string;
  search: string;
  searchBy?: PersonSearchBy;
  education?: EducationFilter;
  gstatus?: string;
}) {
  return (
    <Paper withBorder p="md">
      <form action="/dashboard/guardians" method="get">
        <input type="hidden" name="tab" value={tab} />
        {education && (
          <input type="hidden" name="education" value={education} />
        )}
        {gstatus && <input type="hidden" name="gstatus" value={gstatus} />}
        <Stack gap="sm">
          <SearchTarget defaultValue={searchBy} />
          <Group align="flex-end">
            <TextInput
              name="q"
              label="Zoeken"
              placeholder={placeholder}
              defaultValue={search}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1 }}
            />
            <Button type="submit" variant="light">
              Zoeken
            </Button>
            {search && (
              <Button
                component="a"
                href={`/dashboard/guardians?tab=${tab}${
                  education ? `&education=${education}` : ""
                }${gstatus ? `&gstatus=${gstatus}` : ""}${
                  searchBy !== "all" ? `&searchBy=${searchBy}` : ""
                }`}
                variant="subtle"
                color="gray"
              >
                Wissen
              </Button>
            )}
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}

function SortHeader({
  label,
  column,
  tab,
  search,
  searchBy = "all",
  education = "",
  gstatus = "",
  current,
  dir,
}: {
  label: string;
  column: string;
  tab: TabValue;
  search: string;
  searchBy?: PersonSearchBy;
  education?: EducationFilter;
  gstatus?: string;
  current: string;
  dir: SortDir;
}) {
  const active = current === column;
  const nextDir: SortDir = active && dir === "asc" ? "desc" : "asc";

  const params = new URLSearchParams({ tab });
  if (search) params.set("q", search);
  if (searchBy !== "all") params.set("searchBy", searchBy);
  if (education) params.set("education", education);
  if (gstatus) params.set("gstatus", gstatus);
  params.set("sort", column);
  params.set("dir", nextDir);

  return (
    <TableTh>
      <Anchor
        href={`/dashboard/guardians?${params.toString()}`}
        c="inherit"
        underline="never"
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
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

export default async function GuardiansPage({
  searchParams,
}: PageProps<"/dashboard/guardians">) {
  await requireRole("manager");

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const searchBy: PersonSearchBy = isPersonSearchBy(params.searchBy)
    ? params.searchBy
    : "all";
  const tab: TabValue = params.tab === "guardians" ? "guardians" : "students";

  const sortParam = typeof params.sort === "string" ? params.sort : "";
  const dir: SortDir = params.dir === "desc" ? "desc" : "asc";

  const guardianSort = isGuardianSortKey(sortParam) ? sortParam : "name";
  const studentSort = isStudentSortKey(sortParam) ? sortParam : "name";
  const studentStatus = isStudentStatus(params.status) ? params.status : "";
  const educationFilter: EducationFilter =
    params.education === "with" || params.education === "without"
      ? params.education
      : "";
  const guardianStatusFilter: GuardianStatusFilter =
    params.gstatus === "archived"
      ? "ARCHIVED"
      : params.gstatus === "all"
        ? "all"
        : "ACTIVE";
  const guardianStatusParam =
    guardianStatusFilter === "ARCHIVED"
      ? "archived"
      : guardianStatusFilter === "all"
        ? "all"
        : "";

  // Lazy retention cleanup after the response: this render still shows overdue
  // archived rows (in red), and they are removed for the next visit.
  after(async () => {
    await purgeExpiredArchived();
  });

  const [guardians, students, registration, studentCounts] = await Promise.all([
    listGuardians({
      search,
      searchBy,
      sort: guardianSort,
      dir,
      hasEducationNumber:
        educationFilter === "with"
          ? true
          : educationFilter === "without"
            ? false
            : undefined,
      status: guardianStatusFilter === "all" ? undefined : guardianStatusFilter,
    }),
    listStudents({
      search,
      searchBy,
      sort: studentSort,
      dir,
      status: studentStatus || undefined,
    }),
    getRegistrationSetting(),
    getStudentCounts(),
  ]);

  const retentionMonths = registration.archiveRetentionMonths;
  const today = toDateOnly(todayDateOnly())!;
  const showGuardianArchiveColumns = guardianStatusFilter === "ARCHIVED";
  const showStudentArchiveColumns = studentStatus === "ARCHIVED";

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Inschrijvingen</Title>
        <Button
          component="a"
          href="/dashboard/guardians/new"
          leftSection={<IconPlus size={16} />}
        >
          Nieuwe inschrijving
        </Button>
      </Group>

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTab value="students">Leerlingen</TabsTab>
          <TabsTab value="guardians">Ouders / verzorgers</TabsTab>
        </TabsList>

        <TabsPanel value="guardians" pt="md">
          <Stack>
            <SearchBar
              tab="guardians"
              placeholder="Naam, chartnummer of onderwijsnummer"
              search={search}
              searchBy={searchBy}
              education={educationFilter}
              gstatus={guardianStatusParam}
            />

            <Group gap="xs">
              {GUARDIAN_STATUS_OPTIONS.map((option) => {
                const pillParams = new URLSearchParams({ tab: "guardians" });
                if (search) pillParams.set("q", search);
                if (searchBy !== "all") pillParams.set("searchBy", searchBy);
                if (educationFilter) {
                  pillParams.set("education", educationFilter);
                }
                if (option.value !== "active") {
                  pillParams.set("gstatus", option.value);
                }
                return (
                  <Button
                    key={option.value}
                    component="a"
                    href={`/dashboard/guardians?${pillParams.toString()}`}
                    size="xs"
                    variant={
                      guardianStatusParam ===
                      (option.value === "active" ? "" : option.value)
                        ? "filled"
                        : "default"
                    }
                  >
                    {option.label}
                  </Button>
                );
              })}
            </Group>

            <Group gap="xs">
              {EDUCATION_FILTER_OPTIONS.map((option) => {
                const pillParams = new URLSearchParams({ tab: "guardians" });
                if (search) pillParams.set("q", search);
                if (searchBy !== "all") pillParams.set("searchBy", searchBy);
                if (guardianStatusParam) {
                  pillParams.set("gstatus", guardianStatusParam);
                }
                if (option.value) pillParams.set("education", option.value);
                return (
                  <Button
                    key={option.value}
                    component="a"
                    href={`/dashboard/guardians?${pillParams.toString()}`}
                    size="xs"
                    variant={
                      educationFilter === option.value ? "filled" : "default"
                    }
                  >
                    {option.label}
                  </Button>
                );
              })}
            </Group>

            {guardians.length === 0 ? (
              <Text c="dimmed">
                {search || educationFilter
                  ? "Geen ouders/verzorgers gevonden."
                  : "Nog geen ouders/verzorgers geregistreerd."}
              </Text>
            ) : (
              <TableScrollContainer minWidth={1180}>
                <Table striped highlightOnHover>
                  <TableThead>
                    <TableTr>
                      <SortHeader
                        label="Naam"
                        column="name"
                        tab="guardians"
                        search={search}
                        searchBy={searchBy}
                        education={educationFilter}
                        gstatus={guardianStatusParam}
                        current={guardianSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="E-mail"
                        column="email"
                        tab="guardians"
                        search={search}
                        searchBy={searchBy}
                        education={educationFilter}
                        gstatus={guardianStatusParam}
                        current={guardianSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Telefoon"
                        column="phone"
                        tab="guardians"
                        search={search}
                        searchBy={searchBy}
                        education={educationFilter}
                        gstatus={guardianStatusParam}
                        current={guardianSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Chartnr."
                        column="donationNumber"
                        tab="guardians"
                        search={search}
                        searchBy={searchBy}
                        education={educationFilter}
                        gstatus={guardianStatusParam}
                        current={guardianSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Onderwijsnr."
                        column="educationNumber"
                        tab="guardians"
                        search={search}
                        searchBy={searchBy}
                        education={educationFilter}
                        gstatus={guardianStatusParam}
                        current={guardianSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Leerlingen"
                        column="studentCount"
                        tab="guardians"
                        search={search}
                        searchBy={searchBy}
                        education={educationFilter}
                        gstatus={guardianStatusParam}
                        current={guardianSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Inschrijfdatum"
                        column="enrolledAt"
                        tab="guardians"
                        search={search}
                        searchBy={searchBy}
                        education={educationFilter}
                        gstatus={guardianStatusParam}
                        current={guardianSort}
                        dir={dir}
                      />
                      {showGuardianArchiveColumns && (
                        <>
                          <SortHeader
                            label="Gearchiveerd op"
                            column="archivedAt"
                            tab="guardians"
                            search={search}
                            searchBy={searchBy}
                            education={educationFilter}
                            gstatus={guardianStatusParam}
                            current={guardianSort}
                            dir={dir}
                          />
                          <TableTh>Verwijderdatum</TableTh>
                        </>
                      )}
                      <TableTh>Actie</TableTh>
                    </TableTr>
                  </TableThead>
                  <TableTbody>
                    {guardians.map((guardian) => {
                      const archived = guardian.status === "ARCHIVED";
                      const deleteDate = deletionDate(
                        guardian.archivedAt,
                        retentionMonths,
                      );
                      const overdue = deleteDate !== null && deleteDate <= today;

                      return (
                        <TableTr key={guardian.id}>
                          <TableTd>
                            {guardian.lastName}, {guardian.firstName}
                          </TableTd>
                          <TableTd>{guardian.email ?? "—"}</TableTd>
                          <TableTd>{guardian.phone ?? "—"}</TableTd>
                          <TableTd>{guardian.donationNumber ?? "—"}</TableTd>
                          <TableTd>{guardian.educationNumber ?? "—"}</TableTd>
                          <TableTd>
                            <Badge variant="light">
                              {guardian.studentCount}
                            </Badge>
                          </TableTd>
                          <TableTd>{formatDate(guardian.enrolledAt)}</TableTd>
                          {showGuardianArchiveColumns && (
                            <>
                              <TableTd>
                                {archived ? formatDate(guardian.archivedAt) : "—"}
                              </TableTd>
                              <TableTd>
                                {archived ? (
                                  <Text
                                    c={overdue ? "red" : undefined}
                                    fw={overdue ? 600 : undefined}
                                  >
                                    {formatDate(deleteDate)}
                                  </Text>
                                ) : (
                                  "—"
                                )}
                              </TableTd>
                            </>
                          )}
                          <TableTd>
                            <Group gap="xs" wrap="nowrap">
                              <Button
                                component="a"
                                href={`/dashboard/guardians/${guardian.id}`}
                                size="xs"
                                variant="subtle"
                              >
                                Bekijken
                              </Button>
                              {!archived && (
                                <DeleteGuardianButton
                                  guardianId={guardian.id}
                                  guardianName={`${guardian.firstName} ${guardian.lastName}`}
                                  students={guardian.students}
                                  retentionMonths={retentionMonths}
                                />
                              )}
                            </Group>
                          </TableTd>
                        </TableTr>
                      );
                    })}
                  </TableTbody>
                </Table>
              </TableScrollContainer>
            )}
          </Stack>
        </TabsPanel>

        <TabsPanel value="students" pt="md">
          <Stack>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Paper withBorder p="md">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Totaal leerlingen
                </Text>
                <Text fw={600} size="xl" c="brand">
                  {studentCounts.total}
                </Text>
              </Paper>
              <Paper withBorder p="md">
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Gearchiveerd
                </Text>
                <Text fw={600} size="xl" c="gray">
                  {studentCounts.archived}
                </Text>
              </Paper>
            </SimpleGrid>

            <SearchBar
              tab="students"
              placeholder="Naam, chartnummer of onderwijsnummer"
              search={search}
              searchBy={searchBy}
            />

            <Group gap="xs">
              {STUDENT_STATUS_OPTIONS.map((option) => {
                const pillParams = new URLSearchParams({ tab: "students" });
                if (search) pillParams.set("q", search);
                if (searchBy !== "all") pillParams.set("searchBy", searchBy);
                if (option.value) pillParams.set("status", option.value);
                return (
                  <Button
                    key={option.value}
                    component="a"
                    href={`/dashboard/guardians?${pillParams.toString()}`}
                    size="xs"
                    variant={studentStatus === option.value ? "filled" : "default"}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </Group>

            {students.length === 0 ? (
              <Text c="dimmed">
                {search
                  ? "Geen leerlingen gevonden."
                  : "Nog geen leerlingen geregistreerd."}
              </Text>
            ) : (
              <TableScrollContainer minWidth={1240}>
                <Table striped highlightOnHover>
                  <TableThead>
                    <TableTr>
                      <SortHeader
                        label="Voornaam"
                        column="firstName"
                        tab="students"
                        search={search}
                        searchBy={searchBy}
                        current={studentSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Achternaam"
                        column="lastName"
                        tab="students"
                        search={search}
                        searchBy={searchBy}
                        current={studentSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Klas"
                        column="class"
                        tab="students"
                        search={search}
                        searchBy={searchBy}
                        current={studentSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Ouders / verzorgers"
                        column="guardian"
                        tab="students"
                        search={search}
                        searchBy={searchBy}
                        current={studentSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Chartnr."
                        column="donationNumber"
                        tab="students"
                        search={search}
                        searchBy={searchBy}
                        current={studentSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Onderwijsnr."
                        column="educationNumber"
                        tab="students"
                        search={search}
                        searchBy={searchBy}
                        current={studentSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Inschrijfdatum"
                        column="enrolledAt"
                        tab="students"
                        search={search}
                        searchBy={searchBy}
                        current={studentSort}
                        dir={dir}
                      />
                      {showStudentArchiveColumns && (
                        <>
                          <SortHeader
                            label="Gearchiveerd op"
                            column="archivedAt"
                            tab="students"
                            search={search}
                            searchBy={searchBy}
                            current={studentSort}
                            dir={dir}
                          />
                          <TableTh>Verwijderdatum</TableTh>
                        </>
                      )}
                      <TableTh>Actie</TableTh>
                    </TableTr>
                  </TableThead>
                  <TableTbody>
                    {students.map((student) => {
                      const archived = student.status === "ARCHIVED";
                      const deleteDate = deletionDate(
                        student.archivedAt,
                        retentionMonths,
                      );
                      const overdue = deleteDate !== null && deleteDate <= today;

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
                                "/dashboard/guardians?tab=students",
                              )}`}
                            >
                              {student.firstName}
                            </Anchor>
                          </Group>
                        </TableTd>
                        <TableTd>{student.lastName}</TableTd>
                        <TableTd>
                          {student.class ? (
                            <Anchor
                              component="a"
                              href={`/dashboard/classes/${student.class.id}`}
                            >
                              {student.class.name}
                            </Anchor>
                          ) : (
                            <Text c="dimmed">Geen klas</Text>
                          )}
                        </TableTd>
                        <TableTd>
                          {student.guardians.length === 0 ? (
                            <Text c="dimmed">Geen</Text>
                          ) : (
                            <Group gap="xs" wrap="wrap">
                              {student.guardians.map((guardian) => (
                                <Anchor
                                  key={guardian.id}
                                  component="a"
                                  href={`/dashboard/guardians/${guardian.id}`}
                                  size="sm"
                                >
                                  {guardian.firstName} {guardian.lastName}
                                  {guardian.relation
                                    ? ` (${guardian.relation})`
                                    : ""}
                                </Anchor>
                              ))}
                            </Group>
                          )}
                        </TableTd>
                        <TableTd>{guardianNumbers(student, "donationNumber")}</TableTd>
                        <TableTd>{guardianNumbers(student, "educationNumber")}</TableTd>
                        <TableTd>{formatDate(student.enrolledAt)}</TableTd>
                        {showStudentArchiveColumns && (
                          <>
                            <TableTd>
                              {archived ? formatDate(student.archivedAt) : "—"}
                            </TableTd>
                            <TableTd>
                              {archived ? (
                                <Text
                                  c={overdue ? "red" : undefined}
                                  fw={overdue ? 600 : undefined}
                                >
                                  {formatDate(deleteDate)}
                                </Text>
                              ) : (
                                "—"
                              )}
                            </TableTd>
                          </>
                        )}
                        <TableTd>
                          {!archived && (
                            <DeleteStudentButton
                              studentId={student.id}
                              studentName={`${student.firstName} ${student.lastName}`}
                              retentionMonths={retentionMonths}
                            />
                          )}
                        </TableTd>
                      </TableTr>
                      );
                    })}
                  </TableTbody>
                </Table>
              </TableScrollContainer>
            )}
          </Stack>
        </TabsPanel>
      </Tabs>
    </Stack>
  );
}
