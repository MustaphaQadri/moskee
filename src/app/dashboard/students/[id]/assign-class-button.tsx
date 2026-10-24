"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Radio,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";

import { enrollStudent } from "@/app/actions/enrollments";
import type { DonationChoice } from "@/app/dashboard/donation-prompt";
import { useActionFeedback } from "@/app/dashboard/manage/use-action-feedback";

export type AssignClassTarget = {
  id: string;
  name: string;
  levelName: string | null;
};

function euro(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

// Manager-only first class assignment from the student detail page. Mirrors the
// roster's add flow: choose a class and set the yearly donation.
export function AssignClassButton({
  studentId,
  studentName,
  classes,
  defaultDonationAmount,
}: {
  studentId: string;
  studentName: string;
  classes: AssignClassTarget[];
  defaultDonationAmount: number;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);
  const handleResult = useActionFeedback();

  const form = useForm({
    initialValues: {
      classId: null as string | null,
      category: "FULL" as DonationChoice,
      amount: defaultDonationAmount,
    },
    validate: {
      classId: (value) => (value ? null : "Kies een klas"),
      amount: (value, values) =>
        values.category === "REDUCED" &&
        (!Number.isFinite(Number(value)) || Number(value) < 0)
          ? "Vul een geldig bedrag in"
          : null,
    },
  });

  function closeModal() {
    close();
    form.reset();
  }

  const handleSubmit = form.onSubmit(async (values) => {
    if (!values.classId) return;
    setLoading(true);
    const result = await enrollStudent({
      classId: values.classId,
      studentId,
      donation: {
        category: values.category,
        expectedAmount:
          values.category === "REDUCED" ? Number(values.amount) : undefined,
      },
    });
    setLoading(false);

    if (handleResult(result, "Leerling aan klas toegevoegd.")) {
      closeModal();
    }
  });

  return (
    <>
      <Button leftSection={<IconPlus size={16} />} onClick={open}>
        Toevoegen aan klas
      </Button>

      <Modal
        opened={opened}
        onClose={closeModal}
        title="Leerling aan klas toevoegen"
      >
        <form onSubmit={handleSubmit}>
          <Stack>
            <Text size="sm" c="dimmed">
              {studentName} heeft nog geen klas. Kies een klas en stel de
              jaarlijkse donatie in.
            </Text>

            <Select
              label="Klas"
              placeholder="Kies een klas"
              data={classes.map((schoolClass) => ({
                value: schoolClass.id,
                label: schoolClass.levelName
                  ? `${schoolClass.name} (${schoolClass.levelName})`
                  : schoolClass.name,
              }))}
              searchable
              allowDeselect={false}
              required
              {...form.getInputProps("classId")}
            />

            <Radio.Group label="Type bijdrage" {...form.getInputProps("category")}>
              <Stack gap="xs" mt="xs">
                <Radio
                  value="FULL"
                  label={`Verschuldigd (${euro(defaultDonationAmount)})`}
                />
                <Radio value="REDUCED" label="Deels verschuldigd" />
                <Radio value="EXEMPT" label="Vrijgesteld" />
              </Stack>
            </Radio.Group>

            {form.values.category === "REDUCED" && (
              <NumberInput
                label="Bedrag"
                min={0}
                decimalScale={2}
                fixedDecimalScale
                prefix="€ "
                {...form.getInputProps("amount")}
              />
            )}

            <Group justify="flex-end">
              <Button variant="default" onClick={closeModal}>
                Annuleren
              </Button>
              <Button type="submit" loading={loading}>
                Toevoegen
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
