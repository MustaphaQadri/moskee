"use client";

import { useState } from "react";
import { Button, Card, Stack, Text, Textarea, Title } from "@mantine/core";

import {
  savePeriodReportObservation,
  saveYearReportObservation,
} from "@/app/actions/report-observations";
import { useActionFeedback } from "@/app/dashboard/manage/use-action-feedback";

type Props = {
  classId: string;
  studentId: string;
  academicYearId: string;
  initialObservation: string | null;
} & (
  | { mode: "period"; termId: string }
  | { mode: "year"; termId?: never }
);

export function ReportObservationEditor(props: Props) {
  const { classId, studentId, academicYearId, initialObservation } = props;
  const [value, setValue] = useState(initialObservation ?? "");
  const [loading, setLoading] = useState(false);
  const handleResult = useActionFeedback();

  async function save() {
    setLoading(true);
    const result =
      props.mode === "period"
        ? await savePeriodReportObservation({
            classId,
            studentId,
            termId: props.termId,
            academicYearId,
            body: value,
          })
        : await saveYearReportObservation({
            classId,
            studentId,
            academicYearId,
            body: value,
          });
    setLoading(false);
    handleResult(result, "De opmerking is opgeslagen.");
  }

  return (
    <Card withBorder>
      <Title order={5} mb="xs">
        Opmerking / ملاحظة
      </Title>
      <Stack gap="xs">
        <Text size="sm" c="dimmed">
          Deze opmerking verschijnt op het rapport van de leerling en op de
          afdruk.
        </Text>
        <Textarea
          minRows={4}
          maxRows={10}
          autosize
          maxLength={2000}
          placeholder="Schrijf hier een opmerking voor deze leerling…"
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
        />
        <Button
          onClick={save}
          loading={loading}
          style={{ alignSelf: "flex-start" }}
        >
          Opslaan
        </Button>
      </Stack>
    </Card>
  );
}
