import { Alert, Anchor, Stack, Title } from "@mantine/core";

import { requireRole } from "@/lib/dal";
import { listLevels, listRooms, listSessions, listTeachers } from "@/lib/lookups";
import { ClassForm } from "../class-form";

export default async function NewClassPage() {
  await requireRole("manager");

  const [levels, rooms, teachers, sessions] = await Promise.all([
    listLevels(),
    listRooms(),
    listTeachers(),
    listSessions(),
  ]);

  return (
    <Stack gap="md">
      <Title order={2}>Nieuwe klas</Title>

      {levels.length === 0 ? (
        <Alert color="yellow" variant="light" title="Nog geen niveaus">
          Maak eerst een niveau aan via{" "}
          <Anchor href="/dashboard/manage">Beheer</Anchor> voordat je een klas
          kunt toevoegen.
        </Alert>
      ) : (
        <ClassForm
          levels={levels}
          rooms={rooms}
          teachers={teachers}
          sessions={sessions}
        />
      )}
    </Stack>
  );
}
