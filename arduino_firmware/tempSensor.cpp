#include "config.h"
#include <Arduino.h>
#include <DallasTemperature.h>
#include <OneWire.h>

// Initialize onewire bus and dallas temperature
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// To store all the devices addresses
DeviceAddress deviceAddresses[MAX_DEVICES];
// To store number of deviceses
int numberOfDevices = 0;

static void printAddress(DeviceAddress deviceAddress) {
  for (uint8_t i = 0; i < 8; i++) {
    if (deviceAddress[i] < 16) {
      Serial.print("0");
    }
    Serial.print(deviceAddress[i], HEX);
  }
}

void initTemperatureSensors() {
  sensors.begin();
  numberOfDevices = sensors.getDeviceCount();

  if (numberOfDevices > MAX_DEVICES) {
    numberOfDevices = MAX_DEVICES;
  }

  for (int i = 0; i < numberOfDevices; i++) {
    sensors.getAddress(deviceAddresses[i], i);
    Serial.print("CONNECTED DEVICE: ");
    printAddress(deviceAddresses[i]);
    Serial.println();
  }
}

void requestTemperatureReadings() { sensors.requestTemperatures(); }

// Returns the number of devices connected to the arduino
int getDeviceCount() { return numberOfDevices; }

// Returns the temperature of the indexed sensor in celcius
float getTemperatureC(int index) {
  float tempC = sensors.getTempC(deviceAddresses[index]);
  return tempC;
}
