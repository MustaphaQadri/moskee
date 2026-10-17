"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCopy, IconLink, IconRefresh } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

import { createGuardianRegistrationLink } from "@/app/actions/guardian-registration";
import type { RegistrationLinkDTO } from "@/lib/registration";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(
    new Date(iso),
  );
}

// Clipboard API is unavailable on plain HTTP (non-secure context), which is how
// the app currently runs on the VPS — fall back to the legacy copy command.
async function copyText(value: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("copy failed");
  }
}

export function RegistrationLinkButton({
  guardianId,
  initialLink,
}: {
  guardianId: string;
  initialLink: RegistrationLinkDTO | null;
}) {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [link, setLink] = useState<RegistrationLinkDTO | null>(initialLink);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);

    const result = await createGuardianRegistrationLink(guardianId);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      notifications.show({
        title: "Genereren mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }

    setLink(result.data);
    notifications.show({
      title: "Link gegenereerd",
      message: "De vorige link (indien aanwezig) is ingetrokken.",
      color: "green",
    });
    router.refresh();
  }

  async function copy() {
    if (!link) return;
    try {
      await copyText(link.url);
      notifications.show({
        title: "Gekopieerd",
        message: "De registratielink staat op het klembord.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Kopiëren mislukt",
        message: "Selecteer de link en kopieer hem handmatig.",
        color: "red",
      });
    }
  }

  return (
    <>
      <Button
        variant="light"
        leftSection={<IconLink size={16} />}
        onClick={open}
      >
        Registratielink
      </Button>

      <Modal
        opened={opened}
        onClose={close}
        title="Registratielink voor deze ouder"
        size="lg"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Stuur deze link naar de ouder. Die vult zelf de verplichte gegevens
            aan en voegt de kinderen toe. De link kan één keer worden gebruikt.
          </Text>

          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          {link ? (
            <>
              <TextInput
                label="Link"
                value={link.url}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
              <Text size="sm" c="dimmed">
                Geldig tot en met {formatDate(link.expiresAt)}.
              </Text>
              <Group justify="space-between">
                <Button
                  variant="light"
                  leftSection={<IconCopy size={16} />}
                  onClick={copy}
                >
                  Kopiëren
                </Button>
                <Button
                  variant="subtle"
                  color="gray"
                  leftSection={<IconRefresh size={16} />}
                  onClick={generate}
                  loading={loading}
                >
                  Nieuwe link genereren
                </Button>
              </Group>
              <Text size="xs" c="dimmed">
                Een nieuwe link maakt de huidige link direct ongeldig.
              </Text>
            </>
          ) : (
            <>
              <Text size="sm">
                Er is nog geen actieve registratielink voor deze ouder.
              </Text>
              <Group justify="flex-end">
                <Button
                  leftSection={<IconLink size={16} />}
                  onClick={generate}
                  loading={loading}
                >
                  Link genereren
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </>
  );
}
