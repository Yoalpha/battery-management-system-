import type {
  BatteryTelemetry,
  DischargeCycleDetail,
  DischargeCycleSummary,
} from '../shared/battery'

declare global {
  interface Window {
    bmsApi?: {
      getBatteryTelemetry: () => Promise<BatteryTelemetry>
      stopActiveDischargeCycle: () => Promise<void>
      getDischargeCycles: () => Promise<DischargeCycleSummary[]>
      getDischargeCycleDetail: (cycleId: number) => Promise<DischargeCycleDetail | null>
      subscribeToBatteryTelemetry: (
        listener: (telemetry: BatteryTelemetry) => void
      ) => () => void
    }
  }
}

export {}
