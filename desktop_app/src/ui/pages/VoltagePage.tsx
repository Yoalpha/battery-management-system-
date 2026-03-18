import { MetricCard } from '../components/MetricCard'
import { VoltageChart } from '../components/VoltageChart'
import type { BatteryTelemetry } from '../types/battery'

type VoltagePageProps = Pick<BatteryTelemetry, 'voltagePage'>

export function VoltagePage({ voltagePage }: VoltagePageProps) {
  return (
    <section className="voltage-layout voltage-layout--expanded">
      <div className="voltage-layout__left">
        <section className="voltage-page-header">
          <span className="dashboard__eyebrow">Voltage Tab</span>
          <h2>Voltage</h2>
        </section>

        <section
          className="dashboard__metrics dashboard__metrics--compact"
          aria-label="Voltage details"
        >
          <MetricCard
            title="Highest Voltage"
            value={String(voltagePage.highestCellVoltage)}
            unit="V"
            trend="Highest sensor reading"
            accent="voltage"
            compact
          />
          <MetricCard
            title="Average Voltage"
            value={String(voltagePage.averageCellVoltage)}
            unit="V"
            trend="Average across 12 sensors"
            accent="current"
            compact
          />
          <MetricCard
            title="Lowest Voltage"
            value={String(voltagePage.lowestCellVoltage)}
            unit="V"
            trend="Lowest sensor reading"
            accent="temperature"
            compact
          />
        </section>

        <VoltageChart data={voltagePage.averageVoltageHistory} />
      </div>

      <div className="voltage-layout__right">
        <section className="sensor-list-card sensor-list-card--expanded">
          <div className="sensor-list-card__header">
            <div>
              <span className="dashboard__eyebrow">Voltage</span>
              <h2>Sensor readings</h2>
            </div>
          </div>

          <div
            id="sensor-readings-list"
            className="sensor-list-card__scroll sensor-list-card__scroll--open"
            aria-label="Voltage sensor readings"
          >
            {voltagePage.sensorVoltages.map((voltage, index) => (
              <div key={index} className="sensor-list-card__item">
                <span>{`Sensor ${index}`}</span>
                <strong>{voltage} V</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}
