#include "config.h"
#include "create_json.h"
#include "sensors.h"
#include "tempSensor.h"
#include <Arduino.h>

int voltage_pin;

void setup() {
  Serial.begin(115200);
  initTemperatureSensors();
}

void loop() {

  // Temperature Readings
  int device_count = getDeviceCount();
  float temperatures[device_count];

  for (int i = 0; i < device_count; i++) {
    temperatures[i] = getTemperatureC(i);
  }

  // Voltage Readings
  float voltage_readings[NUMBER_OF_VOLTAGE_SENSORS];
  for (int i = 0; i < NUMBER_OF_VOLTAGE_SENSORS; i++) {
    voltage_pin = VOLTAGE_PINS[i];
    voltage_readings[i] = readVoltage(voltage_pin);
  }

  // Current Readings
  float current = readCurrent(CURRENT_SENSOR_PIN);

  printJSON(current, voltage_readings, temperatures);
  delay(1000);
}
