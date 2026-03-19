#include "config.h"
#include <Arduino.h>
float readCurrent(int adcPin) {
  static float filtered = 0;

  float adcValue = analogRead(adcPin); // get analog value
  float voltage =
      (adcValue / (float)MAX_ADC) * REF_VOLT; // converts to voltage in
                                              // calculates ratio and
                                              // multiplies with ref voltage
  // calculates current by finding the amount of voltage from offset and divides
  // by sens
  float current = (voltage - CURRENT_SENSOR_OFFSET) / CURRENT_SENSOR_SENS;

  // low-pass filter
  filtered = 0.9 * filtered + 0.1 * current;

  return filtered;
}

float readVoltage(int adcPin) {
  int sensorValue = analogRead(adcPin);
  float voltage = sensorValue * (REF_VOLT / MAX_ADC);
  voltage = voltage * REF_VOLT;

  return voltage;
}
