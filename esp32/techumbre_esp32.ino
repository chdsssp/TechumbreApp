// ================================================================
//  AUTOMALLA — Sistema Automatizado Inteligente
//  ESP32 + DHT22 + GUVA-S12SD + FC-37 + Motorreductores TT (L298N)
// ================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ================================================================
//  CONFIGURACIÓN — EDITAR ESTOS VALORES
// ================================================================

const char* WIFI_SSID  = "TU_WIFI_SSID";
const char* WIFI_PASS  = "TU_WIFI_PASSWORD";

const char* SERVER_HOST = "techumbreapp-production.up.railway.app";
const int   SERVER_PORT = 443;
const char* API_KEY     = "esp32-techumbre-key";

// ================================================================
//  PINES SENSORES
// ================================================================

#define DHT_PIN       4    // GPIO4  — señal DHT22
#define UV_PIN        34   // GPIO34 — salida analógica GUVA-S12SD
#define RAIN_DIG_PIN  13   // GPIO13 — salida digital FC-37 (DO)
#define RAIN_ANA_PIN  35   // GPIO35 — salida analógica FC-37 (AO)

// ================================================================
//  PINES L298N — MOTORREDUCTORES TT
// ================================================================

// Motor A (izquierdo)
#define MOTOR_A_IN1  25
#define MOTOR_A_IN2  26
#define MOTOR_A_ENA  27   // PWM velocidad (o conectar directo a 5V para velocidad máxima)

// Motor B (derecho)
#define MOTOR_B_IN3  32
#define MOTOR_B_IN4  33
#define MOTOR_B_ENB  14   // PWM velocidad

// ================================================================
//  CALIBRACIÓN — AJUSTAR SEGÚN TU MECANISMO
// ================================================================

// Tiempo en milisegundos que tarda el techo en recorrer su carrera completa
const unsigned long TIEMPO_MOVIMIENTO = 3000; // 3 segundos — ajustar al probar

// Velocidad PWM (0-255). 255 = máxima velocidad
const int VELOCIDAD_MOTOR = 200;

// ================================================================
//  OBJETOS Y ESTADO GLOBAL
// ================================================================

DHT dht(DHT_PIN, DHT22);
WebSocketsClient ws;

String estadoTecho = "CLOSED";
bool wsConectado   = false;
unsigned long ultimaTelemetria = 0;
const unsigned long INTERVALO_TELEMETRIA = 5000;

// ================================================================
//  CONTROL DE MOTORES
// ================================================================

void detenerMotores() {
  digitalWrite(MOTOR_A_IN1, LOW);
  digitalWrite(MOTOR_A_IN2, LOW);
  digitalWrite(MOTOR_B_IN3, LOW);
  digitalWrite(MOTOR_B_IN4, LOW);
}

void moverTecho(String estado) {
  if (estado == "OPEN" && estadoTecho != "OPEN") {
    Serial.println("→ Abriendo techo...");
    estadoTecho = "MOVING";

    // Avanzar: ambos motores hacia adelante
    analogWrite(MOTOR_A_ENA, VELOCIDAD_MOTOR);
    analogWrite(MOTOR_B_ENB, VELOCIDAD_MOTOR);
    digitalWrite(MOTOR_A_IN1, HIGH);
    digitalWrite(MOTOR_A_IN2, LOW);
    digitalWrite(MOTOR_B_IN3, HIGH);
    digitalWrite(MOTOR_B_IN4, LOW);

    delay(TIEMPO_MOVIMIENTO);
    detenerMotores();
    estadoTecho = "OPEN";
    Serial.println("✓ Techo ABIERTO");

  } else if (estado == "CLOSED" && estadoTecho != "CLOSED") {
    Serial.println("→ Cerrando techo...");
    estadoTecho = "MOVING";

    // Retroceder: ambos motores hacia atrás
    analogWrite(MOTOR_A_ENA, VELOCIDAD_MOTOR);
    analogWrite(MOTOR_B_ENB, VELOCIDAD_MOTOR);
    digitalWrite(MOTOR_A_IN1, LOW);
    digitalWrite(MOTOR_A_IN2, HIGH);
    digitalWrite(MOTOR_B_IN3, LOW);
    digitalWrite(MOTOR_B_IN4, HIGH);

    delay(TIEMPO_MOVIMIENTO);
    detenerMotores();
    estadoTecho = "CLOSED";
    Serial.println("✓ Techo CERRADO");
  }
}

// ================================================================
//  FUNCIONES DE SENSORES
// ================================================================

float leerUV() {
  int raw = analogRead(UV_PIN);
  float voltaje = raw * (3.3f / 4095.0f);
  float uvIndex = voltaje * 10.0f;
  return constrain(uvIndex, 0.0f, 15.0f);
}

