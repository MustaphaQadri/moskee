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
import { IconPlus, IconSearch } from "@tabler/icons-react";

import { requireRole } from "@/lib/dal";
import { listGuardians } from "@/lib/guardians";

export default async function GuardiansPage({
  searchParams,
}: PageProps<"/dashboard/guardians">) {
  await requireRole("manager");

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const guardians = await listGuardians({ search });

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Inschrijvingen</Title>
        <Button
          component="a"
          href="/dashboard/guardians/new"
          leftSection={<IconPlus size={16} />}
        >
          Nieuwe inschrijving
        </Button>
      </Group>

      <Paper withBorder p="md">
        <form action="/dashboard/guardians" method="get">
          <Group align="flex-end">
            <TextInput
              name="q"
              label="Zoeken"
              placeholder="Naam, e-mail, telefoon of nummer"
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
                href="/dashboard/guardians"
                variant="subtle"
                color="gray"
              >
                Wissen
              </Button>
            )}
          </Group>
        </form>
      </Paper>

      {guardians.length === 0 ? (
        <Text c="dimmed">
          {search
            ? "Geen ouders/verzorgers gevonden."
            : "Nog geen ouders/verzorgers geregistreerd."}
        </Text>
      ) : (
        <TableScrollContainer minWidth={860}>
          <Table striped highlightOnHover>
            <TableThead>
              <TableTr>
                <TableTh>Naam</TableTh>
                <TableTh>E-mail</TableTh>
                <TableTh>Telefoon</TableTh>
                <TableTh>Donatienr.</TableTh>
                <TableTh>Onderwijsnr.</TableTh>
                <TableTh>Leerlingen</TableTh>
                <TableTh />
              </TableTr>
            </TableThead>
            <TableTbody>
              {guardians.map((guardian) => (
                <TableTr key={guardian.id}>
                  <TableTd>
                    {guardian.lastName}, {guardian.firstName}
                  </TableTd>
                  <TableTd>{guardian.email ?? "—"}</TableTd>
                  <TableTd>{guardian.phone ?? "—"}</TableTd>
                  <TableTd>{guardian.donationNumber ?? "—"}</TableTd>
                  <TableTd>{guardian.educationNumber ?? "—"}</TableTd>
                  <TableTd>
                    <Badge variant="light">{guardian.studentCount}</Badge>
                  </TableTd>
                  <TableTd>
                    <Button
                      component="a"
                      href={`/dashboard/guardians/${guardian.id}`}
                      size="xs"
                      variant="subtle"
                    >
                      Bekijken
                    </Button>
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
