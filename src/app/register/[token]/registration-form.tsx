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
  Paper,
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

import { submitGuardianRegistration } from "@/app/actions/guardian-registration";
import {
  RELATION_OPTIONS,
  SEX_OPTIONS,
} from "@/app/dashboard/guardians/options";
import type { RegistrationGuardianDTO } from "@/lib/registration";

type ChildValues = {
  firstName: string;
  lastName: string;
  sex: string | null;
  dateOfBirth: string;
  relation: string;
};

function emptyChild(): ChildValues {
  return {
    firstName: "",
    lastName: "",
    sex: null,
    dateOfBirth: "",
    relation: "",
  };
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(
    new Date(iso),
  );
}

export function RegistrationForm({
  token,
  guardian,
  expiresAt,
}: {
  token: string;
  guardian: RegistrationGuardianDTO;
  expiresAt: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const form = useForm({
    initialValues: {
      firstName: guardian.firstName,
      lastName: guardian.lastName,
      email: guardian.email ?? "",
      phone: guardian.phone ?? "",
      address: guardian.address ?? "",
      donationNumber: guardian.donationNumber ?? "",
      children: [emptyChild()],
    },
    validate: {
      firstName: (value) => (value.trim() ? null : "Voornaam is verplicht"),
      lastName: (value) => (value.trim() ? null : "Achternaam is verplicht"),
      email: (value) =>
        !value.trim()
          ? "E-mailadres is verplicht"
          : /^\S+@\S+\.\S+$/.test(value)
            ? null
            : "Ongeldig e-mailadres",
      phone: (value) => (value.trim() ? null : "Telefoon is verplicht"),
      address: (value) => (value.trim() ? null : "Adres is verplicht"),
      donationNumber: (value) =>
        value.trim() ? null : "Chartnummer is verplicht",
      children: {
        firstName: (value) => (value.trim() ? null : "Voornaam is verplicht"),
        lastName: (value) => (value.trim() ? null : "Achternaam is verplicht"),
        dateOfBirth: (value) => (value ? null : "Geboortedatum is verplicht"),
      },
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    setError(null);

    const result = await submitGuardianRegistration({
      token,
      ...values,
      children: values.children,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      notifications.show({
        title: "Versturen mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }

    setSubmitted(true);
    // The token is now used; the RSC refresh of this page would show the
    // "already used" state, so go to the dedicated success page instead.
    router.replace("/register/done");
  });

  if (submitted) {
    return (
      <Paper withBorder p="xl" maw={560}>
        <Stack gap="sm">
          <Title order={2}>Gegevens ontvangen</Title>
          <Text>
            Bedankt! De gegevens zijn naar de moskee verstuurd. Neem contact op
            met de moskee als je nog iets wilt wijzigen.
          </Text>
          <Text size="sm" c="dimmed">
            Deze registratielink is nu niet meer geldig.
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="lg">
        <div>
          <Title order={2}>Inschrijving</Title>
          <Text c="dimmed" size="sm" mt={6}>
            Vul je eigen gegevens aan en voeg je kinderen toe. Velden met een *
            zijn verplicht. Deze link is geldig tot en met{" "}
            {formatDate(expiresAt)} en kan één keer worden gebruikt.
          </Text>
        </div>

        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}

        <Card withBorder>
          <Title order={4} mb="md">
            Jouw gegevens
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
                required
                {...form.getInputProps("email")}
              />
              <TextInput
                label="Telefoon"
                required
                {...form.getInputProps("phone")}
              />
              <TextInput
                label="Chartnummer"
                required
                {...form.getInputProps("donationNumber")}
              />
            </SimpleGrid>
            <Textarea
              label="Adres"
              required
              autosize
              minRows={2}
              {...form.getInputProps("address")}
            />
          </Stack>
        </Card>

        <Card withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={4}>Kinderen</Title>
              <Text size="sm" c="dimmed">
                Voeg minimaal één kind toe.
              </Text>
            </div>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={16} />}
              onClick={() => form.insertListItem("children", emptyChild())}
            >
              Kind toevoegen
            </Button>
          </Group>

          <Stack>
            {form.values.children.map((_, index) => (
              <Card
                key={index}
                withBorder
                bg="var(--mantine-color-default-hover)"
              >
                <Group justify="space-between" mb="sm">
                  <Text fw={500}>Kind {index + 1}</Text>
                  {form.values.children.length > 1 && (
                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      leftSection={<IconTrash size={16} />}
                      onClick={() => form.removeListItem("children", index)}
                    >
                      Verwijderen
                    </Button>
                  )}
                </Group>
                <Stack>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <TextInput
                      label="Voornaam"
                      required
                      {...form.getInputProps(`children.${index}.firstName`)}
                    />
                    <TextInput
                      label="Achternaam"
                      required
                      {...form.getInputProps(`children.${index}.lastName`)}
                    />
                    <TextInput
                      label="Geboortedatum"
                      type="date"
                      required
                      {...form.getInputProps(`children.${index}.dateOfBirth`)}
                    />
                    <Select
                      label="Geslacht"
                      data={[...SEX_OPTIONS]}
                      clearable
                      {...form.getInputProps(`children.${index}.sex`)}
                    />
                    <Select
                      label="Relatie"
                      data={[...RELATION_OPTIONS]}
                      clearable
                      {...form.getInputProps(`children.${index}.relation`)}
                    />
                  </SimpleGrid>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Card>

        <Divider />

        <Group justify="flex-end">
          <Button type="submit" loading={loading}>
            Gegevens versturen
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
