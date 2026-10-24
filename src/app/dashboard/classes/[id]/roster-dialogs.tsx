"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Group,
  Loader,
  Modal,
  SegmentedControl,
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
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconSearch } from "@tabler/icons-react";

import {
  enrollStudent,
  searchEnrollableStudents,
  unenrollStudent,
} from "@/app/actions/enrollments";
import {
  DonationPrompt,
  type DonationChoice,
} from "@/app/dashboard/donation-prompt";
import { ConfirmDeleteButton } from "@/app/dashboard/manage/confirm-delete";
import { useActionFeedback } from "@/app/dashboard/manage/use-action-feedback";
import {
  PERSON_SEARCH_OPTIONS,
  type PersonSearchBy,
} from "@/lib/search";

export type EnrollableStudent = {
  id: string;
  firstName: string;
  lastName: string;
  currentClass: { id: string; name: string } | null;
};

export function AddStudentButton({
  classId,
  students,
  defaultDonationAmount,
}: {
  classId: string;
  students: EnrollableStudent[];
  defaultDonationAmount: number;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState<PersonSearchBy>("all");
  const [results, setResults] = useState<EnrollableStudent[]>(students);
  const [loadedKey, setLoadedKey] = useState("initial");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [promptStudent, setPromptStudent] = useState<EnrollableStudent | null>(
    null,
  );
  const handleResult = useActionFeedback();
  const [debouncedQuery] = useDebouncedValue(query, 300);
  const searchKey = `${debouncedQuery.trim()}|${searchBy}`;
  const searching = opened && loadedKey !== searchKey;

  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    void searchEnrollableStudents({
      classId,
      search: debouncedQuery,
      searchBy,
    }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        notifications.show({
          title: "Zoeken mislukt",
          message: result.error,
          color: "red",
        });
        setLoadedKey(`${debouncedQuery.trim()}|${searchBy}`);
        return;
      }
      setResults(result.data);
      setLoadedKey(`${debouncedQuery.trim()}|${searchBy}`);
    });
    return () => {
      cancelled = true;
    };
  }, [opened, classId, debouncedQuery, searchBy]);

  const filtered = results.filter((student) => !added.includes(student.id));

  function openModal() {
    setQuery("");
    setSearchBy("all");
    setResults(students);
    open();
  }

  async function add(
    student: EnrollableStudent,
    donation?: { category: DonationChoice; expectedAmount?: number },
  ) {
    setAddingId(student.id);
    const result = await enrollStudent({
      classId,
      studentId: student.id,
      donation,
    });
    setAddingId(null);
    if (handleResult(result, "Leerling toegevoegd.")) {
      setAdded((prev) => [...prev, student.id]);
      setPromptStudent(null);
    }
  }

  function startAdd(student: EnrollableStudent) {
    // Moving between classes: no new expectation is needed.
    if (student.currentClass) {
      void add(student);
      return;
    }
    setPromptStudent(student);
  }

  return (
    <>
      <Button leftSection={<IconPlus size={16} />} onClick={openModal}>
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
          <Stack gap="xs">
            <SegmentedControl
              value={searchBy}
              onChange={(value) => setSearchBy(value as PersonSearchBy)}
              data={[...PERSON_SEARCH_OPTIONS]}
              size="xs"
              w="fit-content"
            />
            <TextInput
              label="Zoeken"
              placeholder="Naam, chartnummer of onderwijsnummer"
              leftSection={<IconSearch size={16} />}
              rightSection={searching ? <Loader size="xs" /> : undefined}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </Stack>

          {filtered.length === 0 ? (
            <Text c="dimmed">
              {searching ? "Zoeken…" : "Geen leerlingen gevonden."}
            </Text>
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
                            onClick={() => startAdd(student)}
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

      <Modal
        opened={promptStudent !== null}
        onClose={() => setPromptStudent(null)}
        title="Donatie instellen"
      >
        {promptStudent && (
          <DonationPrompt
            studentName={`${promptStudent.firstName} ${promptStudent.lastName}`}
            defaultAmount={defaultDonationAmount}
            loading={addingId === promptStudent.id}
            onCancel={() => setPromptStudent(null)}
            onConfirm={(donation) => add(promptStudent, donation)}
          />
        )}
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
      description="De inschrijving wordt op inactief gezet; de leerling wordt gearchiveerd."
      onConfirm={async () =>
        handleResult(
          await unenrollStudent({ classId, studentId }),
          "Leerling verwijderd uit de klas.",
        )
      }
    />
  );
}
