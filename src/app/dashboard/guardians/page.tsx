import {
  Anchor,
  Avatar,
  Badge,
  Button,
  Group,
  Paper,
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
import {
  isGuardianSortKey,
  listGuardians,
} from "@/lib/guardians";
import { isStudentSortKey, listStudents } from "@/lib/students";
import {
  STUDENT_STATUS_COLORS,
  STUDENT_STATUS_LABELS,
  isStudentStatus,
} from "@/lib/student-status";
import type { SortDir } from "@/lib/sort";

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

type EducationFilter = "" | "with" | "without";

function SearchBar({
  tab,
  placeholder,
  search,
  education = "",
}: {
  tab: TabValue;
  placeholder: string;
  search: string;
  education?: EducationFilter;
}) {
  return (
    <Paper withBorder p="md">
      <form action="/dashboard/guardians" method="get">
        <input type="hidden" name="tab" value={tab} />
        {education && (
          <input type="hidden" name="education" value={education} />
        )}
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
              }`}
              variant="subtle"
              color="gray"
            >
              Wissen
            </Button>
          )}
        </Group>
      </form>
    </Paper>
  );
}

function SortHeader({
  label,
  column,
  tab,
  search,
  education = "",
  current,
  dir,
}: {
  label: string;
  column: string;
  tab: TabValue;
  search: string;
  education?: EducationFilter;
  current: string;
  dir: SortDir;
}) {
  const active = current === column;
  const nextDir: SortDir = active && dir === "asc" ? "desc" : "asc";

  const params = new URLSearchParams({ tab });
  if (search) params.set("q", search);
  if (education) params.set("education", education);
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
  const tab: TabValue = params.tab === "students" ? "students" : "guardians";

  const sortParam = typeof params.sort === "string" ? params.sort : "";
  const dir: SortDir = params.dir === "desc" ? "desc" : "asc";

  const guardianSort = isGuardianSortKey(sortParam) ? sortParam : "name";
  const studentSort = isStudentSortKey(sortParam) ? sortParam : "name";
  const studentStatus = isStudentStatus(params.status) ? params.status : "";
  const educationFilter: EducationFilter =
    params.education === "with" || params.education === "without"
      ? params.education
      : "";

  const [guardians, students] = await Promise.all([
    listGuardians({
      search,
      sort: guardianSort,
      dir,
      hasEducationNumber:
        educationFilter === "with"
          ? true
          : educationFilter === "without"
            ? false
            : undefined,
    }),
    listStudents({
      search,
      sort: studentSort,
      dir,
      status: studentStatus || undefined,
    }),
  ]);

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
          <TabsTab value="guardians">Ouders / verzorgers</TabsTab>
          <TabsTab value="students">Leerlingen</TabsTab>
        </TabsList>

        <TabsPanel value="guardians" pt="md">
          <Stack>
            <SearchBar
              tab="guardians"
              placeholder="Naam, e-mail, telefoon of nummer"
              search={search}
              education={educationFilter}
            />

            <Group gap="xs">
              {EDUCATION_FILTER_OPTIONS.map((option) => {
                const pillParams = new URLSearchParams({ tab: "guardians" });
                if (search) pillParams.set("q", search);
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
              <TableScrollContainer minWidth={860}>
                <Table striped highlightOnHover>
                  <TableThead>
                    <TableTr>
                      <SortHeader
                        label="Naam"
                        column="name"
                        tab="guardians"
                        search={search}
                        education={educationFilter}
                        current={guardianSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="E-mail"
                        column="email"
                        tab="guardians"
                        search={search}
                        education={educationFilter}
                        current={guardianSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Telefoon"
                        column="phone"
                        tab="guardians"
                        search={search}
                        education={educationFilter}
                        current={guardianSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Chartnr."
                        column="donationNumber"
                        tab="guardians"
                        search={search}
                        education={educationFilter}
                        current={guardianSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Onderwijsnr."
                        column="educationNumber"
                        tab="guardians"
                        search={search}
                        education={educationFilter}
                        current={guardianSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Leerlingen"
                        column="studentCount"
                        tab="guardians"
                        search={search}
                        education={educationFilter}
                        current={guardianSort}
                        dir={dir}
                      />
                      <TableTh />
                    </TableTr>
                  </TableThead>
                  <TableTbody>
                    {guardians.map((guardian) => (
                      <TableTr key={guardian.id}>
                        <TableTd>
                          {guardian.lastName}, {guardian.firstName}
                        </TableTd>
                        <TableTd>{guardian.email ?? "—"}</TableTd>
                        <TableTd>{guardian.phone ?? "—"}</TableTd>
                        <TableTd>{guardian.donationNumber ?? "—"}</TableTd>
                        <TableTd>{guardian.educationNumber ?? "—"}</TableTd>
                        <TableTd>
                          <Badge variant="light">{guardian.studentCount}</Badge>
                        </TableTd>
                        <TableTd>
                          <Button
                            component="a"
                            href={`/dashboard/guardians/${guardian.id}`}
                            size="xs"
                            variant="subtle"
                          >
                            Bekijken
                          </Button>
                        </TableTd>
                      </TableTr>
                    ))}
                  </TableTbody>
                </Table>
              </TableScrollContainer>
            )}
          </Stack>
        </TabsPanel>

        <TabsPanel value="students" pt="md">
          <Stack>
            <SearchBar
              tab="students"
              placeholder="Naam van de leerling"
              search={search}
            />

            <Group gap="xs">
              {STUDENT_STATUS_OPTIONS.map((option) => {
                const pillParams = new URLSearchParams({ tab: "students" });
                if (search) pillParams.set("q", search);
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
              <TableScrollContainer minWidth={720}>
                <Table striped highlightOnHover>
                  <TableThead>
                    <TableTr>
                      <SortHeader
                        label="Naam"
                        column="name"
                        tab="students"
                        search={search}
                        current={studentSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Klas"
                        column="class"
                        tab="students"
                        search={search}
                        current={studentSort}
                        dir={dir}
                      />
                      <SortHeader
                        label="Ouders / verzorgers"
                        column="guardian"
                        tab="students"
                        search={search}
                        current={studentSort}
                        dir={dir}
                      />
                      <TableTh>Status</TableTh>
                    </TableTr>
                  </TableThead>
                  <TableTbody>
                    {students.map((student) => (
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
                              {student.lastName}, {student.firstName}
                            </Anchor>
                          </Group>
                        </TableTd>
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
                        <TableTd>
                          <Badge
                            variant="light"
                            color={STUDENT_STATUS_COLORS[student.status]}
                          >
                            {STUDENT_STATUS_LABELS[student.status]}
                          </Badge>
                        </TableTd>
                      </TableTr>
                    ))}
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
