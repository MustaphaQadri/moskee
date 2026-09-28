"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import {
  Alert,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { updateGuardian } from "@/app/actions/guardians";

export type EditableGuardian = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  donationNumber: string | null;
  educationNumber: string | null;
};

export function EditGuardianForm({ guardian }: { guardian: EditableGuardian }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      firstName: guardian.firstName,
      lastName: guardian.lastName,
      email: guardian.email ?? "",
      phone: guardian.phone ?? "",
      address: guardian.address ?? "",
      donationNumber: guardian.donationNumber ?? "",
      educationNumber: guardian.educationNumber ?? "",
    },
    validate: {
      firstName: (value) => (value.trim() ? null : "Voornaam is verplicht"),
      lastName: (value) => (value.trim() ? null : "Achternaam is verplicht"),
      email: (value) =>
        !value || /^\S+@\S+\.\S+$/.test(value)
          ? null
          : "Ongeldig e-mailadres",
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    setError(null);

    const result = await updateGuardian({ id: guardian.id, ...values });
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
      title: "Opgeslagen",
      message: "De gegevens zijn bijgewerkt.",
      color: "green",
    });
    router.push(`/dashboard/guardians/${guardian.id}`);
    router.refresh();
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}
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
          <TextInput label="Telefoon" {...form.getInputProps("phone")} />
          <TextInput
            label="Donatienummer"
            {...form.getInputProps("donationNumber")}
          />
          <TextInput
            label="Onderwijsnummer"
            {...form.getInputProps("educationNumber")}
          />
        </SimpleGrid>
        <Textarea label="Adres" autosize minRows={2} {...form.getInputProps("address")} />
        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={() => router.push(`/dashboard/guardians/${guardian.id}`)}
          >
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
