import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import type { MessageBoxOptions } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseSerial } from './SerialParse/ParseSerialJSON.js'
import type { BatteryTelemetry, TrendPoint } from '../shared/battery.js'
import { TelemetryStore } from './telemetryStore.js'
import { isDev } from './util.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const batteryTelemetryChannel = 'battery:telemetry'
const historyWindowMs = 10 * 60 * 1000
const serialDisconnectedAlert = 'Waiting for Arduino serial connection.'
const dischargeRecordingAlert = 'Discharge cycle recording in progress.'
const dischargeConfirmationAlert = 'Discharge detected. Confirm to begin recording this discharge cycle.'
const lowVoltageAlert = 'Pack voltage reached 35 V. Data polling has been stopped.'
const dischargeStartThresholdAmps = 1
const dischargeEndThresholdAmps = 0.2
const dischargeStartHoldMs = 5_000
const dischargeEndHoldMs = 20_000
const minimumPackVoltage = 35

// Seed the live charts with placeholder points so the UI has a stable shape before serial data arrives.
function createInitialHistory(values: Array<{ time: string; value: number }>, now = Date.now()): TrendPoint[] {
  const stepMs = historyWindowMs / Math.max(values.length - 1, 1)

  return values.map((point, index) => ({
    ...point,
    timestampMs: now - historyWindowMs + index * stepMs,
  }))
}

const batteryTelemetry: BatteryTelemetry = {
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
    internalResistanceGrowth: 0
  },
  voltagePage: {
    sensorVoltages: [3.35, 3.36, 3.37, 3.34, 3.35, 3.38, 3.41, 3.33, 3.32, 3.36, 3.35, 3.37],
    averageCellVoltage: 3.36,
    highestCellVoltage: 3.41,
    lowestCellVoltage: 3.32,
    averageVoltageHistory: createInitialHistory([
      { time: '09:00', value: 3.31 },
      { time: '09:05', value: 3.32 },
      { time: '09:10', value: 3.33 },
      { time: '09:15', value: 3.34 },
      { time: '09:20', value: 3.35 },
      { time: '09:25', value: 3.35 },
      { time: '09:30', value: 3.36 },
    ]),
  },
  currentPage: {
    sensorCurrent: 48.6,
    currentHistory: createInitialHistory([
      { time: '09:00', value: 45.1 },
      { time: '09:05', value: 46.4 },
      { time: '09:10', value: 47.2 },
      { time: '09:15', value: 47.9 },
      { time: '09:20', value: 48.1 },
      { time: '09:25', value: 48.4 },
      { time: '09:30', value: 48.6 },
    ]),
  },
  temperaturePage: {
    sensorTemperatures: [30.8, 31.2, 31.9, 31.7],
    averageTemperature: 31.4,
    highestTemperature: 31.9,
    lowestTemperature: 30.8,
    averageTemperatureHistory: createInitialHistory([
      { time: '09:00', value: 29.8 },
      { time: '09:05', value: 30.2 },
      { time: '09:10', value: 30.6 },
      { time: '09:15', value: 30.9 },
      { time: '09:20', value: 31.1 },
      { time: '09:25', value: 31.3 },
      { time: '09:30', value: 31.4 },
    ]),
  },
}

let mainWindow: BrowserWindow | null = null
let stopSerialReader: (() => void) | null = null
let telemetryStore: TelemetryStore | null = null
let activeCycleId: number | null = null
let dischargeState: 'idle' | 'candidate_discharge' | 'awaiting_confirmation' | 'discharging' | 'candidate_end' = 'idle'
let dischargeStateSinceMs: number | null = null
let loggingStoppedForLowVoltage = false

// Add a user-facing alert only once.
function addAlert(message: string) {
  if (!batteryTelemetry.alerts.includes(message)) {
    batteryTelemetry.alerts = [...batteryTelemetry.alerts, message]
  }
}

// Remove a user-facing alert if it is no longer relevant.
function removeAlert(message: string) {
  batteryTelemetry.alerts = batteryTelemetry.alerts.filter((alert) => alert !== message)
}

// Push the latest in-memory telemetry snapshot to the renderer process.
function sendTelemetryUpdate() {
  mainWindow?.webContents.send(batteryTelemetryChannel, batteryTelemetry)
}

