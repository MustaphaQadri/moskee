"use client";

import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPrinter } from "@tabler/icons-react";

// Opens the printable A4 report. If the teacher hasn't written an observation
// yet, confirms first so the report isn't handed out without one.
export function PrintReportButton({
  url,
  hasObservation,
}: {
  url: string;
  hasObservation: boolean;
}) {
  const [opened, { open, close }] = useDisclosure(false);

  function proceed() {
    close();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <Button
        variant="light"
        leftSection={<IconPrinter size={16} />}
        onClick={() => (hasObservation ? proceed() : open())}
      >
        Afdrukbaar rapport
      </Button>
      <Modal opened={opened} onClose={close} title="Nog geen opmerking" size="md">
        <Stack>
          <Text>
            Er is nog geen opmerking ingevuld voor deze leerling. Weet je zeker
            dat je het rapport wilt afdrukken?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Annuleren
            </Button>
            <Button onClick={proceed}>Toch afdrukken</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
