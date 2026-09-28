import { Stack, Title } from "@mantine/core";

import { requireRole } from "@/lib/dal";
import { SubscriptionForm } from "../subscription-form";

export default async function NewGuardianPage() {
  await requireRole("manager");

  return (
    <Stack gap="md">
      <Title order={2}>Nieuwe inschrijving</Title>
      <SubscriptionForm />
    </Stack>
  );
}
