import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseSerial } from './SerialParse/ParseSerialJSON.js'
import type { BatteryTelemetry, TrendPoint } from '../shared/battery.js'
import { isDev } from './util.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const batteryTelemetryChannel = 'battery:telemetry'
const historyLimit = 24

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
  },
  voltagePage: {
    sensorVoltages: [3.35, 3.36, 3.37, 3.34, 3.35, 3.38, 3.41, 3.33, 3.32, 3.36, 3.35, 3.37],
    averageCellVoltage: 3.36,
    highestCellVoltage: 3.41,
    lowestCellVoltage: 3.32,
    averageVoltageHistory: [
      { time: '09:00', value: 3.31 },
      { time: '09:05', value: 3.32 },
      { time: '09:10', value: 3.33 },
      { time: '09:15', value: 3.34 },
      { time: '09:20', value: 3.35 },
      { time: '09:25', value: 3.35 },
      { time: '09:30', value: 3.36 },
    ],
  },
  currentPage: {
    sensorCurrent: 48.6,
    currentHistory: [
      { time: '09:00', value: 45.1 },
      { time: '09:05', value: 46.4 },
      { time: '09:10', value: 47.2 },
      { time: '09:15', value: 47.9 },
      { time: '09:20', value: 48.1 },
      { time: '09:25', value: 48.4 },
      { time: '09:30', value: 48.6 },
    ],
  },
  temperaturePage: {
    sensorTemperatures: [30.8, 31.2, 31.9, 31.7],
    averageTemperature: 31.4,
    highestTemperature: 31.9,
    lowestTemperature: 30.8,
    averageTemperatureHistory: [
      { time: '09:00', value: 29.8 },
      { time: '09:05', value: 30.2 },
      { time: '09:10', value: 30.6 },
      { time: '09:15', value: 30.9 },
      { time: '09:20', value: 31.1 },
      { time: '09:25', value: 31.3 },
      { time: '09:30', value: 31.4 },
    ],
  },
}

let mainWindow: BrowserWindow | null = null

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function appendHistory(history: TrendPoint[], value: number) {
  history.push({
    time: formatTimeLabel(new Date()),
    value: Number(value.toFixed(2)),
  })

  if (history.length > historyLimit) {
    history.shift()
  }
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function updateTelemetryFromSerial(data: {
  temps: number[]
  voltages: number[]
  current: number
}) {
  const averageVoltage = average(data.voltages)
  const averageTemperature = average(data.temps)
  const highestTemperature = Math.max(...data.temps)
  const lowestTemperature = Math.min(...data.temps)

  batteryTelemetry.homeMetrics.currentVoltage = Number(
    data.voltages.reduce((sum, value) => sum + value, 0).toFixed(2)
  )
  batteryTelemetry.homeMetrics.current = Number(data.current.toFixed(2))
  batteryTelemetry.homeMetrics.temperature = Number(averageTemperature.toFixed(2))

  batteryTelemetry.voltagePage.sensorVoltages = data.voltages.map((value) => Number(value.toFixed(2)))
  batteryTelemetry.voltagePage.averageCellVoltage = Number(averageVoltage.toFixed(2))
  batteryTelemetry.voltagePage.highestCellVoltage = Number(Math.max(...data.voltages).toFixed(2))
  batteryTelemetry.voltagePage.lowestCellVoltage = Number(Math.min(...data.voltages).toFixed(2))
  appendHistory(batteryTelemetry.voltagePage.averageVoltageHistory, averageVoltage)

  batteryTelemetry.currentPage.sensorCurrent = Number(data.current.toFixed(2))
  appendHistory(batteryTelemetry.currentPage.currentHistory, data.current)

  batteryTelemetry.temperaturePage.sensorTemperatures = data.temps.map((value) => Number(value.toFixed(2)))
  batteryTelemetry.temperaturePage.averageTemperature = Number(averageTemperature.toFixed(2))
  batteryTelemetry.temperaturePage.highestTemperature = Number(highestTemperature.toFixed(2))
  batteryTelemetry.temperaturePage.lowestTemperature = Number(lowestTemperature.toFixed(2))
  appendHistory(batteryTelemetry.temperaturePage.averageTemperatureHistory, averageTemperature)

  mainWindow?.webContents.send(batteryTelemetryChannel, batteryTelemetry)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev()) {
    void mainWindow.loadURL('http://localhost:5555')
    return
  }

  void mainWindow.loadFile(path.join(app.getAppPath(), 'dist-react/index.html'))
}

app.whenReady().then(() => {
  ipcMain.handle('battery:get-telemetry', () => batteryTelemetry)
  createWindow()

  void parseSerial((data) => {
    updateTelemetryFromSerial(data)
  })
})
