import type {
  BatteryTelemetry,
  DischargeCycleDetail,
  DischargeCycleSummary,
} from '../shared/battery'

declare global {
  interface Window {
    bmsApi?: {
      getBatteryTelemetry: () => Promise<BatteryTelemetry>
      getDischargeCycles: () => Promise<DischargeCycleSummary[]>
      getDischargeCycleDetail: (cycleId: number) => Promise<DischargeCycleDetail | null>
      subscribeToBatteryTelemetry: (
        listener: (telemetry: BatteryTelemetry) => void
      ) => () => void
    }
  }
}

export {}
