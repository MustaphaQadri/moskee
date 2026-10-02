import { Group, Stack, Text } from "@mantine/core";

// Lightweight SVG donut chart — no charting dependency. Renders one arc segment
// per slice plus a legend with counts and percentages. Safe to use from both
// Server and Client Components.

export type PieSlice = {
  label: string;
  value: number;
  color: string;
};

export function PieChart({
  data,
  size = 160,
  thickness = 22,
  label,
}: {
  data: PieSlice[];
  size?: number;
  thickness?: number;
  // Optional text shown under the total number in the centre (e.g. "Totaal").
  label?: string;
}) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const slices: {
    label: string;
    color: string;
    dash: number;
    offset: number;
  }[] = [];
  let offset = 0;
  for (const slice of data) {
    if (total <= 0 || slice.value <= 0) continue;
    const dash = (slice.value / total) * circumference;
    slices.push({ label: slice.label, color: slice.color, dash, offset });
    offset += dash;
  }

  return (
    <Group align="center" gap="xl" wrap="wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Verdeling aanwezigheid"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--mantine-color-gray-2)"
          strokeWidth={thickness}
        />
        {slices.map((slice) => (
          <circle
            key={slice.label}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth={thickness}
            strokeDasharray={`${slice.dash} ${circumference - slice.dash}`}
            strokeDashoffset={-slice.offset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ))}
        <text
          x={center}
          y={label ? center - size * 0.06 : center}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.18}
          fontWeight={600}
          fill="currentColor"
        >
          {total}
        </text>
        {label && (
          <text
            x={center}
            y={center + size * 0.12}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.09}
            fill="var(--mantine-color-dimmed)"
          >
            {label}
          </text>
        )}
      </svg>

      <Stack gap={6}>
        {data.map((slice) => (
          <Group key={slice.label} gap="xs" wrap="nowrap">
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: slice.color,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <Text size="sm">{slice.label}</Text>
            <Text size="sm" c="dimmed">
              {slice.value} ({total > 0 ? Math.round((slice.value / total) * 100) : 0}
              %)
            </Text>
          </Group>
        ))}
      </Stack>
    </Group>
  );
}
