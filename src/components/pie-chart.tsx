"use client";

import { useState } from "react";
import { Group, Stack, Text, type MantineSpacing } from "@mantine/core";

// Lightweight SVG donut chart — no charting dependency. Renders one arc segment
// per slice plus a legend with counts and percentages. Hovering a slice (or its
// legend entry) shows that slice's label and percentage in the centre.

export type PieSlice = {
  label: string;
  value: number;
  color: string;
};

export function PieChart({
  data,
  size = 160,
  thickness = 22,
  gap = 0,
  legendGap = "md",
  label,
  showLegend = true,
  showValues = true,
  showTotal = true,
  ariaLabel = "Verdeling",
}: {
  data: PieSlice[];
  size?: number;
  thickness?: number;
  // Visual gap between slices, in SVG pixels.
  gap?: number;
  // Space between the donut and its legend.
  legendGap?: MantineSpacing;
  // Optional text shown under the total number in the centre (e.g. "Totaal").
  label?: string;
  showLegend?: boolean;
  showValues?: boolean;
  showTotal?: boolean;
  ariaLabel?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const visible = total > 0 ? data.filter((slice) => slice.value > 0) : [];
  const sliceGap = visible.length > 1 ? gap : 0;

  const slices: {
    label: string;
    color: string;
    percent: number;
    dash: number;
    offset: number;
  }[] = [];
  let offset = 0;
  for (const slice of visible) {
    const arc = (slice.value / total) * circumference;
    slices.push({
      label: slice.label,
      color: slice.color,
      percent: Math.round((slice.value / total) * 100),
      dash: Math.max(arc - sliceGap, 0),
      offset,
    });
    offset += arc;
  }

  const active = hovered !== null ? slices[hovered] : null;

  return (
    <Group align="center" gap={legendGap} wrap="wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel}
        style={{ maxWidth: "100%", height: "auto" }}
        onMouseLeave={() => setHovered(null)}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--mantine-color-gray-2)"
          strokeWidth={thickness}
        />
        {slices.map((slice, index) => {
          const isActive = hovered === index;
          return (
            <circle
              key={`${slice.label}-${index}`}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={isActive ? thickness + 2 : thickness}
              strokeDasharray={`${slice.dash} ${circumference - slice.dash}`}
              strokeDashoffset={-slice.offset}
              transform={`rotate(-90 ${center} ${center})`}
              opacity={hovered === null || isActive ? 1 : 0.45}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              <title>{`${slice.label}: ${slice.percent}%`}</title>
            </circle>
          );
        })}

        {active ? (
          <>
            <text
              x={center}
              y={center - size * 0.06}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size * 0.15}
              fontWeight={600}
              fill="currentColor"
            >
              {active.percent}%
            </text>
            <text
              x={center}
              y={center + size * 0.09}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size * 0.06}
              fill="var(--mantine-color-dimmed)"
            >
              {active.label}
            </text>
          </>
        ) : (
          <>
            {showTotal && (
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
            )}
            {label && (
              <text
                x={center}
                y={showTotal ? center + size * 0.12 : center}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={showTotal ? size * 0.09 : size * 0.11}
                fill="var(--mantine-color-dimmed)"
              >
                {label}
              </text>
            )}
          </>
        )}
      </svg>

      {showLegend && (
        <Stack gap={6}>
          {data.map((slice) => {
            const percent =
              total > 0 ? Math.round((slice.value / total) * 100) : 0;
            const index = slices.findIndex((item) => item.label === slice.label);
            return (
              <Group
                key={slice.label}
                gap="xs"
                wrap="nowrap"
                onMouseEnter={() => index >= 0 && setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
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
                  {showValues ? `${slice.value} (${percent}%)` : `${percent}%`}
                </Text>
              </Group>
            );
          })}
        </Stack>
      )}
    </Group>
  );
}
