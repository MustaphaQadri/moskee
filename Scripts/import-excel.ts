// One-off Excel → Moskee migration.
//
// Replaces the migrated entities on every run (students, guardians, links,
// enrollments, donations and payments). Non-migrated tables (users, lookups,
// settings) are left alone. Existing classes are reused; missing ones are
// created. The student sheet's "Klassen" column is used to enroll students: an
// existing class is matched case-insensitively, or a new class is created with
// the first available level/timeslot.
//
// Supports both the old workbook (`Data_Voogd`, `ContributieDB`) and the new
// one (`Data_ouders`, no contribution sheet).
//
// Usage:
//   pnpm db:import --file "Ouders en leerlingen (imported).xlsx" --dry-run
//   pnpm db:import --file "Ouders en leerlingen (imported).xlsx" --yes
//
// Run with tsx (see package.json). The file is read from disk; it is not
// committed to git.

import "dotenv/config";
import ExcelJS from "exceljs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { DonationCategory } from "../src/generated/prisma/enums";

const STANDARD_AMOUNT = 115;
const RELATION = "Vader";
const CURRENT_YEAR = "2026 - 2027";
const YEAR_NAMES = ["2025 - 2026", "2026 - 2027"] as const;
const PLACEHOLDER_DATE = new Date(Date.UTC(1900, 0, 1));
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mrt: 2,
  maa: 2,
  apr: 3,
  mei: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  okt: 9,
  oct: 9,
  nov: 10,
  dec: 11,
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const filePath =
  argValue("--file") ?? "Ouders en leerlingen (imported).xlsx";
const dryRun = process.argv.includes("--dry-run");
const confirmed = process.argv.includes("--yes");

if (!dryRun && !confirmed) {
  console.error(
    "Weigerachtig: dit script vervangt alle leerlingen, ouders en donaties.\n" +
      'Voeg --yes toe om te bevestigen, of gebruik --dry-run om alleen te controleren.',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------

type CellValue = ExcelJS.CellValue;

function text(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const record = value as unknown as Record<string, unknown>;
    if (Array.isArray(record.richText)) {
      return (record.richText as Array<{ text?: string }>)
        .map((part) => part.text ?? "")
        .join("");
    }
    if (typeof record.text === "string") return record.text;
    if (record.result !== undefined) return text(record.result as CellValue);
    if (record.error !== undefined) return "";
  }
  return String(value);
}

function clean(value: CellValue): string {
  return text(value).trim().replace(/\s+/g, " ");
}

function normalizeHeader(value: CellValue): string {
  return clean(value).toLowerCase();
}

function toNumber(value: CellValue): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const raw = text(value).trim().replace(/[€\s]/g, "").replace(",", ".");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function utcDate(year: number, month: number, day: number): Date | null {
  const value = new Date(Date.UTC(year, month, day));
  return Number.isNaN(value.getTime()) ? null : value;
}

function toDate(value: CellValue): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return utcDate(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const raw = clean(value);
  if (!raw) return null;

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial > 0 && serial < 80000) {
      const date = new Date(EXCEL_EPOCH_MS + Math.floor(serial) * 86_400_000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  let match = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    return utcDate(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  match = raw.match(/^(\d{1,2})[-\s]([A-Za-z]{3,4})[-\s](\d{4})$/);
  if (match) {
    const month = MONTHS[match[2].toLowerCase()];
    if (month !== undefined) {
      return utcDate(Number(match[3]), month, Number(match[1]));
    }
  }

  match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    return utcDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  return null;
}

function normalizeSex(value: string): "MALE" | "FEMALE" | null {
  const raw = value.trim().toLowerCase();
  if (["man", "m", "jongen", "male", "j"].includes(raw)) return "MALE";
  if (["vrouw", "v", "meisje", "female"].includes(raw)) return "FEMALE";
  return null;
}

// Mobile numbers in the old system often miss the leading zero.
function normalizePhone(value: string): string {
  const phone = value.trim();
  if (!phone) return "";
  return /^6/.test(phone) ? `0${phone}` : phone;
}

// ---------------------------------------------------------------------------
// Sheet access
// ---------------------------------------------------------------------------

type Sheet = {
  name: string;
  headers: Map<string, number>;
  rows: ExcelJS.Row[];
};

function readSheet(workbook: ExcelJS.Workbook, name: string): Sheet {
  const worksheet = workbook.getWorksheet(name);
  if (!worksheet) {
    throw new Error(`Sheet "${name}" niet gevonden in het Excel-bestand`);
  }

  const headers = new Map<string, number>();
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
    const key = normalizeHeader(cell.value);
    if (key && !headers.has(key)) headers.set(key, column);
  });

  const rows: ExcelJS.Row[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) rows.push(row);
  });

  return { name, headers, rows };
}

