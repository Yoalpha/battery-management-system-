type MetricCardProps = {
  title: string
  value: string
  unit: string
  trend: string
  accent: 'voltage' | 'current' | 'temperature'
  compact?: boolean
}

export function MetricCard({
  title,
  value,
  unit,
  trend,
  accent,
  compact = false,
}: MetricCardProps) {
  return (
    <section
      className={`metric-card metric-card--${accent} ${compact ? 'metric-card--compact' : ''}`}
    >
      <div className="metric-card__header">
        <p>{title}</p>
        <span>{trend}</span>
      </div>

      <div className="metric-card__value">
        <strong>{value}</strong>
        <span>{unit}</span>
      </div>
    </section>
  )
}
