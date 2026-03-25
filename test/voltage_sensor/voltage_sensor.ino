
//----------VOLTAGE SENSOR SETTINGS----------
const int VOLTAGE_PINS_LOW[] = {A1, A2, A3, A4, A5, A6};
const int VOLTAGE_PINS_HIGH[] = {A8, A9, A10, A11, A12, A13};
#define NUMBER_OF_VOLTAGE_SENSORS_HIGH 6
#define NUMBER_OF_VOLTAGE_SENSORS_LOW 6
#define TOTAL_VOLTAGE_SENSORS 12
#define VOLTAGE_DIVIDER_RATIO 5.0
#define MAX_ADC 1023.0
#define VREF 5.17
#define CALIBRATION_FACTOR 1.016
//-------------------------------------------

const int voltagePin = A1;   

float voltage = 0.0;
float vout = 0.0;
float vin = 0.0;

float readVoltageHigh(int adcPin) {
  int sensorValue = analogRead(adcPin);
  float x = sensorValue * VREF;
  float voltage = x / MAX_ADC;
  voltage = voltage * (33.3 / 3.3);
  return voltage;
}

float readVoltageLow(int adcPin) {
  int sensorValue = analogRead(adcPin);
  float x = sensorValue * VREF;
  float voltage = x / MAX_ADC;
  voltage = voltage * VOLTAGE_DIVIDER_RATIO;
  return voltage * CALIBRATION_FACTOR;
}

void setup() {
  Serial.begin(115200);
}

void loop() {
  // low voltage
  float low_volts[6];
  for (int i = 0; i<6; i++) {
    low_volts[i] = readVoltageLow(VOLTAGE_PINS_LOW[i]);
  }


  float high_volts[6];
  for (int i = 0; i<6; i++) {
    high_volts[i] = readVoltageHigh(VOLTAGE_PINS_HIGH[i]);
  }

  float voltage_readings[12];

// Copy low readings
  for (int i = 0; i < NUMBER_OF_VOLTAGE_SENSORS_LOW; i++) {
      voltage_readings[i] = low_volts[i];
  }

  // Copy high readings
  for (int i = 0; i < NUMBER_OF_VOLTAGE_SENSORS_HIGH; i++) {
      voltage_readings[i + NUMBER_OF_VOLTAGE_SENSORS_LOW] = high_volts[i];
  }

  for (int i = 0; i<12; i++) {
    Serial.print(voltage_readings[i]);
    Serial.print(", ");
    delay(10);
  }
  Serial.println("");


// float sensorValue = analogRead(voltagePin);   // Read analog value (0–1023)
// // float sensorValue = 941.16;
//   Serial.print("sensor value ");
//   Serial.println(sensorValue);
  
           
//   float x = sensorValue * 5;
//   vout = x / 1023;
//   Serial.print("vout ");
//   Serial.println(vout);
//   float measured = (vout * 33.3) / 3.3;
//   vin = 1.03 * measured + 0.25;

//   Serial.print("vin ");
//   Serial.println(vin);
//

  delay(500);
}
