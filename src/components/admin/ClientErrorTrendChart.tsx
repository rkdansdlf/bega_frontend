type ClientErrorTrendPoint = {
  label: string;
  api: number;
  runtime: number;
  feedback: number;
};

interface ClientErrorTrendChartProps {
  chartData: ClientErrorTrendPoint[];
  loading: boolean;
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 260;
const maxPaintedXLabels = 6;
const maxPaintedLabelLength = 12;
const PADDING = {
  top: 16,
  right: 16,
  bottom: 36,
  left: 36,
};

const SERIES = [
  { key: 'api', label: 'API', stroke: '#38bdf8', fill: 'rgba(56, 189, 248, 0.18)' },
  { key: 'runtime', label: 'Runtime', stroke: '#fb7185', fill: 'rgba(251, 113, 133, 0.18)' },
  { key: 'feedback', label: 'Feedback', stroke: '#fbbf24', fill: 'rgba(251, 191, 36, 0.18)' },
] as const;

const truncatePaintedLabel = (label: string) => {
  const characters = Array.from(label);
  if (characters.length <= maxPaintedLabelLength) {
    return label;
  }

  return `${characters.slice(0, maxPaintedLabelLength - 1).join('')}…`;
};

export default function ClientErrorTrendChart({
  chartData,
  loading,
}: ClientErrorTrendChartProps) {
  if (loading || chartData.length === 0) {
    return (
      <div
        data-testid="admin-client-error-trend-chart"
        className="flex h-full w-full min-w-0 max-w-full flex-col"
      >
        <div
          data-testid="admin-client-error-trend-chart-status"
          role="status"
          aria-live="polite"
          aria-busy={loading ? 'true' : undefined}
          className="flex h-full min-h-24 items-center justify-center text-slate-400"
        >
          {loading ? '로딩 중...' : '표시할 데이터가 없습니다.'}
        </div>
      </div>
    );
  }

  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const maxValue = Math.max(
    1,
    ...chartData.flatMap((point) => [point.api, point.runtime, point.feedback]),
  );

  const xForIndex = (index: number) => {
    if (chartData.length === 1) {
      return PADDING.left + innerWidth / 2;
    }

    return PADDING.left + (innerWidth / (chartData.length - 1)) * index;
  };

  const yForValue = (value: number) => (
    PADDING.top + innerHeight - (value / maxValue) * innerHeight
  );

  const tickValues = Array.from(new Set(
    Array.from({ length: 5 }, (_, index) => Math.round((maxValue / 4) * (4 - index))),
  ));
  const labelStep = chartData.length <= maxPaintedXLabels
    ? 1
    : Math.ceil((chartData.length - 1) / (maxPaintedXLabels - 1));
  const visibleLabelIndexes = new Set([
    ...chartData.map((_, index) => index).filter((index) => index % labelStep === 0),
    chartData.length - 1,
  ]);
  const chartLabel = [
    `클라이언트 오류 추이 차트, ${chartData.length}개 구간`,
    ...SERIES.map((series) => (
      `${series.label} 최대 ${Math.max(...chartData.map((point) => point[series.key]))}`
    )),
  ].join(', ');

  const buildLinePoints = (key: keyof ClientErrorTrendPoint) => (
    chartData
      .map((point, index) => `${xForIndex(index)},${yForValue(Number(point[key]))}`)
      .join(' ')
  );

  const buildAreaPoints = (key: keyof ClientErrorTrendPoint) => {
    const linePoints = chartData.map((point, index) => `${xForIndex(index)},${yForValue(Number(point[key]))}`);
    const lastX = xForIndex(chartData.length - 1);
    const firstX = xForIndex(0);
    const baselineY = PADDING.top + innerHeight;
    return [`${firstX},${baselineY}`, ...linePoints, `${lastX},${baselineY}`].join(' ');
  };

  return (
    <div
      data-testid="admin-client-error-trend-chart"
      className="flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden"
    >
      <div
        data-testid="admin-client-error-trend-chart-scroll"
        role="region"
        aria-label="클라이언트 오류 추이 차트 가로 스크롤"
        tabIndex={0}
        className="w-full max-w-full overflow-x-auto overflow-y-hidden"
      >
        <svg
          role="img"
          aria-label={chartLabel}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="block h-[260px] w-[720px] max-w-none shrink-0"
        >
          <g>
            {tickValues.map((tick, index) => {
              const y = yForValue(tick);
              return (
                <g key={`${tick}-${index}`}>
                  <line
                    x1={PADDING.left}
                    x2={CHART_WIDTH - PADDING.right}
                    y1={y}
                    y2={y}
                    stroke="#1f2937"
                    strokeDasharray="3 3"
                  />
                  <text
                    data-vqa-axis="y-tick"
                    x={PADDING.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="12"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}
          </g>

          {SERIES.map((series) => (
            <g key={series.key}>
              <polygon points={buildAreaPoints(series.key)} fill={series.fill} />
              <polyline
                fill="none"
                stroke={series.stroke}
                strokeWidth="2.5"
                points={buildLinePoints(series.key)}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {chartData.map((point, index) => {
                const x = xForIndex(index);
                const y = yForValue(point[series.key]);
                return (
                  <circle key={`${series.key}-${index}`} cx={x} cy={y} r="3.5" fill={series.stroke}>
                    <title>{`${point.label} · ${series.label}: ${point[series.key]}`}</title>
                  </circle>
                );
              })}
            </g>
          ))}

          <g>
            {chartData.map((point, index) => (visibleLabelIndexes.has(index) ? (
              <text
                key={`${point.label}-${index}`}
                data-vqa-axis="x-label"
                aria-label={point.label}
                x={xForIndex(index)}
                y={CHART_HEIGHT - 10}
                textAnchor={chartData.length === 1
                  ? 'middle'
                  : index === 0
                    ? 'start'
                    : index === chartData.length - 1
                      ? 'end'
                      : 'middle'}
                fill="#94a3b8"
                fontSize="12"
              >
                {truncatePaintedLabel(point.label)}
              </text>
            ) : null))}
          </g>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-caption text-slate-300">
        {SERIES.map((series) => (
          <div key={series.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.stroke }} />
            <span>{series.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