// Format timestamps for chart labels and compact UI display.
function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Append one point to a rolling chart history and trim anything older than the 10 minute window.
function appendHistory(history: TrendPoint[], value: number) {
  const timestampMs = Date.now()

  history.push({
    time: formatTimeLabel(new Date(timestampMs)),
    timestampMs,
    value: Number(value.toFixed(2)),
  })

  while (history.length > 0 && history[0].timestampMs < timestampMs - historyWindowMs) {
    history.shift()
  }
}

// Compute a numeric average for a non-empty set of values.
function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

// Convert cumulative tap voltages into per-cell voltages expected by the UI.
function computeCellVoltagesFromTapReadings(tapVoltages: number[]) {
  return tapVoltages.map((tapVoltage, index) => {
    const previousTapVoltage = index === 0 ? 0 : tapVoltages[index - 1]
    return Number((tapVoltage - previousTapVoltage).toFixed(2))
  })
}

type LiveTelemetryData = {
  temps: number[]
  voltages: number[]
  current: number
}

type ComputedTelemetryMetrics = {
  packVoltage: number
  cellVoltages: number[]
  averageVoltage: number
  averageTemperature: number | null
  highestTemperature: number | null
  lowestTemperature: number | null
}

// Derive UI-friendly metrics from the normalized serial payload.
function computeTelemetryMetrics(data: LiveTelemetryData): ComputedTelemetryMetrics {
  const cellVoltages = computeCellVoltagesFromTapReadings(data.voltages)
  const packVoltage = Math.max(...data.voltages)

  return {
    packVoltage: Number(packVoltage.toFixed(2)),
    cellVoltages,
    averageVoltage: average(cellVoltages),
    averageTemperature: data.temps.length > 0 ? average(data.temps) : null,
    highestTemperature: data.temps.length > 0 ? Math.max(...data.temps) : null,
    lowestTemperature: data.temps.length > 0 ? Math.min(...data.temps) : null,
  }
}

// Update the live telemetry snapshot from one parsed serial sample.
function updateTelemetryFromSerial(data: LiveTelemetryData, metrics: ComputedTelemetryMetrics) {
  removeAlert(serialDisconnectedAlert)

  batteryTelemetry.homeMetrics.currentVoltage = metrics.packVoltage
  batteryTelemetry.homeMetrics.current = Number(data.current.toFixed(2))
  if (metrics.averageTemperature != null) {
    batteryTelemetry.homeMetrics.temperature = Number(metrics.averageTemperature.toFixed(2))
  }

  batteryTelemetry.voltagePage.sensorVoltages = data.voltages.map((value) => Number(value.toFixed(2)))
  batteryTelemetry.voltagePage.averageCellVoltage = Number(metrics.averageVoltage.toFixed(2))
  batteryTelemetry.voltagePage.highestCellVoltage = Number(Math.max(...metrics.cellVoltages).toFixed(2))
  batteryTelemetry.voltagePage.lowestCellVoltage = Number(Math.min(...metrics.cellVoltages).toFixed(2))
  appendHistory(batteryTelemetry.voltagePage.averageVoltageHistory, metrics.averageVoltage)

  batteryTelemetry.currentPage.sensorCurrent = Number(data.current.toFixed(2))
  appendHistory(batteryTelemetry.currentPage.currentHistory, data.current)

  if (metrics.averageTemperature != null) {
    batteryTelemetry.temperaturePage.sensorTemperatures = data.temps.map((value) => Number(value.toFixed(2)))
    batteryTelemetry.temperaturePage.averageTemperature = Number(metrics.averageTemperature.toFixed(2))
    batteryTelemetry.temperaturePage.highestTemperature = Number(metrics.highestTemperature!.toFixed(2))
    batteryTelemetry.temperaturePage.lowestTemperature = Number(metrics.lowestTemperature!.toFixed(2))
    appendHistory(batteryTelemetry.temperaturePage.averageTemperatureHistory, metrics.averageTemperature)
  }

  sendTelemetryUpdate()
}

// Mark the live feed as disconnected without clearing the most recent telemetry values.
function setSerialDisconnected() {
  addAlert(serialDisconnectedAlert)
  sendTelemetryUpdate()
}

