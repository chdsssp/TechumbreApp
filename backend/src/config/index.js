require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'techumbre-secret-key-2025',
  esp32ApiKey: process.env.ESP32_API_KEY || 'esp32-techumbre-key',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  weatherLat: process.env.WEATHER_LAT || '25.79',
  weatherLon: process.env.WEATHER_LON || '-108.99',
};
