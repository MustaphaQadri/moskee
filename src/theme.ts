import { createTheme, type MantineColorsTuple } from "@mantine/core";

const brand: MantineColorsTuple = [
  "#e8f5ee",
  "#d2ebdd",
  "#b8dfc9",
  "#8dcda8",
  "#5cb882",
  "#2d8a52",
  "#1a6b3c",
  "#145630",
  "#0f4626",
  "#0a321b",
];

const gold: MantineColorsTuple = [
  "#faf5e8",
  "#f3e8c8",
  "#e8d59a",
  "#dcc26e",
  "#d4b060",
  "#c9a84c",
  "#b8933a",
  "#8b6914",
  "#6b5010",
  "#4a370b",
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 4 },
  colors: { brand, gold },
  autoContrast: true,
  fontFamily: "var(--font-body), system-ui, sans-serif",
  headings: {
    fontFamily: "var(--font-heading), Georgia, serif",
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "2.6rem", lineHeight: "1.15" },
      h2: { fontSize: "2rem", lineHeight: "1.2" },
      h3: { fontSize: "1.6rem", lineHeight: "1.3" },
      h4: { fontSize: "1.3rem", lineHeight: "1.35" },
    },
  },
  defaultRadius: "md",
  components: {
    Button: {
      defaultProps: { fw: 500 },
    },
    Card: {
      defaultProps: { radius: "lg" },
    },
    Paper: {
      defaultProps: { radius: "lg" },
    },
    NavLink: {
      defaultProps: { radius: "md" },
    },
  },
});
