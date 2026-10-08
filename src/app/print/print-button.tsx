"use client";

import { Button } from "@mantine/core";
import { IconPrinter } from "@tabler/icons-react";

export function PrintButton() {
  return (
    <Button
      leftSection={<IconPrinter size={16} />}
      onClick={() => window.print()}
    >
      Afdrukken / opslaan als PDF
    </Button>
  );
}