bool leerLluvia() {
  return !digitalRead(RAIN_DIG_PIN); // LOW = lluvia detectada
}

int leerLluviaAnalog() {
  return analogRead(RAIN_ANA_PIN);
}

// ================================================================
//  ENVÍO DE TELEMETRÍA POR HTTP POST
// ================================================================

void enviarTelemetria() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("Error leyendo DHT22");
    return;
  }

  bool  lluvia       = leerLluvia();
  int   lluviaAnalog = leerLluviaAnalog();
  float uvIndex      = leerUV();

  StaticJsonDocument<256> doc;
  doc["temperature"] = round(temp * 10) / 10.0;
  doc["humidity"]    = round(hum * 10) / 10.0;
  doc["rain"]        = lluvia;
  doc["rainAnalog"]  = lluviaAnalog;
  doc["uvIndex"]     = round(uvIndex * 10) / 10.0;
  doc["roofState"]   = estadoTecho;

  String body;
  serializeJson(doc, body);

  WiFiClientSecure cliente;
  cliente.setInsecure();
  HTTPClient http;
  http.begin(cliente, String("https://") + SERVER_HOST + "/api/telemetry");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);

  int codigo = http.POST(body);
  http.end();

  Serial.printf("[HTTP %d] T=%.1f°C H=%.1f%% UV=%.1f Lluvia=%s Techo=%s\n",
    codigo, temp, hum, uvIndex, lluvia ? "SI" : "NO", estadoTecho.c_str());
}

// ================================================================
//  MANEJO DE EVENTOS WEBSOCKET (Socket.IO)
// ================================================================

void webSocketEvent(WStype_t tipo, uint8_t* payload, size_t longitud) {
  String msg = String((char*)payload);

  switch (tipo) {

    case WStype_CONNECTED:
      wsConectado = true;
      Serial.println("✓ WebSocket conectado");
      ws.sendTXT("42[\"esp32:register\"]");
      break;

    case WStype_DISCONNECTED:
      wsConectado = false;
      Serial.println("✗ WebSocket desconectado");
      break;

    case WStype_TEXT:
      if (msg == "2") { ws.sendTXT("3"); return; }

      if (msg.startsWith("42")) {
        Serial.println("WS recibido: " + msg);
        if (msg.indexOf("roof:command") >= 0) {
          if (msg.indexOf("\"OPEN\"") >= 0) {
            moverTecho("OPEN");
            ws.sendTXT("42[\"status:ack\",{\"command\":\"SET_ROOF\",\"success\":true}]");
          } else if (msg.indexOf("\"CLOSED\"") >= 0) {
            moverTecho("CLOSED");
            ws.sendTXT("42[\"status:ack\",{\"command\":\"SET_ROOF\",\"success\":true}]");
          }
        }
      }
      break;

    case WStype_ERROR:
      Serial.println("WebSocket error");
      break;

    default:
      break;
  }
}

// ================================================================
//  SETUP
// ================================================================

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== AutoMalla ESP32 ===");

  // Pines sensores
  pinMode(RAIN_DIG_PIN, INPUT);
  dht.begin();

  // Pines motores
  pinMode(MOTOR_A_IN1, OUTPUT);
  pinMode(MOTOR_A_IN2, OUTPUT);
  pinMode(MOTOR_A_ENA, OUTPUT);
  pinMode(MOTOR_B_IN3, OUTPUT);
  pinMode(MOTOR_B_IN4, OUTPUT);
  pinMode(MOTOR_B_ENB, OUTPUT);
  detenerMotores();
  Serial.println("Motores inicializados — detenidos");

  // Conectar WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando a WiFi");
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 30) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nError: no se pudo conectar al WiFi. Reiniciando...");
    delay(3000);
    ESP.restart();
  }

  Serial.println("\nWiFi conectado — IP: " + WiFi.localIP().toString());

  // Conectar WebSocket a Railway (SSL)
  ws.beginSSL(SERVER_HOST, SERVER_PORT,
    "/socket.io/?EIO=4&transport=websocket");
  ws.onEvent(webSocketEvent);
  ws.setReconnectInterval(5000);

  Serial.println("Sistema listo. Enviando datos cada 5 segundos.\n");
}

// ================================================================
//  LOOP
// ================================================================

void loop() {
  ws.loop();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi perdido, reconectando...");
    WiFi.reconnect();
    delay(2000);
    return;
  }

  unsigned long ahora = millis();
  if (ahora - ultimaTelemetria >= INTERVALO_TELEMETRIA) {
    ultimaTelemetria = ahora;
    enviarTelemetria();
  }
}
