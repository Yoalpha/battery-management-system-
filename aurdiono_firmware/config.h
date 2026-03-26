#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// Senor Configurations
// ----------CURRENT SENSOR SETTINGS----------
#define CURRENT_SENSOR_PIN A0
#define REF_VOLT 5.0
#define MAX_ADC 1023.0
#define CURRENT_SENSOR_OFFSET 2.44
#define CURRENT_SENSOR_SENS 0.100 // volts per amp
//---------------------------------------------

//----------VOLTAGE SENSOR SETTINGS----------
const int VOLTAGE_PINS_LOW[] = {A1, A2, A3, A4, A5, A6};
const int VOLTAGE_PINS_HIGH[] = {A8, A9, A10, A11, A12, A13};
#define NUMBER_OF_VOLTAGE_SENSORS_HIGH 6
#define NUMBER_OF_VOLTAGE_SENSORS_LOW 6
#define TOTAL_VOLTAGE_SENSORS 12
#define VOLTAGE_DIVIDER_RATIO 5.0
#define LOW_CALIBRATION_FACTOR 0.998
#define HIGH_CALIBRATION_FACTOR 0.989
//-------------------------------------------

//----------TEMPERATURE SENSOR SETTINGS----------
#define ONE_WIRE_BUS 5
#define MAX_DEVICES 4
//-----------------------------------------------
#endif
