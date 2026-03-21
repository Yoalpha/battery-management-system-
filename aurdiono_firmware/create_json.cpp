#include "config.h"
#include <Arduino.h>

void printJSON(float current, float voltage_readings[], float temperatures[]) {
  Serial.print("{");
  // Temps
  Serial.print("\"temps\":[");
  for (int i = 0; i < MAX_DEVICES; i++) {
    Serial.print(temperatures[i]);
    if (i < MAX_DEVICES - 1)
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
