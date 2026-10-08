import type { AttendanceStatus } from "@/generated/prisma/enums";

// Fixed labels for the printed (bilingual) reports. Pure and dependency-free so
// they can be used from Server and Client Components.

export type BilingualLabel = { nl: string; ar: string };

export const REPORT_LABELS = {
  report: { nl: "Rapport", ar: "التقرير" },
  yearReport: { nl: "Jaarrapport", ar: "التقرير السنوي" },
  student: { nl: "Leerling", ar: "الطالب" },
  className: { nl: "Klas", ar: "القسم" },
  subject: { nl: "Vak", ar: "المادة" },
  average: { nl: "Gemiddelde", ar: "المعدل" },
  totalAverage: { nl: "Totaal gemiddelde", ar: "المعدل الإجمالي" },
  year: { nl: "Jaar", ar: "السنة" },
  attendance: { nl: "Aanwezigheid", ar: "الحضور" },
  schoolYear: { nl: "Schooljaar", ar: "العام الدراسي" },
  printedOn: { nl: "Afgedrukt op", ar: "تاريخ الطباعة" },
  observation: { nl: "Opmerking", ar: "ملاحظة" },
  noAttendance: {
    nl: "Geen aanwezigheid geregistreerd",
    ar: "لا يوجد تسجيل للحضور",
  },
  period: { nl: "Periode", ar: "الفصل" },
} satisfies Record<string, BilingualLabel>;

export const ATTENDANCE_LABELS_BILINGUAL: Record<AttendanceStatus, BilingualLabel> = {
  PRESENT: { nl: "Aanwezig", ar: "حاضر" },
  LATE: { nl: "Te laat", ar: "متأخر" },
  VERY_LATE: { nl: "Erg laat", ar: "متأخر جدًا" },
  ABSENT: { nl: "Afwezig", ar: "غائب" },
  EXCUSED: { nl: "Geoorloofd afwezig", ar: "غائب بعذر" },
};
