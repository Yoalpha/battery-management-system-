import { serialReader } from './SerialReader.js'
import type { ArduinoData } from './types.js'

export type NormalizedArduinoData = {
  temps: number[]
  voltages: number[]
  current: number
}

type ParseSerialOptions = {
  onData: (data: NormalizedArduinoData) => void
  onDisconnected?: () => void
  reconnectDelayMs?: number
}

// Validate the Arduino payload and coerce it into the shape expected by the Electron runtime.
function normalizeArduinoData(data: ArduinoData): NormalizedArduinoData | null {
  const currentValue = Array.isArray(data.current) ? data.current[0] : data.current

  if (
    !Array.isArray(data.temps) ||
    !Array.isArray(data.voltages) ||
    typeof currentValue !== 'number' ||
    Number.isNaN(currentValue)
  ) {
    return null
  }

  const temps = data.temps.filter((value) => typeof value === 'number' && !Number.isNaN(value))
  const voltages = data.voltages.filter((value) => typeof value === 'number' && !Number.isNaN(value))

  if (voltages.length === 0) {
    return null
  }

  return {
    temps,
    voltages,
    current: currentValue,
  }
}

// Maintain a resilient serial parser loop that reconnects when the Arduino is missing or disconnected.
export async function parseSerial(
  {
    onData,
    onDisconnected,
    reconnectDelayMs = 2_000,
  }: ParseSerialOptions
): Promise<(() => void) | null> {
  let readerCleanup: (() => void) | null = null
  let reconnectTimer: NodeJS.Timeout | null = null
  let stopRequested = false

  const clearReconnectTimer = () => {
    if (reconnectTimer != null) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const scheduleReconnect = () => {
    if (stopRequested || reconnectTimer != null) {
      return
    }

    onDisconnected?.()

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void connect()
    }, reconnectDelayMs)
  }

  const connect = async () => {
    if (stopRequested) {
      return
    }

    readerCleanup = await serialReader({
      onLine: (streamData) => {
        try {
          const parsedData = JSON.parse(streamData) as ArduinoData
          const normalizedData = normalizeArduinoData(parsedData)

          if (normalizedData != null) {
            clearReconnectTimer()
            onData(normalizedData)
            return
          }

          console.log('Serial payload missing expected telemetry arrays')
        } catch {
          console.log(streamData)
        }
      },
      onError: (error) => {
        console.error('Serial parser error:', error.message)
        scheduleReconnect()
      },
      onClose: () => {
        scheduleReconnect()
      }
    })

    if (readerCleanup == null) {
      scheduleReconnect()
    }
  }

  await connect()

  return () => {
    stopRequested = true
    clearReconnectTimer()
    readerCleanup?.()
  }
}
