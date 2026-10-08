import type { BilingualLabel } from "@/lib/report-labels";

// Renders a Dutch / Arabic label pair with the Arabic isolated as RTL, so the
// two scripts don't reorder around the separator.
export function Bilingual({ label }: { label: BilingualLabel }) {
  return (
    <span>
      {label.nl} /{" "}
      <bdi dir="rtl" lang="ar">
        {label.ar}
      </bdi>
    </span>
  );
}
