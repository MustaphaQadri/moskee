import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { MantineProvider, mantineHtmlProps } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";

import { ColorSchemeScriptOnce } from "@/components/color-scheme-script";
import { theme } from "@/theme";

const heading = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
});

const body = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Moskee Sayidina Ibrahim",
    template: "%s | Moskee Sayidina Ibrahim",
  },
  description:
    "Beheeromgeving van Moskee Sayidina Ibrahim — Islamitische Vereniging Kanaleneiland.",
  icons: {
    icon: "/icon-ivk.png",
    apple: "/icon-ivk.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${heading.variable} ${body.variable}`}
      {...mantineHtmlProps}
    >
      <head>
        <ColorSchemeScriptOnce />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <Notifications />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
