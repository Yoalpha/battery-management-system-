#include <OneWire.h>
#include <DallasTemperature.h>

#define ONE_WIRE_BUS 4
// #define VOLTAGE_PIN A0
// #define CURRENT PIN A1

const float ref_volt = 5.0;
const int voltage_pin = 0;
const int offset = 2.5;
const int maxADC = 1023;
const int sens = 0.100; //0.66 volt per amp 

int counter = 0;

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

float readCurrent(int adcPin){

    static float filtered = 0;

    float adcValue = analogRead(adcPin);
    float voltage = (adcValue / 1023.0) * 5.0;
    float current = (voltage - offset) / sens;

    // simple low-pass filter
    filtered = 0.9 * filtered + 0.1 * current;

    return filtered;
}

float readVoltage(int pin){
    // reading voltage
    int val = analogRead(pin);
    float volts = (val / 1023.0) * ref_volt;

}

float readTemperatre(){
  sensors.requestTemperatures();
  return sensors.getTempCByIndex(0);
}

void setup() {
  Serial.begin(115200);
  sensors.begin();
}



void loop() {
  sensors.requestTemperatures();
  
  int pin = A0;
  float sum = 0;

  float avg_adc = analogRead(pin);
  Serial.println(avg_adc);

  float voltage = (avg_adc / 1023.0) * ref_volt; // ADC → volts
  float current = (voltage - 2.5) / sens;        // volts → amps



  //output loop
  if(counter > 1000){

    counter = 0;

    Serial.print("Current:");
    Serial.println(current);
    Serial.print("temp:");
    Serial.println(sensors.getTempCByIndex(0));

  }
  
  // Serial.println(readCurrent(A0, 1000));

  // Serial.println("Voltage:");
  // Serial.println(volts);

  
  delay(1);

}
