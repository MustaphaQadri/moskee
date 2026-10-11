"use client";

import {
  ActionIcon,
  type ActionIconProps,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

export function ColorSchemeToggle({
  variant = "default",
}: {
  variant?: ActionIconProps["variant"];
} = {}) {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const isLight = computed === "light";

  return (
    <ActionIcon
      variant={variant}
      size="lg"
      aria-label={isLight ? "Donkere modus" : "Lichte modus"}
      title={isLight ? "Donkere modus" : "Lichte modus"}
      onClick={() => setColorScheme(isLight ? "dark" : "light")}
    >
      {isLight ? <IconMoon size={18} /> : <IconSun size={18} />}
    </ActionIcon>
  );
}
