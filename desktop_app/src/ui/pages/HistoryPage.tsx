import { MetricCard } from '../components/MetricCard'
import { TrendChart } from '../components/TrendChart'
import type { DischargeCycleDetail, DischargeCycleSummary } from '../types/battery'

type HistoryPageProps = {
  cycles: DischargeCycleSummary[]
  expandedCycleId: number | null
  expandedCycleDetail: DischargeCycleDetail | null
  isLoading: boolean
  onToggleCycle: (cycleId: number) => void
}

function formatDateTime(timestampMs: number) {
  return new Date(timestampMs).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(startedAtMs: number, endedAtMs: number | null) {
  if (endedAtMs == null) {
    return 'In progress'
  }

  const elapsedMs = Math.max(endedAtMs - startedAtMs, 0)
  const totalMinutes = Math.floor(elapsedMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes} min`
  }

  return `${hours} h ${minutes} min`
}

function getCycleStatusLabel(summary: DischargeCycleSummary) {
  if (summary.status === 'active') {
    return 'Active'
  }

  return summary.status.charAt(0).toUpperCase() + summary.status.slice(1)
}

export function HistoryPage({
  cycles,
  expandedCycleId,
  expandedCycleDetail,
  isLoading,
  onToggleCycle,
}: HistoryPageProps) {
  return (
    <section className="history-page">
      <section className="voltage-page-header">
        <span className="dashboard__eyebrow">Discharge History</span>
        <h2>Past discharge cycles</h2>
      </section>

      <section className="history-list-card" aria-label="Discharge cycle history">
        {cycles.length === 0 && !isLoading ? (
          <div className="history-empty-state">
            <strong>No discharge cycles recorded yet.</strong>
            <span>Completed and stopped cycles will appear here once discharge data is stored.</span>
          </div>
        ) : null}

        {cycles.map((cycle) => {
          const isExpanded = cycle.id === expandedCycleId
          const detail = isExpanded ? expandedCycleDetail : null

          return (
            <article key={cycle.id} className="history-cycle-card">
              <button
                type="button"
                className="history-cycle-card__summary"
                onClick={() => onToggleCycle(cycle.id)}
                aria-expanded={isExpanded}
              >
                <div className="history-cycle-card__summary-main">
                  <span className="dashboard__eyebrow">Cycle {cycle.id}</span>
                  <h3>{formatDateTime(cycle.startedAtMs)}</h3>
                  <p>{formatDuration(cycle.startedAtMs, cycle.endedAtMs)}</p>
                </div>

                <div className="history-cycle-card__summary-stats">
                  <div>
                    <span>Status</span>
                    <strong>{getCycleStatusLabel(cycle)}</strong>
                  </div>
                  <div>
                    <span>Drained</span>
                    <strong>{cycle.drainedMah} mAh</strong>
                  </div>
                  <div>
                    <span>Samples</span>
                    <strong>{cycle.sampleCount}</strong>
                  </div>
                </div>
              </button>

              {isExpanded ? (
                <div className="history-cycle-card__detail">
                  {isLoading || detail == null ? (
                    <div className="history-detail-loading">
                      <span>Loading cycle detail...</span>
                    </div>
                  ) : (
                    <>
                      <section className="dashboard__metrics dashboard__metrics--compact">
                        <MetricCard
                          title="Charge Drained"
                          value={String(detail.summary.drainedMah)}
                          unit="mAh"
                          trend="Integrated from discharge current"
                          accent="current"
                          compact
                        />
                        <MetricCard
                          title="Start Voltage"
                          value={String(detail.summary.startPackVoltage)}
                          unit="V"
                          trend="Pack voltage at cycle start"
                          accent="voltage"
                          compact
                        />
                        <MetricCard
                          title="End Voltage"
                          value={detail.summary.endPackVoltage != null ? String(detail.summary.endPackVoltage) : '--'}
                          unit="V"
                          trend="Pack voltage at cycle end"
                          accent="temperature"
                          compact
                        />
                      </section>

                      <div className="history-trend-grid">
                        <TrendChart
                          data={detail.voltageTrend}
                          eyebrow="Full Cycle"
                          title="Pack voltage across discharge"
                          ariaLabel="Pack voltage for the full discharge cycle"
                          accent="voltage"
                          windowMs={null}
                        />
                        <TrendChart
                          data={detail.currentTrend}
                          eyebrow="Full Cycle"
                          title="Current across discharge"
                          ariaLabel="Current for the full discharge cycle"
                          accent="current"
                          windowMs={null}
                        />
                        <TrendChart
                          data={detail.temperatureTrend}
                          eyebrow="Full Cycle"
                          title="Average temperature across discharge"
                          ariaLabel="Temperature for the full discharge cycle"
                          accent="temperature"
                          windowMs={null}
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </article>
          )
        })}
      </section>
    </section>
  )
}
