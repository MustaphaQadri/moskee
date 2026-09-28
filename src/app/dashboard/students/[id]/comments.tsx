"use client";

import { useState } from "react";
import { Button, Group, Stack, Text, Textarea } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import {
  addStudentComment,
  deleteStudentComment,
} from "@/app/actions/comments";
import { ConfirmDeleteButton } from "@/app/dashboard/manage/confirm-delete";
import { useActionFeedback } from "@/app/dashboard/manage/use-action-feedback";

export type StudentComment = {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string;
  createdAt: string; // ISO
};

// UTC-stable formatting so server and client render the same string.
function formatDateTime(iso: string): string {
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 16);
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year} ${time}`;
}

export function CommentsSection({
  studentId,
  comments,
  isManager,
}: {
  studentId: string;
  comments: StudentComment[];
  isManager: boolean;
}) {
  const handleResult = useActionFeedback();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!body.trim()) return;
    setLoading(true);
    const result = await addStudentComment({ studentId, body });
    setLoading(false);
    if (handleResult(result, "Commentaar toegevoegd.")) {
      setBody("");
    }
  }

  return (
    <Stack>
      <Textarea
        label="Nieuw commentaar"
        placeholder="Schrijf een opmerking over deze leerling..."
        autosize
        minRows={2}
        maxLength={2000}
        value={body}
        onChange={(event) => setBody(event.currentTarget.value)}
      />
      <Group justify="flex-end">
        <Button
          leftSection={<IconPlus size={16} />}
          loading={loading}
          disabled={!body.trim()}
          onClick={submit}
        >
          Commentaar toevoegen
        </Button>
      </Group>

      {comments.length === 0 ? (
        <Text c="dimmed">Nog geen commentaar.</Text>
      ) : (
        <Stack gap="sm">
          {comments.map((comment) => (
            <div key={comment.id}>
              <Group justify="space-between" align="flex-start">
                <Text size="sm" fw={500}>
                  {comment.authorName}
                  <Text span c="dimmed" fw={400}>
                    {" · "}
                    {formatDateTime(comment.createdAt)}
                  </Text>
                </Text>
                {isManager && (
                  <ConfirmDeleteButton
                    itemName="dit commentaar"
                    onConfirm={async () =>
                      handleResult(
                        await deleteStudentComment({ id: comment.id }),
                        "Commentaar verwijderd.",
                      )
                    }
                  />
                )}
              </Group>
              <Text style={{ whiteSpace: "pre-wrap" }}>{comment.body}</Text>
            </div>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
