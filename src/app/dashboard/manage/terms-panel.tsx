"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import {
  Button,
  Group,
  Modal,
  NumberInput,
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

import { createTerm, deleteTerm, updateTerm } from "@/app/actions/periods";
import { ConfirmDeleteButton } from "./confirm-delete";
import { useActionFeedback } from "./use-action-feedback";
import type { AcademicYearRow } from "./academic-years-panel";

export type TermRow = {
  id: string;
  academicYearId: string;
  name: string;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
};

function TermForm({
  academicYearId,
  term,
  onDone,
}: {
  academicYearId: string;
  term: TermRow | null;
  onDone: () => void;
}) {
  const handleResult = useActionFeedback();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: term?.name ?? "",
      sortOrder: term?.sortOrder ?? 1,
      startDate: term?.startDate ?? "",
      endDate: term?.endDate ?? "",
    },
    validate: {
      name: (value) => (value.trim() ? null : "Naam is verplicht"),
      sortOrder: (value) =>
        value && value >= 1 ? null : "Volgorde moet minstens 1 zijn",
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = term
      ? await updateTerm({ id: term.id, ...values })
      : await createTerm({ academicYearId, ...values });
    setLoading(false);

    if (handleResult(result, term ? "Periode bijgewerkt." : "Periode toegevoegd.")) {
      onDone();
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput
          label="Naam"
          required
          placeholder="bv. Periode 1"
          {...form.getInputProps("name")}
        />
        <NumberInput
          label="Volgorde"
          min={1}
          required
          {...form.getInputProps("sortOrder")}
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

export function TermsPanel({
  years,
  terms,
}: {
  years: AcademicYearRow[];
  terms: TermRow[];
}) {
  const handleResult = useActionFeedback();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<TermRow | null>(null);
  const [yearId, setYearId] = useState<string | null>(years[0]?.id ?? null);

  const selectedYearId = editing?.academicYearId ?? yearId;
  const rows = terms
    .filter((term) => term.academicYearId === selectedYearId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  function openCreate() {
    setEditing(null);
    open();
  }

  function openEdit(term: TermRow) {
    setEditing(term);
    open();
  }

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <Select
          label="Schooljaar"
          data={years.map((year) => ({ value: year.id, label: year.name }))}
          value={yearId}
          onChange={setYearId}
          allowDeselect={false}
          style={{ flex: 1 }}
          disabled={editing !== null}
        />
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={openCreate}
          disabled={!selectedYearId}
        >
          Periode toevoegen
        </Button>
      </Group>

      {!selectedYearId ? (
        <Text c="dimmed">Maak eerst een schooljaar aan.</Text>
      ) : rows.length === 0 ? (
        <Text c="dimmed">Nog geen periodes voor dit schooljaar.</Text>
      ) : (
        <TableScrollContainer minWidth={640}>
          <Table striped highlightOnHover>
            <TableThead>
              <TableTr>
                <TableTh>Volgorde</TableTh>
                <TableTh>Naam</TableTh>
                <TableTh>Van</TableTh>
                <TableTh>Tot</TableTh>
                <TableTh />
              </TableTr>
            </TableThead>
            <TableTbody>
              {rows.map((term) => (
                <TableTr key={term.id}>
                  <TableTd>{term.sortOrder}</TableTd>
                  <TableTd>{term.name}</TableTd>
                  <TableTd>{term.startDate ?? "—"}</TableTd>
                  <TableTd>{term.endDate ?? "—"}</TableTd>
                  <TableTd>
                    <Group gap="xs" justify="flex-end">
                      <Button
                        variant="subtle"
                        size="xs"
                        leftSection={<IconPencil size={16} />}
                        onClick={() => openEdit(term)}
                      >
                        Bewerken
                      </Button>
                      <ConfirmDeleteButton
                        itemName={term.name}
                        description="Een periode met cijfers kan niet verwijderd worden."
                        onConfirm={async () =>
                          handleResult(
                            await deleteTerm({ id: term.id }),
                            "Periode verwijderd.",
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
        title={editing ? "Periode bewerken" : "Periode toevoegen"}
      >
        <TermForm
          academicYearId={selectedYearId ?? ""}
          term={editing}
          onDone={close}
        />
      </Modal>
    </Stack>
  );
}
