import { Anchor, Button, Container, Group, Stack, Text, Title } from "@mantine/core";

export default function Home() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={1}>Moskee</Title>
        <Text c="dimmed">
          School management platform — classes, children, and guardian registration.
        </Text>
        <Group>
          <Button component="a" href="/sign-in">
            Sign in
          </Button>
          <Anchor href="/dashboard">Go to dashboard</Anchor>
        </Group>
      </Stack>
    </Container>
  );
}
