import { serialReader } from './SerialReader.js'
import type { ArduinoData } from './types.js'

export type NormalizedArduinoData = {
  temps: number[]
  voltages: number[]
  current: number
}

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

  if (temps.length === 0 || voltages.length === 0) {
    return null
  }

  return {
    temps,
    voltages,
    current: currentValue,
  }
}

export async function parseSerial(
  onData: (data: NormalizedArduinoData) => void
): Promise<(() => void) | null> {
  return serialReader({
    onLine: (streamData) => {
      try {
        const parsedData = JSON.parse(streamData) as ArduinoData
        const normalizedData = normalizeArduinoData(parsedData)

        if (normalizedData != null) {
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
    },
  })
}
