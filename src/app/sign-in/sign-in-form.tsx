"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import {
  Alert,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { authClient } from "@/lib/auth-client";

export function SignInForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: (value) => (value.trim() ? null : "E-mailadres is verplicht"),
      password: (value) => (value ? null : "Wachtwoord is verplicht"),
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (signInError) {
      setLoading(false);
      setError("Onjuist e-mailadres of wachtwoord.");
      return;
    }

    notifications.show({
      title: "Welkom terug",
      message: "Je bent ingelogd.",
      color: "green",
    });
    router.push(redirectTo);
    router.refresh();
  });

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder shadow="sm" radius="md" p="xl" w={400} maw="100%">
        <Title order={2} mb="lg">
          Inloggen
        </Title>
        <form onSubmit={handleSubmit}>
          <Stack>
            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
            <TextInput
              label="E-mailadres"
              placeholder="naam@school.nl"
              autoComplete="email"
              required
              {...form.getInputProps("email")}
            />
            <PasswordInput
              label="Wachtwoord"
              autoComplete="current-password"
              required
              {...form.getInputProps("password")}
            />
            <Button type="submit" loading={loading} fullWidth>
              Inloggen
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
