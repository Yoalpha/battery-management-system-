import { MetricCard } from '../components/MetricCard'
import { SectionHeader } from '../components/SectionHeader'
import { StateCard } from '../components/StateCard'
import type { BatteryTelemetry } from '../types/battery'

type HomePageProps = Pick<
  BatteryTelemetry,
  'alerts' | 'batteryState' | 'homeMetrics'
> & {
  canStopDischarge: boolean
  onStopDischarge: () => void
}

export function HomePage({
  alerts,
  homeMetrics,
  batteryState,
  canStopDischarge,
  onStopDischarge,
}: HomePageProps) {
  const visibleAlerts =
    alerts.length > 0 ? alerts : ['Battery conditions are normal.']

  return (
    <>
      <section className="dashboard__hero">
        <SectionHeader
          eyebrow="Home"
          title="Battery Performance"
          description="Battery Telematry Summary"
        />

        <section className="alerts-card" aria-label="Battery alerts">
          <div className="alerts-card__header">
            <span>Alerts</span>
            {canStopDischarge ? (
              <button
                type="button"
                className="alerts-card__action"
                onClick={onStopDischarge}
              >
                Stop Discharge
              </button>
            ) : null}
          </div>
          <div className="alerts-card__list">
            {visibleAlerts.map((alert) => (
              <p key={alert}>{alert}</p>
            ))}
          </div>
        </section>
      </section>

      <section className="dashboard__metrics" aria-label="Battery metrics">
        <MetricCard
          title="Voltage"
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
          <h2>Battery state of Health</h2>
        </div>

        <div className="state-card-grid">
          <StateCard
            label="State Of Health (%)"
            value={`${batteryState.stateOfChargePercent}%`}
          />
          <StateCard
            label="State Of Health (mAh)"
            value={`${batteryState.stateOfChargeMah} mAh`}
          />
          <StateCard
            label="Initial Internal Resistance (ohms)"
            value={batteryState.initialInternalResistance != null ? String(batteryState.initialInternalResistance) : '--'}
          />
          <StateCard
            label="Final Internal Resistance (ohms)"
            value={batteryState.finalInternalResistance != null ? String(batteryState.finalInternalResistance) : '--'}
          />
          <StateCard
            label="Internal Resistance Growth (ohms)"
            value={String(batteryState.internalResistanceGrowth)}
          />
        </div>
      </section>
    </>
  )
}
