"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Radio,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconPlus } from "@tabler/icons-react";

import {
  addDonationPayment,
  deleteDonationPayment,
  setStudentDonation,
  updateDonationPayment,
} from "@/app/actions/donations";
import { ConfirmDeleteButton } from "@/app/dashboard/manage/confirm-delete";
import { useActionFeedback } from "@/app/dashboard/manage/use-action-feedback";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type PaymentRow = {
  id: string;
  amount: number;
  paidAt: string | null;
  note: string | null;
};

function PaymentForm({
  amount,
  paidAt,
  note,
  submitLabel,
  onSubmit,
  onDone,
}: {
  amount: number;
  paidAt: string;
  note: string;
  submitLabel: string;
  onSubmit: (values: { amount: number; paidAt: string; note: string }) => Promise<boolean>;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: { amount, paidAt, note },
    validate: {
      amount: (value) => (Number(value) > 0 ? null : "Voer een bedrag in"),
      paidAt: (value) =>
        DATE_RE.test(value) ? null : "Kies een geldige datum",
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const ok = await onSubmit({
      amount: Number(values.amount),
      paidAt: values.paidAt,
      note: values.note.trim(),
    });
    setLoading(false);
    if (ok) onDone();
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <NumberInput
          label="Bedrag"
          min={0}
          decimalScale={2}
          fixedDecimalScale
          prefix="€ "
          required
          {...form.getInputProps("amount")}
        />
        <TextInput
          label="Datum"
          type="date"
          required
          {...form.getInputProps("paidAt")}
        />
        <Textarea
          label="Opmerking"
          autosize
          minRows={2}
          maxLength={500}
          {...form.getInputProps("note")}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            Annuleren
          </Button>
          <Button type="submit" loading={loading}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function AddPaymentButton({
  studentId,
  academicYearId,
  suggestedAmount,
  today,
}: {
  studentId: string;
  academicYearId: string;
  suggestedAmount: number;
  today: string;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const handleResult = useActionFeedback();

  return (
    <>
      <Button size="xs" leftSection={<IconPlus size={16} />} onClick={open}>
        Betaling toevoegen
      </Button>
      <Modal opened={opened} onClose={close} title="Betaling toevoegen">
        <PaymentForm
          amount={suggestedAmount}
          paidAt={today}
          note=""
          submitLabel="Toevoegen"
          onDone={close}
          onSubmit={async (values) =>
            handleResult(
              await addDonationPayment({
                studentId,
                academicYearId,
                amount: values.amount,
                paidAt: values.paidAt,
                note: values.note,
              }),
              "Betaling toegevoegd.",
            )
          }
        />
      </Modal>
    </>
  );
}

export function EditPaymentButton({ payment }: { payment: PaymentRow }) {
  const [opened, { open, close }] = useDisclosure(false);
  const handleResult = useActionFeedback();

  return (
    <>
      <Button
        size="xs"
        variant="subtle"
        leftSection={<IconPencil size={16} />}
        onClick={open}
      >
        Bewerken
      </Button>
      <Modal opened={opened} onClose={close} title="Betaling bewerken">
        <PaymentForm
          amount={payment.amount}
          paidAt={payment.paidAt ?? ""}
          note={payment.note ?? ""}
          submitLabel="Opslaan"
          onDone={close}
          onSubmit={async (values) =>
            handleResult(
              await updateDonationPayment({
                paymentId: payment.id,
                amount: values.amount,
                paidAt: values.paidAt,
                note: values.note,
              }),
              "Betaling bijgewerkt.",
            )
          }
        />
      </Modal>
    </>
  );
}

export function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const handleResult = useActionFeedback();

  return (
    <ConfirmDeleteButton
      itemName="deze betaling"
      description="De betaling wordt verwijderd. De wijziging blijft zichtbaar in de mutaties."
      onConfirm={async () =>
        handleResult(await deleteDonationPayment({ paymentId }), "Betaling verwijderd.")
      }
    />
  );
}

export function ExpectationButton({
  studentId,
  academicYearId,
  category,
  expectedAmount,
  note,
  defaultAmount,
}: {
  studentId: string;
  academicYearId: string;
  category: "FULL" | "REDUCED" | "EXEMPT";
  expectedAmount: number;
  note: string | null;
  defaultAmount: number;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);
  const handleResult = useActionFeedback();

  const form = useForm({
    initialValues: {
      category,
      amount: category === "REDUCED" ? expectedAmount : defaultAmount,
      note: note ?? "",
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    const result = await setStudentDonation({
      studentId,
      academicYearId,
      category: values.category,
      expectedAmount:
        values.category === "REDUCED" ? Number(values.amount) : undefined,
      note: values.note.trim(),
    });
    setLoading(false);
    if (handleResult(result, "Verwachting opgeslagen.")) close();
  });

  return (
    <>
      <Button
        size="xs"
        variant="light"
        leftSection={<IconPencil size={16} />}
        onClick={open}
      >
        Verwachting
      </Button>
      <Modal opened={opened} onClose={close} title="Verwachting instellen">
        <form onSubmit={handleSubmit}>
          <Stack>
            <Radio.Group
              label="Type bijdrage"
              {...form.getInputProps("category")}
            >
              <Stack gap="xs" mt="xs">
                <Radio value="FULL" label="Verschuldigd" />
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

            <Textarea
              label="Opmerking"
              autosize
              minRows={2}
              maxLength={500}
              {...form.getInputProps("note")}
            />

            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                Annuleren
              </Button>
              <Button type="submit" loading={loading}>
                Opslaan
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
