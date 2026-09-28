import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlus, IconSearch } from "@tabler/icons-react";

import { requireStaff } from "@/lib/authorization";
import { listClasses } from "@/lib/classes";

export default async function ClassesPage({
  searchParams,
}: PageProps<"/dashboard/classes">) {
  const staff = await requireStaff();

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const classes = await listClasses({ staff, search });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Klassen</Title>
        {!staff.isTeacher && (
          <Button
            component="a"
            href="/dashboard/classes/new"
            leftSection={<IconPlus size={16} />}
          >
            Nieuwe klas
          </Button>
        )}
      </Group>

      <Paper withBorder p="md">
        <form action="/dashboard/classes" method="get">
          <Group align="flex-end">
            <TextInput
              name="q"
              label="Zoeken"
              placeholder="Naam of niveau"
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
                href="/dashboard/classes"
                variant="subtle"
                color="gray"
              >
                Wissen
              </Button>
            )}
          </Group>
        </form>
      </Paper>

      {classes.length === 0 ? (
        <Text c="dimmed">
          {search ? "Geen klassen gevonden." : "Nog geen klassen."}
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {classes.map((schoolClass) => (
            <Card
              key={schoolClass.id}
              withBorder
              component="a"
              href={`/dashboard/classes/${schoolClass.id}`}
              padding="lg"
            >
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start">
                  <Text fw={600}>{schoolClass.name}</Text>
                  {schoolClass.level && (
                    <Badge variant="light">{schoolClass.level.name}</Badge>
                  )}
                </Group>

                <Text size="sm" c="dimmed">
                  Docent: {schoolClass.teacher?.name ?? "—"}
                </Text>
                <Text size="sm" c="dimmed">
                  Lokaal: {schoolClass.room?.name ?? "—"}
                </Text>

                <Group gap={4} wrap="wrap">
                  {schoolClass.sessions.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      Geen tijdslot
                    </Text>
                  ) : (
                    schoolClass.sessions.map((session) => (
                      <Badge key={session.id} variant="outline" size="sm">
                        {session.label}
                      </Badge>
                    ))
                  )}
                </Group>

                <Group gap="lg">
                  <Text size="sm">
                    <Text span fw={600}>
                      {schoolClass.studentCount}
                    </Text>{" "}
                    leerlingen
                  </Text>
                  <Text size="sm">
                    <Text span fw={600}>
                      {schoolClass.subjectCount}
                    </Text>{" "}
                    vakken
                  </Text>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
