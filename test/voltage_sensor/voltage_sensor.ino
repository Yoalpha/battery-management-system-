const int voltagePin = A1;   
float voltage = 0.0;
float vout = 0.0;
float vin = 0.0;

void setup() {
  Serial.begin(115200);
}

void loop() {
float sensorValue = analogRead(voltagePin);   // Read analog value (0–1023)
// float sensorValue = 941.16;
  Serial.print("sensor value ");
  Serial.println(sensorValue);
  
           
  float x = sensorValue * 5;
  vout = x / 1023;
  Serial.print("vout ");
  Serial.println(vout);
  float measured = (vout * 33.3) / 3.3;
  vin = 1.03 * measured + 0.25;

  Serial.print("vin ");
  Serial.println(vin);

  delay(500);
}
