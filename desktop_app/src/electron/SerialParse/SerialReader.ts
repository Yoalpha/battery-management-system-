import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { findArduinoPort } from './IdentifyArduino.js'

type SerialReaderOptions = {
  onLine: (line: string) => void
  onError?: (error: Error) => void
  onClose?: () => void
}

export async function serialReader({
  onLine,
  onError,
  onClose,
}: SerialReaderOptions): Promise<(() => void) | null> {
  const portPath = await findArduinoPort()

  if (portPath == null) {
    console.log('NO ARDUINO FOUND')
    return null
  }

  const port = new SerialPort({
    path: portPath,
    baudRate: 115200,
  })

  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))

  parser.on('data', (data: string) => {
    onLine(data.trim())
  })

  port.on('error', (error: Error) => {
    console.error('Serial port error:', error.message)
    onError?.(error)
  })

  port.on('close', () => {
    console.log('Serial port closed')
    onClose?.()
  })

  return () => {
    parser.removeAllListeners('data')
    port.removeAllListeners('error')
    port.removeAllListeners('close')

    if (port.isOpen) {
      port.close((error) => {
        if (error != null) {
          console.error('Failed to close serial port:', error.message)
        }
      })
    }
  }
}
