import { SerialPort } from 'serialport'

// Pick the first serial port that looks like an attached Arduino board.
export async function findArduinoPort(): Promise<string | null> {
  const ports = await SerialPort.list()

  for (const port of ports) {
    console.log(port)

    if (
      port.manufacturer?.toLowerCase().includes('arduino') ||
      port.path.includes('ttyACM') ||
      port.path.includes('ttyUSB') ||
      port.path.includes('usbmodem') ||
      port.path.includes('usbserial') ||
      port.path.includes('cu.usb') ||
      port.path.includes('COM')
    ) {
      return port.path
    }
  }

  return null
}
