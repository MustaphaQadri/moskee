import { Paper, Stack, Text, Title } from "@mantine/core";

export const metadata = {
  title: "Inschrijving ontvangen",
  robots: { index: false, follow: false },
};

export default function RegisterDonePage() {
  return (
    <Paper withBorder p="xl" maw={560}>
      <Stack gap="sm">
        <Title order={2}>Gegevens ontvangen</Title>
        <Text>Bedankt! De gegevens zijn naar de moskee verstuurd.</Text>
        <Text size="sm" c="dimmed">
          Neem contact op met de moskee als je nog iets wilt wijzigen.
        </Text>
      </Stack>
    </Paper>
  );
}
