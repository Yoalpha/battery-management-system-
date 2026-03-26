import './App.css'
import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { HomePage } from './pages/HomePage'
import { CurrentPage } from './pages/CurrentPage'
import { TemperaturePage } from './pages/TemperaturePage'
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
      { time: '09:00', value: 0 },
      { time: '09:05', value: 0 },
    ],
  },
  currentPage: {
    sensorCurrent: 0,
    currentHistory: [
      { time: '09:00', value: 0 },
      { time: '09:05', value: 0 },
    ],
  },
  temperaturePage: {
    sensorTemperatures: [0, 0, 0, 0],
    averageTemperature: 0,
    highestTemperature: 0,
    lowestTemperature: 0,
    averageTemperatureHistory: [
      { time: '09:00', value: 0 },
      { time: '09:05', value: 0 },
    ],
  },
}

function App() {
  const [activePage, setActivePage] = useState<PageId>('home')
  const [telemetry, setTelemetry] = useState<BatteryTelemetry>(fallbackTelemetry)

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
          <CurrentPage currentPage={telemetry.currentPage} />
        )}

        {activePage === 'temperature' && (
          <TemperaturePage temperaturePage={telemetry.temperaturePage} />
        )}
      </main>
    </div>
  )
}

export default App
