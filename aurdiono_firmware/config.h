// Senor Configurations
#ifndef CONFIG_H
#define CONFIG_H
// ----------CURRENT SENSOR SETTINGS----------
#define CURRENT_SENSOR_PIN A0
#define REF_VOLT 5.0
#define MAX_ADC 1023
#define CURRENT_SENSOR_OFFSET 2.44
#define CURRENT_SENSOR_SENS 0.100 // volts per amp
//---------------------------------------------

//----------VOLTAGE SENSOR SETTINGS----------
#define VOLTAGE_PINS {A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12}
#define NUMBER_OF_VOLTAGE_SENSORS 12
#define VOLTAGE_DIVIDER_RATIO 5.0
//-------------------------------------------

//----------TEMPERATURE SENSOR SETTINGS----------
#define ONE_WIRE_BUS 4
#define MAX_DEVICES 4
//-----------------------------------------------
#endif
