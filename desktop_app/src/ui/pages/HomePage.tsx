import { MetricCard } from '../components/MetricCard'
import { SectionHeader } from '../components/SectionHeader'
import { StateCard } from '../components/StateCard'
import type { BatteryTelemetry } from '../types/battery'

type HomePageProps = Pick<
  BatteryTelemetry,
  'alerts' | 'batteryState' | 'homeMetrics'
>

export function HomePage({
  alerts,
  homeMetrics,
  batteryState,
}: HomePageProps) {
  const visibleAlerts =
    alerts.length > 0 ? alerts : ['Battery conditions are normal.']

  return (
    <>
      <section className="dashboard__hero">
        <SectionHeader
          eyebrow="Home"
          title="Battery performance at a glance"
          description="A minimal control surface for checking voltage, current, and temperature without friction."
        />

        <section className="alerts-card" aria-label="Battery alerts">
          <span>Alerts</span>
          <div className="alerts-card__list">
            {visibleAlerts.map((alert) => (
              <p key={alert}>{alert}</p>
            ))}
          </div>
        </section>
      </section>

      <section className="dashboard__metrics" aria-label="Battery metrics">
        <MetricCard
          title="Current Voltage"
          value={String(homeMetrics.currentVoltage)}
          unit="V"
          trend="Live pack voltage"
          accent="voltage"
        />
        <MetricCard
          title="Current"
          value={String(homeMetrics.current)}
          unit="A"
          trend="Live pack current"
          accent="current"
        />
        <MetricCard
          title="Temperature"
          value={String(homeMetrics.temperature)}
          unit="°C"
          trend="Live pack temperature"
          accent="temperature"
        />
      </section>

      <section className="summary-panel">
        <div className="summary-panel__heading">
          <span className="summary-panel__eyebrow">Battery State Of Charge</span>
          <h2>Battery state of charge</h2>
        </div>

        <div className="state-card-grid">
          <StateCard
            label="State Of Charge"
            value={`${batteryState.stateOfChargePercent}%`}
          />
          <StateCard
            label="State Of Charge (mAh)"
            value={`${batteryState.stateOfChargeMah} mAh`}
          />
          <StateCard
            label="Remaining Cycles Left"
            value={String(batteryState.remainingCycles)}
          />
        </div>
      </section>
    </>
  )
}
