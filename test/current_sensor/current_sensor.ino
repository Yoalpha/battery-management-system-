// ===== ACS712 CURRENT READER (STABLE VERSION) =====

// --- Constants ---
const int adcPin = A0;
const int maxADC = 1023;
const float ref_volt = 4.89;     // measured Arduino 5V (adjust if needed)
const float sens = 0.113;       // V/A (ACS712-20A = 0.100)
const float calibration_gain = 1.05;

// --- Globals ---
float offset = 2.5;

// ===== Calibrate zero-current offset =====
float calibrateOffset(int pin) {
  float sum = 0;
  int samples = 500;

  Serial.println("Calibrating offset... (NO current should be flowing)");

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

// ===== Read current (with filtering) =====
float readCurrent(int pin) {
  static float filtered = 0;

  float adcValue = 0;
  const int samples = 10;

  for (int i = 0; i < samples; i++) {
    adcValue += analogRead(pin);
  }
  adcValue /= samples;

  float voltage = (adcValue / maxADC) * ref_volt;

  float current = ((voltage - offset) / sens) * calibration_gain;

  filtered = 0.9 * filtered + 0.1 * current;

  return filtered;
}


// ===== Setup =====
void setup() {
  Serial.begin(115200);
  delay(1000);

  offset = calibrateOffset(adcPin);

  Serial.println("Setup complete.\n");
}

// ===== Main loop =====
void loop() {
  float current = readCurrent(adcPin);

  Serial.print("Current: ");
  Serial.println(current, 4);

  delay(200);
}