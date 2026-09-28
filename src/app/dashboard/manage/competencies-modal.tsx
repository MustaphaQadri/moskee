"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  Switch,
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
import { useForm } from "@mantine/form";
import { IconPencil, IconPlus } from "@tabler/icons-react";

import {
  createCompetency,
  deleteCompetency,
  updateCompetency,
} from "@/app/actions/competencies";
import { ConfirmDeleteButton } from "./confirm-delete";
import { useActionFeedback } from "./use-action-feedback";

export type CompetencyRow = {
  id: string;
  subjectId: string;
  name: string;
  sortOrder: number | null;
  isActive: boolean;
};

export function CompetenciesModal({
  subjectId,
  subjectName,
  competencies,
  onClose,
}: {
  subjectId: string;
  subjectName: string;
  competencies: CompetencyRow[];
  onClose: () => void;
}) {
  const handleResult = useActionFeedback();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<CompetencyRow | null>(null);

  const form = useForm({
    initialValues: { name: "", sortOrder: null as number | null, isActive: true },
    validate: {
      name: (value) => (value.trim() ? null : "Naam is verplicht"),
    },
  });

  const rows = competencies.filter((item) => item.subjectId === subjectId);

  function startEdit(competency: CompetencyRow) {
    setEditing(competency);
    form.setValues({
      name: competency.name,
      sortOrder: competency.sortOrder,
      isActive: competency.isActive,
    });
  }

  function resetForm() {
    setEditing(null);
    form.reset();
  }

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = editing
      ? await updateCompetency({ id: editing.id, ...values })
      : await createCompetency({ subjectId, ...values });
    setLoading(false);

    if (handleResult(result, editing ? "Vaardigheid bijgewerkt." : "Vaardigheid toegevoegd.")) {
      resetForm();
    }
  });

  return (
    <Modal
      opened
      onClose={onClose}
      title={`Vaardigheden — ${subjectName}`}
      size="lg"
    >
      <Stack>
        <form onSubmit={handleSubmit}>
          <Stack>
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <TextInput
                label="Naam"
                required
                {...form.getInputProps("name")}
              />
              <NumberInput
                label="Volgorde"
                min={0}
                {...form.getInputProps("sortOrder")}
              />
              <Switch
                label="Actief"
                mt="xl"
                {...form.getInputProps("isActive", { type: "checkbox" })}
              />
            </SimpleGrid>
            <Group justify="flex-end">
              {editing && (
                <Button variant="default" onClick={resetForm}>
                  Annuleren
                </Button>
              )}
              <Button
                type="submit"
                loading={loading}
                leftSection={!editing ? <IconPlus size={16} /> : undefined}
              >
                {editing ? "Bijwerken" : "Vaardigheid toevoegen"}
              </Button>
            </Group>
          </Stack>
        </form>

        {rows.length === 0 ? (
          <Text c="dimmed">Nog geen vaardigheden voor dit vak.</Text>
        ) : (
          <TableScrollContainer minWidth={480}>
            <Table striped highlightOnHover>
              <TableThead>
                <TableTr>
                  <TableTh>Naam</TableTh>
                  <TableTh>Volgorde</TableTh>
                  <TableTh>Status</TableTh>
                  <TableTh />
                </TableTr>
              </TableThead>
              <TableTbody>
                {rows.map((competency) => (
                  <TableTr key={competency.id}>
                    <TableTd>{competency.name}</TableTd>
                    <TableTd>{competency.sortOrder ?? "—"}</TableTd>
                    <TableTd>
                      <Badge
                        color={competency.isActive ? "green" : "gray"}
                        variant="light"
                      >
                        {competency.isActive ? "Actief" : "Inactief"}
                      </Badge>
                    </TableTd>
                    <TableTd>
                      <Group gap="xs" justify="flex-end">
                        <Button
                          variant="subtle"
                          size="xs"
                          leftSection={<IconPencil size={16} />}
                          onClick={() => startEdit(competency)}
                        >
                          Bewerken
                        </Button>
                        <ConfirmDeleteButton
                          itemName={competency.name}
                          onConfirm={async () =>
                            handleResult(
                              await deleteCompetency({ id: competency.id }),
                              "Vaardigheid verwijderd.",
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
      </Stack>
    </Modal>
  );
}
