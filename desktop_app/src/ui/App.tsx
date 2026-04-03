import './App.css'
import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { HomePage } from './pages/HomePage'
import { HistoryPage } from './pages/HistoryPage'
import { CurrentPage } from './pages/CurrentPage'
import { TemperaturePage } from './pages/TemperaturePage'
import { VoltagePage } from './pages/VoltagePage'
import type {
  BatteryTelemetry,
  DischargeCycleDetail,
  DischargeCycleSummary,
  PageId,
  TrendPoint,
} from './types/battery'

const navItems = [
  { id: 'home' as const, label: 'Home' },
  { id: 'voltage' as const, label: 'Voltage' },
  { id: 'current' as const, label: 'Current' },
  { id: 'temperature' as const, label: 'Temperature' },
  { id: 'history' as const, label: 'History' },
]

const fallbackTelemetry: BatteryTelemetry = {
  alerts: [],
  homeMetrics: {
    currentVoltage: 0,
    current: 0,
    temperature: 0,
  },
  batteryState: {
    stateOfChargePercent: 0,
    stateOfChargeMah: 0,
    remainingCycles: 0,
  },
  voltagePage: {
    sensorVoltages: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    averageCellVoltage: 0,
    highestCellVoltage: 0,
    lowestCellVoltage: 0,
    averageVoltageHistory: [
      { time: '09:00', timestampMs: Date.now() - 10 * 60 * 1000, value: 0 },
      { time: '09:05', timestampMs: Date.now(), value: 0 },
    ],
  },
  currentPage: {
    sensorCurrent: 0,
    currentHistory: [
      { time: '09:00', timestampMs: Date.now() - 10 * 60 * 1000, value: 0 },
      { time: '09:05', timestampMs: Date.now(), value: 0 },
    ],
  },
  temperaturePage: {
    sensorTemperatures: [0, 0, 0, 0],
    averageTemperature: 0,
    highestTemperature: 0,
    lowestTemperature: 0,
    averageTemperatureHistory: [
      { time: '09:00', timestampMs: Date.now() - 10 * 60 * 1000, value: 0 },
      { time: '09:05', timestampMs: Date.now(), value: 0 },
    ],
  },
}

const demoCycleStartedAtMs = Date.now() - (2 * 60 + 15) * 60_000
const demoCycleSampleCount = 45
const demoCycleIntervalMs = 30_000

function createDemoTrendPoints(
  sampleValue: (index: number, progress: number) => number
): TrendPoint[] {
  return Array.from({ length: demoCycleSampleCount }, (_, index) => {
    const timestampMs = demoCycleStartedAtMs + index * demoCycleIntervalMs
    const progress = index / Math.max(demoCycleSampleCount - 1, 1)

    return {
      time: new Date(timestampMs).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestampMs,
      value: Number(sampleValue(index, progress).toFixed(2)),
    }
  })
}

const demoCycleDetail: DischargeCycleDetail = {
  summary: {
    id: -1,
    startedAtMs: demoCycleStartedAtMs,
    endedAtMs: demoCycleStartedAtMs + (demoCycleSampleCount - 1) * demoCycleIntervalMs,
    status: 'demo',
    startPackVoltage: 50.6,
    endPackVoltage: 35.2,
    triggerCurrent: -12.4,
    sampleCount: demoCycleSampleCount,
    drainedMah: 4021.5,
  },
  voltageTrend: createDemoTrendPoints((_index, progress) => 50.6 - progress * 15.4),
  currentTrend: createDemoTrendPoints((index, progress) => -(12.4 - progress * 3.2 + Math.sin(index / 5) * 0.45)),
  temperatureTrend: createDemoTrendPoints((index, progress) => 27.5 + progress * 8.6 + Math.sin(index / 6) * 0.35),
}

const demoCycles: DischargeCycleSummary[] = [demoCycleDetail.summary]

function App() {
  const [activePage, setActivePage] = useState<PageId>('home')
  const [telemetry, setTelemetry] = useState<BatteryTelemetry>(fallbackTelemetry)
  const [cycles, setCycles] = useState<DischargeCycleSummary[]>([])
  const [expandedCycleId, setExpandedCycleId] = useState<number | null>(null)
  const [expandedCycleDetail, setExpandedCycleDetail] = useState<DischargeCycleDetail | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = window.bmsApi?.subscribeToBatteryTelemetry((data) => {
      setTelemetry(data)
    })

    window.bmsApi
      ?.getBatteryTelemetry()
      .then(
        (data) => setTelemetry(data)
      )
      .catch(
        () => setTelemetry(fallbackTelemetry)
      )

    return () => {
      unsubscribe?.()
    }
  }, [])

  function loadDischargeCycles() {
    if (window.bmsApi == null) {
      setCycles(demoCycles)
      setIsHistoryLoading(false)
      return
    }

    setIsHistoryLoading(true)

    void window.bmsApi
      .getDischargeCycles()
      .then((data) => {
        setCycles(data.length > 0 ? data : demoCycles)
      })
      .catch(() => {
        setCycles(demoCycles)
      })
      .finally(() => {
        setIsHistoryLoading(false)
      })
  }

  function handleSelectPage(pageId: PageId) {
    setActivePage(pageId)

    if (pageId === 'history') {
      loadDischargeCycles()
    }
  }

  function handleToggleCycle(cycleId: number) {
    if (expandedCycleId === cycleId) {
      setExpandedCycleId(null)
      setExpandedCycleDetail(null)
      return
    }

    setExpandedCycleId(cycleId)
    setExpandedCycleDetail(null)
    setIsHistoryLoading(true)

    if (cycleId === demoCycleDetail.summary.id) {
      setExpandedCycleDetail(demoCycleDetail)
      setIsHistoryLoading(false)
      return
    }

    if (window.bmsApi == null) {
      setExpandedCycleDetail(demoCycleDetail)
      setIsHistoryLoading(false)
      return
    }

    window.bmsApi
      .getDischargeCycleDetail(cycleId)
      .then((detail) => {
        setExpandedCycleDetail(detail ?? demoCycleDetail)
      })
      .catch(() => {
        setExpandedCycleDetail(demoCycleDetail)
      })
      .finally(() => {
        setIsHistoryLoading(false)
      })
  }

  return (
    <div className="app-shell">
      <Sidebar
        items={navItems}
        activeId={activePage}
        onSelect={handleSelectPage}
      />

      <main
        className={`dashboard ${activePage === 'voltage' ? 'dashboard--voltage' : ''}`}
      >
        {activePage === 'home' && (
          <HomePage
            alerts={telemetry.alerts}
            homeMetrics={telemetry.homeMetrics}
            batteryState={telemetry.batteryState}
          />
        )}

        {activePage === 'voltage' && (
          <VoltagePage voltagePage={telemetry.voltagePage} />
        )}

        {activePage === 'current' && (
          <CurrentPage currentPage={telemetry.currentPage} />
        )}

        {activePage === 'temperature' && (
          <TemperaturePage temperaturePage={telemetry.temperaturePage} />
        )}

        {activePage === 'history' && (
          <HistoryPage
            cycles={cycles}
            expandedCycleId={expandedCycleId}
            expandedCycleDetail={expandedCycleDetail}
            isLoading={isHistoryLoading}
            onToggleCycle={handleToggleCycle}
          />
        )}
      </main>
    </div>
  )
}

export default App
