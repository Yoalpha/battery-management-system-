export type PageId = 'home' | 'voltage' | 'current' | 'temperature'

export type TrendPoint = {
  time: string
  value: number
}

export type BatteryTelemetry = {
  alerts: string[]
  homeMetrics: {
    currentVoltage: number
    current: number
    temperature: number
  }
  batteryState: {
    stateOfChargePercent: number
    stateOfChargeMah: number
    remainingCycles: number
  }
  voltagePage: {
    sensorVoltages: number[]
    averageCellVoltage: number
    highestCellVoltage: number
    lowestCellVoltage: number
    averageVoltageHistory: TrendPoint[]
  }
  currentPage: {
    sensorCurrent: number
    currentHistory: TrendPoint[]
  }
  temperaturePage: {
    sensorTemperatures: number[]
    averageTemperature: number
    highestTemperature: number
    lowestTemperature: number
    averageTemperatureHistory: TrendPoint[]
  }
}
