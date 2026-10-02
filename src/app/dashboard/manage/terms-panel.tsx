"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import {
  Alert,
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
import { IconInfoCircle, IconPencil, IconPlus } from "@tabler/icons-react";

import { createTerm, deleteTerm, updateTerm } from "@/app/actions/periods";
import { ConfirmDeleteButton } from "./confirm-delete";
import { useActionFeedback } from "./use-action-feedback";

export type TermRow = {
  id: string;
  name: string;
  sortOrder: number;
  startMonth: number;
  endMonth: number;
};

const MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

const MONTH_OPTIONS = MONTHS.map((label, index) => ({
  value: String(index + 1),
  label: `${label.charAt(0).toUpperCase()}${label.slice(1)}`,
}));

function monthLabel(month: number): string {
  const label = MONTHS[month - 1] ?? String(month);
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function TermForm({ term, onDone }: { term: TermRow | null; onDone: () => void }) {
  const handleResult = useActionFeedback();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: term?.name ?? "",
      sortOrder: term?.sortOrder ?? 1,
      startMonth: String(term?.startMonth ?? 9),
      endMonth: String(term?.endMonth ?? 12),
    },
    validate: {
      name: (value) => (value.trim() ? null : "Naam is verplicht"),
      sortOrder: (value) =>
        value && value >= 1 ? null : "Volgorde moet minstens 1 zijn",
      endMonth: (value, values) =>
        Number(value) >= Number(values.startMonth)
          ? null
          : "Eindmaand mag niet voor de startmaand liggen",
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const payload = {
      name: values.name,
      sortOrder: values.sortOrder,
      startMonth: Number(values.startMonth),
      endMonth: Number(values.endMonth),
    };
    const result = term
      ? await updateTerm({ id: term.id, ...payload })
      : await createTerm(payload);
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
          placeholder="bv. Termijn 1"
          {...form.getInputProps("name")}
        />
        <NumberInput
          label="Volgorde"
          min={1}
          required
          {...form.getInputProps("sortOrder")}
        />
        <SimpleGrid cols={2}>
          <Select
            label="Startmaand"
            data={MONTH_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps("startMonth")}
          />
          <Select
            label="Eindmaand"
            data={MONTH_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps("endMonth")}
          />
        </SimpleGrid>
        <Text size="xs" c="dimmed">
          De periode loopt van de eerste dag van de startmaand tot de laatste dag
          van de eindmaand.
        </Text>
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

export function TermsPanel({ terms }: { terms: TermRow[] }) {
  const handleResult = useActionFeedback();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<TermRow | null>(null);

  const rows = [...terms].sort((a, b) => a.sortOrder - b.sortOrder);

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
      <Group justify="space-between" align="flex-start">
        <Alert
          variant="light"
          color="blue"
          icon={<IconInfoCircle size={18} />}
          title="Periodes gelden voor alle schooljaren"
          style={{ flex: 1 }}
        >
          Stel hier de periodes één keer in. Elk schooljaar gebruikt dezelfde
          periodes; de datums worden per schooljaar berekend. Periodes mogen niet
          overlappen.
        </Alert>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Periode toevoegen
        </Button>
      </Group>

      {rows.length === 0 ? (
        <Text c="dimmed">Nog geen periodes.</Text>
      ) : (
        <TableScrollContainer minWidth={640}>
          <Table striped highlightOnHover>
            <TableThead>
              <TableTr>
                <TableTh>Volgorde</TableTh>
                <TableTh>Naam</TableTh>
                <TableTh>Startmaand</TableTh>
                <TableTh>Eindmaand</TableTh>
                <TableTh />
              </TableTr>
            </TableThead>
            <TableTbody>
              {rows.map((term) => (
                <TableTr key={term.id}>
                  <TableTd>{term.sortOrder}</TableTd>
                  <TableTd>{term.name}</TableTd>
                  <TableTd>{monthLabel(term.startMonth)}</TableTd>
                  <TableTd>{monthLabel(term.endMonth)}</TableTd>
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
        <TermForm term={editing} onDone={close} />
      </Modal>
    </Stack>
  );
}
