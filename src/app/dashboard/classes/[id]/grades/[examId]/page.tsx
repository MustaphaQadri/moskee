import { notFound } from "next/navigation";
import { Anchor, Group, Stack } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

import { requireStaff } from "@/lib/authorization";
import { getClassDetail } from "@/lib/classes";
import { getExamGradeSheet } from "@/lib/grades";
import { ExamSheet } from "./exam-sheet";

export default async function ExamGradePage({
  params,
}: PageProps<"/dashboard/classes/[id]/grades/[examId]">) {
  const staff = await requireStaff();

  const { id, examId } = await params;
  const schoolClass = await getClassDetail(id, staff);
  if (!schoolClass) notFound();

  const sheet = await getExamGradeSheet(examId);
  if (!sheet || sheet.exam.classId !== id) notFound();

  return (
    <Stack gap="md">
      <Anchor
        component="a"
        href={`/dashboard/classes/${id}/grades`}
        size="sm"
      >
        <Group gap={4}>
          <IconArrowLeft size={16} />
          Terug naar cijfers
        </Group>
      </Anchor>

      <ExamSheet classId={id} exam={sheet.exam} students={sheet.students} />
    </Stack>
  );
}
