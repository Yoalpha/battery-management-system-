import type { TrendPoint } from '../../shared/battery'

type TrendChartProps = {
  data: TrendPoint[]
  eyebrow: string
  title: string
  ariaLabel: string
  accent: 'voltage' | 'current' | 'temperature'
  windowMs?: number | null
}

const areaClassNameByAccent = {
  voltage: 'trend-chart__area trend-chart__area--voltage',
  current: 'trend-chart__area trend-chart__area--current',
  temperature: 'trend-chart__area trend-chart__area--temperature',
} as const

export function TrendChart({
  data,
  eyebrow,
  title,
  ariaLabel,
  accent,
  windowMs = 10 * 60 * 1000,
}: TrendChartProps) {
  const sortedData = [...data].sort((left, right) => left.timestampMs - right.timestampMs)
  const latestTimestamp = sortedData.length > 0
    ? sortedData[sortedData.length - 1].timestampMs
    : 0
  const earliestTimestamp = sortedData.length > 0
    ? sortedData[0].timestampMs
    : 0
  const fallbackSpanMs = windowMs ?? 10 * 60 * 1000
  const spanMs = windowMs ?? Math.max(latestTimestamp - earliestTimestamp, 60_000)
  const windowStartMs = windowMs == null
    ? earliestTimestamp
    : latestTimestamp - windowMs
  const pointsInWindow = sortedData.filter((point) => point.timestampMs >= windowStartMs)
  const safeData = pointsInWindow.length > 0
    ? pointsInWindow
    : [
        { time: '00:00', timestampMs: windowStartMs, value: 0 },
        { time: '00:10', timestampMs: windowStartMs + fallbackSpanMs, value: 0 },
      ]

  const width = 760
  const height = 280
  const padding = 28

  const values = safeData.map((point) => point.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = Math.max(maxValue - minValue, 0.1)

  const toX = (timestampMs: number) =>
    padding + ((timestampMs - windowStartMs) / Math.max(spanMs, 1)) * (width - padding * 2)
  const toY = (value: number) =>
    height - padding - ((value - minValue) / range) * (height - padding * 2)

  const linePath = safeData
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(point.timestampMs)} ${toY(point.value)}`)
    .join(' ')

  const areaPath = `${linePath} L ${toX(safeData[safeData.length - 1].timestampMs)} ${height - padding} L ${toX(safeData[0].timestampMs)} ${height - padding} Z`
  const xAxisTicks = Array.from({ length: 6 }, (_, index) => {
    const timestampMs = windowStartMs + (Math.max(spanMs, 1) / 5) * index

    return {
      timestampMs,
      label: new Date(timestampMs).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  })

  return (
    <section className="chart-card">
      <div className="chart-card__header">
        <div>
          <span className="dashboard__eyebrow">{eyebrow}</span>
          <h3>{title}</h3>
        </div>
      </div>

      <div className="chart-card__canvas">
        <svg
          className={`trend-chart trend-chart--${accent}`}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={ariaLabel}
        >
          {[0, 1, 2, 3].map((step) => {
            const y = padding + (step / 3) * (height - padding * 2)

            return (
              <line
                key={step}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                className="trend-chart__grid"
              />
            )
          })}

          <path d={areaPath} className={areaClassNameByAccent[accent]} />
          <path d={linePath} className="trend-chart__line" />

          {safeData.map((point) => (
            <g key={`${point.timestampMs}-${point.value}`}>
              <circle
                cx={toX(point.timestampMs)}
                cy={toY(point.value)}
                r="5"
                className="trend-chart__point"
              />
            </g>
          ))}

          {xAxisTicks.map((tick) => (
            <text
              key={tick.timestampMs}
              x={toX(tick.timestampMs)}
              y={height - 8}
              textAnchor="middle"
              className="trend-chart__label"
            >
              {tick.label}
            </text>
          ))}
        </svg>
      </div>
    </section>
  )
}
