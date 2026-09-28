import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { requireRole } from "@/lib/dal";
import { getClassDetail } from "@/lib/classes";
import { listLevels, listRooms, listSessions, listTeachers } from "@/lib/lookups";
import { ClassForm } from "../../class-form";

export default async function EditClassPage({
  params,
}: PageProps<"/dashboard/classes/[id]/edit">) {
  const session = await requireRole("manager");

  const { id } = await params;
  const [schoolClass, levels, rooms, teachers, sessions] = await Promise.all([
    getClassDetail(id, { userId: session.user.id, isTeacher: false }),
    listLevels(),
    listRooms(),
    listTeachers(),
    listSessions(),
  ]);

  if (!schoolClass) {
    notFound();
  }

  return (
    <Stack gap="md">
      <Title order={2}>Klas bewerken</Title>
      <ClassForm
        classId={schoolClass.id}
        initial={{
          name: schoolClass.name,
          description: schoolClass.description,
          levelId: schoolClass.level?.id ?? null,
          roomId: schoolClass.room?.id ?? null,
          teacherId: schoolClass.teacher?.id ?? null,
          sessionIds: schoolClass.sessions.map((s) => s.id),
        }}
        levels={levels}
        rooms={rooms}
        teachers={teachers}
        sessions={sessions}
      />
    </Stack>
  );
}
