"use client";

import { useState } from "react";
import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPrinter } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

import {
  savePeriodReportObservation,
  saveYearReportObservation,
} from "@/app/actions/report-observations";
import {
  PeriodReportSheet,
  type SheetAttendance,
} from "@/app/print/components/period-report-sheet";
import { YearReportSheet } from "@/app/print/components/year-report-sheet";

type StudentBase = {
  studentId: string;
  firstName: string;
  lastName: string;
  observation: string | null;
  overallAverage: number | null;
  attendance: SheetAttendance | null;
};

type Student = StudentBase & {
  averages: Record<string, number | null>;
  periodAverages?: Record<string, (number | null)[]>;
};

type Props = {
  classId: string;
  yearId: string;
  className: string;
  yearName: string;
  subjects: { id: string; name: string }[];
  students: Student[];
} & (
  | { mode: "period"; termId: string; termName: string; periods?: never }
  | { mode: "year"; periods: { id: string; name: string }[]; termId?: never }
);

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

export function BulkPrintButton(props: Props) {
  const { classId, yearId, className, yearName, subjects, students } = props;
  const [opened, { open, close }] = useDisclosure(false);
  const [queue, setQueue] = useState<Student[]>([]);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const printUrl =
    props.mode === "period"
      ? `/print/classes/${classId}/report?year=${yearId}&term=${props.termId}`
      : `/print/classes/${classId}/year?year=${yearId}`;

  function openPrint() {
    window.open(printUrl, "_blank", "noopener,noreferrer");
  }

  function start() {
    const missing = students.filter((student) => !student.observation?.trim());
    if (missing.length === 0) {
      openPrint();
      return;
    }
    setQueue(missing);
    setIndex(0);
    setValue("");
    open();
  }

  function advance() {
    const next = index + 1;
    if (next >= queue.length) {
      close();
      openPrint();
      return;
    }
    setIndex(next);
    setValue("");
  }

  async function saveAndNext() {
    const current = queue[index];
    if (!current) return;
    setSaving(true);
    const result =
      props.mode === "period"
        ? await savePeriodReportObservation({
            classId,
            studentId: current.studentId,
            termId: props.termId,
            academicYearId: yearId,
            body: value,
          })
        : await saveYearReportObservation({
            classId,
            studentId: current.studentId,
            academicYearId: yearId,
            body: value,
          });
    setSaving(false);
    if (!result.ok) {
      notifications.show({
        title: "Opslaan mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }
    advance();
  }

  const current = queue[index];
  const remaining = queue.length - index;
  const printedOn = formatDate(new Date().toISOString().slice(0, 10));
  const previewObservation = value.trim() ? value : current?.observation ?? null;

  return (
    <>
      <Button
        variant="default"
        leftSection={<IconPrinter size={16} />}
        onClick={start}
      >
        Alle rapporten afdrukken
      </Button>

      <Modal opened={opened} onClose={close} title="Opmerking invullen" size="xl">
        {current && (
          <Stack>
            <Text>
              <strong>
                {current.firstName} {current.lastName}
              </strong>{" "}
              heeft nog geen opmerking. Vul ze in of sla over ({remaining} te
              gaan).
            </Text>

            <div
              style={{
                maxHeight: 420,
                overflowY: "auto",
                padding: 4,
                background: "var(--mantine-color-gray-0)",
                borderRadius: 8,
              }}
            >
              {props.mode === "period" ? (
                <PeriodReportSheet
                  variant="preview"
                  data={{
                    studentName: `${current.firstName} ${current.lastName}`,
                    className,
                    yearName,
                    termName: props.termName,
                    subjects: subjects.map((subject) => ({
                      id: subject.id,
                      name: subject.name,
                      average: current.averages[subject.id] ?? null,
                    })),
                    overallAverage: current.overallAverage,
                    attendance: current.attendance,
                    observation: previewObservation,
                    printedOn,
                  }}
                />
              ) : (
                <YearReportSheet
                  variant="preview"
                  data={{
                    studentName: `${current.firstName} ${current.lastName}`,
                    className,
                    yearName,
                    periods: props.periods,
                    subjects: subjects.map((subject) => ({
                      id: subject.id,
                      name: subject.name,
                      periodAverages: current.periodAverages?.[subject.id] ?? [],
                      average: current.averages[subject.id] ?? null,
                    })),
                    overallAverage: current.overallAverage,
                    attendance: current.attendance,
                    observation: previewObservation,
                    printedOn,
                  }}
                />
              )}
            </div>

            <Textarea
              label="Opmerking / ملاحظة"
              minRows={3}
              maxRows={8}
              autosize
              maxLength={2000}
              value={value}
              onChange={(event) => setValue(event.currentTarget.value)}
            />

            <Group justify="space-between">
              <Button variant="default" onClick={close}>
                Annuleren
              </Button>
              <Group gap="xs">
                <Button variant="subtle" onClick={advance}>
                  Overslaan
                </Button>
                <Button onClick={saveAndNext} loading={saving}>
                  Opslaan & volgende
                </Button>
              </Group>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
