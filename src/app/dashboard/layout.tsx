import { requireActiveSession } from "@/lib/dal";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const session = await requireActiveSession();

  return (
    <DashboardShell
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role ?? "teacher",
      }}
    >
      {children}
    </DashboardShell>
  );
}
