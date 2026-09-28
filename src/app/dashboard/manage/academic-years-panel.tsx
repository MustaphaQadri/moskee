"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import {
  Badge,
  Button,
  Group,
  Modal,
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

import {
  createAcademicYear,
  deleteAcademicYear,
  setCurrentAcademicYear,
  updateAcademicYear,
} from "@/app/actions/academic-years";
import { ConfirmDeleteButton } from "./confirm-delete";
import { useActionFeedback } from "./use-action-feedback";

export type AcademicYearRow = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
};

function AcademicYearForm({
  year,
  onDone,
}: {
  year: AcademicYearRow | null;
  onDone: () => void;
}) {
  const handleResult = useActionFeedback();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: year?.name ?? "",
      startDate: year?.startDate ?? "",
      endDate: year?.endDate ?? "",
    },
    validate: {
      name: (value) => (value.trim() ? null : "Naam is verplicht"),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = year
      ? await updateAcademicYear({ id: year.id, ...values })
      : await createAcademicYear(values);
    setLoading(false);

    if (
      handleResult(
        result,
        year ? "Schooljaar bijgewerkt." : "Schooljaar toegevoegd.",
      )
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
          placeholder="bv. 2026-2027"
          {...form.getInputProps("name")}
        />
        <SimpleGrid cols={2}>
          <TextInput
            label="Startdatum"
            type="date"
            {...form.getInputProps("startDate")}
          />
          <TextInput
            label="Einddatum"
            type="date"
            {...form.getInputProps("endDate")}
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

export function AcademicYearsPanel({ years }: { years: AcademicYearRow[] }) {
  const handleResult = useActionFeedback();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<AcademicYearRow | null>(null);

  function openCreate() {
    setEditing(null);
    open();
  }

  function openEdit(year: AcademicYearRow) {
    setEditing(year);
    open();
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Text c="dimmed" size="sm">
          Schooljaren met daarbinnen de periodes waarin cijfers gegeven worden.
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Schooljaar toevoegen
        </Button>
      </Group>

      {years.length === 0 ? (
        <Text c="dimmed">Nog geen schooljaren.</Text>
      ) : (
        <TableScrollContainer minWidth={640}>
          <Table striped highlightOnHover>
            <TableThead>
              <TableTr>
                <TableTh>Naam</TableTh>
                <TableTh>Van</TableTh>
                <TableTh>Tot</TableTh>
                <TableTh>Status</TableTh>
                <TableTh />
              </TableTr>
            </TableThead>
            <TableTbody>
              {years.map((year) => (
                <TableTr key={year.id}>
                  <TableTd>{year.name}</TableTd>
                  <TableTd>{year.startDate ?? "—"}</TableTd>
                  <TableTd>{year.endDate ?? "—"}</TableTd>
                  <TableTd>
                    {year.isCurrent ? (
                      <Badge color="green" variant="light">
                        Huidig
                      </Badge>
                    ) : (
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={async () =>
                          handleResult(
                            await setCurrentAcademicYear({ id: year.id }),
                            "Huidig schooljaar ingesteld.",
                          )
                        }
                      >
                        Instellen als huidig
                      </Button>
                    )}
                  </TableTd>
                  <TableTd>
                    <Group gap="xs" justify="flex-end">
                      <Button
                        variant="subtle"
                        size="xs"
                        leftSection={<IconPencil size={16} />}
                        onClick={() => openEdit(year)}
                      >
                        Bewerken
                      </Button>
                      <ConfirmDeleteButton
                        itemName={year.name}
                        description="Een schooljaar met periodes met cijfers of met donaties kan niet verwijderd worden."
                        onConfirm={async () =>
                          handleResult(
                            await deleteAcademicYear({ id: year.id }),
                            "Schooljaar verwijderd.",
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
        title={editing ? "Schooljaar bewerken" : "Schooljaar toevoegen"}
      >
        <AcademicYearForm year={editing} onDone={close} />
      </Modal>
    </Stack>
  );
}
