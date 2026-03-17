// Senor Configurations
#ifndef CONFIG_H
#define CONFIG_H

// ----------CURRENT SENSOR SETTINGS----------
// ADC configuration
#define CURRENT_SENSOR_PIN A0
#define REF_VOLT 5.0
#define MAX_ADC 1023
// ACS712 current sensor configuration
#define CURRENT_SENSOR_OFFSET 2.44
#define CURRENT_SENSOR_SENS 0.100 // volts per amp

//----------VOLTAGE SENSOR SETTINGS----------
#define VOLTAGE_SENSOR_PIN A1
#define VOLTAGE_DIVIDER_RATIO 5.0

// Loop print interval
#define PRINT_INTERVAL 1000

#endif
