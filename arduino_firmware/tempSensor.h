#ifndef TEMP_SENSORS_H
#define TEMP_SENSORS_H

void initTemperatureSensors();
void requestTemperatureReadings();
int getDeviceCount();
float getTemperatureC(int index);

#endif
