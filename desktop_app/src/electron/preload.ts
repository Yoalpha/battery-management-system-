import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('bmsApi', {
  getBatteryTelemetry: () => ipcRenderer.invoke('battery:get-telemetry'),
})
