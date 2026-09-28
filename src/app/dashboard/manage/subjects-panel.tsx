"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import {
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
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
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconPlus } from "@tabler/icons-react";

import {
  createSubject,
  deleteSubject,
  updateSubject,
} from "@/app/actions/subjects";
import { CompetenciesModal, type CompetencyRow } from "./competencies-modal";
import { ConfirmDeleteButton } from "./confirm-delete";
import { useActionFeedback } from "./use-action-feedback";
import type { LevelRow } from "./levels-panel";

export type SubjectRow = {
  id: string;
  levelId: string;
  name: string;
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

  const form = useForm({
    initialValues: {
      name: subject?.name ?? "",
      sortOrder: subject?.sortOrder ?? null,
      isActive: subject?.isActive ?? true,
    },
    validate: {
      name: (value) => (value.trim() ? null : "Naam is verplicht"),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = subject
      ? await updateSubject({ id: subject.id, ...values })
      : await createSubject({ levelId, ...values });
    setLoading(false);

    if (handleResult(result, subject ? "Vak bijgewerkt." : "Vak toegevoegd.")) {
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
  competencies,
}: {
  levels: LevelRow[];
  subjects: SubjectRow[];
  competencies: CompetencyRow[];
}) {
  const handleResult = useActionFeedback();
  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<SubjectRow | null>(null);
  const [levelId, setLevelId] = useState<string | null>(levels[0]?.id ?? null);
  const [competencySubject, setCompetencySubject] =
    useState<SubjectRow | null>(null);

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
              {rows.map((subject) => (
                <TableTr key={subject.id}>
                  <TableTd>{subject.name}</TableTd>
                  <TableTd>{subject.sortOrder ?? "—"}</TableTd>
                  <TableTd>
                    <Badge
                      color={subject.isActive ? "green" : "gray"}
                      variant="light"
                    >
                      {subject.isActive ? "Actief" : "Inactief"}
                    </Badge>
                  </TableTd>
                  <TableTd>
                    <Group gap="xs" justify="flex-end">
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => setCompetencySubject(subject)}
                      >
                        Vaardigheden
                      </Button>
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
        title={editing ? "Vak bewerken" : "Vak toevoegen"}
      >
        <SubjectForm
          levelId={selectedLevelId ?? ""}
          subject={editing}
          onDone={close}
        />
      </Modal>

      {competencySubject && (
        <CompetenciesModal
          key={competencySubject.id}
          subjectId={competencySubject.id}
          subjectName={competencySubject.name}
          competencies={competencies}
          onClose={() => setCompetencySubject(null)}
        />
      )}
    </Stack>
  );
}
