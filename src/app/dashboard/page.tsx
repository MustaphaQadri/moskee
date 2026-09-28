import { Button, Group, Stack, Text, Title } from "@mantine/core";

import { requireSession } from "@/lib/dal";

export default async function DashboardPage() {
  const session = await requireSession();
  const isManager = session.user.role === "manager";

  return (
    <Stack gap="md">
      <Title order={2}>Dashboard</Title>
      <Text c="dimmed">Welkom, {session.user.name}.</Text>

      {isManager && (
        <Group>
          <Button component="a" href="/dashboard/guardians">
            Inschrijvingen
          </Button>
          <Button
            component="a"
            href="/dashboard/guardians/new"
            variant="light"
          >
            Nieuwe inschrijving
          </Button>
        </Group>
      )}
    </Stack>
  );
}
