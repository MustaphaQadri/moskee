"use client";

import { useState, type ReactNode } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";

// Small confirm-then-delete button used across the management panels. The
// caller owns the actual server call; this only gates it behind a modal.
export function ConfirmDeleteButton({
  itemName,
  onConfirm,
  description,
  iconOnly = false,
}: {
  itemName: string;
  onConfirm: () => Promise<boolean>;
  description?: ReactNode;
  iconOnly?: boolean;
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
      {iconOnly ? (
        <Tooltip label="Verwijderen">
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            aria-label="Verwijderen"
            onClick={open}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      ) : (
        <Button
          variant="subtle"
          color="red"
          size="xs"
          leftSection={<IconTrash size={16} />}
          onClick={open}
        >
          Verwijderen
        </Button>
      )}
      <Modal opened={opened} onClose={close} title="Bevestigen">
        <Stack>
          <Text>
            Weet je zeker dat je <strong>{itemName}</strong> wilt verwijderen?
          </Text>
          {description && (
            <Box>
              {typeof description === "string" ? (
                <Text size="sm" c="dimmed">
                  {description}
                </Text>
              ) : (
                description
              )}
            </Box>
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
