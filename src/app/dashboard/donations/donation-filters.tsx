"use client";

import { useRouter } from "next/navigation";
import { Paper, SegmentedControl, Select } from "@mantine/core";

export type DonationFilterOption = { value: string; label: string };

const STATUS_OPTIONS = [
  { value: "", label: "Alle" },
  { value: "PAID", label: "Betaald" },
  { value: "PARTIAL", label: "Deels" },
  { value: "UNPAID", label: "Onbetaald" },
  { value: "EXEMPT", label: "Vrijgesteld" },
];

export function DonationFilters({
  basePath,
  years,
  yearId,
  status,
}: {
  basePath: string;
  years: DonationFilterOption[];
  yearId: string;
  status: string;
}) {
  const router = useRouter();

  function navigate(next: { year?: string; status?: string }) {
    const params = new URLSearchParams();
    params.set("year", next.year ?? yearId);
    const nextStatus = next.status ?? status;
    if (nextStatus) params.set("status", nextStatus);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <Paper withBorder p="md">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <Select
          label="Schooljaar"
          data={years}
          value={yearId}
          onChange={(value) => {
            if (value) navigate({ year: value });
          }}
          allowDeselect={false}
          style={{ minWidth: 180 }}
        />
        <SegmentedControl
          data={STATUS_OPTIONS}
          value={status}
          onChange={(value) => navigate({ status: value })}
        />
      </div>
    </Paper>
  );
}
