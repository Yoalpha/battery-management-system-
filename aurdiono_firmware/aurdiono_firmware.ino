#include "config.h"
#include "create_json.h"
#include "sensors.h"
#include "tempSensor.h"
#include <Arduino.h>

int voltage_pin;

void setup() {
  Serial.begin(115200);
  initTemperatureSensors();
  initCurrentSensor();
}

void loop() {

  // Temperature Readings
  int device_count = getDeviceCount();
  float temperatures[device_count];

  for (int i = 0; i < device_count; i++) {
    temperatures[i] = getTemperatureC(i);
  }

  // Voltage Readings High
  float voltage_readings_high[NUMBER_OF_VOLTAGE_SENSORS_HIGH];
  for (int i = 0; i < NUMBER_OF_VOLTAGE_SENSORS_HIGH; i++) {
    voltage_pin = VOLTAGE_PINS_HIGH[i];
    voltage_readings_high[i] = readVoltageHigh(voltage_pin);
  }

  // Voltage Readings Low
  float voltage_readings_low[NUMBER_OF_VOLTAGE_SENSORS_LOW];
  for (int i = 0; i < NUMBER_OF_VOLTAGE_SENSORS_LOW; i++) {
    voltage_pin = VOLTAGE_PINS_LOW[i];
    voltage_readings_low[i] = readVoltageLow(voltage_pin);
  }
  
  // combining high and low voltage readings into one array
  float voltage_readings[TOTAL_VOLTAGE_SENSORS];

  // Copy low readings
  for (int i = 0; i < NUMBER_OF_VOLTAGE_SENSORS_LOW; i++) {
      voltage_readings[i] = voltage_readings_low[i];
  }

  // Copy high readings
  for (int i = 0; i < NUMBER_OF_VOLTAGE_SENSORS_HIGH; i++) {
      voltage_readings[i + NUMBER_OF_VOLTAGE_SENSORS_LOW] = voltage_readings_high[i];
  }

  // Current Readings
  float current = readCurrent(CURRENT_SENSOR_PIN);

  printJSON(current, voltage_readings, temperatures);
  delay(1000);
}
