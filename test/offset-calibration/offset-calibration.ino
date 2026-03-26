void setup() {
  Serial.begin(115200);
}

void loop() {
  int adc = analogRead(A0);
  float voltage = (adc / 1023.0) * 4.9;

  Serial.println(voltage, 5);  // 5 decimal places
  delay(200);
}