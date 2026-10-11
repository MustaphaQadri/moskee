"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Radio,
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

type DonationChoice = "FULL" | "REDUCED" | "EXEMPT";

function euro(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function DonationPrompt({
  student,
  defaultAmount,
  loading,
  onCancel,
  onConfirm,
}: {
  student: EnrollableStudent;
  defaultAmount: number;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (donation: {
    category: DonationChoice;
    expectedAmount?: number;
  }) => void;
}) {
  const form = useForm({
    initialValues: { category: "FULL" as DonationChoice, amount: defaultAmount },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const { category, amount } = form.values;
        onConfirm({
          category,
          expectedAmount: category === "REDUCED" ? Number(amount) : undefined,
        });
      }}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          {student.firstName} {student.lastName} krijgt een klas. Stel de
          jaarlijkse donatie in.
        </Text>

        <Radio.Group label="Type bijdrage" {...form.getInputProps("category")}>
          <Stack gap="xs" mt="xs">
            <Radio value="FULL" label={`Verschuldigd (${euro(defaultAmount)})`} />
            <Radio value="REDUCED" label="Deels verschuldigd" />
            <Radio value="EXEMPT" label="Vrijgesteld" />
          </Stack>
        </Radio.Group>

        {form.values.category === "REDUCED" && (
          <NumberInput
            label="Bedrag"
            min={0}
            decimalScale={2}
            fixedDecimalScale
            prefix="€ "
            {...form.getInputProps("amount")}
          />
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>
            Annuleren
          </Button>
          <Button type="submit" loading={loading}>
            Toevoegen
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

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
  const [addingId, setAddingId] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [promptStudent, setPromptStudent] = useState<EnrollableStudent | null>(
    null,
  );
  const handleResult = useActionFeedback();

  const filtered = students.filter((student) => {
    if (added.includes(student.id)) return false;
    const haystack = `${student.firstName} ${student.lastName}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

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
            student={promptStudent}
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
