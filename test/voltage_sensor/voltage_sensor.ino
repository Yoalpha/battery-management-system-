const int voltagePin = A1;   
float voltage = 0.0;

void setup() {
  Serial.begin(115200);
}

void loop() {
  int sensorValue = analogRead(voltagePin);   // Read analog value (0–1023)

  // Convert ADC value to voltage
  voltage = sensorValue * (5.0 / 1023.0);  

  // The module divides voltage by ~5
  voltage = voltage * 5.0;

  Serial.print(voltage);
  Serial.println(" V");

  delay(500);
}
