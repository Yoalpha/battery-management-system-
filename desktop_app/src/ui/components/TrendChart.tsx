import type { TrendPoint } from '../../shared/battery'

type TrendChartProps = {
  data: TrendPoint[]
  eyebrow: string
  title: string
  ariaLabel: string
  accent: 'voltage' | 'current' | 'temperature'
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
}: TrendChartProps) {
  const safeData =
    data.length > 0
      ? data
      : [
          { time: '00:00', value: 0 },
          { time: '00:05', value: 0 },
        ]

  const width = 760
  const height = 280
  const padding = 28

  const values = safeData.map((point) => point.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = Math.max(maxValue - minValue, 0.1)

  const toX = (index: number) =>
    padding + (index / Math.max(safeData.length - 1, 1)) * (width - padding * 2)
  const toY = (value: number) =>
    height - padding - ((value - minValue) / range) * (height - padding * 2)

  const linePath = safeData
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point.value)}`)
    .join(' ')

  const areaPath = `${linePath} L ${toX(safeData.length - 1)} ${height - padding} L ${toX(0)} ${height - padding} Z`

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

          {safeData.map((point, index) => (
            <g key={`${point.time}-${point.value}`}>
              <circle
                cx={toX(index)}
                cy={toY(point.value)}
                r="5"
                className="trend-chart__point"
              />
              <text
                x={toX(index)}
                y={height - 8}
                textAnchor="middle"
                className="trend-chart__label"
              >
                {point.time}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  )
}
