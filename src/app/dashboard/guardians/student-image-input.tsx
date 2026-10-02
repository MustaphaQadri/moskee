"use client";

import { useState } from "react";
import { Button, FileInput, Group, Image, Loader, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPhoto, IconTrash } from "@tabler/icons-react";

// Uploads a student photo immediately on selection and reports the resulting
// URL. Used by the subscription form and the add/edit student dialogs.
export function StudentImageInput({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);

    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/uploads/student-image", {
        method: "POST",
        body,
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        notifications.show({
          title: "Upload mislukt",
          message: data?.error ?? "Probeer het opnieuw.",
          color: "red",
        });
        return;
      }
      const data = (await response.json()) as { url: string };
      onChange(data.url);
    } catch {
      notifications.show({
        title: "Upload mislukt",
        message: "Probeer het opnieuw.",
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Stack gap="xs">
      <FileInput
        label="Foto"
        placeholder="Kies een foto"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        leftSection={<IconPhoto size={16} />}
        disabled={uploading}
        value={null}
        onChange={handleFile}
      />
      {uploading && (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">
            Bezig met uploaden…
          </Text>
        </Group>
      )}
      {value && !uploading && (
        <Group>
          <Image
            src={value}
            alt="Foto van de leerling"
            w={72}
            h={72}
            fit="cover"
            radius="sm"
          />
          <Button
            variant="subtle"
            color="red"
            size="xs"
            leftSection={<IconTrash size={14} />}
            onClick={() => onChange(null)}
          >
            Verwijderen
          </Button>
        </Group>
      )}
    </Stack>
  );
}
