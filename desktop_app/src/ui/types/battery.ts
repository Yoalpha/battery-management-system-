export type PageId = 'home' | 'voltage' | 'current' | 'temperature'

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
    averageVoltageHistory: Array<{
      time: string
      voltage: number
    }>
  }
}
