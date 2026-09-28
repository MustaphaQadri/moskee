"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconPlus } from "@tabler/icons-react";

import { createLevel, deleteLevel, updateLevel } from "@/app/actions/levels";
import { ConfirmDeleteButton } from "./confirm-delete";
import { useActionFeedback } from "./use-action-feedback";

export type LevelRow = { id: string; name: string; sortOrder: number | null };

function LevelForm({
  level,
  onDone,
}: {
  level: LevelRow | null;
  onDone: () => void;
}) {
  const handleResult = useActionFeedback();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: level?.name ?? "",
      sortOrder: level?.sortOrder ?? null,
    },
    validate: {
      name: (value) => (value.trim() ? null : "Naam is verplicht"),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = level
      ? await updateLevel({ id: level.id, ...values })
      : await createLevel(values);
    setLoading(false);

    if (handleResult(result, level ? "Niveau bijgewerkt." : "Niveau toegevoegd.")) {
      onDone();
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="Naam" required {...form.getInputProps("name")} />
        <NumberInput
          label="Volgorde"
          min={0}
          {...form.getInputProps("sortOrder")}
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

export function LevelsPanel({ levels }: { levels: LevelRow[] }) {
  const handleResult = useActionFeedback();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<LevelRow | null>(null);

  function openCreate() {
    setEditing(null);
    open();
  }

  function openEdit(level: LevelRow) {
    setEditing(level);
    open();
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Text c="dimmed" size="sm">
          Niveaus die aan klassen en vakken gekoppeld worden.
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Niveau toevoegen
        </Button>
      </Group>

      {levels.length === 0 ? (
        <Text c="dimmed">Nog geen niveaus.</Text>
      ) : (
        <TableScrollContainer minWidth={480}>
          <Table striped highlightOnHover>
            <TableThead>
              <TableTr>
                <TableTh>Naam</TableTh>
                <TableTh>Volgorde</TableTh>
                <TableTh />
              </TableTr>
            </TableThead>
            <TableTbody>
              {levels.map((level) => (
                <TableTr key={level.id}>
                  <TableTd>{level.name}</TableTd>
                  <TableTd>{level.sortOrder ?? "—"}</TableTd>
                  <TableTd>
                    <Group gap="xs" justify="flex-end">
                      <Button
                        variant="subtle"
                        size="xs"
                        leftSection={<IconPencil size={16} />}
                        onClick={() => openEdit(level)}
                      >
                        Bewerken
                      </Button>
                      <ConfirmDeleteButton
                        itemName={level.name}
                        description="Een niveau met klassen of vakken kan niet verwijderd worden."
                        onConfirm={async () =>
                          handleResult(
                            await deleteLevel({ id: level.id }),
                            "Niveau verwijderd.",
                          )
                        }
                      />
                    </Group>
                  </TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        </TableScrollContainer>
      )}

      <Modal
        opened={opened}
        onClose={close}
        title={editing ? "Niveau bewerken" : "Niveau toevoegen"}
      >
        <LevelForm level={editing} onDone={close} />
      </Modal>
    </Stack>
  );
}
