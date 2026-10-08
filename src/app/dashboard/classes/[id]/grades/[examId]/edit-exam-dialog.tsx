"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPencil } from "@tabler/icons-react";

import { updateExam } from "@/app/actions/grades";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function EditExamButton({
  exam,
}: {
  exam: { id: string; title: string; date: string; coefficient: number };
}) {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    initialValues: {
      title: exam.title,
      date: exam.date,
      coefficient: exam.coefficient,
    },
    validate: {
      title: (value) => (value.trim() ? null : "Geef een naam"),
      date: (value) => (DATE_RE.test(value) ? null : "Kies een datum"),
    },
  });

  async function handleSubmit(values: typeof form.values) {
    setSaving(true);
    try {
      await updateExam({
        examId: exam.id,
        title: values.title.trim(),
        date: values.date,
        coefficient: Number(values.coefficient) || 1,
      });
      notifications.show({
        title: "Bijgewerkt",
        message: "De toets is bijgewerkt.",
        color: "green",
      });
      close();
      router.refresh();
    } catch {
      notifications.show({
        title: "Bijwerken mislukt",
        message: "Probeer het opnieuw.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        variant="default"
        leftSection={<IconPencil size={16} />}
        onClick={open}
      >
        Bewerken
      </Button>
      <Modal opened={opened} onClose={close} title="Toets bewerken" size="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Naam" {...form.getInputProps("title")} />
            <Group grow>
              <TextInput
                label="Datum"
                type="date"
                {...form.getInputProps("date")}
              />
              <NumberInput
                label="Weging"
                min={1}
                max={100}
                allowDecimal={false}
                {...form.getInputProps("coefficient")}
              />
            </Group>
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                Annuleren
              </Button>
              <Button type="submit" loading={saving}>
                Opslaan
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
