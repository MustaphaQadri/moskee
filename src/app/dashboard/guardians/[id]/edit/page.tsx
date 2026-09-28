import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { requireRole } from "@/lib/dal";
import { getGuardianDetail } from "@/lib/guardians";
import { EditGuardianForm } from "../../edit-guardian-form";

export default async function EditGuardianPage({
  params,
}: PageProps<"/dashboard/guardians/[id]/edit">) {
  await requireRole("manager");

  const { id } = await params;
  const guardian = await getGuardianDetail(id);
  if (!guardian) {
    notFound();
  }

  return (
    <Stack gap="md">
      <Title order={2}>Ouder/verzorger bewerken</Title>
      <EditGuardianForm guardian={guardian} />
    </Stack>
  );
}
