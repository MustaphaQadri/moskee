"use client";

import { useState } from "react";
import {
  Button,
  Group,
  Modal,
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
import { IconPlus } from "@tabler/icons-react";

import { enrollStudent, unenrollStudent } from "@/app/actions/enrollments";
import { ConfirmDeleteButton } from "@/app/dashboard/manage/confirm-delete";
import { useActionFeedback } from "@/app/dashboard/manage/use-action-feedback";

export type EnrollableStudent = {
  id: string;
  firstName: string;
  lastName: string;
  currentClass: { id: string; name: string } | null;
};

export function AddStudentButton({
  classId,
  students,
}: {
  classId: string;
  students: EnrollableStudent[];
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const handleResult = useActionFeedback();

  const filtered = students.filter((student) => {
    if (added.includes(student.id)) return false;
    const haystack = `${student.firstName} ${student.lastName}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  async function add(studentId: string) {
    setAddingId(studentId);
    const result = await enrollStudent({ classId, studentId });
    setAddingId(null);
    if (handleResult(result, "Leerling toegevoegd.")) {
      setAdded((prev) => [...prev, studentId]);
    }
  }

  return (
    <>
      <Button leftSection={<IconPlus size={16} />} onClick={open}>
        Leerling toevoegen
      </Button>
      <Modal
        opened={opened}
        onClose={close}
        title="Leerling aan klas toevoegen"
        size="lg"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Een leerling heeft één actieve klas. Toevoegen aan deze klas
            verplaatst de leerling automatisch.
          </Text>
          <TextInput
            label="Zoeken"
            placeholder="Naam"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />

          {filtered.length === 0 ? (
            <Text c="dimmed">Geen leerlingen gevonden.</Text>
          ) : (
            <TableScrollContainer minWidth={420}>
              <Table striped highlightOnHover>
                <TableThead>
                  <TableTr>
                    <TableTh>Naam</TableTh>
                    <TableTh>Huidige klas</TableTh>
                    <TableTh />
                  </TableTr>
                </TableThead>
                <TableTbody>
                  {filtered.map((student) => (
                    <TableTr key={student.id}>
                      <TableTd>
                        {student.firstName} {student.lastName}
                      </TableTd>
                      <TableTd>{student.currentClass?.name ?? "—"}</TableTd>
                      <TableTd>
                        <Group justify="flex-end">
                          <Button
                            size="xs"
                            variant="light"
                            loading={addingId === student.id}
                            onClick={() => add(student.id)}
                          >
                            Toevoegen
                          </Button>
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
    </>
  );
}

export function RemoveStudentButton({
  classId,
  studentId,
  studentName,
}: {
  classId: string;
  studentId: string;
  studentName: string;
}) {
  const handleResult = useActionFeedback();

  return (
    <ConfirmDeleteButton
      itemName={studentName}
      description="De inschrijving wordt op inactief gezet; de historiek blijft bewaard."
      onConfirm={async () =>
        handleResult(
          await unenrollStudent({ classId, studentId }),
          "Leerling verwijderd uit de klas.",
        )
      }
    />
  );
}
