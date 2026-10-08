"use client";

import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";

import { deleteExam } from "@/app/actions/grades";
import { ConfirmDeleteButton } from "@/app/dashboard/manage/confirm-delete";

export function DeleteExamButton({
  examId,
  title,
  redirectTo,
}: {
  examId: string;
  title: string;
  redirectTo?: string;
}) {
  const router = useRouter();

  return (
    <ConfirmDeleteButton
      itemName={title}
      description="De cijfers van deze toets worden ook verwijderd."
      onConfirm={async () => {
        try {
          await deleteExam({ examId });
          notifications.show({
            title: "Verwijderd",
            message: "De toets is verwijderd.",
            color: "green",
          });
          if (redirectTo) {
            router.push(redirectTo);
          } else {
            router.refresh();
          }
          return true;
        } catch {
          notifications.show({
            title: "Verwijderen mislukt",
            message: "Probeer het opnieuw.",
            color: "red",
          });
          return false;
        }
      }}
    />
  );
}
