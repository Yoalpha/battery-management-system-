// ===== ACS712 CALIBRATED CURRENT READER =====

// --- Constants ---
const int adcPin = A0;
const int maxADC = 1023;
const float sens = 0.100;          // V/A (adjust for your sensor model)
const float calibration_gain = 1.0; // tweak after testing

// --- Globals ---
float ref_volt = 5.0;
float offset = 2.5;
int counter = 0;

// ===== Measure actual Vcc using internal 1.1V reference =====
long readVref() {
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1);
  delay(2);

  ADCSRA |= _BV(ADSC);
  while (bit_is_set(ADCSRA, ADSC));

  long result = ADCL;
  result |= ADCH << 8;

  result = 1125300L / result; // in mV
  return result;
}

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

// ===== Read current with filtering =====
float readCurrent(int pin) {
  static float filtered = 0;

  // --- Average multiple ADC samples (noise reduction) ---
  float adcValue = 0;
  const int samples = 10;

  for (int i = 0; i < samples; i++) {
    adcValue += analogRead(pin);
  }
  adcValue /= samples;

  // --- Convert to voltage ---
  float voltage = (adcValue / maxADC) * ref_volt;

  // --- Convert to current ---
  float current = ((voltage - offset) / sens) * calibration_gain;

  // --- Low-pass filter ---
  filtered = 0.9 * filtered + 0.1 * current;

  return filtered;
}

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  delay(1000);

  // Measure actual Vcc
  ref_volt = readVref() / 1000.0;

  Serial.print("Measured Vref: ");
  Serial.println(ref_volt, 4);

  // Calibrate offset (IMPORTANT: no current flowing)
  offset = calibrateOffset(adcPin);

  Serial.println("Setup complete.\n");
}

// ===== Main loop =====
void loop() {
  float current = readCurrent(adcPin);

  if (counter > 200) {
    Serial.print("Current: ");
    Serial.println(current, 4);
    counter = 0;
  }

  counter++;
  delay(1);
}
