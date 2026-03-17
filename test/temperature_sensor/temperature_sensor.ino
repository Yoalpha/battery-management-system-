#include <OneWire.h>
#include <DallasTemperature.h>

// Data wire is plugged into port 4 on the Arduino
#define ONE_WIRE_BUS 4
// Setup a oneWire instance to communicate with any OneWire devices (not just Maxim/Dallas temperature ICs)
OneWire oneWire(ONE_WIRE_BUS);

// Pass our oneWire reference to Dallas Temperature. 
DallasTemperature sensors(&oneWire);

int numberOfDevices; // Number of temperature devices found

#define MAX_DEVICES 10
DeviceAddress deviceAddresses[MAX_DEVICES];

void setup(void) {
  // start serial port
  Serial.begin(115200);
  
  // Start up the library
  sensors.begin();
  
  // Grab a count of devices on the wire
  numberOfDevices = sensors.getDeviceCount();
  
  // locate devices on the bus
  Serial.print("Locating devices...");
  Serial.print("Found ");
  Serial.print(numberOfDevices, DEC);
  Serial.println(" devices.");

  // Loop through each device, print out address
  for(int i=0; i<numberOfDevices; i++) {
    if(sensors.getAddress(deviceAddresses[i], i)) {

      Serial.print("Found device ");
      Serial.print(i);
      Serial.print(" with address: ");
      printAddress(deviceAddresses[i]);
      Serial.println();

    } else {
      Serial.print("Ghost device at ");
      Serial.println(i);
    }
  }
}

void loop(void) { 
  sensors.requestTemperatures();

  for(int i=0; i<numberOfDevices; i++) {

    Serial.print("Temperature for device ");
    Serial.println(i);

    float tempC = sensors.getTempC(deviceAddresses[i]);

    Serial.print("Temp C: ");
    Serial.print(tempC);
    Serial.print(" Temp F: ");
    Serial.println(DallasTemperature::toFahrenheit(tempC));
  }
  delay(1000);
}

// function to print a device address
void printAddress(DeviceAddress deviceAddress) {
  for (uint8_t i = 0; i < 8; i++) {
    if (deviceAddress[i] < 16) Serial.print("0");
      Serial.print(deviceAddress[i], HEX);
  }
}
