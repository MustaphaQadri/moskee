"use client";

import { useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { saveExamGrades } from "@/app/actions/grades";
import { gradeColor } from "@/lib/grade-colors";
import { DeleteExamButton } from "../exam-actions";
import { EditExamButton } from "./edit-exam-dialog";

const NONE = "none";

const GRADE_OPTIONS = [
  {
    value: NONE,
    label: (
      <Text component="span" size="xs" c="dimmed">
        —
      </Text>
    ),
  },
  ...Array.from({ length: 10 }, (_, index) => {
    const grade = index + 1;
    return {
      value: String(grade),
      label: (
        <Text component="span" size="xs" fw={600} c={gradeColor(grade)}>
          {grade}
        </Text>
      ),
    };
  }),
];

export type ExamSheetExam = {
  id: string;
  title: string;
  date: string;
  coefficient: number;
  subjectName: string;
  termName: string;
  academicYearName: string;
};

export type ExamSheetStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  image: string | null;
  score: number | null;
  remark: string | null;
};

function formatDate(value: string): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function parseScore(value: string): number | null {
  if (value === NONE || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : null;
}

export function ExamSheet({
  classId,
  exam,
  students,
}: {
  classId: string;
  exam: ExamSheetExam;
  students: ExamSheetStudent[];
}) {
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const student of students) {
      initial[student.studentId] = student.score != null ? String(student.score) : NONE;
    }
    return initial;
  });
  const [remarks, setRemarks] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const student of students) initial[student.studentId] = student.remark ?? "";
    return initial;
  });
  const [loading, setLoading] = useState(false);

  const summary = useMemo(() => {
    const values: number[] = [];
    for (const student of students) {
      const parsed = parseScore(scores[student.studentId] ?? NONE);
      if (parsed !== null) values.push(parsed);
    }
    if (values.length === 0) return { count: 0, average: null as number | null };
    return {
      count: values.length,
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
    };
  }, [scores, students]);

  async function handleSave() {
    const entries = students.map((student) => {
      const remark = remarks[student.studentId]?.trim();
      return {
        studentId: student.studentId,
        score: parseScore(scores[student.studentId] ?? NONE),
        remark: remark ? remark : undefined,
      };
    });

    setLoading(true);
    try {
      await saveExamGrades({ examId: exam.id, entries });
      notifications.show({
        title: "Opgeslagen",
        message: "De cijfers zijn opgeslagen.",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Opslaan mislukt",
        message: "Probeer het opnieuw.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    const next: Record<string, string> = {};
    for (const student of students) next[student.studentId] = NONE;
    setScores(next);
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>{exam.title}</Title>
          <Text c="dimmed" size="sm">
            {exam.subjectName} · {formatDate(exam.date)} · weging{" "}
            {exam.coefficient}×
          </Text>
        </div>
        <Group gap="xs">
          <EditExamButton
            exam={{
              id: exam.id,
              title: exam.title,
              date: exam.date,
              coefficient: exam.coefficient,
            }}
          />
          <DeleteExamButton
            examId={exam.id}
            title={exam.title}
            redirectTo={`/dashboard/classes/${classId}/grades`}
          />
        </Group>
      </Group>

      {students.length === 0 ? (
        <Text c="dimmed">Nog geen leerlingen in deze klas.</Text>
      ) : (
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={500}>Leerlingen ({students.length})</Text>
            <Button variant="subtle" size="xs" onClick={clearAll}>
              Alles wissen
            </Button>
          </Group>

          <TableScrollContainer minWidth={860}>
            <Table verticalSpacing="xs">
              <TableThead>
                <TableTr>
                  <TableTh>Leerling</TableTh>
                  <TableTh>Cijfer (1–10)</TableTh>
                  <TableTh>Opmerking</TableTh>
                </TableTr>
              </TableThead>
              <TableTbody>
                {students.map((student) => (
                  <TableTr key={student.studentId}>
                    <TableTd>
                      <Group gap="xs" wrap="nowrap">
                        <Avatar
                          src={student.image}
                          alt={`${student.firstName} ${student.lastName}`}
                          size={32}
                          radius="sm"
                        />
                        {student.lastName}, {student.firstName}
                      </Group>
                    </TableTd>
                    <TableTd>
                      <SegmentedControl
                        size="xs"
                        data={GRADE_OPTIONS}
                        value={scores[student.studentId] ?? NONE}
                        onChange={(value) =>
                          setScores((prev) => ({
                            ...prev,
                            [student.studentId]: value,
                          }))
                        }
                      />
                    </TableTd>
                    <TableTd>
                      <TextInput
                        size="xs"
                        placeholder="Optioneel"
                        value={remarks[student.studentId] ?? ""}
                        onChange={(event) =>
                          setRemarks((prev) => ({
                            ...prev,
                            [student.studentId]: event.currentTarget.value,
                          }))
                        }
                      />
                    </TableTd>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
          </TableScrollContainer>

          <Group justify="space-between" align="center" mt="lg" wrap="wrap">
            <Text size="sm" c="dimmed">
              {summary.count} van {students.length} ingevuld
              {summary.average !== null ? (
                <>
                  {" · gemiddelde "}
                  <Text
                    component="span"
                    size="sm"
                    fw={700}
                    c={gradeColor(summary.average)}
                  >
                    {summary.average.toFixed(1)}
                  </Text>
                </>
              ) : (
                ""
              )}
            </Text>
            <Button onClick={handleSave} loading={loading}>
              Opslaan
            </Button>
          </Group>
        </Card>
      )}
    </Stack>
  );
}
