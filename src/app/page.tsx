import { Box, Button, Group, Stack, Text, Title } from "@mantine/core";

import { BrandLogo } from "@/components/brand-logo";

export default function Home() {
  return (
    <Box className="home-hero">
      <Stack
        align="center"
        gap="lg"
        maw={720}
        style={{ textAlign: "center" }}
      >
        <BrandLogo height={120} inverted priority />

        <Text
          style={{
            color: "var(--mosque-gold)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            fontSize: "0.72rem",
            fontWeight: 600,
          }}
        >
          Islamitische Vereniging Kanaleneiland
        </Text>

        <Title order={1} style={{ color: "#fff", fontSize: "clamp(2.4rem, 6vw, 3.8rem)" }}>
          Moskee Sayidina Ibrahim
        </Title>

        <Text
          size="lg"
          fw={300}
          style={{ color: "rgba(255,255,255,0.8)", maxWidth: 520 }}
        >
          Beheeromgeving voor klassen, leerlingen, inschrijvingen en resultaten —
          een huis van Allah voor de hele gemeenschap.
        </Text>

        <Group mt="md">
          <Button
            component="a"
            href="/sign-in"
            color="gold"
            size="md"
            radius="sm"
          >
            Inloggen
          </Button>
          <Button
            component="a"
            href="/dashboard"
            variant="outline"
            size="md"
            radius="sm"
            style={{ color: "#fff", borderColor: "rgba(255,255,255,0.5)" }}
          >
            Naar dashboard
          </Button>
        </Group>
      </Stack>
    </Box>
  );
}
