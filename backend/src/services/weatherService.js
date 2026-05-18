const { weatherLat, weatherLon } = require('../config');

let cachedWeather = null;
let lastFetch = 0;
const CACHE_DURATION = 10 * 60 * 1000;

async function fetchWeather() {
  const now = Date.now();
  if (cachedWeather && now - lastFetch < CACHE_DURATION) {
    return cachedWeather;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${weatherLat}&longitude=${weatherLon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&hourly=precipitation_probability,temperature_2m&timezone=America/Mazatlan&forecast_days=1`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);

    const data = await res.json();

    const currentHour = new Date().toLocaleString('en-US', { timeZone: 'America/Mazatlan', hour: 'numeric', hour12: false });
    const hourIndex = Math.min(parseInt(currentHour), (data.hourly?.precipitation_probability?.length || 1) - 1);

    const nextHours = (data.hourly?.precipitation_probability || []).slice(hourIndex, hourIndex + 6);

    cachedWeather = {
      precipitationProbability: data.hourly?.precipitation_probability?.[hourIndex] ?? null,
      nextHoursProbability: nextHours,
      currentPrecipitation: data.current?.precipitation ?? 0,
      weatherCode: data.current?.weather_code ?? 0,
      apiTemperature: data.current?.temperature_2m ?? null,
      apiHumidity: data.current?.relative_humidity_2m ?? null,
      fetchedAt: new Date().toISOString(),
    };

    lastFetch = now;
    console.log(`Clima actualizado: ${cachedWeather.precipitationProbability}% prob. lluvia`);
    return cachedWeather;
  } catch (err) {
    console.error('Error al obtener clima:', err.message);
    return cachedWeather || {
      precipitationProbability: null,
      nextHoursProbability: [],
      currentPrecipitation: 0,
      weatherCode: 0,
      apiTemperature: null,
      apiHumidity: null,
      fetchedAt: null,
    };
  }
}

function startWeatherPolling(io) {
  fetchWeather().then((weather) => {
    if (io && weather) io.emit('weather:update', weather);
  });

  setInterval(async () => {
    const weather = await fetchWeather();
    if (io && weather) io.emit('weather:update', weather);
  }, CACHE_DURATION);
}

module.exports = { fetchWeather, startWeatherPolling };
