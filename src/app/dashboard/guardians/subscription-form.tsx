"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import {
  Alert,
  Button,
  Card,
  Divider,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

import { createGuardianWithStudents } from "@/app/actions/guardians";
import { RELATION_OPTIONS, SEX_OPTIONS } from "./options";
import { StudentImageInput } from "./student-image-input";

type StudentValues = {
  firstName: string;
  lastName: string;
  sex: string | null;
  dateOfBirth: string;
  relation: string;
  image: string | null;
};

function emptyStudent(): StudentValues {
  return {
    firstName: "",
    lastName: "",
    sex: null,
    dateOfBirth: "",
    relation: "",
    image: null,
  };
}

export function SubscriptionForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [savingGuardian, setSavingGuardian] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      donationNumber: "",
      // The education number is assigned automatically on save.
      // Start without a student: a guardian can be registered on its own and
      // children can be added later from the guardian detail page.
      students: [] as StudentValues[],
    },
    validate: {
      firstName: (value) => (value.trim() ? null : "Voornaam is verplicht"),
      lastName: (value) => (value.trim() ? null : "Achternaam is verplicht"),
      email: (value) =>
        !value || /^\S+@\S+\.\S+$/.test(value)
          ? null
          : "Ongeldig e-mailadres",
      students: {
        firstName: (value) => (value.trim() ? null : "Voornaam is verplicht"),
        lastName: (value) => (value.trim() ? null : "Achternaam is verplicht"),
        dateOfBirth: (value) => (value ? null : "Geboortedatum is verplicht"),
      },
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    setError(null);

    const result = await createGuardianWithStudents(values);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      notifications.show({
        title: "Opslaan mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }

    notifications.show({
      title: "Inschrijving opgeslagen",
      message: "De ouder/verzorger is geregistreerd.",
      color: "green",
    });
    router.push(`/dashboard/guardians/${result.data.guardianId}`);
    router.refresh();
  });

  // Save only the guardian, without students. Children can be added afterwards
  // from the guardian detail page.
  async function saveGuardianOnly() {
    const { errors } = form.validate();
    const hasGuardianErrors = Object.keys(errors).some(
      (key) => key !== "students" && !key.startsWith("students."),
    );
    if (hasGuardianErrors) {
      return;
    }

    setSavingGuardian(true);
    setError(null);

    const result = await createGuardianWithStudents({
      ...form.values,
      students: [],
    });
    setSavingGuardian(false);

    if (!result.ok) {
      setError(result.error);
      notifications.show({
        title: "Opslaan mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }

    notifications.show({
      title: "Ouder opgeslagen",
      message: "Je kunt nu leerlingen toevoegen.",
      color: "green",
    });
    router.push(`/dashboard/guardians/${result.data.guardianId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="lg">
        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}

        <Card withBorder>
          <Title order={4} mb="md">
            Ouder / verzorger
          </Title>
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
              <TextInput
                label="E-mailadres"
                type="email"
                {...form.getInputProps("email")}
              />
              <TextInput
                label="Telefoon"
                {...form.getInputProps("phone")}
              />
              <TextInput
                label="Chartnummer"
                {...form.getInputProps("donationNumber")}
              />
            </SimpleGrid>
            <Textarea
              label="Adres"
              autosize
              minRows={2}
              {...form.getInputProps("address")}
            />
          </Stack>
        </Card>

        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Leerlingen</Title>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={16} />}
              onClick={() => form.insertListItem("students", emptyStudent())}
            >
              Leerling toevoegen
            </Button>
          </Group>

          {form.values.students.length === 0 ? (
            <Text c="dimmed">
              Nog geen leerlingen toegevoegd. Je kunt de ouder eerst opslaan en
              daarna leerlingen toevoegen.
            </Text>
          ) : (
            <Stack>
              {form.values.students.map((_, index) => (
                <Card key={index} withBorder bg="var(--mantine-color-default-hover)">
                  <Group justify="space-between" mb="sm">
                    <Text fw={500}>Leerling {index + 1}</Text>
                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => form.removeListItem("students", index)}
                    >
                      Verwijderen
                    </Button>
                  </Group>
                  <Stack>
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                      <TextInput
                        label="Voornaam"
                        required
                        {...form.getInputProps(`students.${index}.firstName`)}
                      />
                      <TextInput
                        label="Achternaam"
                        required
                        {...form.getInputProps(`students.${index}.lastName`)}
                      />
                      <Select
                        label="Geslacht"
                        data={[...SEX_OPTIONS]}
                        clearable
                        {...form.getInputProps(`students.${index}.sex`)}
                      />
                      <TextInput
                        label="Geboortedatum"
                        type="date"
                        required
                        {...form.getInputProps(`students.${index}.dateOfBirth`)}
                      />
                      <Select
                        label="Relatie"
                        data={[...RELATION_OPTIONS]}
                        clearable
                        {...form.getInputProps(`students.${index}.relation`)}
                      />
                    </SimpleGrid>
                    <StudentImageInput
                      value={form.values.students[index].image}
                      onChange={(url) =>
                        form.setFieldValue(`students.${index}.image`, url)
                      }
                    />
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </Card>

        <Divider />

        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={() => router.push("/dashboard/guardians")}
          >
            Annuleren
          </Button>
          {form.values.students.length === 0 && (
            <Button
              type="button"
              variant="light"
              onClick={saveGuardianOnly}
              loading={savingGuardian}
              disabled={loading}
            >
              Alleen ouder opslaan
            </Button>
          )}
          <Button type="submit" loading={loading} disabled={savingGuardian}>
            Inschrijving opslaan
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
