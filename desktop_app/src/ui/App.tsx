import './App.css'
import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { HomePage } from './pages/HomePage'
import { VoltagePage } from './pages/VoltagePage'
import type { BatteryTelemetry, PageId } from './types/battery'

const navItems = [
  { id: 'home' as const, label: 'Home' },
  { id: 'voltage' as const, label: 'Voltage' },
  { id: 'current' as const, label: 'Current' },
  { id: 'temperature' as const, label: 'Temperature' },
]

const fallbackTelemetry: BatteryTelemetry = {
  alerts: [],
  homeMetrics: {
    currentVoltage: 402.8,
    current: 48.6,
    temperature: 31.4,
  },
  batteryState: {
    stateOfChargePercent: 84,
    stateOfChargeMah: 4280,
    remainingCycles: 612,
  },
  voltagePage: {
    sensorVoltages: [3.35, 3.36, 3.37, 3.34, 3.35, 3.38, 3.41, 3.33, 3.32, 3.36, 3.35, 3.37],
    averageCellVoltage: 3.36,
    highestCellVoltage: 3.41,
    lowestCellVoltage: 3.32,
    averageVoltageHistory: [
      { time: '09:00', voltage: 3.31 },
      { time: '09:05', voltage: 3.32 },
      { time: '09:10', voltage: 3.33 },
      { time: '09:15', voltage: 3.34 },
      { time: '09:20', voltage: 3.35 },
      { time: '09:25', voltage: 3.35 },
      { time: '09:30', voltage: 3.36 },
    ],
  },
}

function App() {
  const [activePage, setActivePage] = useState<PageId>('home')
  const [telemetry, setTelemetry] = useState<BatteryTelemetry>(fallbackTelemetry)

  useEffect(() => {
    window.bmsApi
      ?.getBatteryTelemetry()
      .then((data) => setTelemetry(data))
      .catch(() => setTelemetry(fallbackTelemetry))
  }, [])

  return (
    <div className="app-shell">
      <Sidebar
        items={navItems}
        activeId={activePage}
        onSelect={setActivePage}
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
          <section className="placeholder-page">
            <span className="dashboard__eyebrow">Current</span>
            <h2>Current page is ready for backend data.</h2>
          </section>
        )}

        {activePage === 'temperature' && (
          <section className="placeholder-page">
            <span className="dashboard__eyebrow">Temperature</span>
            <h2>Temperature page is ready for backend data.</h2>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