function get(sheet: Sheet, row: ExcelJS.Row, header: string): CellValue {
  const column = sheet.headers.get(normalizeHeader(header));
  return column ? row.getCell(column).value : null;
}

function getText(sheet: Sheet, row: ExcelJS.Row, header: string): string {
  return clean(get(sheet, row, header));
}

// ---------------------------------------------------------------------------
// Parsed records
// ---------------------------------------------------------------------------

type GuardianInput = {
  rowNumber: number;
  legacyId: string;
  chart: string;
  education: string;
  firstName: string;
  lastName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  enrolledAt: Date | null;
};

type StudentInput = {
  rowNumber: number;
  legacyId: string;
  chart: string;
  guardianEducation: string;
  className: string;
  levelName: string;
  firstName: string;
  lastName: string;
  sex: "MALE" | "FEMALE" | null;
  dateOfBirth: Date;
  dateOfBirthIsPlaceholder: boolean;
  enrolledAt: Date | null;
  stoppedOn: Date | null;
  status: "ACTIVE" | "ARCHIVED";
  currentYear: boolean;
  currentStatus: string;
  currentPaid: number | null;
  currentRest: number | null;
  currentPaidAt: Date | null;
};

type DonationInput = {
  legacyId: string;
  year: string;
  status: string;
  paid: number | null;
  rest: number | null;
  paidAt: Date | null;
  source: string;
};

type DonationComputed = {
  legacyId: string;
  year: string;
  expected: number;
  category: DonationCategory;
  note: string;
  payment: { amount: number; paidAt: Date } | null;
};

type Warnings = {
  skippedStudents: string[];
  placeholderBirthDates: string[];
  missingGuardians: string[];
  unknownDonationStudents: string[];
  skippedDonationRows: string[];
  duplicateDonationRows: string[];
  duplicateCharts: string[];
  duplicateStudents: string[];
  notes: string[];
};

