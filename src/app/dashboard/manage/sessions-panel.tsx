"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import {
  Button,
  Group,
  Modal,
  Select,
  SimpleGrid,
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

import { createSession, deleteSession, updateSession } from "@/app/actions/sessions";
import { ConfirmDeleteButton } from "./confirm-delete";
import { useActionFeedback } from "./use-action-feedback";

export type SessionRow = {
  id: string;
  label: string;
  day: string | null;
  startTime: string | null;
  endTime: string | null;
};

const DAY_OPTIONS = [
  "Maandag",
  "Dinsdag",
  "Woensdag",
  "Donderdag",
  "Vrijdag",
  "Zaterdag",
  "Zondag",
];

function formatTime(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  return `${start ?? "?"} – ${end ?? "?"}`;
}

function SessionForm({
  session,
  onDone,
}: {
  session: SessionRow | null;
  onDone: () => void;
}) {
  const handleResult = useActionFeedback();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      label: session?.label ?? "",
      day: session?.day ?? null,
      startTime: session?.startTime ?? "",
      endTime: session?.endTime ?? "",
    },
    validate: {
      label: (value) => (value.trim() ? null : "Naam is verplicht"),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = session
      ? await updateSession({ id: session.id, ...values })
      : await createSession(values);
    setLoading(false);

    if (
      handleResult(result, session ? "Tijdslot bijgewerkt." : "Tijdslot toegevoegd.")
    ) {
      onDone();
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput
          label="Naam"
          required
          placeholder="bv. Zaterdag ochtend"
          {...form.getInputProps("label")}
        />
        <Select
          label="Dag"
          data={DAY_OPTIONS}
          clearable
          {...form.getInputProps("day")}
        />
        <SimpleGrid cols={2}>
          <TextInput
            label="Van"
            type="time"
            {...form.getInputProps("startTime")}
          />
          <TextInput
            label="Tot"
            type="time"
            {...form.getInputProps("endTime")}
          />
        </SimpleGrid>
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

export function SessionsPanel({ sessions }: { sessions: SessionRow[] }) {
  const handleResult = useActionFeedback();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<SessionRow | null>(null);

  function openCreate() {
    setEditing(null);
    open();
  }

  function openEdit(session: SessionRow) {
    setEditing(session);
    open();
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Text c="dimmed" size="sm">
          Terugkerende weekendmomenten. De 6 standaardmomenten zijn vooraf aangemaakt.
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Tijdslot toevoegen
        </Button>
      </Group>

      {sessions.length === 0 ? (
        <Text c="dimmed">Nog geen tijdsloten.</Text>
      ) : (
        <TableScrollContainer minWidth={520}>
          <Table striped highlightOnHover>
            <TableThead>
              <TableTr>
                <TableTh>Naam</TableTh>
                <TableTh>Dag</TableTh>
                <TableTh>Tijd</TableTh>
                <TableTh />
              </TableTr>
            </TableThead>
            <TableTbody>
              {sessions.map((session) => (
                <TableTr key={session.id}>
                  <TableTd>{session.label}</TableTd>
                  <TableTd>{session.day ?? "—"}</TableTd>
                  <TableTd>
                    {formatTime(session.startTime, session.endTime)}
                  </TableTd>
                  <TableTd>
                    <Group gap="xs" justify="flex-end">
                      <Button
                        variant="subtle"
                        size="xs"
                        leftSection={<IconPencil size={16} />}
                        onClick={() => openEdit(session)}
                      >
                        Bewerken
                      </Button>
                      <ConfirmDeleteButton
                        itemName={session.label}
                        description="Een tijdslot dat aan klassen of aanwezigheid gekoppeld is, kan niet verwijderd worden."
                        onConfirm={async () =>
                          handleResult(
                            await deleteSession({ id: session.id }),
                            "Tijdslot verwijderd.",
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
        title={editing ? "Tijdslot bewerken" : "Tijdslot toevoegen"}
      >
        <SessionForm session={editing} onDone={close} />
      </Modal>
    </Stack>
  );
}
