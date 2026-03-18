type VoltagePoint = {
  time: string
  voltage: number
}

type VoltageChartProps = {
  data: VoltagePoint[]
}

export function VoltageChart({ data }: VoltageChartProps) {
  const width = 760
  const height = 280
  const padding = 28

  const values = data.map((point) => point.voltage)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = Math.max(maxValue - minValue, 0.1)

  const toX = (index: number) =>
    padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2)
  const toY = (value: number) =>
    height - padding - ((value - minValue) / range) * (height - padding * 2)

  const linePath = data
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point.voltage)}`)
    .join(' ')

  const areaPath = `${linePath} L ${toX(data.length - 1)} ${height - padding} L ${toX(0)} ${height - padding} Z`

  return (
    <section className="chart-card">
      <div className="chart-card__header">
        <div>
          <span className="dashboard__eyebrow">Voltage Trend</span>
          <h3>Voltage over time</h3>
        </div>
      </div>

      <div className="chart-card__canvas">
        <svg
          className="voltage-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Voltage over time graph"
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
                className="voltage-chart__grid"
              />
            )
          })}

          <path d={areaPath} className="voltage-chart__area" />
          <path d={linePath} className="voltage-chart__line" />

          {data.map((point, index) => (
            <g key={`${point.time}-${point.voltage}`}>
              <circle
                cx={toX(index)}
                cy={toY(point.voltage)}
                r="5"
                className="voltage-chart__point"
              />
              <text
                x={toX(index)}
                y={height - 8}
                textAnchor="middle"
                className="voltage-chart__label"
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
