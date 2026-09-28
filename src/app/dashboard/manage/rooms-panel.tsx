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
  Textarea,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconPlus } from "@tabler/icons-react";

import { createRoom, deleteRoom, updateRoom } from "@/app/actions/rooms";
import { ConfirmDeleteButton } from "./confirm-delete";
import { useActionFeedback } from "./use-action-feedback";

export type RoomRow = {
  id: string;
  name: string;
  capacity: number | null;
  description: string | null;
};

function RoomForm({
  room,
  onDone,
}: {
  room: RoomRow | null;
  onDone: () => void;
}) {
  const handleResult = useActionFeedback();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: room?.name ?? "",
      capacity: room?.capacity ?? null,
      description: room?.description ?? "",
    },
    validate: {
      name: (value) => (value.trim() ? null : "Naam is verplicht"),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = room
      ? await updateRoom({ id: room.id, ...values })
      : await createRoom(values);
    setLoading(false);

    if (handleResult(result, room ? "Lokaal bijgewerkt." : "Lokaal toegevoegd.")) {
      onDone();
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="Naam" required {...form.getInputProps("name")} />
        <NumberInput
          label="Capaciteit"
          min={0}
          {...form.getInputProps("capacity")}
        />
        <Textarea
          label="Omschrijving"
          autosize
          minRows={2}
          {...form.getInputProps("description")}
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

export function RoomsPanel({ rooms }: { rooms: RoomRow[] }) {
  const handleResult = useActionFeedback();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<RoomRow | null>(null);

  function openCreate() {
    setEditing(null);
    open();
  }

  function openEdit(room: RoomRow) {
    setEditing(room);
    open();
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Text c="dimmed" size="sm">
          Fysieke lokalen die aan klassen gekoppeld kunnen worden.
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Lokaal toevoegen
        </Button>
      </Group>

      {rooms.length === 0 ? (
        <Text c="dimmed">Nog geen lokalen.</Text>
      ) : (
        <TableScrollContainer minWidth={480}>
          <Table striped highlightOnHover>
            <TableThead>
              <TableTr>
                <TableTh>Naam</TableTh>
                <TableTh>Capaciteit</TableTh>
                <TableTh>Omschrijving</TableTh>
                <TableTh />
              </TableTr>
            </TableThead>
            <TableTbody>
              {rooms.map((room) => (
                <TableTr key={room.id}>
                  <TableTd>{room.name}</TableTd>
                  <TableTd>{room.capacity ?? "—"}</TableTd>
                  <TableTd>{room.description ?? "—"}</TableTd>
                  <TableTd>
                    <Group gap="xs" justify="flex-end">
                      <Button
                        variant="subtle"
                        size="xs"
                        leftSection={<IconPencil size={16} />}
                        onClick={() => openEdit(room)}
                      >
                        Bewerken
                      </Button>
                      <ConfirmDeleteButton
                        itemName={room.name}
                        description="Klassen die aan dit lokaal gekoppeld zijn, behouden hun naam maar raken het lokaal kwijt."
                        onConfirm={async () =>
                          handleResult(
                            await deleteRoom({ id: room.id }),
                            "Lokaal verwijderd.",
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
        title={editing ? "Lokaal bewerken" : "Lokaal toevoegen"}
      >
        <RoomForm room={editing} onDone={close} />
      </Modal>
    </Stack>
  );
}
