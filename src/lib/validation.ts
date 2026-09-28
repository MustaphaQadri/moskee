import { z } from "zod";

// Shared Zod helpers for Server Action inputs coming from Mantine form controls,
// which emit an empty string for cleared numeric/date/time fields.

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

export const optionalInt = (min?: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z
      .number()
      .int()
      .nullable()
      .refine(
        (value) => value === null || min === undefined || value >= min,
        { message: min !== undefined ? `Minimaal ${min}` : "Ongeldige waarde" },
      ),
  );

export const requiredInt = (min = 1) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.number({ error: "Verplicht veld" }).int().min(min, `Minimaal ${min}`),
  );

export const optionalDate = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Gebruik het formaat jjjj-mm-dd")
    .nullable(),
);

export const optionalTime = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, "Gebruik het formaat uu:mm")
    .nullable(),
);
