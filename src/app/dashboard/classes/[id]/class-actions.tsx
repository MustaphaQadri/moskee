"use client";

import { useRouter } from "next/navigation";

import { deleteClass } from "@/app/actions/classes";
import { ConfirmDeleteButton } from "@/app/dashboard/manage/confirm-delete";
import { useActionFeedback } from "@/app/dashboard/manage/use-action-feedback";

export function DeleteClassButton({
  classId,
  name,
}: {
  classId: string;
  name: string;
}) {
  const router = useRouter();
  const handleResult = useActionFeedback();

  return (
    <ConfirmDeleteButton
      itemName={name}
      description="Alle inschrijvingen van deze klas worden verwijderd. Dit kan niet ongedaan worden gemaakt."
      onConfirm={async () => {
        const ok = handleResult(
          await deleteClass({ id: classId }),
          "Klas verwijderd.",
        );
        if (ok) router.push("/dashboard/classes");
        return ok;
      }}
    />
  );
}
