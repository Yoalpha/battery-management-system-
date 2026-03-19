const float ref_volt = 5.0;
const float offset = 2.42;
const int maxADC = 1023;
const float sens = 0.100; // volts per amp
int counter = 0;

float readCurrent(int adcPin){
    static float filtered = 0;

    float adcValue = analogRead(adcPin);
    float voltage = (adcValue / (float)maxADC) * ref_volt;
    float current = (voltage - offset) / sens;

    // low-pass filter
    filtered = 0.9 * filtered + 0.1 * current;

    return filtered;
}

void setup(){
    Serial.begin(115200);
}

void loop(){
    float current = readCurrent(A0);
    if(counter>1000){
      Serial.println(current);
      counter = 0;
    }
    counter++;
    delay(1);
}
