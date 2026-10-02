// Client-safe option lists shared by the guardian/student forms.

export const SEX_OPTIONS = [
  { value: "MALE", label: "Jongen" },
  { value: "FEMALE", label: "Meisje" },
] as const;

export const RELATION_OPTIONS = [
  "Moeder",
  "Vader",
  "Voogd",
  "Stiefouder",
  "Oma",
  "Opa",
  "Tante",
  "Oom",
  "Anders",
] as const;

export const SEX_LABELS: Record<string, string> = {
  MALE: "Jongen",
  FEMALE: "Meisje",
};
