// defined global interface so type script knows bmsApi exists 
import type { BatteryTelemetry } from './types/battery'

declare global {
  interface Window {
    bmsApi?: {
      getBatteryTelemetry: () => Promise<BatteryTelemetry>
    }
  }
}

export {}
