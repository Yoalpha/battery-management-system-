import { SerialPort } from 'serialport'

export async function findArduinoPort(): Promise<string | null> {
  const ports = await SerialPort.list();

  for (const port of ports) {
    console.log(port);
    
    // checking for arduino manufacturer

    if (
    port.manufacturer?.toLowerCase().includes('arduino') ||
      port.path.includes('ttyACM') ||     // Linux
      port.path.includes('ttyUSB') ||     // Linux
      port.path.includes('usbmodem') ||   // Mac
      port.path.includes('COM')           // Windows
    ) {
      return port.path
    }  
  }
  
  return null

}