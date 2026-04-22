const { contextBridge, ipcRenderer } = require('electron')

const batteryTelemetryChannel = 'battery:telemetry'

contextBridge.exposeInMainWorld('bmsApi', {
  getBatteryTelemetry: () => ipcRenderer.invoke('battery:get-telemetry'),
  stopActiveDischargeCycle: () => ipcRenderer.invoke('cycles:stop-active'),
  getDischargeCycles: () => ipcRenderer.invoke('cycles:list'),
  getDischargeCycleDetail: (cycleId) => ipcRenderer.invoke('cycles:get-detail', cycleId),
  subscribeToBatteryTelemetry: (listener) => {
    const handleTelemetry = (_event, telemetry) => {
      listener(telemetry)
    }

    ipcRenderer.on(batteryTelemetryChannel, handleTelemetry)

    return () => {
      ipcRenderer.removeListener(batteryTelemetryChannel, handleTelemetry)
    }
  },
})