function emptyWarnings(): Warnings {
  return {
    skippedStudents: [],
    placeholderBirthDates: [],
    missingGuardians: [],
    unknownDonationStudents: [],
    skippedDonationRows: [],
    duplicateDonationRows: [],
    duplicateCharts: [],
    duplicateStudents: [],
    notes: [],
  };
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function parseGuardians(sheet: Sheet, warnings: Warnings): GuardianInput[] {
  const guardians: GuardianInput[] = [];

  for (const [index, row] of sheet.rows.entries()) {
    const rowNumber = index + 2;
    const firstName = getText(sheet, row, "Voornaam");
    const lastName = getText(sheet, row, "Achternaam");
    const chart = getText(sheet, row, "Chart Nr");
    const education = getText(sheet, row, "Onderwijs Nr");

    if (!firstName && !lastName && !chart && !education) continue;
    if (!firstName || !lastName) {
      warnings.skippedStudents.push(
        `ouder rij ${rowNumber}: naam ontbreekt (${firstName} ${lastName})`,
      );
      continue;
    }

    const street = getText(sheet, row, "Adres");
    const postalCode = getText(sheet, row, "Postcode");
    const city = getText(sheet, row, "Woonplaats");
    const place = [postalCode, city].filter(Boolean).join(" ");
    const address = [street, place].filter(Boolean).join(", ");

    const phone =
      normalizePhone(getText(sheet, row, "Telefoon 1")) ||
      normalizePhone(getText(sheet, row, "Telefoon 2"));
    const email = getText(sheet, row, "Email adres");

    guardians.push({
      rowNumber,
      legacyId: getText(sheet, row, "ID"),
      chart,
      education,
      firstName,
      lastName,
      address: address || null,
      phone: phone || null,
      email: email || null,
      enrolledAt: toDate(get(sheet, row, "Datum Inschrijving")),
    });
  }

  return guardians;
}

function parseStudents(
  sheet: Sheet,
  warnings: Warnings,
): StudentInput[] {
  const students: StudentInput[] = [];
  const seen = new Set<string>();

  for (const [index, row] of sheet.rows.entries()) {
    const rowNumber = index + 2;
    const legacyId = getText(sheet, row, "ID Leerling");
    const firstName = getText(sheet, row, "Voornaam");
    const lastName = getText(sheet, row, "Achternaam");

    if (!legacyId && !firstName && !lastName) continue;
    if (!legacyId) {
      warnings.skippedStudents.push(`leerling rij ${rowNumber}: ID ontbreekt`);
      continue;
    }
    if (!firstName || !lastName) {
      warnings.skippedStudents.push(
        `leerling ${legacyId}: naam ontbreekt`,
      );
      continue;
    }
    if (seen.has(legacyId)) {
      warnings.duplicateStudents.push(`leerling ${legacyId}: dubbele ID`);
      continue;
    }
    seen.add(legacyId);

    const rawDateOfBirth = toDate(get(sheet, row, "Geboorte datum"));
    if (!rawDateOfBirth) {
      warnings.placeholderBirthDates.push(
        `${legacyId} (${firstName} ${lastName})`,
      );
    }

    const rawStatus = getText(sheet, row, "Status");
    const rawLeerjaar = getText(sheet, row, "LeerJaar");
    const currentYear = /^2026\s*[/-]\s*202[78]$/.test(rawLeerjaar);
    const inactive = /niet actief/i.test(rawStatus);
    const active = currentYear && !inactive;

    students.push({
      rowNumber,
      legacyId,
      chart: getText(sheet, row, "Chart Nr"),
      guardianEducation: getText(sheet, row, "Onderwijs Nr"),
      className: getText(sheet, row, "Klassen"),
      levelName: getText(sheet, row, "Niveau"),
      firstName,
      lastName,
      sex: normalizeSex(getText(sheet, row, "Geslacht")),
      dateOfBirth: rawDateOfBirth ?? PLACEHOLDER_DATE,
      dateOfBirthIsPlaceholder: rawDateOfBirth === null,
      enrolledAt: toDate(get(sheet, row, "Gestart op")),
      stoppedOn: toDate(get(sheet, row, "GestoptOp")),
      status: active ? "ACTIVE" : "ARCHIVED",
      currentYear,
      currentStatus: getText(sheet, row, "StatusBt"),
      currentPaid: toNumber(get(sheet, row, "BD")),
      currentRest: toNumber(get(sheet, row, "Rs")),
      currentPaidAt: toDate(get(sheet, row, "DatumBT")),
    });
  }

  return students;
}

function parseDonationYear(value: string): string | null {
  const match = value.match(/^(\d{4})\s*[/-]\s*(\d{4})$/);
  return match ? `${match[1]} - ${match[2]}` : null;
}

function parseDonations(
  contributions: Sheet | null,
  students: StudentInput[],
  warnings: Warnings,
): DonationInput[] {
  const byKey = new Map<string, DonationInput>();

  if (contributions) {
    for (const [index, row] of contributions.rows.entries()) {
      const rowNumber = index + 2;
      const legacyId = getText(contributions, row, "IDLeerling");
      if (!legacyId) continue;

      const rawYear = getText(contributions, row, "Leerjaar");
      const year = parseDonationYear(rawYear);
      if (!year) {
        warnings.skippedDonationRows.push(
          `donatie rij ${rowNumber}: onbekend schooljaar "${rawYear}"`,
        );
        continue;
      }

      const key = `${legacyId}|${year}`;
      if (byKey.has(key)) {
        warnings.duplicateDonationRows.push(`${legacyId} ${year}`);
        continue;
      }

      byKey.set(key, {
        legacyId,
        year,
        status: getText(contributions, row, "Status Bt"),
        paid: toNumber(get(contributions, row, "BD")),
        rest: toNumber(get(contributions, row, "RS")),
        paidAt: toDate(get(contributions, row, "Datum BT")),
        source: "ContributieDB",
      });
    }
  }

  // The current-year columns on Data_Leerling complement ContributieDB for
  // students that are not in that sheet for 2026/2027.
  for (const student of students) {
    if (!student.currentYear) continue;
    if (
      !student.currentStatus &&
      student.currentPaid === null &&
      student.currentRest === null
    ) {
      continue;
    }

    const key = `${student.legacyId}|${CURRENT_YEAR}`;
    if (byKey.has(key)) continue;

    byKey.set(key, {
      legacyId: student.legacyId,
      year: CURRENT_YEAR,
      status: student.currentStatus,
      paid: student.currentPaid,
      rest: student.currentRest,
      paidAt: student.currentPaidAt,
      source: "Data_Leerling",
    });
  }

  const knownStudents = new Set(students.map((student) => student.legacyId));
  const result: DonationInput[] = [];

  for (const donation of byKey.values()) {
    if (!knownStudents.has(donation.legacyId)) {
      warnings.unknownDonationStudents.push(
        `${donation.legacyId} (${donation.year})`,
      );
      continue;
    }
    result.push(donation);
  }

  return result;
}

function computeDonation(
  donation: DonationInput,
  yearStart: Date,
): DonationComputed {
  const arrangement = /regeling/i.test(donation.status);
  const paid = donation.paid ?? 0;
  const rest = donation.rest ?? 0;

  if (arrangement && donation.paid === null && donation.rest === null) {
    return {
      legacyId: donation.legacyId,
      year: donation.year,
      expected: 0,
      category: "EXEMPT",
      note: `Oud systeem — status: ${donation.status || "regeling"}`,
      payment: null,
    };
  }

  let expected = paid + rest;
  if (expected === 0 && donation.paid === null && donation.rest === null) {
    expected = STANDARD_AMOUNT;
  }

  const category: DonationCategory =
    expected === 0
      ? "EXEMPT"
      : expected < STANDARD_AMOUNT
        ? "REDUCED"
        : "FULL";

  return {
    legacyId: donation.legacyId,
    year: donation.year,
    expected,
    category,
    note: `Oud systeem — status: ${donation.status || "onbekend"}`,
    payment:
      paid > 0
        ? { amount: paid, paidAt: donation.paidAt ?? yearStart }
        : null,
  };
}

// ---------------------------------------------------------------------------
// Education number allocation
// ---------------------------------------------------------------------------

function allocateEducation(
  preferred: string,
  used: Set<number>,
): string {
  const parsed = Number(preferred);
  if (
    preferred.trim() !== "" &&
    Number.isInteger(parsed) &&
    parsed > 0 &&
    !used.has(parsed)
  ) {
    used.add(parsed);
    return String(parsed);
  }

  let next = 1;
  while (used.has(next)) next += 1;
  used.add(next);
  return String(next);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log(`Inlezen: ${filePath}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const warnings = emptyWarnings();
  const now = new Date();
  // Date-only fallback for records that have no date in the workbook.
  const migrationDate = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  const guardianSheet = readSheet(
    workbook,
    workbook.getWorksheet("Data_Voogd") ? "Data_Voogd" : "Data_ouders",
  );
  const studentSheet = readSheet(workbook, "Data_Leerling");
  const contributionSheet = workbook.getWorksheet("ContributieDB")
    ? readSheet(workbook, "ContributieDB")
    : null;

  const guardians = parseGuardians(guardianSheet, warnings);
  const students = parseStudents(studentSheet, warnings);
  const donations = parseDonations(contributionSheet, students, warnings);

  const donationsComputed = donations.map((donation) =>
    computeDonation(
      donation,
      donation.year === "2025 - 2026"
        ? new Date(Date.UTC(2025, 8, 1))
        : new Date(Date.UTC(2026, 8, 1)),
    ),
  );

  const missingGuardianCharts = new Set<string>();
  const knownCharts = new Set(
    guardians.map((guardian) => guardian.chart).filter(Boolean),
  );
  for (const student of students) {
    if (student.chart && !knownCharts.has(student.chart)) {
      missingGuardianCharts.add(student.chart);
    }
  }

  console.log("");
  console.log("Samenvatting");
  console.log(`  Ouders uit Excel:            ${guardians.length}`);
  console.log(
    `    inschrijfdatum uit Excel:  ${guardians.filter((guardian) => guardian.enrolledAt).length} (${guardians.filter((guardian) => !guardian.enrolledAt).length} vallen terug op importdatum)`,
  );
  console.log(`  Leerlingen:                  ${students.length}`);
  console.log(
    `    inschrijfdatum uit Excel:  ${students.filter((student) => student.enrolledAt).length} (${students.filter((student) => !student.enrolledAt).length} vallen terug op importdatum)`,
  );
  const excelClassNames = new Set(
    students.map((student) => student.className).filter(Boolean),
  );
  console.log(
    `  Klassen in Excel:            ${excelClassNames.size} (${[...excelClassNames].sort().join(", ") || "-"})`,
  );
  console.log(
    `    leerlingen zonder klas:    ${students.filter((student) => !student.className).length}`,
  );
  console.log(
    `    actief (2026/2027):        ${students.filter((student) => student.status === "ACTIVE").length}`,
  );
  console.log(
    `    gearchiveerd:              ${students.filter((student) => student.status === "ARCHIVED").length}`,
  );
  console.log(
    `    geboortedatum placeholder: ${warnings.placeholderBirthDates.length}`,
  );
  console.log(
    `  Ontbrekende ouder-Charts:    ${missingGuardianCharts.size} (${[...missingGuardianCharts].join(", ") || "-"})`,
  );
  console.log(`  Donaties:                    ${donationsComputed.length}`);
  console.log(
    `    met betaling:              ${donationsComputed.filter((donation) => donation.payment).length}`,
  );
  console.log(
    `    onbekende leerlingen:      ${warnings.unknownDonationStudents.length}`,
  );

  if (warnings.placeholderBirthDates.length > 0) {
    console.log("");
    console.log(
      `  Geboortedatum 1900-01-01 voor: ${warnings.placeholderBirthDates.join(", ")}`,
    );
  }
  if (warnings.skippedStudents.length > 0) {
    console.log("");
    console.log(`  Overgeslagen leerlingen/ouders (${warnings.skippedStudents.length}):`);
    for (const message of warnings.skippedStudents.slice(0, 20)) {
      console.log(`    - ${message}`);
    }
  }
  if (warnings.unknownDonationStudents.length > 0) {
    console.log("");
    console.log(
      `  Donatieregels overgeslagen (${warnings.unknownDonationStudents.length}):`,
    );
    console.log(
      `    ${warnings.unknownDonationStudents.slice(0, 10).join(", ")}${warnings.unknownDonationStudents.length > 10 ? ", …" : ""}`,
    );
  }
  if (warnings.skippedDonationRows.length > 0) {
    console.log("");
    console.log(
      `  Ongeldige donatieregels (${warnings.skippedDonationRows.length}):`,
    );
    for (const message of warnings.skippedDonationRows.slice(0, 10)) {
      console.log(`    - ${message}`);
    }
  }
  if (warnings.duplicateDonationRows.length > 0) {
    console.log(
      `  Dubbele donatieregels genegeerd: ${warnings.duplicateDonationRows.length}`,
    );
  }

  if (dryRun) {
    console.log("");
    console.log("Dry-run: niets gewijzigd.");
    return;
  }

  if (students.length === 0) {
    throw new Error("Geen leerlingen gevonden; import afgebroken");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const deletedStudents = await tx.student.deleteMany();
        const deletedGuardians = await tx.guardian.deleteMany();

        // Academic years (keep existing ones; only these two are touched).
        const yearIds = new Map<string, string>();
        for (const name of YEAR_NAMES) {
          const year = await tx.academicYear.upsert({
            where: { name },
            update: { isCurrent: name === CURRENT_YEAR },
            create: { name, isCurrent: name === CURRENT_YEAR },
            select: { id: true },
          });
          yearIds.set(name, year.id);
        }
        await tx.academicYear.updateMany({
          where: { name: { notIn: [...YEAR_NAMES] } },
          data: { isCurrent: false },
        });

        // Guardians + education-number allocation. Numbers are allocated in
        // file order from an empty set, so every Excel value is preserved and
        // only duplicates/empties get the smallest free number.
        const usedEducation = new Set<number>();

        const guardianIdsByChart = new Map<string, string[]>();
        const guardianIdsByChartEducation = new Map<string, string>();
        const guardianIdsByChartSurname = new Map<string, string[]>();
        const usedCharts = new Set<string>();
        let createdGuardians = 0;

        for (const guardian of guardians) {
          const educationNumber = allocateEducation(
            guardian.education,
            usedEducation,
          );

          let donationNumber: string | null = guardian.chart || null;
          if (guardian.chart === "9999") {
            donationNumber = null;
            warnings.notes.push(
              `ouder ${guardian.firstName} ${guardian.lastName}: ChartNr 9999 → leeg`,
            );
          } else if (donationNumber && usedCharts.has(donationNumber)) {
            warnings.duplicateCharts.push(donationNumber);
            donationNumber = null;
          }
          if (donationNumber) usedCharts.add(donationNumber);

          const created = await tx.guardian.create({
            data: {
              firstName: guardian.firstName,
              lastName: guardian.lastName,
              email: guardian.email,
              phone: guardian.phone,
              address: guardian.address,
              donationNumber,
              educationNumber,
              enrolledAt: guardian.enrolledAt ?? migrationDate,
            },
            select: { id: true },
          });
          createdGuardians += 1;

          if (guardian.chart) {
            const ids = guardianIdsByChart.get(guardian.chart) ?? [];
            ids.push(created.id);
            guardianIdsByChart.set(guardian.chart, ids);
            guardianIdsByChartEducation.set(
              `${guardian.chart}|${educationNumber}`,
              created.id,
            );
            const surnameKey = `${guardian.chart}|${guardian.lastName.toLowerCase()}`;
            const surnameIds = guardianIdsByChartSurname.get(surnameKey) ?? [];
            surnameIds.push(created.id);
            guardianIdsByChartSurname.set(surnameKey, surnameIds);
          }
        }

        // One placeholder guardian per chart number that has students but no
        // guardian row in Excel.
        const placeholderIds = new Map<string, string>();
        for (const chart of missingGuardianCharts) {
          const educationNumber = allocateEducation("", usedEducation);
          const created = await tx.guardian.create({
            data: {
              firstName: "Onbekend",
              lastName: `Onbekend (${chart})`,
              donationNumber: chart,
              educationNumber,
              enrolledAt: migrationDate,
            },
            select: { id: true },
          });
          usedCharts.add(chart);
          placeholderIds.set(chart, created.id);
          createdGuardians += 1;
          warnings.missingGuardians.push(`ChartNr ${chart}`);
        }

        // Classes: reuse by case-insensitive name, otherwise create with the
        // first available level + timeslot. Room/teacher stay empty.
        const existingClasses = await tx.schoolClass.findMany({
          select: { id: true, name: true },
        });
        const classIdsByName = new Map(
          existingClasses.map((schoolClass) => [
            schoolClass.name.trim().toLowerCase(),
            schoolClass.id,
          ]),
        );

        const levels = await tx.level.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        });
        let fallbackLevelId = levels[0]?.id;
        if (!fallbackLevelId) {
          const level = await tx.level.create({
            data: { name: "Onbekend" },
            select: { id: true },
          });
          fallbackLevelId = level.id;
          levels.push({ id: level.id, name: "Onbekend" });
        }
        const levelIdsByName = new Map(
          levels.map((level) => [level.name.trim().toLowerCase(), level.id]),
        );

        const firstSession = await tx.classSession.findFirst({
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });

        let createdClasses = 0;
        const classIdFor = async (student: StudentInput): Promise<string | null> => {
          const name = student.className.trim();
          if (!name) return null;

          const key = name.toLowerCase();
          const existing = classIdsByName.get(key);
          if (existing) return existing;

          const levelId =
            levelIdsByName.get(student.levelName.trim().toLowerCase()) ??
            fallbackLevelId;

          const created = await tx.schoolClass.create({
            data: {
              name,
              levelId,
              sessions: firstSession
                ? { create: { sessionId: firstSession.id } }
                : undefined,
            },
            select: { id: true },
          });
          classIdsByName.set(key, created.id);
          createdClasses += 1;
          return created.id;
        };

        // Students + guardian links + class enrollment.
        const studentIds = new Map<string, string>();
        let createdStudents = 0;
        let createdEnrollments = 0;

        for (const student of students) {
          let guardianId: string | undefined;

          if (student.chart) {
            guardianId = guardianIdsByChartEducation.get(
              `${student.chart}|${student.guardianEducation}`,
            );

            const chartGuardians =
              guardianIdsByChart.get(student.chart) ?? [];

            if (!guardianId && chartGuardians.length === 1) {
              guardianId = chartGuardians[0];
            }

            // Pseudo chart numbers (e.g. 9999) are shared by several families:
            // fall back to the surname to pick the right guardian.
            if (!guardianId && chartGuardians.length > 1) {
              const surnameMatches =
                guardianIdsByChartSurname.get(
                  `${student.chart}|${student.lastName.toLowerCase()}`,
                ) ?? [];
              if (surnameMatches.length === 1) {
                guardianId = surnameMatches[0];
              }
            }

            if (!guardianId && chartGuardians.length === 0) {
              guardianId = placeholderIds.get(student.chart);
            }
          }

          if (!guardianId) {
            const educationNumber = allocateEducation("", usedEducation);
            const placeholder = await tx.guardian.create({
              data: {
                firstName: "Onbekend",
                lastName: `Onbekend (${student.lastName})`,
                educationNumber,
                enrolledAt: migrationDate,
              },
              select: { id: true },
            });
            guardianId = placeholder.id;
            createdGuardians += 1;
            warnings.missingGuardians.push(
              `leerling ${student.legacyId} (geen eenduidige ouder)`,
            );
          }

          const classId = await classIdFor(student);
          const assignedToClass = classId !== null;

          const created = await tx.student.create({
            data: {
              firstName: student.firstName,
              lastName: student.lastName,
              sex: student.sex,
              dateOfBirth: student.dateOfBirth,
              enrolledAt: student.enrolledAt ?? migrationDate,
              archivedAt: assignedToClass
                ? null
                : student.status === "ARCHIVED"
                  ? (student.stoppedOn ?? migrationDate)
                  : null,
              status: assignedToClass ? "ACTIVE" : student.status,
              guardians: {
                create: { guardianId, relation: RELATION },
              },
            },
            select: { id: true },
          });
          studentIds.set(student.legacyId, created.id);
          createdStudents += 1;

          if (classId) {
            await tx.enrollment.create({
              data: {
                studentId: created.id,
                classId,
                status: "active",
                startDate: student.enrolledAt ?? migrationDate,
              },
            });
            createdEnrollments += 1;
          }
        }

        // Donations + payments.
        let createdDonations = 0;
        let createdPayments = 0;

        for (const donation of donationsComputed) {
          const studentId = studentIds.get(donation.legacyId);
          const academicYearId = yearIds.get(donation.year);
          if (!studentId || !academicYearId) continue;

          await tx.studentDonation.create({
            data: {
              studentId,
              academicYearId,
              expectedAmount: donation.expected,
              category: donation.category,
              note: donation.note,
              payments: donation.payment
                ? {
                    create: {
                      amount: donation.payment.amount,
                      paidAt: donation.payment.paidAt,
                      note: "Geïmporteerd uit het oude systeem",
                    },
                  }
                : undefined,
            },
          });
          createdDonations += 1;
          if (donation.payment) createdPayments += 1;
        }

        // Explicit zero rows for student/year combinations without old-system
        // data, so the donations report does not apply the global default
        // amount to students with no contribution record.
        const donatedKeys = new Set(
          donationsComputed.map(
            (donation) => `${donation.legacyId}|${donation.year}`,
          ),
        );
        let createdEmptyDonations = 0;
        for (const student of students) {
          const studentId = studentIds.get(student.legacyId);
          if (!studentId) continue;

          for (const year of YEAR_NAMES) {
            if (donatedKeys.has(`${student.legacyId}|${year}`)) continue;
            await tx.studentDonation.create({
              data: {
                studentId,
                academicYearId: yearIds.get(year)!,
                expectedAmount: 0,
                category: "EXEMPT",
                note: "Geen bijdrage in het oude systeem",
              },
            });
            createdEmptyDonations += 1;
          }
        }

        // Integrity check: every student must have at least one guardian.
        const withoutGuardian = await tx.student.count({
          where: { guardians: { none: {} } },
        });
        if (withoutGuardian > 0) {
          throw new Error(
            `${withoutGuardian} leerling(en) zonder ouder; import afgebroken`,
          );
        }

        const linkCount = await tx.studentGuardian.count();

        return {
          deletedStudents: deletedStudents.count,
          deletedGuardians: deletedGuardians.count,
          createdGuardians,
          createdStudents,
          createdClasses,
          createdEnrollments,
          linkCount,
          createdDonations,
          createdPayments,
          createdEmptyDonations,
        };
      },
      { maxWait: 10_000, timeout: 180_000 },
    );

    console.log("");
    console.log("Import voltooid");
    console.log(`  Verwijderd:  ${result.deletedStudents} leerlingen, ${result.deletedGuardians} ouders`);
    console.log(`  Aangemaakt:  ${result.createdStudents} leerlingen, ${result.createdGuardians} ouders`);
    console.log(`  Klassen:     ${result.createdClasses} nieuw, ${result.createdEnrollments} inschrijvingen`);
    console.log(`  Koppelingen: ${result.linkCount}`);
    console.log(
      `  Donaties:    ${result.createdDonations} (waarvan ${result.createdPayments} betalingen)`,
    );
    console.log(
      `  €0-regels:   ${result.createdEmptyDonations} (geen bijdrage in het oude systeem)`,
    );
    if (warnings.notes.length > 0) {
      console.log("");
      console.log(`  Notities (${warnings.notes.length}):`);
      for (const note of warnings.notes.slice(0, 20)) {
        console.log(`    - ${note}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("");
  console.error("Import mislukt:", error);
  process.exit(1);
});
