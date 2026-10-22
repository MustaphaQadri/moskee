// Search target for the Inschrijvingen overview. `chart` and `education`
// restrict the search to the linked guardian's number only.
export type PersonSearchBy = "all" | "chart" | "education";

export const PERSON_SEARCH_OPTIONS = [
  { value: "all", label: "Alles" },
  { value: "chart", label: "Chartnummer" },
  { value: "education", label: "Onderwijsnummer" },
] as const satisfies readonly { value: PersonSearchBy; label: string }[];

export function isPersonSearchBy(value: unknown): value is PersonSearchBy {
  return (
    value === "all" || value === "chart" || value === "education"
  );
}
