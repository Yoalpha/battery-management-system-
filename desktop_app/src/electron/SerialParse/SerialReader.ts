import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { findArduinoPort } from './IdentifyArduino.js'

export async function serialReader(): Promise<string | null>  {
  const portPath = await findArduinoPort();

  if (portPath != null) {
    // Create port
    const port: any = new SerialPort({
      path: portPath,
      baudRate: 115200,
    })

    // Create parser (reads line-by-line)
    const parser = port.pipe(
      new ReadlineParser({ delimiter: '\n' })
    )

    // Listen for data
    parser.on('data', (data: string) => {
      return data;
    })

    // Error handling
    port.on('error', (err: { message: any; }) => {
      console.error('Error:', err.message)
    })
  } else {
    console.log('NO ARDUINO FOUND');
  }
  return null
}

