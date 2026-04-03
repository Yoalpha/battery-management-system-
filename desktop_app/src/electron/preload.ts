import { contextBridge, ipcRenderer } from 'electron'
import type {
  BatteryTelemetry,
  DischargeCycleDetail,
  DischargeCycleSummary,
} from '../shared/battery.js'

const batteryTelemetryChannel = 'battery:telemetry'

contextBridge.exposeInMainWorld('bmsApi', {
  getBatteryTelemetry: () => ipcRenderer.invoke('battery:get-telemetry'),
  getDischargeCycles: () => ipcRenderer.invoke('cycles:list') as Promise<DischargeCycleSummary[]>,
  getDischargeCycleDetail: (cycleId: number) =>
    ipcRenderer.invoke('cycles:get-detail', cycleId) as Promise<DischargeCycleDetail | null>,
  subscribeToBatteryTelemetry: (listener: (telemetry: BatteryTelemetry) => void) => {
    const handleTelemetry = (_event: unknown, telemetry: BatteryTelemetry) => {
      listener(telemetry)
    }

    ipcRenderer.on(batteryTelemetryChannel, handleTelemetry)

    return () => {
      ipcRenderer.removeListener(batteryTelemetryChannel, handleTelemetry)
    }
  },
})
