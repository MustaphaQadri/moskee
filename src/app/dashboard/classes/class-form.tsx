"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import {
  Button,
  Group,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";

import { createClass, updateClass } from "@/app/actions/classes";
import { useActionFeedback } from "@/app/dashboard/manage/use-action-feedback";

export type ClassOption = { id: string; name: string };

export type ClassFormInitial = {
  name: string;
  description: string | null;
  levelId: string | null;
  roomId: string | null;
  teacherId: string | null;
  sessionIds: string[];
};

export function ClassForm({
  classId,
  initial,
  levels,
  rooms,
  teachers,
  sessions,
}: {
  classId?: string;
  initial?: ClassFormInitial;
  levels: ClassOption[];
  rooms: ClassOption[];
  teachers: ClassOption[];
  sessions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const handleResult = useActionFeedback();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      levelId: initial?.levelId ?? null,
      roomId: initial?.roomId ?? null,
      teacherId: initial?.teacherId ?? null,
      sessionIds: initial?.sessionIds ?? [],
    },
    validate: {
      name: (value) => (value.trim() ? null : "Naam is verplicht"),
      levelId: (value) => (value ? null : "Niveau is verplicht"),
      sessionIds: (value) =>
        value.length > 0 ? null : "Kies minstens één tijdslot",
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);

    if (classId) {
      const result = await updateClass({ id: classId, ...values });
      setLoading(false);
      if (handleResult(result, "Klas bijgewerkt.")) {
        router.push(`/dashboard/classes/${classId}`);
      }
      return;
    }

    const result = await createClass(values);
    setLoading(false);
    if (!handleResult(result, "Klas toegevoegd.")) {
      return;
    }
    if (result.ok) {
      router.push(`/dashboard/classes/${result.data.id}`);
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label="Naam" required {...form.getInputProps("name")} />
          <Select
            label="Niveau"
            required
            data={levels.map((level) => ({
              value: level.id,
              label: level.name,
            }))}
            allowDeselect={false}
            {...form.getInputProps("levelId")}
          />
          <Select
            label="Lokaal"
            data={rooms.map((room) => ({ value: room.id, label: room.name }))}
            clearable
            {...form.getInputProps("roomId")}
          />
          <Select
            label="Docent"
            data={teachers.map((teacher) => ({
              value: teacher.id,
              label: teacher.name,
            }))}
            clearable
            {...form.getInputProps("teacherId")}
          />
        </SimpleGrid>
        <MultiSelect
          label="Tijdsloten"
          required
          data={sessions.map((session) => ({
            value: session.id,
            label: session.label,
          }))}
          {...form.getInputProps("sessionIds")}
        />
        <Textarea
          label="Omschrijving"
          autosize
          minRows={2}
          {...form.getInputProps("description")}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={() => router.back()}>
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
