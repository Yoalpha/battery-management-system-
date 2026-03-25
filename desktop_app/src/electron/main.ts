import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { isDev } from './util.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)



const batteryTelemetry = {
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

function createWindow() {
  const mainWindow = new BrowserWindow({
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
})
