import { MetricCard } from '../components/MetricCard'
import { TrendChart } from '../components/TrendChart'
import type { BatteryTelemetry } from '../../shared/battery'

type TemperaturePageProps = Pick<BatteryTelemetry, 'temperaturePage'>

export function TemperaturePage({ temperaturePage }: TemperaturePageProps) {
  return (
    <section className="voltage-layout voltage-layout--expanded">
      <div className="voltage-layout__left">
        <section className="voltage-page-header">
          <span className="dashboard__eyebrow">Temperature Tab</span>
          <h2>Temperature</h2>
        </section>

        <section
          className="dashboard__metrics dashboard__metrics--compact"
          aria-label="Temperature details"
        >
          <MetricCard
            title="Average Temperature"
            value={String(temperaturePage.averageTemperature)}
            unit="°C"
            trend="Average across 4 sensors"
            accent="current"
            compact
          />
          <MetricCard
            title="Highest Temperature"
            value={String(temperaturePage.highestTemperature)}
            unit="°C"
            trend="Hottest sensor reading"
            accent="temperature"
            compact
          />
          <MetricCard
            title="Lowest Temperature"
            value={String(temperaturePage.lowestTemperature)}
            unit="°C"
            trend="Coolest sensor reading"
            accent="voltage"
            compact
          />
        </section>

        <TrendChart
          data={temperaturePage.averageTemperatureHistory}
          eyebrow="Temperature Trend"
          title="Average temperature over time"
          ariaLabel="Average temperature over time graph"
          accent="temperature"
        />
      </div>

      <div className="voltage-layout__right">
        <section className="sensor-list-card sensor-list-card--expanded">
          <div className="sensor-list-card__header">
            <div>
              <span className="dashboard__eyebrow">Temperature</span>
              <h2>Sensor readings</h2>
            </div>
          </div>

          <div
            className="sensor-list-card__scroll sensor-list-card__scroll--open"
            aria-label="Temperature sensor readings"
          >
            {temperaturePage.sensorTemperatures.map((temperature, index) => (
              <div key={index} className="sensor-list-card__item">
                <span>{`Sensor ${index + 1}`}</span>
                <strong>{temperature} °C</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}
