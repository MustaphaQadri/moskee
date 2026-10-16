"use client";

import { useEffect } from "react";
import { ColorSchemeScript } from "@mantine/core";

// The inline script rendered by <ColorSchemeScript /> must run at parse time
// to apply the color scheme before the first paint. React 19.2 logs a
// console error whenever such a script tag is created during a client render
// (e.g. when the root layout subtree remounts), so only render it for SSR and
// the initial hydration pass. Later client remounts skip the script: the
// scheme is already applied, and MantineProvider keeps it in sync.
let hasHydrated = false;

export function ColorSchemeScriptOnce() {
  useEffect(() => {
    hasHydrated = true;
  }, []);

  if (hasHydrated) {
    return null;
  }

  return <ColorSchemeScript defaultColorScheme="auto" />;
}
