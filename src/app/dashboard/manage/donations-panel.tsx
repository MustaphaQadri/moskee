"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import { Button, Group, NumberInput, Paper, Stack, Text } from "@mantine/core";

import { setDonationDefault } from "@/app/actions/donations";
import { useActionFeedback } from "./use-action-feedback";

export function DonationsPanel({ defaultAmount }: { defaultAmount: number }) {
  const handleResult = useActionFeedback();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: { defaultAmount: String(defaultAmount) },
    validate: {
      defaultAmount: (value) =>
        value === "" || Number(value) < 0 ? "Voer een geldig bedrag in" : null,
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = await setDonationDefault({
      defaultAmount: Number(values.defaultAmount),
    });
    setLoading(false);
    handleResult(result, "Standaardbedrag opgeslagen.");
  });

  return (
    <Paper withBorder p="lg" maw={520}>
      <form onSubmit={handleSubmit}>
        <Stack>
          <div>
            <Text fw={500}>Standaardbedrag</Text>
            <Text size="sm" c="dimmed">
              Het bedrag dat een leerling standaard verschuldigd is per
              schooljaar. Bij het toewijzen van een klas wordt dit voorgesteld.
            </Text>
          </div>
          <NumberInput
            label="Bedrag"
            min={0}
            decimalScale={2}
            fixedDecimalScale
            prefix="€ "
            {...form.getInputProps("defaultAmount")}
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
