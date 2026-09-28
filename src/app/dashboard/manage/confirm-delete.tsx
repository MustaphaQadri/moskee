"use client";

import { useState } from "react";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";

// Small confirm-then-delete button used across the management panels. The
// caller owns the actual server call; this only gates it behind a modal.
export function ConfirmDeleteButton({
  itemName,
  onConfirm,
  description,
}: {
  itemName: string;
  onConfirm: () => Promise<boolean>;
  description?: string;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const ok = await onConfirm();
    setLoading(false);
    if (ok) close();
  }

  return (
    <>
      <Button
        variant="subtle"
        color="red"
        size="xs"
        leftSection={<IconTrash size={16} />}
        onClick={open}
      >
        Verwijderen
      </Button>
      <Modal opened={opened} onClose={close} title="Bevestigen">
        <Stack>
          <Text>
            Weet je zeker dat je <strong>{itemName}</strong> wilt verwijderen?
          </Text>
          {description && (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Annuleren
            </Button>
            <Button color="red" loading={loading} onClick={handleConfirm}>
              Verwijderen
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
