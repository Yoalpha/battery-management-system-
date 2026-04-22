export type PageId = 'home' | 'voltage' | 'current' | 'temperature' | 'history'

export type TrendPoint = {
  time: string
  timestampMs: number
  value: number
}

export type DischargeCycleSummary = {
  id: number
  startedAtMs: number
  endedAtMs: number | null
  status: string
  startPackVoltage: number
  endPackVoltage: number | null
  triggerCurrent: number
  sampleCount: number
  drainedMah: number
  startInternalResistance: number | null
  endInternalResistance: number | null
  internalResistanceGrowth: number
}

export type DischargeCycleDetail = {
  summary: DischargeCycleSummary
  voltageTrend: TrendPoint[]
  currentTrend: TrendPoint[]
  temperatureTrend: TrendPoint[]
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
    initialInternalResistance: number | null
    finalInternalResistance: number | null
    internalResistanceGrowth: number
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
