import type { DischargeCycleDetail, TrendPoint } from './battery.js'

export type DemoCycleSample = {
  recordedAtMs: number
  packVoltage: number
  current: number
  averageTemperature: number
  highestTemperature: number
  lowestTemperature: number
  cellVoltages: number[]
  sensorTemperatures: number[]
}

export type DemoCycleData = {
  detail: DischargeCycleDetail
  samples: DemoCycleSample[]
}

const demoCycleDurationMinutes = 135
const demoCycleSampleCount = 45
const demoCycleIntervalMs = 30_000

function createTrendPoint(timestampMs: number, value: number): TrendPoint {
  return {
    time: new Date(timestampMs).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    timestampMs,
    value: Number(value.toFixed(2)),
  }
}

export function createDemoCycleData(now = Date.now()): DemoCycleData {
  const startedAtMs = now - demoCycleDurationMinutes * 60_000
  const samples: DemoCycleSample[] = Array.from({ length: demoCycleSampleCount }, (_, index) => {
    const progress = index / Math.max(demoCycleSampleCount - 1, 1)
    const recordedAtMs = startedAtMs + index * demoCycleIntervalMs
    const packVoltage = 50.6 - progress * 15.4
    const current = -(12.4 - progress * 3.2 + Math.sin(index / 5) * 0.45)
    const averageTemperature = 27.5 + progress * 8.6 + Math.sin(index / 6) * 0.35
    const cellBaseVoltage = packVoltage / 12
    const cellVoltages = Array.from({ length: 12 }, (_, cellIndex) => {
      const offset = (cellIndex % 4) * 0.008 - 0.012
      return Number((cellBaseVoltage + offset).toFixed(3))
    })
    const sensorTemperatures = Array.from({ length: 4 }, (_, sensorIndex) => {
      const offset = sensorIndex * 0.45 - 0.65
      return Number((averageTemperature + offset).toFixed(2))
    })

    return {
      recordedAtMs,
      packVoltage: Number(packVoltage.toFixed(2)),
      current: Number(current.toFixed(2)),
      averageTemperature: Number(averageTemperature.toFixed(2)),
      highestTemperature: Math.max(...sensorTemperatures),
      lowestTemperature: Math.min(...sensorTemperatures),
      cellVoltages,
      sensorTemperatures,
    }
  })

  const endedAtMs = samples[samples.length - 1]?.recordedAtMs ?? startedAtMs
  const drainedMah = 4021.5

  return {
    detail: {
      summary: {
        id: -1,
        startedAtMs,
        endedAtMs,
        status: 'demo',
        startPackVoltage: 50.6,
        endPackVoltage: 35.2,
        triggerCurrent: -12.4,
        sampleCount: demoCycleSampleCount,
        drainedMah,
        startInternalResistance: 0.1126,
        endInternalResistance: 0.131,
        internalResistanceGrowth: 0.0184,
      },
      voltageTrend: samples.map((sample) => createTrendPoint(sample.recordedAtMs, sample.packVoltage)),
      currentTrend: samples.map((sample) => createTrendPoint(sample.recordedAtMs, sample.current)),
      temperatureTrend: samples.map((sample) => createTrendPoint(sample.recordedAtMs, sample.averageTemperature)),
    },
    samples,
  }
}
