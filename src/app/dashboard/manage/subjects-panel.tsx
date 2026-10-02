"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import {
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  Image,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconPencil,
  IconPhoto,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

import {
  createSubject,
  deleteSubject,
  updateSubject,
} from "@/app/actions/subjects";
import { ConfirmDeleteButton } from "./confirm-delete";
import { useActionFeedback } from "./use-action-feedback";
import type { LevelRow } from "./levels-panel";

export type SubjectRow = {
  id: string;
  levelId: string;
  name: string;
  description: string | null;
  image: string | null;
  sortOrder: number | null;
  isActive: boolean;
};

function SubjectForm({
  levelId,
  subject,
  onDone,
}: {
  levelId: string;
  subject: SubjectRow | null;
  onDone: () => void;
}) {
  const handleResult = useActionFeedback();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState(subject?.image ?? "");

  const form = useForm({
    initialValues: {
      name: subject?.name ?? "",
      description: subject?.description ?? "",
      sortOrder: subject?.sortOrder ?? null,
      isActive: subject?.isActive ?? true,
    },
    validate: {
      name: (value) => (value.trim() ? null : "Naam is verplicht"),
    },
  });

  async function uploadImage(): Promise<string | null> {
    if (!file) return existingImage || null;
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/uploads/subject-image", {
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
      return null;
    }
    const data = (await response.json()) as { url: string };
    return data.url;
  }

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const image = await uploadImage();
    if (image === null) {
      setLoading(false);
      return;
    }

    const text = values.description.trim();
    const payload = {
      name: values.name,
      description: text.length > 0 ? text : null,
      image,
      sortOrder: values.sortOrder,
      isActive: values.isActive,
    };
    const result = subject
      ? await updateSubject({ id: subject.id, ...payload })
      : await createSubject({ levelId, ...payload });
    setLoading(false);

    if (handleResult(result, subject ? "Vak bijgewerkt." : "Vak toegevoegd.")) {
      onDone();
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="Naam" required {...form.getInputProps("name")} />
        <Textarea
          label="Omschrijving"
          autosize
          minRows={2}
          maxRows={5}
          {...form.getInputProps("description")}
        />
        <Stack gap="xs">
          <FileInput
            label="Afbeelding"
            placeholder="Kies een afbeelding"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            clearable
            leftSection={<IconPlus size={16} />}
            value={file}
            onChange={setFile}
          />
          {existingImage && !file && (
            <Paper withBorder p="xs" w={120}>
              <Image
                src={existingImage}
                alt={subject?.name ?? "Vak"}
                h={80}
                fit="contain"
              />
              <Button
                variant="subtle"
                color="red"
                size="compact-xs"
                leftSection={<IconTrash size={14} />}
                onClick={() => setExistingImage("")}
                fullWidth
                mt="xs"
              >
                Verwijderen
              </Button>
            </Paper>
          )}
        </Stack>
        <NumberInput
          label="Volgorde"
          min={0}
          {...form.getInputProps("sortOrder")}
        />
        <Switch
          label="Actief"
          {...form.getInputProps("isActive", { type: "checkbox" })}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            Annuleren
          </Button>
          <Button type="submit" loading={loading}>
            Opslaan
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function SubjectsPanel({
  levels,
  subjects,
}: {
  levels: LevelRow[];
  subjects: SubjectRow[];
}) {
  const handleResult = useActionFeedback();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<SubjectRow | null>(null);
  const [levelId, setLevelId] = useState<string | null>(levels[0]?.id ?? null);

  const selectedLevelId = editing?.levelId ?? levelId;
  const rows = subjects.filter((subject) => subject.levelId === selectedLevelId);

  function openCreate() {
    setEditing(null);
    open();
  }

  function openEdit(subject: SubjectRow) {
    setEditing(subject);
    open();
  }

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <Select
          label="Niveau"
          data={levels.map((level) => ({ value: level.id, label: level.name }))}
          value={levelId}
          onChange={setLevelId}
          allowDeselect={false}
          style={{ flex: 1 }}
          disabled={editing !== null}
        />
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={openCreate}
          disabled={!selectedLevelId}
        >
          Vak toevoegen
        </Button>
      </Group>

      {!selectedLevelId ? (
        <Text c="dimmed">Maak eerst een niveau aan.</Text>
      ) : rows.length === 0 ? (
        <Text c="dimmed">Nog geen vakken voor dit niveau.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {rows.map((subject) => (
            <Card key={subject.id} withBorder padding="lg">
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  {subject.image ? (
                    <Image
                      src={subject.image}
                      alt={subject.name}
                      w={56}
                      h={56}
                      fit="contain"
                    />
                  ) : (
                    <ThemeIcon variant="light" size={56} radius="md">
                      <IconPhoto size={28} />
                    </ThemeIcon>
                  )}
                  <Badge
                    color={subject.isActive ? "green" : "gray"}
                    variant="light"
                  >
                    {subject.isActive ? "Actief" : "Inactief"}
                  </Badge>
                </Group>

                <div>
                  <Text fw={600}>{subject.name}</Text>
                  <Text
                    size="sm"
                    c="dimmed"
                    lineClamp={2}
                    mih="2.5em"
                  >
                    {subject.description ?? "Geen omschrijving"}
                  </Text>
                </div>

                <Group justify="space-between" align="center">
                  <Text size="xs" c="dimmed">
                    Volgorde: {subject.sortOrder ?? "—"}
                  </Text>
                  <Group gap="xs">
                    <Button
                      variant="subtle"
                      size="xs"
                      leftSection={<IconPencil size={16} />}
                      onClick={() => openEdit(subject)}
                    >
                      Bewerken
                    </Button>
                    <ConfirmDeleteButton
                      itemName={subject.name}
                      description="Een vak met cijfers kan niet verwijderd worden."
                      onConfirm={async () =>
                        handleResult(
                          await deleteSubject({ id: subject.id }),
                          "Vak verwijderd.",
                        )
                      }
                    />
                  </Group>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal
        opened={opened}
        onClose={close}
        title={editing ? "Vak bewerken" : "Vak toevoegen"}
      >
        <SubjectForm
          levelId={selectedLevelId ?? ""}
          subject={editing}
          onDone={close}
        />
      </Modal>
    </Stack>
  );
}
