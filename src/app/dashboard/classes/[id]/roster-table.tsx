"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Anchor,
  Avatar,
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconArrowsExchange } from "@tabler/icons-react";

import {
  moveStudents,
  removeStudentsFromClass,
} from "@/app/actions/enrollments";
import { SEX_LABELS } from "@/app/dashboard/guardians/options";
import type { Sex } from "@/generated/prisma/enums";
import { RemoveStudentButton } from "./roster-dialogs";

export type RosterStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  sex: Sex | null;
  image: string | null;
};

export type ClassOption = {
  id: string;
  name: string;
  levelName: string | null;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

export function RosterTable({
  classId,
  students,
  moveTargets,
  canManage,
}: {
  classId: string;
  students: RosterStudent[];
  moveTargets: ClassOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [moveOpened, setMoveOpened] = useState(false);
  const [removeOpened, setRemoveOpened] = useState(false);
  const [targetClassId, setTargetClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const allSelected =
    students.length > 0 && selected.length === students.length;
  const someSelected = selected.length > 0 && !allSelected;
  const count = selected.length;

  function toggle(studentId: string) {
    setSelected((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  }

  function toggleAll() {
    setSelected(allSelected ? [] : students.map((student) => student.studentId));
  }

  function closeMove() {
    setMoveOpened(false);
    setTargetClassId(null);
  }

  async function confirmMove() {
    if (!targetClassId) return;
    setLoading(true);
    const result = await moveStudents({
      fromClassId: classId,
      toClassId: targetClassId,
      studentIds: selected,
    });
    setLoading(false);

    if (!result.ok) {
      notifications.show({
        title: "Verplaatsen mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }

    notifications.show({
      title: "Verplaatst",
      message: `${result.data.moved} leerling(en) verplaatst.`,
      color: "green",
    });
    closeMove();
    setSelected([]);
    router.refresh();
  }

  async function confirmRemove() {
    setLoading(true);
    const result = await removeStudentsFromClass({
      classId,
      studentIds: selected,
    });
    setLoading(false);

    if (!result.ok) {
      notifications.show({
        title: "Verwijderen mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }

    notifications.show({
      title: "Verwijderd uit klas",
      message: `${result.data.removed} leerling(en) hebben nu geen klas.`,
      color: "green",
    });
    setRemoveOpened(false);
    setSelected([]);
    router.refresh();
  }

  return (
    <Stack gap="sm">
      {canManage && count > 0 && (
        <Group justify="space-between">
          <Text size="sm" fw={500}>
            {count} geselecteerd
          </Text>
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              leftSection={<IconArrowsExchange size={16} />}
              disabled={moveTargets.length === 0}
              onClick={() => setMoveOpened(true)}
            >
              Verplaatsen
            </Button>
            <Button
              size="xs"
              color="red"
              variant="light"
              onClick={() => setRemoveOpened(true)}
            >
              Uit klas verwijderen
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              onClick={() => setSelected([])}
            >
              Selectie wissen
            </Button>
          </Group>
        </Group>
      )}

      <TableScrollContainer minWidth={640}>
        <Table striped highlightOnHover>
          <TableThead>
            <TableTr>
              {canManage && (
                <TableTh w={40}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    aria-label="Alles selecteren"
                  />
                </TableTh>
              )}
              <TableTh>Naam</TableTh>
              <TableTh>Geboortedatum</TableTh>
              <TableTh>Geslacht</TableTh>
              {canManage && <TableTh />}
            </TableTr>
          </TableThead>
          <TableTbody>
            {students.map((student) => (
              <TableTr key={student.studentId}>
                {canManage && (
                  <TableTd>
                    <Checkbox
                      checked={selected.includes(student.studentId)}
                      onChange={() => toggle(student.studentId)}
                      aria-label={`Selecteer ${student.firstName} ${student.lastName}`}
                    />
                  </TableTd>
                )}
                <TableTd>
                  <Group gap="xs" wrap="nowrap">
                    <Avatar
                      src={student.image}
                      alt={`${student.firstName} ${student.lastName}`}
                      size={32}
                      radius="sm"
                    />
                    <Anchor
                      component="a"
                      href={`/dashboard/students/${student.studentId}?from=${encodeURIComponent(
                        `/dashboard/classes/${classId}`,
                      )}`}
                    >
                      {student.firstName} {student.lastName}
                    </Anchor>
                  </Group>
                </TableTd>
                <TableTd>{formatDate(student.dateOfBirth)}</TableTd>
                <TableTd>
                  {student.sex ? SEX_LABELS[student.sex] ?? student.sex : "—"}
                </TableTd>
                {canManage && (
                  <TableTd>
                    <Group justify="flex-end">
                      <RemoveStudentButton
                        classId={classId}
                        studentId={student.studentId}
                        studentName={`${student.firstName} ${student.lastName}`}
                      />
                    </Group>
                  </TableTd>
                )}
              </TableTr>
            ))}
          </TableTbody>
        </Table>
      </TableScrollContainer>

      <Modal
        opened={moveOpened}
        onClose={closeMove}
        title="Leerlingen verplaatsen"
      >
        <Stack>
          <Text size="sm">
            Je staat op het punt <strong>{count}</strong> leerling(en) te
            verplaatsen naar een andere klas.
          </Text>
          <Select
            label="Doelklas"
            placeholder="Kies een klas"
            data={moveTargets.map((target) => ({
              value: target.id,
              label: target.levelName
                ? `${target.name} (${target.levelName})`
                : target.name,
            }))}
            value={targetClassId}
            onChange={setTargetClassId}
            searchable
            allowDeselect={false}
            required
          />
          <Alert
            color="orange"
            variant="light"
            icon={<IconAlertTriangle size={18} />}
          >
            De leerlingen worden uit deze klas gehaald en in de gekozen klas
            geplaatst.
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeMove}>
              Annuleren
            </Button>
            <Button
              loading={loading}
              disabled={!targetClassId}
              onClick={confirmMove}
            >
              Verplaatsen
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={removeOpened}
        onClose={() => setRemoveOpened(false)}
        title="Uit klas verwijderen"
      >
        <Stack>
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={18} />}
          >
            Weet je zeker dat je <strong>{count}</strong> leerling(en) uit deze
            klas wilt verwijderen? Deze leerlingen hebben daarna <strong>geen klas meer</strong>.
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRemoveOpened(false)}>
              Annuleren
            </Button>
            <Button color="red" loading={loading} onClick={confirmRemove}>
              Verwijderen
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
