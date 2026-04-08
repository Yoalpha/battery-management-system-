#include "config.h"
#include <Arduino.h>

static float offset = CURRENT_SENSOR_OFFSET;

// --- CURRENT SENSOR ---

// --- Calibration gain (from your data) ---
static const float calibration_gain = CALIBRATION_GAIN;

// ===== Calibrate offset =====
static float calibrateOffset(int pin) {
  float sum = 0;
  int samples = 500;

  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(2);
  }

  float avg = sum / samples;
  float voltage = (avg / MAX_ADC) * REF_VOLT;

  return voltage;
}

// ===== Init current sensor =====
void initCurrentSensor() {
  delay(1000); // let system stabilize

  // Override config offset with real measured offset
  offset = calibrateOffset(CURRENT_SENSOR_PIN);

  Serial.print("Calibrated Current Offset: ");
  Serial.println(offset, 4);
}

// ===== Read current =====
float readCurrent(int pin) {
  static float filtered = 0;

  float adcValue = 0;
  const int samples = 10;

  for (int i = 0; i < samples; i++) {
    adcValue += analogRead(pin);
  }
  adcValue /= samples;

  float voltage = (adcValue / MAX_ADC) * REF_VOLT;

  float current = ((voltage - offset) / CURRENT_SENSOR_SENS) * calibration_gain;

  // Low-pass filter
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
