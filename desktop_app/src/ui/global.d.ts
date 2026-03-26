import type { BatteryTelemetry } from '../shared/battery'

declare global {
  interface Window {
    bmsApi?: {
      getBatteryTelemetry: () => Promise<BatteryTelemetry>
      subscribeToBatteryTelemetry: (
        listener: (telemetry: BatteryTelemetry) => void
      ) => () => void
    }
  }
}

export {}
