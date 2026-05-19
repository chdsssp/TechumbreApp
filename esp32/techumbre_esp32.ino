// ================================================================
//  SISTEMA DE TECHUMBRE AUTOMATIZADA INTELIGENTE
//  ESP32 + DHT22 + GUVA-S12SD + FC-37 + Servos MG996R
// ================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP32Servo.h>

// ================================================================
//  CONFIGURACIÓN — EDITAR ESTOS VALORES
// ================================================================

const char* WIFI_SSID  = "TU_WIFI_SSID";
const char* WIFI_PASS  = "TU_WIFI_PASSWORD";

const char* SERVER_HOST = "techumbreapp-production.up.railway.app";
const int   SERVER_PORT = 443;
const char* API_KEY     = "esp32-techumbre-key";

// ================================================================
//  PINES — AJUSTAR SEGÚN TU CIRCUITO
// ================================================================

#define DHT_PIN       4    // GPIO4  — señal DHT22
#define UV_PIN        34   // GPIO34 — salida analógica GUVA-S12SD
#define RAIN_DIG_PIN  27   // GPIO27 — salida digital FC-37 (DO)
#define RAIN_ANA_PIN  35   // GPIO35 — salida analógica FC-37 (AO)
#define SERVO1_PIN    18   // GPIO18 — servo izquierdo MG996R
#define SERVO2_PIN    19   // GPIO19 — servo derecho MG996R

// ================================================================
//  POSICIONES DE LOS SERVOS — CALIBRAR SEGÚN TU MECANISMO
// ================================================================

const int SERVO_ABIERTO  = 90;   // grados para techo abierto
const int SERVO_CERRADO  = 0;    // grados para techo cerrado

// ================================================================
//  OBJETOS
// ================================================================

DHT dht(DHT_PIN, DHT22);
Servo servo1;
Servo servo2;
WebSocketsClient ws;

// ================================================================
//  ESTADO GLOBAL
// ================================================================

String estadoTecho = "CLOSED";
bool wsConectado   = false;
unsigned long ultimaTelemetria = 0;
const unsigned long INTERVALO_TELEMETRIA = 5000; // 5 segundos

// ================================================================
//  FUNCIONES DE SENSORES
// ================================================================

float leerUV() {
  int raw = analogRead(UV_PIN);
  // GUVA-S12SD: 0-3.3V -> UV index 0-11+
  // Ajustar el divisor según el circuito de acondicionamiento
  float voltaje = raw * (3.3f / 4095.0f);
  float uvIndex = voltaje * 10.0f; // aprox. 0.1V = 1 UV
  return constrain(uvIndex, 0.0f, 15.0f);
}

bool leerLluvia() {
  // FC-37: LOW = lluvia detectada, HIGH = seco
  return !digitalRead(RAIN_DIG_PIN);
}

int leerLluviaAnalog() {
  return analogRead(RAIN_ANA_PIN); // 0 = muy mojado, 4095 = seco
}

// ================================================================
//  CONTROL DE SERVOS
// ================================================================

void moverTecho(String estado) {
  if (estado == "OPEN" && estadoTecho != "OPEN") {
    Serial.println("→ Abriendo techo...");
    estadoTecho = "MOVING";
    servo1.write(SERVO_ABIERTO);
    servo2.write(SERVO_ABIERTO);
    delay(1500); // tiempo para que el servo llegue
    estadoTecho = "OPEN";
    Serial.println("✓ Techo ABIERTO");

  } else if (estado == "CLOSED" && estadoTecho != "CLOSED") {
    Serial.println("→ Cerrando techo...");
    estadoTecho = "MOVING";
    servo1.write(SERVO_CERRADO);
    servo2.write(SERVO_CERRADO);
    delay(1500);
    estadoTecho = "CLOSED";
    Serial.println("✓ Techo CERRADO");
  }
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

  // Construir JSON
  StaticJsonDocument<256> doc;
  doc["temperature"] = round(temp * 10) / 10.0;
  doc["humidity"]    = round(hum * 10) / 10.0;
  doc["rain"]        = lluvia;
  doc["rainAnalog"]  = lluviaAnalog;
  doc["uvIndex"]     = round(uvIndex * 10) / 10.0;
  doc["roofState"]   = estadoTecho;

  String body;
  serializeJson(doc, body);

  // Enviar a Railway (HTTPS)
  WiFiClientSecure cliente;
  cliente.setInsecure(); // Railway usa certificado válido pero omitimos verificación
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
      // Registrar este ESP32 en el servidor
      ws.sendTXT("42[\"esp32:register\"]");
      break;

    case WStype_DISCONNECTED:
      wsConectado = false;
      Serial.println("✗ WebSocket desconectado");
      break;

    case WStype_TEXT:
      // Socket.IO ping → responder pong
      if (msg == "2") {
        ws.sendTXT("3");
        return;
      }

      // Evento de Socket.IO: empieza con "42"
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
  Serial.println("\n=== Sistema de Techumbre ESP32 ===");

  // Pines
  pinMode(RAIN_DIG_PIN, INPUT);
  dht.begin();

  // Servos
  servo1.attach(SERVO1_PIN);
  servo2.attach(SERVO2_PIN);
  servo1.write(SERVO_CERRADO);
  servo2.write(SERVO_CERRADO);
  Serial.println("Servos inicializados en posición CERRADO");

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
  ws.loop(); // mantener conexión WebSocket

  // Reconectar WiFi si se cae
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi perdido, reconectando...");
    WiFi.reconnect();
    delay(2000);
    return;
  }

  // Enviar telemetría cada 5 segundos
  unsigned long ahora = millis();
  if (ahora - ultimaTelemetria >= INTERVALO_TELEMETRIA) {
    ultimaTelemetria = ahora;
    enviarTelemetria();
  }
}
