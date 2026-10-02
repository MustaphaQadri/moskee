"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@mantine/form";
import {
  Alert,
  Button,
  CopyButton,
  Divider,
  Group,
  Modal,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCheck,
  IconCopy,
  IconKey,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

import {
  createStaff,
  deleteStaff,
  resetStaffPassword,
  updateStaff,
} from "@/app/actions/users";

export type StaffRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "manager" | "teacher";
};

const ROLE_OPTIONS = [
  { value: "manager", label: "Beheerder" },
  { value: "teacher", label: "Docent" },
];

function AddStaffForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      password: "",
      role: "teacher" as "manager" | "teacher",
      phone: "",
    },
    validate: {
      name: (value) => (value.trim() ? null : "Naam is verplicht"),
      email: (value) =>
        /^\S+@\S+\.\S+$/.test(value) ? null : "Ongeldig e-mailadres",
      password: (value) =>
        value.length >= 8 ? null : "Wachtwoord moet minstens 8 tekens zijn",
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = await createStaff(values);
    setLoading(false);

    if (!result.ok) {
      notifications.show({
        title: "Toevoegen mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }

    notifications.show({
      title: "Toegevoegd",
      message: "De medewerker is aangemaakt.",
      color: "green",
    });
    onDone();
    router.refresh();
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label="Naam" required {...form.getInputProps("name")} />
          <TextInput
            label="E-mailadres"
            type="email"
            required
            {...form.getInputProps("email")}
          />
          <PasswordInput
            label="Wachtwoord"
            required
            {...form.getInputProps("password")}
          />
          <Select
            label="Rol"
            data={ROLE_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps("role")}
          />
          <TextInput label="Telefoon" {...form.getInputProps("phone")} />
        </SimpleGrid>
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            Annuleren
          </Button>
          <Button type="submit" loading={loading}>
            Toevoegen
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function AddStaffButton() {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Button leftSection={<IconPlus size={16} />} onClick={open}>
        Medewerker toevoegen
      </Button>
      <Modal
        opened={opened}
        onClose={close}
        title="Medewerker toevoegen"
        size="lg"
      >
        <AddStaffForm onDone={close} />
      </Modal>
    </>
  );
}

function EditStaffForm({
  staff,
  onDone,
}: {
  staff: StaffRecord;
  onDone: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      name: staff.name,
      role: staff.role,
      phone: staff.phone ?? "",
    },
    validate: {
      name: (value) => (value.trim() ? null : "Naam is verplicht"),
    },
  });

  async function handleReset() {
    setResetting(true);
    const result = await resetStaffPassword({ id: staff.id });
    setResetting(false);

    if (!result.ok) {
      notifications.show({
        title: "Resetten mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }

    setGenerated(result.data.password);
    notifications.show({
      title: "Wachtwoord gereset",
      message: "Geef het tijdelijke wachtwoord door aan de medewerker.",
      color: "green",
    });
  }

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = await updateStaff({ id: staff.id, ...values });
    setLoading(false);

    if (!result.ok) {
      notifications.show({
        title: "Opslaan mislukt",
        message: result.error,
        color: "red",
      });
      return;
    }

    notifications.show({
      title: "Opgeslagen",
      message: "De medewerker is bijgewerkt.",
      color: "green",
    });
    onDone();
    router.refresh();
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label="Naam" required {...form.getInputProps("name")} />
        <Text size="sm" c="dimmed">
          {staff.email}
        </Text>
        <Select
          label="Rol"
          data={ROLE_OPTIONS}
          allowDeselect={false}
          {...form.getInputProps("role")}
        />
        <TextInput label="Telefoon" {...form.getInputProps("phone")} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            Annuleren
          </Button>
          <Button type="submit" loading={loading}>
            Opslaan
          </Button>
        </Group>

        <Divider label="Wachtwoord" labelPosition="left" mt="sm" />

        {generated ? (
          <Alert color="green" title="Tijdelijk wachtwoord" variant="light">
            <Stack gap="xs">
              <Group justify="space-between" wrap="nowrap">
                <Text ff="monospace" fw={600}>
                  {generated}
                </Text>
                <CopyButton value={generated} timeout={2000}>
                  {({ copied, copy }) => (
                    <Button
                      size="xs"
                      variant="light"
                      color={copied ? "teal" : "gray"}
                      leftSection={
                        copied ? <IconCheck size={14} /> : <IconCopy size={14} />
                      }
                      onClick={copy}
                    >
                      {copied ? "Gekopieerd" : "Kopiëren"}
                    </Button>
                  )}
                </CopyButton>
              </Group>
              <Text size="xs" c="dimmed">
                Deel dit met {staff.name}. Bij de volgende keer inloggen moet een
                nieuw wachtwoord worden ingesteld.
              </Text>
            </Stack>
          </Alert>
        ) : (
          <>
            <Text size="xs" c="dimmed">
              Genereert een tijdelijk wachtwoord. De medewerker stelt bij de
              volgende keer inloggen zelf een nieuw wachtwoord in en bestaande
              sessies worden afgemeld.
            </Text>
            <Button
              variant="light"
              color="orange"
              leftSection={<IconKey size={16} />}
              loading={resetting}
              onClick={handleReset}
            >
              Wachtwoord genereren
            </Button>
          </>
        )}
      </Stack>
    </form>
  );
}

export function EditStaffButton({ staff }: { staff: StaffRecord }) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Button
        variant="subtle"
        size="xs"
        leftSection={<IconPencil size={16} />}
        onClick={open}
      >
        Bewerken
      </Button>
      <Modal
        opened={opened}
        onClose={close}
        title="Medewerker bewerken"
        size="lg"
      >
        <EditStaffForm staff={staff} onDone={close} />
      </Modal>
    </>
  );
}

export function DeleteStaffButton({
  staff,
  isSelf,
}: {
  staff: StaffRecord;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deleteStaff({ id: staff.id });
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
      title: "Verwijderd",
      message: "De medewerker is verwijderd.",
      color: "green",
    });
    close();
    router.refresh();
  }

  return (
    <>
      <Button
        variant="subtle"
        color="red"
        size="xs"
        leftSection={<IconTrash size={16} />}
        onClick={open}
        disabled={isSelf}
      >
        Verwijderen
      </Button>
      <Modal opened={opened} onClose={close} title="Medewerker verwijderen">
        <Stack>
          <Text>
            Weet je zeker dat je <strong>{staff.name}</strong> wilt verwijderen?
            Deze actie kan niet ongedaan worden gemaakt.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Annuleren
            </Button>
            <Button color="red" loading={loading} onClick={handleDelete}>
              Verwijderen
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
