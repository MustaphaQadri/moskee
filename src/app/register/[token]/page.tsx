import { Stack, Text, Title } from "@mantine/core";

import { resolveRegistrationToken } from "@/lib/registration";
import { RegistrationForm } from "./registration-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inschrijving",
  robots: { index: false, follow: false },
};

const MESSAGES = {
  expired: {
    title: "Deze link is verlopen",
    text: "Vraag de moskee om een nieuwe registratielink.",
  },
  used: {
    title: "Deze link is al gebruikt",
    text: "De gegevens zijn al ontvangen. Neem contact op met de moskee als je iets wilt wijzigen.",
  },
  unknown: {
    title: "Ongeldige link",
    text: "Deze registratielink bestaat niet (meer). Vraag de moskee om een nieuwe link.",
  },
} as const;

export default async function RegisterPage({
  params,
}: PageProps<"/register/[token]">) {
  const { token } = await params;
  const resolved = await resolveRegistrationToken(token);

  if (resolved.status !== "valid") {
    const message = MESSAGES[resolved.status];
    return (
      <Stack gap="xs" maw={520}>
        <Title order={2}>{message.title}</Title>
        <Text c="dimmed">{message.text}</Text>
      </Stack>
    );
  }

  return (
    <RegistrationForm
      token={token}
      guardian={resolved.guardian}
      expiresAt={resolved.expiresAt}
    />
  );
}
