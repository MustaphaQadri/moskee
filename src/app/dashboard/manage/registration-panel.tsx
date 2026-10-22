"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import {
  Button,
  Divider,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

import {
  purgeArchivedRecords,
  updateRegistrationSetting,
} from "@/app/actions/guardian-registration";
import { useActionFeedback } from "./use-action-feedback";

export function RegistrationPanel({
  linkValidityDays,
  archiveRetentionMonths,
}: {
  linkValidityDays: number;
  archiveRetentionMonths: number;
}) {
  const router = useRouter();
  const handleResult = useActionFeedback();
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);

  const form = useForm<{
    linkValidityDays: string | number;
    archiveRetentionMonths: string | number;
  }>({
    initialValues: { linkValidityDays, archiveRetentionMonths },
    validate: {
      linkValidityDays: (value) => {
        const days = Number(value);
        if (!Number.isInteger(days) || days < 1 || days > 365) {
          return "Voer een aantal dagen tussen 1 en 365 in";
        }
        return null;
      },
      archiveRetentionMonths: (value) => {
        const months = Number(value);
        if (!Number.isInteger(months) || months < 1 || months > 120) {
          return "Voer een aantal maanden tussen 1 en 120 in";
        }
        return null;
      },
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = await updateRegistrationSetting({
      linkValidityDays: Number(values.linkValidityDays),
      archiveRetentionMonths: Number(values.archiveRetentionMonths),
    });
    setLoading(false);
    handleResult(result, "Instellingen opgeslagen.");
  });

  async function handlePurge() {
    setPurging(true);
    const result = await purgeArchivedRecords();
    setPurging(false);

    if (!result.ok) {
      notifications.show({
        title: "Opschonen mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }

    notifications.show({
      title: "Opgeschoond",
      message: `${result.data.students} leerling(en) en ${result.data.guardians} ouder(s)/verzorger(s) definitief verwijderd.`,
      color: "green",
    });
    router.refresh();
  }

  return (
    <Paper withBorder p="lg" maw={560}>
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

          <Divider my="xs" />

          <div>
            <Text fw={500}>Archief</Text>
            <Text size="sm" c="dimmed">
              Gearchiveerde leerlingen en ouders/verzorgers blijven zichtbaar
              onder het filter &quot;Gearchiveerd&quot;. Na deze periode worden
              ze definitief verwijderd.
            </Text>
          </div>
          <NumberInput
            label="Bewaartermijn (maanden)"
            min={1}
            max={120}
            allowDecimal={false}
            {...form.getInputProps("archiveRetentionMonths")}
          />

          <Group justify="space-between">
            <Button
              type="button"
              variant="subtle"
              color="red"
              loading={purging}
              onClick={handlePurge}
            >
              Nu opschonen
            </Button>
            <Button type="submit" loading={loading}>
              Opslaan
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
