"use client";

import {
  ActionIcon,
  type ActionIconProps,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useMounted } from "@mantine/hooks";
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
  const mounted = useMounted();

  // The persisted scheme is only known in the browser. Keep the first render
  // identical to the server output, then switch the icon after mounting.
  const isLight = !mounted || computed === "light";

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
