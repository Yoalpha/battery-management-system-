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
const highTemperatureAlert = 'One or more temperature sensors exceeded 60 °C.'
const dischargeStartThresholdAmps = 1
const dischargeEndThresholdAmps = 1
const dischargeStartHoldMs = 5_000
const minimumPackVoltage = 35
const packOpenCircuitVoltageReference = 46.5
const packHealthCutoffVoltage = 40
const factoryDischargeCapacityMah = 11_700
const openCircuitCaptureThresholdAmps = 0.3
const endLoadCaptureDeltaAmps = 0.5

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
    currentVoltage: 0,
    current: 0,
    temperature: 0,
  },
  batteryState: {
    stateOfChargePercent: 0,
    stateOfChargeMah: 0,
    remainingCycles: 0,
    initialInternalResistance: null,
    finalInternalResistance: null,
    internalResistanceGrowth: 0
  },
  voltagePage: {
    sensorVoltages: [0,0,0,0,0,0,0,0,0,0,0,0],
    averageCellVoltage: 0,
    highestCellVoltage: 0,
    lowestCellVoltage: 0,
    averageVoltageHistory: createInitialHistory([
      { time: '09:00', value: 0 },
      { time: '09:05', value: 0 },
      { time: '09:10', value: 0 },
      { time: '09:15', value: 0 },
      { time: '09:20', value: 0 },
      { time: '09:25', value: 0 },
      { time: '09:30', value: 0 },
    ]),
  },
  currentPage: {
    sensorCurrent: 0,
    currentHistory: createInitialHistory([
      { time: '09:00', value: 0 },
      { time: '09:05', value: 0 },
      { time: '09:10', value: 0 },
      { time: '09:15', value: 0 },
      { time: '09:20', value: 0 },
      { time: '09:25', value: 0 },
      { time: '09:30', value: 0 },
    ]),
  },
  temperaturePage: {
    sensorTemperatures: [0, 0, 0, 0],
    averageTemperature: 0,
    highestTemperature: 0,
    lowestTemperature: 0,
    averageTemperatureHistory: createInitialHistory([
      { time: '09:00', value: 0 },
      { time: '09:05', value: 0 },
      { time: '09:10', value: 0 },
      { time: '09:15', value: 0 },
      { time: '09:20', value: 0 },
      { time: '09:25', value: 0 },
      { time: '09:30', value: 0 },
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
let startPackInternalResistanceOhms: number | null = null
let endPackInternalResistanceOhms: number | null = null
let latestOpenCircuitPackVoltage = packOpenCircuitVoltageReference
let endLoadedPackVoltage: number | null = null
let endLoadedCurrent: number | null = null
let previousDischargeCurrentSample: number | null = null
let activeCycleHealthSamples: Array<{ timestampMs: number; packVoltage: number; current: number }> = []

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

// Estimate pack internal resistance from open-circuit voltage, loaded voltage, and discharge current.
function calculatePackInternalResistance(openCircuitVoltage: number, loadedVoltage: number, current: number) {
  if (current <= 0) {
    return null
  }

  return (openCircuitVoltage - loadedVoltage) / current
}

// Calculate resistance growth from the start-of-discharge and end-of-discharge resistance snapshots.
function calculateInternalResistanceGrowth(
  startResistanceOhms: number | null,
  endResistanceOhms: number | null
) {
  if (startResistanceOhms == null || endResistanceOhms == null) {
    return 0
  }

  return Number((endResistanceOhms - startResistanceOhms).toFixed(4))
}

// Integrate discharge current only across the 46.5 V to 40.0 V pack-voltage window.
function calculateWindowDischargedMah(samples: HealthSample[]) {
  if (samples.length < 2) {
    return 0
  }

  let drainedAmpHours = 0

  for (let index = 1; index < samples.length; index += 1) {
    const previousSample = samples[index - 1]
    const currentSample = samples[index]

    if (previousSample.packVoltage < packHealthCutoffVoltage) {
      break
    }

    const elapsedHours = Math.max(currentSample.timestampMs - previousSample.timestampMs, 0) / 3_600_000
    if (elapsedHours === 0) {
      continue
    }

    const previousCurrent = Math.max(previousSample.current, 0)
    const nextCurrent = Math.max(currentSample.current, 0)

    if (currentSample.packVoltage >= packHealthCutoffVoltage) {
      drainedAmpHours += ((previousCurrent + nextCurrent) / 2) * elapsedHours
      continue
    }

    const voltageSpan = previousSample.packVoltage - currentSample.packVoltage
    const fractionUntilCutoff = voltageSpan > 0
      ? (previousSample.packVoltage - packHealthCutoffVoltage) / voltageSpan
      : 0
    const clampedFraction = Math.min(Math.max(fractionUntilCutoff, 0), 1)
    const cutoffCurrent = previousCurrent + (nextCurrent - previousCurrent) * clampedFraction
    drainedAmpHours += ((previousCurrent + cutoffCurrent) / 2) * elapsedHours * clampedFraction
    break
  }

  return drainedAmpHours * 1000
}

// Convert measured discharge capacity in the target voltage window into state-of-health metrics.
function updateBatteryHealthFromSamples(samples: HealthSample[]) {
  const drainedMah = calculateWindowDischargedMah(samples)
  const healthPercent = factoryDischargeCapacityMah > 0
    ? (drainedMah / factoryDischargeCapacityMah) * 100
    : 0

  batteryTelemetry.batteryState.stateOfChargeMah = Number(drainedMah.toFixed(2))
  batteryTelemetry.batteryState.stateOfChargePercent = Number(healthPercent.toFixed(2))
}

type LiveTelemetryData = {
  temps: number[]
  voltages: number[]
  current: number
}

type HealthSample = {
  timestampMs: number
  packVoltage: number
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

  if (data.temps.some((temperature) => temperature > 60)) {
    addAlert(highTemperatureAlert)
  } else {
    removeAlert(highTemperatureAlert)
  }

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

  activeCycleHealthSamples = [{
    timestampMs,
    packVoltage,
    current,
  }]
  startPackInternalResistanceOhms = calculatePackInternalResistance(
    latestOpenCircuitPackVoltage,
    packVoltage,
    current
  )
  activeCycleId = telemetryStore.startCycle(
    timestampMs,
    current,
    packVoltage,
    startPackInternalResistanceOhms
  )
  endPackInternalResistanceOhms = null
  endLoadedPackVoltage = packVoltage
  endLoadedCurrent = current
  previousDischargeCurrentSample = current
  batteryTelemetry.batteryState.initialInternalResistance = startPackInternalResistanceOhms != null
    ? Number(startPackInternalResistanceOhms.toFixed(4))
    : null
  batteryTelemetry.batteryState.finalInternalResistance = null
  batteryTelemetry.batteryState.internalResistanceGrowth = 0
  updateBatteryHealthFromSamples(activeCycleHealthSamples)
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
  if (
    activeCycleHealthSamples.length === 0 ||
    activeCycleHealthSamples[activeCycleHealthSamples.length - 1].timestampMs !== timestampMs
  ) {
    activeCycleHealthSamples.push({
      timestampMs,
      packVoltage,
      current: batteryTelemetry.homeMetrics.current,
    })
  }

  endPackInternalResistanceOhms = (
    endLoadedPackVoltage != null &&
    endLoadedCurrent != null
  )
    ? calculatePackInternalResistance(
        packVoltage,
        endLoadedPackVoltage,
        endLoadedCurrent
      )
    : null
  const finalInternalResistanceGrowth = calculateInternalResistanceGrowth(
    startPackInternalResistanceOhms,
    endPackInternalResistanceOhms
  )

  if (telemetryStore != null && activeCycleId != null) {
    telemetryStore.endCycle(
      activeCycleId,
      timestampMs,
      status,
      reason,
      packVoltage,
      startPackInternalResistanceOhms,
      endPackInternalResistanceOhms,
      finalInternalResistanceGrowth
    )
  }

  activeCycleId = null
  batteryTelemetry.batteryState.initialInternalResistance = startPackInternalResistanceOhms != null
    ? Number(startPackInternalResistanceOhms.toFixed(4))
    : null
  batteryTelemetry.batteryState.finalInternalResistance = endPackInternalResistanceOhms != null
    ? Number(endPackInternalResistanceOhms.toFixed(4))
    : null
  updateBatteryHealthFromSamples(activeCycleHealthSamples)
  startPackInternalResistanceOhms = null
  endPackInternalResistanceOhms = null
  endLoadedPackVoltage = null
  endLoadedCurrent = null
  previousDischargeCurrentSample = null
  activeCycleHealthSamples = []
  batteryTelemetry.batteryState.internalResistanceGrowth = finalInternalResistanceGrowth
  dischargeState = 'idle'
  dischargeStateSinceMs = null
  setRecordingAlert(false)
}

// Stop the active discharge cycle on demand from the renderer.
function stopDischargeCycleManually() {
  if (activeCycleId == null) {
    return
  }

  endDischargeCycle(Date.now(), batteryTelemetry.homeMetrics.currentVoltage, 'completed', 'manual')
  sendTelemetryUpdate()
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

  activeCycleHealthSamples.push({
    timestampMs,
    packVoltage: metrics.packVoltage,
    current: data.current,
  })
  updateBatteryHealthFromSamples(activeCycleHealthSamples)

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
  if (activeCycleId == null && data.current < openCircuitCaptureThresholdAmps) {
    latestOpenCircuitPackVoltage = metrics.packVoltage
  }

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
    if (
      previousDischargeCurrentSample != null &&
      previousDischargeCurrentSample - data.current >= endLoadCaptureDeltaAmps
    ) {
      endLoadedPackVoltage = metrics.packVoltage
      endLoadedCurrent = data.current
    }

    previousDischargeCurrentSample = data.current
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
    endDischargeCycle(timestampMs, metrics.packVoltage, 'completed', 'auto_end')
    sendTelemetryUpdate()
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
  ipcMain.handle('cycles:stop-active', () => {
    stopDischargeCycleManually()
  })
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