// Toggle the alert that indicates whether the current discharge is being recorded.
function setRecordingAlert(isRecording: boolean) {
  if (isRecording) {
    addAlert(dischargeRecordingAlert)
    return
  }

  removeAlert(dischargeRecordingAlert)
}

// Ask the user to confirm that a sustained discharge current should start a discharge cycle.
async function confirmDischargeStart(packVoltage: number, current: number): Promise<boolean> {
  addAlert(dischargeConfirmationAlert)
  sendTelemetryUpdate()

  const dialogOptions: MessageBoxOptions = {
    type: 'warning',
    title: 'Confirm Discharge',
    message: 'Discharge detected.',
    detail: `Current is ${current.toFixed(2)} A and pack voltage is ${packVoltage.toFixed(2)} V.\nConfirm to start recording this discharge cycle.`,
    buttons: ['Confirm', 'Ignore'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  }
  const response = mainWindow != null
    ? await dialog.showMessageBox(mainWindow, dialogOptions)
    : await dialog.showMessageBox(dialogOptions)

  removeAlert(dischargeConfirmationAlert)
  return response.response === 0
}

// Open a new discharge cycle in the database and update the live cycle state.
function startDischargeCycle(timestampMs: number, packVoltage: number, current: number) {
  if (telemetryStore == null || activeCycleId != null) {
    return
  }

  activeCycleId = telemetryStore.startCycle(timestampMs, current, packVoltage)
  dischargeState = 'discharging'
  dischargeStateSinceMs = timestampMs
  setRecordingAlert(true)
  sendTelemetryUpdate()
}

// Close the active discharge cycle and reset the cycle-detection state machine.
function endDischargeCycle(
  timestampMs: number,
  packVoltage: number,
  status: 'completed' | 'aborted',
  reason: 'auto_end' | 'voltage_limit' | 'manual' | 'aborted'
) {
  if (telemetryStore != null && activeCycleId != null) {
    telemetryStore.endCycle(activeCycleId, timestampMs, status, reason, packVoltage)
  }

  activeCycleId = null
  dischargeState = 'idle'
  dischargeStateSinceMs = null
  setRecordingAlert(false)
}

// Persist one live sample into the currently active discharge cycle.
function persistSample(
  timestampMs: number,
  data: LiveTelemetryData,
  metrics: ComputedTelemetryMetrics
) {
  if (telemetryStore == null || activeCycleId == null) {
    return
  }

  telemetryStore.insertSample({
    cycleId: activeCycleId,
    recordedAtMs: timestampMs,
    packVoltage: metrics.packVoltage,
    current: data.current,
    averageTemperature: metrics.averageTemperature ?? batteryTelemetry.temperaturePage.averageTemperature,
    highestTemperature: metrics.highestTemperature ?? batteryTelemetry.temperaturePage.highestTemperature,
    lowestTemperature: metrics.lowestTemperature ?? batteryTelemetry.temperaturePage.lowestTemperature,
    cellVoltages: data.voltages,
    sensorTemperatures: data.temps.length > 0
      ? data.temps
      : batteryTelemetry.temperaturePage.sensorTemperatures,
  })
}

// Stop discharge logging at the low-voltage limit while keeping live telemetry running.
async function stopPollingForVoltageLimit(
  timestampMs: number,
  data: LiveTelemetryData,
  metrics: ComputedTelemetryMetrics
) {
  if (loggingStoppedForLowVoltage) {
    return
  }

  loggingStoppedForLowVoltage = true
  addAlert(lowVoltageAlert)
  removeAlert(serialDisconnectedAlert)
  removeAlert(dischargeConfirmationAlert)
  setRecordingAlert(false)

  if (activeCycleId != null) {
    persistSample(timestampMs, data, metrics)
    endDischargeCycle(timestampMs, metrics.packVoltage, 'completed', 'voltage_limit')
  }

  sendTelemetryUpdate()

  const dialogOptions: MessageBoxOptions = {
    type: 'error',
    title: 'Voltage Below Limit',
    message: 'Pack voltage reached 35 V.',
    detail: 'Discharge logging has been stopped, but live telemetry will continue updating.',
    buttons: ['OK'],
    defaultId: 0,
    noLink: true,
  }

  if (mainWindow != null) {
    await dialog.showMessageBox(mainWindow, dialogOptions)
    return
  }

  await dialog.showMessageBox(dialogOptions)
}

// Advance the discharge-cycle state machine based on the newest live sample.
async function handleDischargeState(
  timestampMs: number,
  data: LiveTelemetryData,
  metrics: ComputedTelemetryMetrics
) {
  if (activeCycleId != null && metrics.packVoltage <= minimumPackVoltage) {
    await stopPollingForVoltageLimit(timestampMs, data, metrics)
    return
  }

  if (metrics.packVoltage > minimumPackVoltage && loggingStoppedForLowVoltage) {
    loggingStoppedForLowVoltage = false
    removeAlert(lowVoltageAlert)
    sendTelemetryUpdate()
  }

  if (activeCycleId != null && !loggingStoppedForLowVoltage) {
    persistSample(timestampMs, data, metrics)
  }

  if (activeCycleId == null && dischargeState !== 'awaiting_confirmation') {
    if (data.current >= dischargeStartThresholdAmps) {
      if (dischargeState !== 'candidate_discharge') {
        dischargeState = 'candidate_discharge'
        dischargeStateSinceMs = timestampMs
      } else if (
        dischargeStateSinceMs != null &&
        timestampMs - dischargeStateSinceMs >= dischargeStartHoldMs
      ) {
        dischargeState = 'awaiting_confirmation'
        const confirmed = await confirmDischargeStart(metrics.packVoltage, data.current)

        if (loggingStoppedForLowVoltage) {
          return
        }

        if (confirmed) {
          startDischargeCycle(timestampMs, metrics.packVoltage, data.current)
          persistSample(timestampMs, data, metrics)
        } else {
          dischargeState = 'idle'
          dischargeStateSinceMs = null
          sendTelemetryUpdate()
        }
      }
    } else {
      dischargeState = 'idle'
      dischargeStateSinceMs = null
    }

    return
  }

  if (activeCycleId == null) {
    return
  }

  if (data.current < dischargeEndThresholdAmps) {
    if (dischargeState !== 'candidate_end') {
      dischargeState = 'candidate_end'
      dischargeStateSinceMs = timestampMs
    } else if (
      dischargeStateSinceMs != null &&
      timestampMs - dischargeStateSinceMs >= dischargeEndHoldMs
    ) {
      endDischargeCycle(timestampMs, metrics.packVoltage, 'completed', 'auto_end')
      sendTelemetryUpdate()
    }

    return
  }

  dischargeState = 'discharging'
  dischargeStateSinceMs = timestampMs
}

// Create the Electron browser window and verify that the preload bridge is available after load.
function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev()) {
    void mainWindow.loadURL('http://localhost:5555')
  } else {
    void mainWindow.loadFile(path.join(app.getAppPath(), 'dist-react/index.html'))
  }

  mainWindow.webContents.on('did-finish-load', () => {
    void mainWindow?.webContents.executeJavaScript('typeof window.bmsApi')
      .then((result) => {
        console.log('WINDOW window.bmsApi type', result)
      })
      .catch((error) => {
        console.error('WINDOW failed to inspect window.bmsApi', error)
      })
  })
}

app.whenReady().then(() => {
  telemetryStore = new TelemetryStore(path.join(app.getPath('userData'), 'data'))
  ipcMain.handle('battery:get-telemetry', () => batteryTelemetry)
  ipcMain.handle('cycles:list', () => telemetryStore?.getCycleSummaries() ?? [])
  ipcMain.handle('cycles:get-detail', (_event, cycleId: number) => {
    return telemetryStore?.getCycleDetail(cycleId) ?? null
  })
  createWindow()
  setSerialDisconnected()

  void parseSerial({
    onData: (data) => {
      const metrics = computeTelemetryMetrics(data)
      const timestampMs = Date.now()

      updateTelemetryFromSerial(data, metrics)
      void handleDischargeState(timestampMs, data, metrics)
    },
    onDisconnected: () => {
      setSerialDisconnected()
    },
  })
    .then((cleanup) => {
      stopSerialReader = cleanup
    })
    .catch((error: unknown) => {
      console.error('Failed to start serial parser:', error)
      setSerialDisconnected()
    })
})

app.on('before-quit', () => {
  stopSerialReader?.()
  telemetryStore?.close()
})
