"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconArrowsExchange } from "@tabler/icons-react";

import { moveStudents } from "@/app/actions/enrollments";

export type MoveTarget = {
  id: string;
  name: string;
  levelName: string | null;
};

// Manager-only move of a student's active class from their detail page. Reuses
// the same action as the class roster's bulk move.
export function MoveStudentButton({
  studentId,
  studentName,
  fromClassId,
  fromClassName,
  targets,
}: {
  studentId: string;
  studentName: string;
  fromClassId: string;
  fromClassName: string;
  targets: MoveTarget[];
}) {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [targetClassId, setTargetClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function closeModal() {
    close();
    setTargetClassId(null);
  }

  async function confirmMove() {
    if (!targetClassId) return;
    setLoading(true);
    const result = await moveStudents({
      fromClassId,
      toClassId: targetClassId,
      studentIds: [studentId],
    });
    setLoading(false);

    if (!result.ok) {
      notifications.show({
        title: "Verplaatsen mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }

    notifications.show({
      title: "Verplaatst",
      message: `${studentName} is verplaatst.`,
      color: "green",
    });
    closeModal();
    router.refresh();
  }

  return (
    <>
      <Button
        variant="light"
        leftSection={<IconArrowsExchange size={16} />}
        onClick={open}
        disabled={targets.length === 0}
      >
        Verplaatsen
      </Button>

      <Modal
        opened={opened}
        onClose={closeModal}
        title="Leerling verplaatsen"
      >
        <Stack>
          <Text size="sm">
            {studentName} zit nu in <strong>{fromClassName}</strong>. Kies de
            klas waarnaar de leerling verplaatst moet worden.
          </Text>
          <Select
            label="Doelklas"
            placeholder="Kies een klas"
            data={targets.map((target) => ({
              value: target.id,
              label: target.levelName
                ? `${target.name} (${target.levelName})`
                : target.name,
            }))}
            value={targetClassId}
            onChange={setTargetClassId}
            searchable
            allowDeselect={false}
            required
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal}>
              Annuleren
            </Button>
            <Button
              loading={loading}
              disabled={!targetClassId}
              onClick={confirmMove}
            >
              Verplaatsen
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
