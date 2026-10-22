"use client";

import { List, Stack, Text } from "@mantine/core";

import {
  archiveGuardian,
  archiveStudent,
} from "@/app/actions/guardians";
import { ConfirmDeleteButton } from "@/app/dashboard/manage/confirm-delete";
import { useActionFeedback } from "@/app/dashboard/manage/use-action-feedback";

export function DeleteStudentButton({
  studentId,
  studentName,
  retentionMonths,
}: {
  studentId: string;
  studentName: string;
  retentionMonths: number;
}) {
  const handleResult = useActionFeedback();

  return (
    <ConfirmDeleteButton
      iconOnly
      itemName={studentName}
      onConfirm={async () =>
        handleResult(
          await archiveStudent({ id: studentId }),
          "Leerling gearchiveerd.",
        )
      }
      description={
        <Stack gap={6}>
          <Text size="sm">
            De leerling wordt gearchiveerd en actieve klasinschrijvingen worden
            beëindigd.
          </Text>
          <Text size="sm" c="red">
            Na {retentionMonths} maanden wordt de leerling definitief verwijderd,
            inclusief aanwezigheid, cijfers, donaties en opmerkingen.
          </Text>
        </Stack>
      }
    />
  );
}

export function DeleteGuardianButton({
  guardianId,
  guardianName,
  students,
  retentionMonths,
}: {
  guardianId: string;
  guardianName: string;
  students: { id: string; firstName: string; lastName: string }[];
  retentionMonths: number;
}) {
  const handleResult = useActionFeedback();

  return (
    <ConfirmDeleteButton
      iconOnly
      itemName={guardianName}
      onConfirm={async () =>
        handleResult(
          await archiveGuardian({ id: guardianId }),
          "Ouder/verzorger en gekoppelde leerlingen gearchiveerd.",
        )
      }
      description={
        <Stack gap={6}>
          {students.length > 0 ? (
            <>
              <Text size="sm">
                De ouder/verzorger en de volgende leerling
                {students.length === 1 ? "" : "en"} worden gearchiveerd:
              </Text>
              <List size="sm" spacing={2}>
                {students.map((student) => (
                  <List.Item key={student.id}>
                    {student.firstName} {student.lastName}
                  </List.Item>
                ))}
              </List>
            </>
          ) : (
            <Text size="sm">
              De ouder/verzorger wordt gearchiveerd. Er zijn geen gekoppelde
              leerlingen.
            </Text>
          )}
          <Text size="sm" c="red">
            Na {retentionMonths} maanden worden deze records definitief
            verwijderd.
          </Text>
        </Stack>
      }
    />
  );
}
