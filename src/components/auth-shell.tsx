import type { ReactNode } from "react";
import Image from "next/image";
import { Text, Title } from "@mantine/core";

import { BrandLogo } from "./brand-logo";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <Image
          src="/moskee-front.jpg"
          alt=""
          fill
          sizes="50vw"
          priority
          className="auth-aside-photo"
        />
        <div className="auth-aside-overlay" />
        <div className="auth-aside-pattern" />

        <div className="auth-aside-content">
          <BrandLogo height={68} inverted priority />

          <div>
            <Title
              order={1}
              style={{ color: "#fff", fontWeight: 600, maxWidth: 460 }}
            >
              Een huis van Allah voor de{" "}
              <span
                style={{ color: "var(--mosque-gold)", fontStyle: "italic" }}
              >
                hele gemeenschap
              </span>
            </Title>
            <Text
              mt="md"
              size="lg"
              fw={300}
              style={{ color: "rgba(255,255,255,0.8)", maxWidth: 440 }}
            >
              Beheer van klassen, leerlingen, inschrijvingen en resultaten — op
              één plek.
            </Text>
          </div>

          <Text
            size="xs"
            style={{
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Moskee Sayidina Ibrahim · Kanaleneiland, Utrecht
          </Text>
        </div>
      </aside>

      <main className="auth-main">{children}</main>
    </div>
  );
}
