"use client";

import { useRouter } from "next/navigation";
import { Group, Paper, Select } from "@mantine/core";

export type FilterOption = { value: string; label: string };

// Period / academic-year (and optional subject) selectors shared by the grades
// and report pages. Navigation is URL-driven, like the attendance sheet. The
// period selector is omitted for year-level screens.
export function GradesFilters({
  basePath,
  years,
  periods,
  subjects,
  yearId,
  termId,
  subjectId,
}: {
  basePath: string;
  years: FilterOption[];
  periods?: FilterOption[];
  subjects?: FilterOption[];
  yearId: string;
  termId?: string;
  subjectId?: string;
}) {
  const router = useRouter();

  function navigate(next: {
    year?: string;
    term?: string;
    subject?: string;
  }) {
    const params = new URLSearchParams();
    params.set("year", next.year ?? yearId);
    if (periods) {
      params.set("term", next.term ?? termId ?? "");
    }
    if (subjects) {
      const value = next.subject ?? subjectId ?? "";
      if (value) params.set("subject", value);
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <Paper withBorder p="md">
      <Group align="flex-end" gap="md" wrap="wrap">
        <Select
          label="Schooljaar"
          data={years}
          value={yearId}
          onChange={(value) => {
            if (value) navigate({ year: value, term: "" });
          }}
          allowDeselect={false}
          style={{ minWidth: 180 }}
        />
        {periods && (
          <Select
            label="Periode"
            data={periods}
            value={termId ?? ""}
            onChange={(value) => {
              if (value) navigate({ term: value });
            }}
            allowDeselect={false}
            style={{ minWidth: 200 }}
          />
        )}
        {subjects && (
          <Select
            label="Vak"
            data={[{ value: "", label: "Alle vakken" }, ...subjects]}
            value={subjectId ?? ""}
            onChange={(value) => navigate({ subject: value ?? "" })}
            style={{ minWidth: 220 }}
          />
        )}
      </Group>
    </Paper>
  );
}
