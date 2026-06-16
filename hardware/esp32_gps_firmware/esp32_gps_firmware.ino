/*
 * WasteLogix Hardware Relay
 * ESP32 + NEO-6M GPS
 *
 * Wiring:
 * GPS TX  -> ESP32 GPIO 16 (RX2)
 * GPS RX  -> ESP32 GPIO 17 (TX2, optional)
 * GPS VCC -> 3.3V or 5V depending on module
 * GPS GND -> GND
 *
 * Arduino libraries:
 * TinyGPSPlus
 * ArduinoJson
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

const char* WIFI_SSID = "realme 7";
const char* WIFI_PASSWORD = "apk07100";
const char* API_BASE_URL = "http://10.198.88.87:4000/api";
const char* SECONDARY_API_BASE_URL = "";
const char* IOT_SECRET = "iot-shared-secret";
const char* DEVICE_KEY = "HARDWARE-TN459900";
const char* FIRMWARE_VERSION = "wastelogix-1.1.0-standalone";

constexpr unsigned long SEND_INTERVAL_MS = 10000;
constexpr unsigned long QUEUE_FLUSH_INTERVAL_MS = 30000;
constexpr unsigned long WIFI_RETRY_DELAY_MS = 500;
constexpr unsigned long HTTP_TIMEOUT_MS = 10000;
constexpr int MAX_WIFI_RETRIES = 20;
constexpr int GPS_RX_PIN = 16;
constexpr int GPS_TX_PIN = 17;
constexpr uint32_t GPS_BAUD = 9600;
constexpr int LED_PIN = 2;
constexpr bool DISABLE_BROWNOUT_FOR_DEV = true;
constexpr int MAX_OFFLINE_QUEUE_ITEMS = 16;

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
Preferences queueStore;

unsigned long lastSendTime = 0;
unsigned long lastSignalNotice = 0;
unsigned long lastQueueFlushAttempt = 0;
int successfulSends = 0;
int failedSends = 0;

void connectWiFi();
void sendGpsData();
void sendHardwareStatus(const char* note);
bool postJson(const String& endpoint, const String& jsonPayload, bool queueWhenOffline = true);
bool postJsonToBase(const char* baseUrl, const String& endpoint, const String& jsonPayload);
void flushQueuedTelemetry();
void queueTelemetry(const String& endpoint, const String& jsonPayload);
String queueKey(const char* prefix, int index);
void emitSerialJson(const String& jsonPayload);
void blinkLed(int times, int delayMs);

void setup() {
  if (DISABLE_BROWNOUT_FOR_DEV) {
    WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  }

  setCpuFrequencyMhz(80);

  Serial.begin(115200);
  delay(1000);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  queueStore.begin("wastelogix", false);

  Serial.println();
  Serial.println("===========================================");
  Serial.println(" WasteLogix ESP32 GPS Hardware Relay");
  Serial.print(" Device key: ");
  Serial.println(DEVICE_KEY);
  Serial.print(" Primary API: ");
  Serial.println(API_BASE_URL);
  if (strlen(SECONDARY_API_BASE_URL) > 0) {
    Serial.print(" Secondary API: ");
    Serial.println(SECONDARY_API_BASE_URL);
  }
  Serial.println("===========================================");

  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.printf("[GPS] UART2 RX=%d TX=%d baud=%lu\n", GPS_RX_PIN, GPS_TX_PIN, static_cast<unsigned long>(GPS_BAUD));

  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setSleep(true);
  WiFi.setTxPower(WIFI_POWER_2dBm);
  WiFi.setAutoReconnect(true);
  WiFi.setHostname("wastelogix-hardware-relay");
  connectWiFi();
}

void loop() {
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  const unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Disconnected. Reconnecting...");
    connectWiFi();
  } else if (now - lastQueueFlushAttempt > QUEUE_FLUSH_INTERVAL_MS) {
    lastQueueFlushAttempt = now;
    flushQueuedTelemetry();
  }

  if (gps.charsProcessed() < 10 && now - lastSignalNotice > 15000) {
    lastSignalNotice = now;
    Serial.println("[GPS] No NMEA data yet. Check GPS TX -> GPIO16, VCC, and GND.");
  }

  if (now - lastSendTime < SEND_INTERVAL_MS) {
    return;
  }

  lastSendTime = now;

  if (gps.location.isValid()) {
    sendGpsData();
    return;
  }

  const int satellites = gps.satellites.isValid() ? gps.satellites.value() : 0;
  Serial.printf("[GPS] Waiting for valid fix. Satellites: %d\n", satellites);
  sendHardwareStatus("WiFi connected. Waiting for GPS fix.");
  blinkLed(3, 80);
}

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.disconnect(true, true);
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < MAX_WIFI_RETRIES) {
    delay(WIFI_RETRY_DELAY_MS);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" connected");
    Serial.print("[WiFi] IP address: ");
    Serial.println(WiFi.localIP());
    Serial.printf("[WiFi] RSSI: %d dBm\n", WiFi.RSSI());
    digitalWrite(LED_PIN, HIGH);
    return;
  }

  Serial.println(" failed");
  Serial.println("[WiFi] ESP32 needs a 2.4 GHz WPA/WPA2 network or compatible hotspot.");
  digitalWrite(LED_PIN, LOW);
}

void sendGpsData() {
  const double latitude = gps.location.lat();
  const double longitude = gps.location.lng();
  const double speedKph = gps.speed.isValid() ? gps.speed.kmph() : 0.0;
  const double heading = gps.course.isValid() ? gps.course.deg() : 0.0;
  const int satellites = gps.satellites.isValid() ? gps.satellites.value() : 0;

#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<512> doc;
#endif

  doc["messageType"] = "gps-data";
  doc["deviceKey"] = DEVICE_KEY;
  doc["lat"] = latitude;
  doc["lng"] = longitude;
  doc["speedKph"] = round(speedKph * 100.0) / 100.0;
  doc["heading"] = round(heading * 100.0) / 100.0;
  doc["satellites"] = satellites;
  doc["rssi"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
  doc["ipAddress"] = WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : "";
  doc["firmwareVersion"] = FIRMWARE_VERSION;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("-------------------------------------------");
  Serial.printf("[GPS] Lat %.6f | Lng %.6f | Speed %.2f km/h | Satellites %d\n", latitude, longitude, speedKph, satellites);
  emitSerialJson(jsonPayload);

  if (postJson("/hardware/location", jsonPayload)) {
    successfulSends++;
    blinkLed(1, 180);
  } else {
    failedSends++;
    blinkLed(5, 50);
  }

  Serial.printf("[STATS] Sent=%d Failed=%d Uptime=%lus\n", successfulSends, failedSends, millis() / 1000UL);
  Serial.println("-------------------------------------------");
}

void sendHardwareStatus(const char* note) {
  const int satellites = gps.satellites.isValid() ? gps.satellites.value() : 0;

#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<512> doc;
#endif

  doc["messageType"] = "hardware-status";
  doc["deviceKey"] = DEVICE_KEY;
  doc["gpsFix"] = false;
  doc["satellites"] = satellites;
  doc["wifiConnected"] = WiFi.status() == WL_CONNECTED;
  doc["rssi"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
  doc["ipAddress"] = WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : "";
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["note"] = note;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  emitSerialJson(jsonPayload);
  postJson("/hardware/status", jsonPayload, false);
}

bool postJson(const String& endpoint, const String& jsonPayload, bool queueWhenOffline) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi not connected. Serial bridge can still forward SERIAL_JSON.");
    if (queueWhenOffline) {
      queueTelemetry(endpoint, jsonPayload);
    }
    return false;
  }

  if (postJsonToBase(API_BASE_URL, endpoint, jsonPayload)) {
    return true;
  }

  if (strlen(SECONDARY_API_BASE_URL) > 0 && postJsonToBase(SECONDARY_API_BASE_URL, endpoint, jsonPayload)) {
    return true;
  }

  if (queueWhenOffline) {
    queueTelemetry(endpoint, jsonPayload);
  }

  return false;
}

bool postJsonToBase(const char* baseUrl, const String& endpoint, const String& jsonPayload) {
  if (strlen(baseUrl) == 0) {
    return false;
  }

  HTTPClient http;
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(String(baseUrl) + endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-iot-secret", IOT_SECRET);

  const int code = http.POST(jsonPayload);

  if (code >= 200 && code < 300) {
    Serial.printf("[HTTP] %s -> %d\n", endpoint.c_str(), code);
    Serial.println(http.getString());
    http.end();
    return true;
  }

  Serial.printf("[HTTP] %s failed -> %d\n", endpoint.c_str(), code);
  if (code > 0) {
    Serial.println(http.getString());
  } else {
    Serial.println(http.errorToString(code));
  }
  http.end();
  return false;
}

void flushQueuedTelemetry() {
  int count = queueStore.getInt("qCount", 0);
  int head = queueStore.getInt("qHead", 0);

  if (count <= 0) {
    return;
  }

  Serial.printf("[QUEUE] Attempting to flush %d queued telemetry item(s)\n", count);

  while (count > 0 && WiFi.status() == WL_CONNECTED) {
    const String endpoint = queueStore.getString(queueKey("e", head).c_str(), "");
    const String payload = queueStore.getString(queueKey("p", head).c_str(), "");

    if (endpoint.length() == 0 || payload.length() == 0) {
      queueStore.remove(queueKey("e", head).c_str());
      queueStore.remove(queueKey("p", head).c_str());
      head = (head + 1) % MAX_OFFLINE_QUEUE_ITEMS;
      count--;
      continue;
    }

    if (!postJsonToBase(API_BASE_URL, endpoint, payload) &&
        !(strlen(SECONDARY_API_BASE_URL) > 0 && postJsonToBase(SECONDARY_API_BASE_URL, endpoint, payload))) {
      break;
    }

    queueStore.remove(queueKey("e", head).c_str());
    queueStore.remove(queueKey("p", head).c_str());
    head = (head + 1) % MAX_OFFLINE_QUEUE_ITEMS;
    count--;
    successfulSends++;
  }

  queueStore.putInt("qHead", head);
  queueStore.putInt("qCount", count);
  Serial.printf("[QUEUE] Remaining queued item(s): %d\n", count);
}

void queueTelemetry(const String& endpoint, const String& jsonPayload) {
  int count = queueStore.getInt("qCount", 0);
  int head = queueStore.getInt("qHead", 0);

  if (count >= MAX_OFFLINE_QUEUE_ITEMS) {
    Serial.println("[QUEUE] Queue full. Dropping oldest telemetry item.");
    queueStore.remove(queueKey("e", head).c_str());
    queueStore.remove(queueKey("p", head).c_str());
    head = (head + 1) % MAX_OFFLINE_QUEUE_ITEMS;
    count--;
  }

  const int tail = (head + count) % MAX_OFFLINE_QUEUE_ITEMS;
  queueStore.putString(queueKey("e", tail).c_str(), endpoint);
  queueStore.putString(queueKey("p", tail).c_str(), jsonPayload);
  count++;

  queueStore.putInt("qHead", head);
  queueStore.putInt("qCount", count);
  Serial.printf("[QUEUE] Stored telemetry for retry. Queue size: %d\n", count);
}

String queueKey(const char* prefix, int index) {
  return String(prefix) + String(index);
}

void emitSerialJson(const String& jsonPayload) {
  Serial.print("SERIAL_JSON ");
  Serial.println(jsonPayload);
}

void blinkLed(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }

  digitalWrite(LED_PIN, WiFi.status() == WL_CONNECTED ? HIGH : LOW);
}
