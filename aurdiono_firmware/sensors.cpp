#include "config.h"
#include <Arduino.h>

long readVref() {
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1);
  delay(2);
  ADCSRA |= _BV(ADSC);
  while (bit_is_set(ADCSRA, ADSC))
    ;
  long result = ADC;
  return 1125300L / result; // mV
}

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

float readVoltageLow(int adcPin) {
  int sensorValue = analogRead(adcPin);
  float x = sensorValue * 5;
  float voltage = x / MAX_ADC;
  voltage = voltage * VOLTAGE_DIVIDER_RATIO;
  return voltage * LOW_CALIBRATION_FACTOR;
}

float readVoltageHigh(int adcPin) {
  int sensorValue = analogRead(adcPin);
  float x = sensorValue * 5;
  float voltage = x / MAX_ADC;
  voltage = voltage * (33.3 / 3.3);
  return voltage * HIGH_CALIBRATION_FACTOR;
}
