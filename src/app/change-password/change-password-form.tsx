"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import {
  Alert,
  Button,
  Center,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle } from "@tabler/icons-react";

import { changeOwnPassword } from "@/app/actions/account";
import { authClient } from "@/lib/auth-client";

export function ChangePasswordForm({
  forced,
  email,
}: {
  forced: boolean;
  email: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      currentPassword: (value) =>
        value ? null : "Huidig wachtwoord is verplicht",
      newPassword: (value) =>
        value.length >= 8 ? null : "Wachtwoord moet minstens 8 tekens zijn",
      confirmPassword: (value, values) =>
        value === values.newPassword ? null : "Wachtwoorden komen niet overeen",
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = await changeOwnPassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    setLoading(false);

    if (!result.ok) {
      notifications.show({
        title: "Wijzigen mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }

    notifications.show({
      title: "Wachtwoord bijgewerkt",
      message: "Je wachtwoord is gewijzigd.",
      color: "green",
    });
    router.push("/dashboard");
    router.refresh();
  });

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder shadow="sm" radius="md" p="xl" w={420} maw="100%">
        <Title order={2} mb="lg">
          {forced ? "Nieuw wachtwoord instellen" : "Wachtwoord wijzigen"}
        </Title>

        <form onSubmit={handleSubmit}>
          <Stack>
            {forced && (
              <Alert
                variant="light"
                color="blue"
                icon={<IconInfoCircle size={18} />}
              >
                Je wachtwoord is opnieuw ingesteld door een beheerder. Kies hier
                een nieuw wachtwoord voordat je verdergaat.
              </Alert>
            )}

            <Text size="sm" c="dimmed">
              {email}
            </Text>

            <PasswordInput
              label="Huidig wachtwoord"
              autoComplete="current-password"
              required
              {...form.getInputProps("currentPassword")}
            />
            <PasswordInput
              label="Nieuw wachtwoord"
              autoComplete="new-password"
              required
              {...form.getInputProps("newPassword")}
            />
            <PasswordInput
              label="Bevestig nieuw wachtwoord"
              autoComplete="new-password"
              required
              {...form.getInputProps("confirmPassword")}
            />

            <Group justify="space-between" mt="xs">
              <Button
                variant="subtle"
                color="gray"
                onClick={async () => {
                  await authClient.signOut();
                  router.push("/sign-in");
                }}
              >
                Uitloggen
              </Button>
              <Button type="submit" loading={loading}>
                Opslaan
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
