"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import {
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

import {
  addStudentToGuardian,
  updateStudent,
} from "@/app/actions/guardians";
import { RELATION_OPTIONS, SEX_OPTIONS } from "./options";

export type StudentRecord = {
  id: string;
  firstName: string;
  lastName: string;
  sex: string | null;
  dateOfBirth: string | null;
  relation: string | null;
  isPrimary: boolean;
};

type StudentFormValues = {
  firstName: string;
  lastName: string;
  sex: string | null;
  dateOfBirth: string;
  relation: string;
  isPrimary: boolean;
};

function StudentForm({
  guardianId,
  student,
  onSuccess,
  onCancel,
}: {
  guardianId: string;
  student?: StudentRecord;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<StudentFormValues>({
    initialValues: {
      firstName: student?.firstName ?? "",
      lastName: student?.lastName ?? "",
      sex: student?.sex ?? null,
      dateOfBirth: student?.dateOfBirth ?? "",
      relation: student?.relation ?? "",
      isPrimary: student?.isPrimary ?? false,
    },
    validate: {
      firstName: (value) => (value.trim() ? null : "Voornaam is verplicht"),
      lastName: (value) => (value.trim() ? null : "Achternaam is verplicht"),
      dateOfBirth: (value) => (value ? null : "Geboortedatum is verplicht"),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);

    const result = student
      ? await updateStudent({
          studentId: student.id,
          guardianId,
          ...values,
        })
      : await addStudentToGuardian({ guardianId, ...values });

    setLoading(false);

    if (!result.ok) {
      notifications.show({
        title: "Opslaan mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }

    notifications.show({
      title: "Opgeslagen",
      message: student ? "De leerling is bijgewerkt." : "De leerling is toegevoegd.",
      color: "green",
    });
    onSuccess();
    router.refresh();
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Voornaam"
            required
            {...form.getInputProps("firstName")}
          />
          <TextInput
            label="Achternaam"
            required
            {...form.getInputProps("lastName")}
          />
          <Select
            label="Geslacht"
            data={[...SEX_OPTIONS]}
            clearable
            {...form.getInputProps("sex")}
          />
          <TextInput
            label="Geboortedatum"
            type="date"
            required
            {...form.getInputProps("dateOfBirth")}
          />
          <Select
            label="Relatie"
            data={[...RELATION_OPTIONS]}
            clearable
            {...form.getInputProps("relation")}
          />
        </SimpleGrid>
        <Checkbox
          label="Primaire contactpersoon voor deze leerling"
          {...form.getInputProps("isPrimary", { type: "checkbox" })}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>
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

export function AddStudentButton({ guardianId }: { guardianId: string }) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Button leftSection={<IconPlus size={16} />} onClick={open}>
        Leerling toevoegen
      </Button>
      <Modal opened={opened} onClose={close} title="Leerling toevoegen" size="lg">
        <StudentForm
          guardianId={guardianId}
          onSuccess={close}
          onCancel={close}
        />
      </Modal>
    </>
  );
}

export function EditStudentButton({
  guardianId,
  student,
}: {
  guardianId: string;
  student: StudentRecord;
}) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconPencil size={16} />}
        onClick={open}
      >
        Bewerken
      </Button>
      <Modal opened={opened} onClose={close} title="Leerling bewerken" size="lg">
        <StudentForm
          guardianId={guardianId}
          student={student}
          onSuccess={close}
          onCancel={close}
        />
      </Modal>
    </>
  );
}
