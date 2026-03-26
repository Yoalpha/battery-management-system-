#ifndef SENSORS_H
#define SENSORS_H

void initCurrentSensor();
float readCurrent(int pin);
float readVoltageHigh(int adcPin);
float readVoltageLow(int adcPin);
long readVref();

#endif
