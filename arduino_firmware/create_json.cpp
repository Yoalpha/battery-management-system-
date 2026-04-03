#include "config.h"
#include <Arduino.h>

void printJSON(float current, float voltage_readings[], float temperatures[], int temperatureCount) {
  Serial.print("{");
  // Temps
  Serial.print("\"temps\":[");
  for (int i = 0; i < temperatureCount; i++) {
    Serial.print(temperatures[i]);
    if (i < temperatureCount - 1)
      Serial.print(",");
  }
  Serial.print("],");

  // Voltages
  Serial.print("\"voltages\":[");
  for (int i = 0; i < TOTAL_VOLTAGE_SENSORS; i++) {
    Serial.print(voltage_readings[i]);
    if (i < TOTAL_VOLTAGE_SENSORS - 1)
      Serial.print(",");
  }
  Serial.print("],");

  // Current
  Serial.print("\"current\":");
  Serial.print(current);

  Serial.println("}");
}
