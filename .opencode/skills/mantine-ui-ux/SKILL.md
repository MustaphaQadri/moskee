---
name: mantine-ui-ux
description: Use when building UI with Mantine 9 in this Next.js 16 app — forms, tables, modals, notifications, layout, theming, or any @mantine/* component. Covers version-specific setup (PostCSS, styles imports, ColorSchemeScript/mantineHtmlProps), server vs client component rules, compound components, form patterns, and UX conventions for dashboards and data entry.
---

# Mantine 9 — UI & UX conventions

Mantine 9 is a client-component library. Follow these rules to avoid
hydration/server-component pitfalls and keep the UI consistent.

## Version-specific setup (already configured)

- `postcss.config.cjs` exists with `postcss-preset-mantine` + `postcss-simple-vars`.
- `@mantine/core/styles.css` is imported once in `src/app/layout.tsx`.
- `@mantine/notifications/styles.css` is imported too. Every other `@mantine/*`
  package (`dates`, `modals`, `dropzone`, …) needs its own `styles.css` import.
- Root layout spreads `{...mantineHtmlProps}` on `<html>` and renders
  `<ColorSchemeScript defaultColorScheme="auto" />` in `<head>`.
- `next.config.ts` enables `optimizePackageImports: ["@mantine/core", "@mantine/hooks"]`.

## Server vs client components

- All `@mantine/*` entry points already carry `"use client"`. A page/component
  that ONLY renders Mantine components does **not** need its own `"use client"`.
- Add `"use client"` only when you use hooks (`useState`, `useForm`, effects) or
  event handlers.
- Client components can't import `src/lib/dal.ts` (server-only). Pass user/data
  as props from a server parent.

## Compound components

`<Popover.Target>`, `<Menu.Target>`, `<Tabs.List>`, etc. cannot render in server
components. Use the flat names (`PopoverTarget`, `PopoverDropdown`, `MenuTarget`)
or add `"use client"` to the file.

## Theming

```tsx
"use client";
import { createTheme, MantineProvider } from "@mantine/core";

const theme = createTheme({
  primaryColor: "indigo",
  defaultRadius: "md",
  fontFamily: "var(--font-sans)",
});
```

Wrap with `<MantineProvider theme={theme}>`. Override components via
`theme.components`, and colors via `theme.colors` / `primaryColor`.

## Layout primitives

Prefer Mantine layout components over hand-rolled CSS:

- `Stack` / `Group` for flex column/row with `gap`.
- `SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}` for responsive card grids.
- `Grid` + `Grid.Col span={{ base: 12, md: 6 }}` for two-column forms.
- `AppShell` for the dashboard shell (header/navbar/main).
- `Container size="md"` to constrain page width.

## Forms (`@mantine/form`)

```tsx
"use client";
import { useForm } from "@mantine/form";
import { TextInput, Button, Group } from "@mantine/core";

const form = useForm({
  initialValues: { name: "" },
  validate: {
    name: (v) => (v.trim().length < 2 ? "Name is too short" : null),
  },
});

<form onSubmit={form.onSubmit(async (values) => { /* server action */ })}>
  <TextInput label="Name" {...form.getInputProps("name")} />
</form>
```

- Use `form.getInputProps("field")` to wire validation + error display.
- Server-side validation is mandatory too — client validation is UX only.
- `TextInput`, `NumberInput`, `Select`, `MultiSelect`, `DateInput` (from
  `@mantine/dates`) for school data (dates of birth, class names).

## Data display

- `Table` with `striped highlightOnHover` for lists (classes, children, guardians).
- `Badge` for status (e.g. enrollment status, role).
- `Paper` + `Card` for grouped info.
- `EmptyState` for empty lists; `Skeleton` for loading placeholders.

## Feedback

- `@mantine/notifications` `<Notifications />` is mounted in the root layout.
  Call `notifications.show({ title, message, color })` for success/error.
- `Modal` / `Drawer` for create/edit forms.

## UX principles

- Destructive actions get `color="red"` and a confirm step (`Modal` or
  `ConfirmButton`-style pattern).
- Every form field has a `label` and every button an accessible `aria-label`
  when icon-only.
- Use `LoadingOverlay` or `Button loading` state during async mutations.

## Import pattern

```tsx
import { Button, Group, Stack, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react"; // installed
```
