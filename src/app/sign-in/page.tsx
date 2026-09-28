import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/dal";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const redirectTo =
    typeof params.redirect === "string" ? params.redirect : "/dashboard";

  return <SignInForm redirectTo={redirectTo} />;
}
