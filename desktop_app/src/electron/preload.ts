import { contextBridge, ipcRenderer } from 'electron'
import type { BatteryTelemetry } from '../shared/battery.js'

const batteryTelemetryChannel = 'battery:telemetry'

contextBridge.exposeInMainWorld('bmsApi', {
  getBatteryTelemetry: () => ipcRenderer.invoke('battery:get-telemetry'),
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
