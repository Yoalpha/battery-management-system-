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
