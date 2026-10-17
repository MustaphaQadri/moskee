import type { ReactNode } from "react";
import { Box, Container, Stack } from "@mantine/core";

import { BrandLogo } from "@/components/brand-logo";

// Public, self-registration pages: no dashboard shell, no session required.
export default function RegisterLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      mih="100vh"
      py={{ base: "xl", sm: 56 }}
      px="md"
      style={{ background: "var(--mantine-color-body)" }}
    >
      <Container size={760}>
        <Stack gap="xl">
          <BrandLogo height={56} />
          {children}
        </Stack>
      </Container>
    </Box>
  );
}
