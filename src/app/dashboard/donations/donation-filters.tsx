"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Paper,
  SegmentedControl,
  Select,
  TextInput,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

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
  search,
}: {
  basePath: string;
  years: DonationFilterOption[];
  yearId: string;
  status: string;
  search: string;
}) {
  const router = useRouter();

  function navigate(next: { year?: string; status?: string; q?: string }) {
    const params = new URLSearchParams();
    params.set("year", next.year ?? yearId);
    const nextStatus = next.status ?? status;
    if (nextStatus) params.set("status", nextStatus);
    const nextSearch = (next.q ?? search).trim();
    if (nextSearch) params.set("q", nextSearch);
    router.push(`${basePath}?${params.toString()}`);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    navigate({ q: typeof value === "string" ? value : "" });
  }

  const clearParams = new URLSearchParams();
  clearParams.set("year", yearId);
  if (status) clearParams.set("status", status);

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
        <form
          onSubmit={handleSearch}
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            flex: "1 1 280px",
          }}
        >
          <TextInput
            name="q"
            label="Zoeken"
            placeholder="Naam, chart- of onderwijsnummer"
            defaultValue={search}
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1 }}
          />
          <Button type="submit" variant="light">
            Zoeken
          </Button>
          {search && (
            <Button
              component="a"
              href={`${basePath}?${clearParams.toString()}`}
              variant="subtle"
              color="gray"
            >
              Wissen
            </Button>
          )}
        </form>

        <div
          style={{
            display: "flex",
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
      </div>
    </Paper>
  );
}
