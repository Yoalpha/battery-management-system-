import type { TrendPoint } from '../../shared/battery'
import { TrendChart } from './TrendChart'

type VoltageChartProps = {
  data: TrendPoint[]
}

export function VoltageChart({ data }: VoltageChartProps) {
  return (
    <TrendChart
      data={data}
      eyebrow="Voltage Trend"
      title="Voltage over time"
      ariaLabel="Voltage over time graph"
      accent="voltage"
      unit="V"
    />
  )
}
