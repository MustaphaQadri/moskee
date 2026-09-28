"use client";

import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";

import type { ActionResult } from "@/lib/action-result";

// Shared helper for Client Components calling Server Actions that return a
// result object: shows a success/error notification and refreshes RSC data.
export function useActionFeedback() {
  const router = useRouter();

  return function handleResult<T>(
    result: ActionResult<T>,
    successMessage: string,
  ): boolean {
    if (!result.ok) {
      notifications.show({
        title: "Actie mislukt",
        message: result.error,
        color: "red",
      });
      return false;
    }

    notifications.show({
      title: "Gelukt",
      message: successMessage,
      color: "green",
    });
    router.refresh();
    return true;
  };
}
