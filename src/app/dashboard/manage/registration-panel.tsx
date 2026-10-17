"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import { Button, Group, NumberInput, Paper, Stack, Text } from "@mantine/core";

import { updateRegistrationSetting } from "@/app/actions/guardian-registration";
import { useActionFeedback } from "./use-action-feedback";

export function RegistrationPanel({
  linkValidityDays,
}: {
  linkValidityDays: number;
}) {
  const handleResult = useActionFeedback();
  const [loading, setLoading] = useState(false);

  const form = useForm<{ linkValidityDays: string | number }>({
    initialValues: { linkValidityDays },
    validate: {
      linkValidityDays: (value) => {
        const days = Number(value);
        if (!Number.isInteger(days) || days < 1 || days > 365) {
          return "Voer een aantal dagen tussen 1 en 365 in";
        }
        return null;
      },
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = await updateRegistrationSetting({
      linkValidityDays: Number(values.linkValidityDays),
    });
    setLoading(false);
    handleResult(result, "Geldigheid opgeslagen.");
  });

  return (
    <Paper withBorder p="lg" maw={520}>
      <form onSubmit={handleSubmit}>
        <Stack>
          <div>
            <Text fw={500}>Registratielink</Text>
            <Text size="sm" c="dimmed">
              Hoe lang een nieuwe registratielink geldig blijft. Een link is
              altijd eenmalig te gebruiken en een nieuwe link trekt de vorige
              in. De wijziging geldt voor nieuw gegenereerde links.
            </Text>
          </div>
          <NumberInput
            label="Geldigheid (dagen)"
            min={1}
            max={365}
            allowDecimal={false}
            {...form.getInputProps("linkValidityDays")}
          />
          <Group justify="flex-end">
            <Button type="submit" loading={loading}>
              Opslaan
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
