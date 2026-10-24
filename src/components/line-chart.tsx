// Lightweight SVG line chart — no charting dependency. Plots one line per series
// over the supplied points and renders date labels on the x-axis.

export type LineChartSeries = {
  key: string;
  label: string;
  color: string;
};

export type LineChartPoint = {
  date: string; // ISO yyyy-mm-dd
} & Record<string, string | number>;

function shortDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${day}-${month}`;
}

export function LineChart({
  data,
  series,
  height = 280,
  percentage = false,
  ariaLabel = "Aanwezigheid per dag",
}: {
  data: LineChartPoint[];
  series: LineChartSeries[];
  height?: number;
  // Plot on a fixed 0–100 axis and label the y-axis with percentages.
  percentage?: boolean;
  ariaLabel?: string;
}) {
  if (data.length === 0) return null;

  const width = 720;
  const padding = { top: 16, right: 16, bottom: 36, left: 44 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    0,
    ...data.flatMap((point) =>
      series.map((item) => Number(point[item.key] ?? 0)),
    ),
  );
  const step = Math.max(1, Math.ceil(maxValue / 4));
  const yMax = percentage ? 100 : step * 4;
  const tickValues = percentage
    ? [0, 25, 50, 75, 100]
    : [0, 1, 2, 3, 4].map((index) => index * step);

  const xFor = (index: number) =>
    data.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (data.length - 1)) * plotWidth;
  const yFor = (value: number) =>
    padding.top + plotHeight - (value / yMax) * plotHeight;

  const ticks = tickValues.map((value) => ({
    value,
    y: yFor(value),
  }));

  const labelIndices = new Set<number>();
  const maxLabels = Math.min(6, data.length);
  if (maxLabels === 1) {
    labelIndices.add(0);
  } else {
    for (let index = 0; index < maxLabels; index += 1) {
      labelIndices.add(
        Math.round((index / (maxLabels - 1)) * (data.length - 1)),
      );
    }
  }

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto" }}
    >
      {ticks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={tick.y}
            y2={tick.y}
            stroke="var(--mantine-color-gray-2)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={padding.left - 8}
            y={tick.y}
            textAnchor="end"
            dominantBaseline="central"
            fontSize={10}
            fill="var(--mantine-color-dimmed)"
          >
            {percentage ? `${tick.value}%` : tick.value}
          </text>
        </g>
      ))}

      {[...labelIndices].map((index) => (
        <text
          key={index}
          x={xFor(index)}
          y={height - 14}
          textAnchor="middle"
          fontSize={10}
          fill="var(--mantine-color-dimmed)"
        >
          {shortDate(data[index].date)}
        </text>
      ))}

      {series.map((item) => {
        const points = data
          .map(
            (point, index) =>
              `${xFor(index)},${yFor(Number(point[item.key] ?? 0))}`,
          )
          .join(" ");

        return (
          <g key={item.key}>
            <polyline
              points={points}
              fill="none"
              stroke={item.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {data.length <= 60 &&
              data.map((point, index) => (
                <circle
                  key={`${item.key}-${index}`}
                  cx={xFor(index)}
                  cy={yFor(Number(point[item.key] ?? 0))}
                  r={2.5}
                  fill={item.color}
                />
              ))}
          </g>
        );
      })}
    </svg>
  );
}
