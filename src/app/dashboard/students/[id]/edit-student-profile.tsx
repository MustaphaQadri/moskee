"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import {
  Button,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPencil } from "@tabler/icons-react";

import { updateStudentProfile } from "@/app/actions/guardians";
import { SEX_OPTIONS } from "@/app/dashboard/guardians/options";
import { StudentImageInput } from "@/app/dashboard/guardians/student-image-input";

// Manager-only edit of a student's own data from their detail page. Uses the
// same fields as the enrollment form (name, sex, date of birth, photo).
export function EditStudentProfileButton({
  student,
}: {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    sex: string | null;
    dateOfBirth: string | null;
    image: string | null;
  };
}) {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      firstName: student.firstName,
      lastName: student.lastName,
      sex: student.sex ?? null,
      dateOfBirth: student.dateOfBirth ?? "",
      image: student.image,
    },
    validate: {
      firstName: (value) => (value.trim() ? null : "Voornaam is verplicht"),
      lastName: (value) => (value.trim() ? null : "Achternaam is verplicht"),
      dateOfBirth: (value) => (value ? null : "Geboortedatum is verplicht"),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = await updateStudentProfile({ id: student.id, ...values });
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
      message: "De leerling is bijgewerkt.",
      color: "green",
    });
    close();
    router.refresh();
  });

  return (
    <>
      <Button variant="light" leftSection={<IconPencil size={16} />} onClick={open}>
        Bewerken
      </Button>
      <Modal opened={opened} onClose={close} title="Leerling bewerken" size="lg">
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
            </SimpleGrid>
            <StudentImageInput
              value={form.values.image}
              onChange={(url) => form.setFieldValue("image", url)}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                Annuleren
              </Button>
              <Button type="submit" loading={loading}>
                Opslaan
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
