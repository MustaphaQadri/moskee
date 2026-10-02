import { redirect } from "next/navigation";

import { getSession } from "@/lib/dal";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <ChangePasswordForm
      forced={Boolean(session.user.mustChangePassword)}
      email={session.user.email}
    />
  );
}
