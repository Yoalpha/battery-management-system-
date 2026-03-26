const int adcPin = A0;
const int maxADC = 1023;
const float ref_volt = 4.9;   // your measured value
const float sens = 0.100;

float offset = 2.5;

float calibrateOffset(int pin) {
  float sum = 0;
  int samples = 500;

  Serial.println("Calibrating offset...");

  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(2);
  }

  float avg = sum / samples;
  float voltage = (avg / maxADC) * ref_volt;

  Serial.print("Offset voltage: ");
  Serial.println(voltage, 4);

  return voltage;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  offset = calibrateOffset(adcPin);
}

void loop() {
  int adc = analogRead(adcPin);
  float voltage = (adc / 1023.0) * ref_volt;

  float current = (voltage - offset) / sens;

  Serial.print("Voltage: ");
  Serial.print(voltage, 4);
  Serial.print(" | Current: ");
  Serial.println(current, 4);

  delay(200);
}