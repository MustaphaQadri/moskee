"use client";

import {
  ActionIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const isLight = computed === "light";

  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label={isLight ? "Donkere modus" : "Lichte modus"}
      title={isLight ? "Donkere modus" : "Lichte modus"}
      onClick={() => setColorScheme(isLight ? "dark" : "light")}
    >
      {isLight ? <IconMoon size={18} /> : <IconSun size={18} />}
    </ActionIcon>
  );
}
