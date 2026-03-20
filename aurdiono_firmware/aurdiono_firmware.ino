#include "config.h"
#include "sensors.h"
#include "tempSensor.h"
#include <Arduino.h>

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
    voltage_readings[i] = readVoltage(i);
  }

  // Current Readings
  float current = readCurrent(CURRENT_SENSOR_PIN);

  // Convert to JSON   Serial.print("{");

  // Temps
  Serial.print("\"temps\":[");
  for (int i = 0; i < device_count; i++) {
    Serial.print(temperatures[i]);
    if (i < device_count - 1)
      Serial.print(",");
  }
  Serial.print("],");

  // Voltages
  Serial.print("\"voltages\":[");
  for (int i = 0; i < NUMBER_OF_VOLTAGE_SENSORS; i++) {
    Serial.print(voltage_readings[i]);
    if (i < NUMBER_OF_VOLTAGE_SENSORS - 1)
      Serial.print(",");
  }
  Serial.print("],");

  // Current
  Serial.print("\"current\":");
  Serial.print(current);

  Serial.println("}");
  Serial.print("{");

  // Temps
  Serial.print("\"temps\":[");
  for (int i = 0; i < device_count; i++) {
    Serial.print(temperatures[i]);
    if (i < device_count - 1)
      Serial.print(",");
  }
  Serial.print("],");

  // Voltages
  Serial.print("\"voltages\":[");
  for (int i = 0; i < NUMBER_OF_VOLTAGE_SENSORS; i++) {
    Serial.print(voltage_readings[i]);
    if (i < NUMBER_OF_VOLTAGE_SENSORS - 1)
      Serial.print(",");
  }
  Serial.print("],");

  // Current
  Serial.print("\"current\":");
  Serial.print(current);

  Serial.println("}");
}
