"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus } from "@tabler/icons-react";

import { createExam } from "@/app/actions/grades";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function NewExamButton({
  classId,
  subjects,
  terms,
  years,
  defaultTermId,
  defaultYearId,
  defaultDate,
}: {
  classId: string;
  subjects: { id: string; name: string }[];
  terms: { id: string; name: string }[];
  years: { id: string; name: string }[];
  defaultTermId: string;
  defaultYearId: string;
  defaultDate: string;
}) {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    initialValues: {
      subjectId: "",
      title: "",
      termId: defaultTermId,
      academicYearId: defaultYearId,
      date: defaultDate,
      coefficient: 1,
    },
    validate: {
      subjectId: (value) => (value ? null : "Kies een vak"),
      title: (value) => (value.trim() ? null : "Geef een naam"),
      termId: (value) => (value ? null : "Kies een periode"),
      academicYearId: (value) => (value ? null : "Kies een schooljaar"),
      date: (value) => (DATE_RE.test(value) ? null : "Kies een datum"),
    },
  });

  async function handleSubmit(values: typeof form.values) {
    setSaving(true);
    try {
      const sheet = await createExam({
        classId,
        subjectId: values.subjectId,
        title: values.title.trim(),
        termId: values.termId,
        academicYearId: values.academicYearId,
        date: values.date,
        coefficient: Number(values.coefficient) || 1,
      });
      notifications.show({
        title: "Toets toegevoegd",
        message: "Je kunt nu de cijfers invullen.",
        color: "green",
      });
      close();
      form.reset();
      if (sheet) {
        router.push(`/dashboard/classes/${classId}/grades/${sheet.exam.id}`);
      } else {
        router.refresh();
      }
    } catch {
      notifications.show({
        title: "Toevoegen mislukt",
        message: "Probeer het opnieuw.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  }

  const disabled =
    subjects.length === 0 || terms.length === 0 || years.length === 0;

  return (
    <>
      <Button
        leftSection={<IconPlus size={16} />}
        onClick={open}
        disabled={disabled}
      >
        Nieuwe toets
      </Button>
      <Modal opened={opened} onClose={close} title="Nieuwe toets" size="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Select
              label="Vak"
              placeholder="Kies een vak"
              data={subjects.map((subject) => ({
                value: subject.id,
                label: subject.name,
              }))}
              allowDeselect={false}
              {...form.getInputProps("subjectId")}
            />
            <TextInput
              label="Naam"
              placeholder="bv. Hoofdstuk 1"
              {...form.getInputProps("title")}
            />
            <Select
              label="Periode"
              data={terms.map((term) => ({ value: term.id, label: term.name }))}
              allowDeselect={false}
              {...form.getInputProps("termId")}
            />
            <Select
              label="Schooljaar"
              data={years.map((year) => ({ value: year.id, label: year.name }))}
              allowDeselect={false}
              {...form.getInputProps("academicYearId")}
            />
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
                Toevoegen
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
