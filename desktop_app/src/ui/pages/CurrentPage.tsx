import { MetricCard } from '../components/MetricCard'
import { TrendChart } from '../components/TrendChart'
import type { BatteryTelemetry } from '../../shared/battery'

type CurrentPageProps = Pick<BatteryTelemetry, 'currentPage'>

export function CurrentPage({ currentPage }: CurrentPageProps) {
  const currentTrend =
    currentPage.currentHistory.length >= 2
      ? currentPage.currentHistory.at(-1)!.value - currentPage.currentHistory.at(-2)!.value
      : 0

  return (
    <section className="voltage-layout voltage-layout--expanded">
      <div className="voltage-layout__left">
        <section className="voltage-page-header">
          <span className="dashboard__eyebrow">Current Tab</span>
          <h2>Current</h2>
        </section>

        <section
          className="dashboard__metrics dashboard__metrics--compact"
          aria-label="Current details"
        >
          <MetricCard
            title="Sensor Current"
            value={String(currentPage.sensorCurrent)}
            unit="A"
            trend="Live single-sensor current"
            accent="current"
            compact
          />
          <MetricCard
            title="Direction"
            value={currentPage.sensorCurrent >= 0 ? 'Discharge' : 'Charge'}
            unit=""
            trend="Derived from live reading"
            accent="voltage"
            compact
          />
          <MetricCard
            title="Change"
            value={String(Number(currentTrend.toFixed(2)))}
            unit="A"
            trend="Delta from previous sample"
            accent="temperature"
            compact
          />
        </section>

        <TrendChart
          data={currentPage.currentHistory}
          eyebrow="Current Trend"
          title="Current over time"
          ariaLabel="Current over time graph"
          accent="current"
        />
      </div>

      <div className="voltage-layout__right">
        <section className="sensor-list-card sensor-list-card--expanded">
          <div className="sensor-list-card__header">
            <div>
              <span className="dashboard__eyebrow">Current</span>
              <h2>Sensor feed</h2>
            </div>
          </div>

          <div className="sensor-list-card__scroll sensor-list-card__scroll--open">
            <div className="sensor-list-card__item">
              <span>Current sensor 1</span>
              <strong>{currentPage.sensorCurrent} A</strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}
