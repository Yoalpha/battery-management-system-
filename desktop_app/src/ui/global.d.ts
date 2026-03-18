import type { BatteryTelemetry } from './types/battery'

declare global {
  interface Window {
    bmsApi?: {
      getBatteryTelemetry: () => Promise<BatteryTelemetry>
    }
  }
}

export {}
