"use client";

import { useForm } from "@mantine/form";
import {
  Button,
  Group,
  NumberInput,
  Radio,
  Stack,
  Text,
} from "@mantine/core";

export type DonationChoice = "FULL" | "REDUCED" | "EXEMPT";

function euro(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

// First-class-assignment donation prompt. Shared by the class roster's
// "add student" dialog and the student detail's "assign to class" dialog.
export function DonationPrompt({
  studentName,
  defaultAmount,
  loading,
  onCancel,
  onConfirm,
}: {
  studentName: string;
  defaultAmount: number;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (donation: {
    category: DonationChoice;
    expectedAmount?: number;
  }) => void;
}) {
  const form = useForm({
    initialValues: { category: "FULL" as DonationChoice, amount: defaultAmount },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const { category, amount } = form.values;
        onConfirm({
          category,
          expectedAmount: category === "REDUCED" ? Number(amount) : undefined,
        });
      }}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          {studentName} krijgt een klas. Stel de jaarlijkse donatie in.
        </Text>

        <Radio.Group label="Type bijdrage" {...form.getInputProps("category")}>
          <Stack gap="xs" mt="xs">
            <Radio value="FULL" label={`Verschuldigd (${euro(defaultAmount)})`} />
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
          <Button variant="default" onClick={onCancel}>
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
