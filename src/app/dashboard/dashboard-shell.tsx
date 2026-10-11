"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Button,
  Group,
  Menu,
  NavLink,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconHome,
  IconLogout,
  IconSchool,
  IconSettings,
  IconUserCog,
  IconUsers,
} from "@tabler/icons-react";

import { authClient } from "@/lib/auth-client";
import { BrandLogo } from "@/components/brand-logo";
import { ColorSchemeToggle } from "./color-scheme-toggle";

type ShellUser = {
  name: string;
  email: string;
  role: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function DashboardShell({
  user,
  children,
}: {
  user: ShellUser;
  children: ReactNode;
}) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();
  const router = useRouter();

  const isManager = user.role === "manager";

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 264,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header className="mosque-header">
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              color="#ffffff"
            />
            <Box hiddenFrom="sm">
              <BrandLogo height={40} inverted />
            </Box>
            <Group gap="sm" wrap="nowrap" visibleFrom="sm">
              <BrandLogo height={38} inverted />
              <div>
                <Text
                  c="#ffffff"
                  fw={600}
                  size="lg"
                  lh={1.1}
                  ff="var(--font-heading)"
                >
                  Moskee Sayidina Ibrahim
                </Text>
                <Text c="rgba(255,255,255,0.7)" size="xs">
                  Islamitische Vereniging Kanaleneiland
                </Text>
              </div>
            </Group>
          </Group>

          <Group gap="sm" wrap="nowrap">
            <ColorSchemeToggle variant="white" />
            <Menu shadow="md" width={230} position="bottom-end">
              <Menu.Target>
                <Button
                  variant="subtle"
                  color="gray"
                  style={{ color: "#ffffff" }}
                  leftSection={
                    <Avatar size={26} radius="xl" color="gold" autoContrast>
                      {initials(user.name)}
                    </Avatar>
                  }
                >
                  <Text component="span" visibleFrom="sm">
                    {user.name}
                  </Text>
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user.email}</Menu.Label>
                <Menu.Item
                  leftSection={<IconLogout size={16} />}
                  onClick={handleSignOut}
                >
                  Uitloggen
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="xs" h="100%">
          <Badge
            color={isManager ? "brand" : "gray"}
            variant="light"
            size="lg"
            mb={4}
          >
            {isManager ? "Beheerder" : "Docent"}
          </Badge>
          <NavLink
            component={Link}
            href="/dashboard"
            label="Dashboard"
            leftSection={<IconHome size={18} />}
            active={pathname === "/dashboard"}
            onClick={close}
          />
          <NavLink
            component={Link}
            href="/dashboard/classes"
            label="Klassen"
            leftSection={<IconSchool size={18} />}
            active={
              pathname.startsWith("/dashboard/classes") ||
              pathname.startsWith("/dashboard/students")
            }
            onClick={close}
          />
          {isManager && (
            <>
              <NavLink
                component={Link}
                href="/dashboard/guardians"
                label="Inschrijvingen"
                leftSection={<IconUsers size={18} />}
                active={pathname.startsWith("/dashboard/guardians")}
                onClick={close}
              />
              <NavLink
                component={Link}
                href="/dashboard/staff"
                label="Personeel"
                leftSection={<IconUserCog size={18} />}
                active={pathname.startsWith("/dashboard/staff")}
                onClick={close}
              />
              <NavLink
                component={Link}
                href="/dashboard/manage"
                label="Beheer"
                leftSection={<IconSettings size={18} />}
                active={pathname.startsWith("/dashboard/manage")}
                onClick={close}
              />
            </>
          )}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
