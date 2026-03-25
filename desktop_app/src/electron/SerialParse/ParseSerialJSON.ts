import { serialReader } from './SerialReader.js'
import type { ArduinoData } from './types.js'

export async function parseSerial() {
  let stream_data: any  = await serialReader();

  try {
    const Data: ArduinoData = JSON.parse(stream_data);

    if (Data &&
      Array.isArray(Data.temps) && 
      Array.isArray(Data.voltages) &&
      Array.isArray(Data.current)) {

      console.log(Data.temps);

    } else {
      console.log('not JSON');
    }

  } catch {
    console.log(stream_data);
  }
}