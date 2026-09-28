"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppShell,
  Badge,
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
import { ColorSchemeToggle } from "./color-scheme-toggle";

type ShellUser = {
  name: string;
  email: string;
  role: string;
};

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
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg">
              Moskee
            </Text>
          </Group>
          <Group gap="sm">
            <ColorSchemeToggle />
            <Menu shadow="md" width={220} position="bottom-end">
              <Menu.Target>
                <Button variant="subtle" color="gray">
                  {user.name}
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
        <Stack gap="xs">
          <Badge color={isManager ? "indigo" : "gray"} variant="light">
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
