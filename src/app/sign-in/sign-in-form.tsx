"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import {
  Alert,
  Box,
  Button,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { authClient } from "@/lib/auth-client";
import { AuthShell } from "@/components/auth-shell";
import { BrandLogo } from "@/components/brand-logo";

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
      color: "brand",
    });
    router.push(redirectTo);
    router.refresh();
  });

  return (
    <AuthShell>
      <Stack w={400} maw="100%" gap="lg">
        <Box hiddenFrom="md">
          <BrandLogo height={52} />
        </Box>

        <div>
          <Title order={2}>Inloggen</Title>
          <Text c="dimmed" size="sm" mt={6}>
            Meld je aan met je werkaccount om verder te gaan.
          </Text>
        </div>

        <Paper withBorder shadow="sm" p="xl">
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
              <Button type="submit" loading={loading} fullWidth mt="xs">
                Inloggen
              </Button>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </AuthShell>
  );
}
