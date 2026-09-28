import {
  Badge,
  Button,
  Group,
  Paper,
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
import { IconSearch } from "@tabler/icons-react";

import { requireRole } from "@/lib/dal";
import { listStaff } from "@/lib/users";
import {
  AddStaffButton,
  DeleteStaffButton,
  EditStaffButton,
} from "./staff-dialogs";

const ROLE_LABELS: Record<string, string> = {
  manager: "Beheerder",
  teacher: "Docent",
};

export default async function StaffPage({
  searchParams,
}: PageProps<"/dashboard/staff">) {
  const session = await requireRole("manager");

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const staff = await listStaff({ search });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Personeel</Title>
        <AddStaffButton />
      </Group>

      <Paper withBorder p="md">
        <form action="/dashboard/staff" method="get">
          <Group align="flex-end">
            <TextInput
              name="q"
              label="Zoeken"
              placeholder="Naam, e-mail of telefoon"
              defaultValue={search}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1 }}
            />
            <Button type="submit" variant="light">
              Zoeken
            </Button>
            {search && (
              <Button
                component="a"
                href="/dashboard/staff"
                variant="subtle"
                color="gray"
              >
                Wissen
              </Button>
            )}
          </Group>
        </form>
      </Paper>

      {staff.length === 0 ? (
        <Text c="dimmed">
          {search
            ? "Geen medewerkers gevonden."
            : "Nog geen medewerkers geregistreerd."}
        </Text>
      ) : (
        <TableScrollContainer minWidth={760}>
          <Table striped highlightOnHover>
            <TableThead>
              <TableTr>
                <TableTh>Naam</TableTh>
                <TableTh>E-mail</TableTh>
                <TableTh>Rol</TableTh>
                <TableTh>Telefoon</TableTh>
                <TableTh />
              </TableTr>
            </TableThead>
            <TableTbody>
              {staff.map((member) => (
                <TableTr key={member.id}>
                  <TableTd>
                    {member.name}
                    {member.id === session.user.id && (
                      <Text span size="xs" c="dimmed">
                        {" "}
                        (jij)
                      </Text>
                    )}
                  </TableTd>
                  <TableTd>{member.email}</TableTd>
                  <TableTd>
                    <Badge
                      color={member.role === "manager" ? "indigo" : "gray"}
                      variant="light"
                    >
                      {ROLE_LABELS[member.role] ?? member.role}
                    </Badge>
                  </TableTd>
                  <TableTd>{member.phone ?? "—"}</TableTd>
                  <TableTd>
                    <Group gap="xs" justify="flex-end">
                      <EditStaffButton staff={member} />
                      <DeleteStaffButton
                        staff={member}
                        isSelf={member.id === session.user.id}
                      />
                    </Group>
                  </TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        </TableScrollContainer>
      )}
    </Stack>
  );
}
