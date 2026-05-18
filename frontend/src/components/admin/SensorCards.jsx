import { Thermometer, Droplets, CloudRain, Sun, CloudLightning, CheckCircle } from 'lucide-react';

function getTempAlert(temp) {
  if (temp < 30) return { text: 'Confortable', desc: 'Temperatura agradable', bg: 'bg-green-50', border: 'border-green-200', value: 'text-green-700', icon: 'text-green-500', label: 'text-green-600', badge: 'bg-green-100 text-green-700' };
  if (temp < 38) return { text: 'Cálido', desc: 'Se recomienda ventilación', bg: 'bg-yellow-50', border: 'border-yellow-200', value: 'text-yellow-700', icon: 'text-yellow-500', label: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' };
  return { text: 'Extremo', desc: 'Riesgo de golpe de calor', bg: 'bg-red-50', border: 'border-red-200', value: 'text-red-700', icon: 'text-red-500', label: 'text-red-600', badge: 'bg-red-100 text-red-700' };
}

function getHumidityAlert(hum) {
  if (hum >= 30 && hum <= 60) return { text: 'Óptima', desc: 'Rango ideal de confort', bg: 'bg-green-50', border: 'border-green-200', value: 'text-green-700', icon: 'text-green-500', label: 'text-green-600', bar: 'bg-green-500', badge: 'bg-green-100 text-green-700' };
  if (hum > 60 && hum <= 80) return { text: 'Alta', desc: 'Ambiente húmedo', bg: 'bg-yellow-50', border: 'border-yellow-200', value: 'text-yellow-700', icon: 'text-yellow-500', label: 'text-yellow-600', bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700' };
  if (hum < 30) return { text: 'Baja', desc: 'Ambiente muy seco', bg: 'bg-red-50', border: 'border-red-200', value: 'text-red-700', icon: 'text-red-500', label: 'text-red-600', bar: 'bg-red-500', badge: 'bg-red-100 text-red-700' };
  return { text: 'Muy alta', desc: 'Riesgo de condensación', bg: 'bg-red-50', border: 'border-red-200', value: 'text-red-700', icon: 'text-red-500', label: 'text-red-600', bar: 'bg-red-500', badge: 'bg-red-100 text-red-700' };
}

function getRainAlert(prob, sensorRain) {
  if (sensorRain) return { text: 'Lloviendo', desc: 'Sensor confirma precipitación', bg: 'bg-red-50', border: 'border-red-200', value: 'text-red-700', icon: 'text-red-500', label: 'text-red-600', bar: 'bg-red-500', badge: 'bg-red-100 text-red-700' };
  if (prob < 30) return { text: 'Despejado', desc: 'Baja probabilidad de lluvia', bg: 'bg-green-50', border: 'border-green-200', value: 'text-green-700', icon: 'text-green-500', label: 'text-green-600', bar: 'bg-green-500', badge: 'bg-green-100 text-green-700' };
  if (prob < 60) return { text: 'Probable', desc: 'Posibilidad de lluvia ligera', bg: 'bg-yellow-50', border: 'border-yellow-200', value: 'text-yellow-700', icon: 'text-yellow-500', label: 'text-yellow-600', bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700' };
  return { text: 'Muy probable', desc: 'Alta probabilidad de lluvia', bg: 'bg-red-50', border: 'border-red-200', value: 'text-red-700', icon: 'text-red-500', label: 'text-red-600', bar: 'bg-red-500', badge: 'bg-red-100 text-red-700' };
}

function getUvAlert(uv) {
  if (uv < 3) return { text: 'Bajo', desc: 'Sin protección necesaria', bg: 'bg-green-50', border: 'border-green-200', value: 'text-green-700', icon: 'text-green-500', label: 'text-green-600', badge: 'bg-green-100 text-green-700' };
  if (uv < 6) return { text: 'Moderado', desc: 'Usar protección solar', bg: 'bg-yellow-50', border: 'border-yellow-200', value: 'text-yellow-700', icon: 'text-yellow-500', label: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' };
  if (uv < 8) return { text: 'Alto', desc: 'Evitar exposición prolongada', bg: 'bg-yellow-50', border: 'border-yellow-200', value: 'text-yellow-700', icon: 'text-yellow-500', label: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' };
  return { text: 'Extremo', desc: 'Peligro, buscar sombra', bg: 'bg-red-50', border: 'border-red-200', value: 'text-red-700', icon: 'text-red-500', label: 'text-red-600', badge: 'bg-red-100 text-red-700' };
}

function getTempRange(temp) {
  if (temp < 15) return 'Frío';
  if (temp < 25) return 'Fresco';
  if (temp < 30) return 'Agradable';
  if (temp < 35) return 'Caluroso';
  return 'Muy caluroso';
}

export default function SensorCards({ sensors, weather = {} }) {
  const temp = getTempAlert(sensors.temperature);
  const hum = getHumidityAlert(sensors.humidity);
  const precipProb = weather.precipitationProbability ?? 0;
  const rain = getRainAlert(precipProb, sensors.rain);
  const uv = getUvAlert(sensors.uvIndex);

  const nextHours = weather.nextHoursProbability || [];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Temperatura */}
      <div className={`${temp.bg} rounded-xl p-4 shadow-sm border ${temp.border} animate-fade-in transition-colors duration-500`}>
        <div className="flex items-center justify-between mb-2">
          <div className={`flex items-center gap-1.5 ${temp.label} text-xs font-semibold uppercase tracking-wide`}>
            <Thermometer size={14} className={temp.icon} />
            Temperatura
          </div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${temp.badge}`}>{temp.text}</span>
        </div>
        <div className={`text-3xl font-bold ${temp.value}`}>{sensors.temperature.toFixed(1)}°C</div>
        <div className="text-xs text-gray-500 mt-1.5">{temp.desc}</div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
          <span>Sensación: {getTempRange(sensors.temperature)}</span>
          <span>Rango: 15–40°C</span>
        </div>
      </div>

      {/* Humedad */}
      <div className={`${hum.bg} rounded-xl p-4 shadow-sm border ${hum.border} animate-fade-in transition-colors duration-500`}>
        <div className="flex items-center justify-between mb-2">
          <div className={`flex items-center gap-1.5 ${hum.label} text-xs font-semibold uppercase tracking-wide`}>
            <Droplets size={14} className={hum.icon} />
            Humedad
          </div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${hum.badge}`}>{hum.text}</span>
        </div>
        <div className={`text-3xl font-bold ${hum.value}`}>{sensors.humidity.toFixed(0)}%</div>
        <div className="text-xs text-gray-500 mt-1.5">{hum.desc}</div>
        <div className="w-full bg-white/60 rounded-full h-2 mt-2">
          <div className={`${hum.bar} h-2 rounded-full transition-all duration-500`} style={{ width: `${Math.min(sensors.humidity, 100)}%` }} />
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
          <span>Ideal: 30–60%</span>
          <span>Relativa</span>
        </div>
      </div>

      {/* Precipitación — ahora con datos de Open-Meteo */}
      <div className={`${rain.bg} rounded-xl p-4 shadow-sm border ${rain.border} animate-fade-in transition-colors duration-500`}>
        <div className="flex items-center justify-between mb-2">
          <div className={`flex items-center gap-1.5 ${rain.label} text-xs font-semibold uppercase tracking-wide`}>
            <CloudRain size={14} className={rain.icon} />
            Precipitación
          </div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${rain.badge}`}>{rain.text}</span>
        </div>
        <div className={`text-3xl font-bold ${rain.value}`}>{precipProb}%</div>
        <div className="text-xs text-gray-500 mt-1.5">{rain.desc}</div>
        <div className="w-full bg-white/60 rounded-full h-2 mt-2">
          <div className={`${rain.bar} h-2 rounded-full transition-all duration-500`} style={{ width: `${precipProb}%` }} />
        </div>
        {nextHours.length > 0 && (
          <div className="flex items-center gap-[3px] mt-2">
            {nextHours.slice(0, 6).map((p, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-sm transition-all duration-500 ${p < 30 ? 'bg-green-300' : p < 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                  style={{ height: `${Math.max(4, p / 100 * 20)}px` }}
                />
                <span className="text-[8px] text-gray-400 mt-0.5">+{i + 1}h</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            {sensors.rain
              ? <><CloudLightning size={10} className="text-red-500" /> Sensor: Lluvia</>
              : <><CheckCircle size={10} className="text-green-500" /> Sensor: Seco</>
            }
          </span>
          <span>Fuente: Open-Meteo</span>
        </div>
      </div>

      {/* UV */}
      <div className={`${uv.bg} rounded-xl p-4 shadow-sm border ${uv.border} animate-fade-in transition-colors duration-500`}>
        <div className="flex items-center justify-between mb-2">
          <div className={`flex items-center gap-1.5 ${uv.label} text-xs font-semibold uppercase tracking-wide`}>
            <Sun size={14} className={uv.icon} />
            Índice UV
          </div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${uv.badge}`}>{uv.text}</span>
        </div>
        <div className={`text-3xl font-bold ${uv.value}`}>{sensors.uvIndex.toFixed(1)}</div>
        <div className="text-xs text-gray-500 mt-1.5">{uv.desc}</div>
        <div className="w-full bg-white/60 rounded-full h-1.5 mt-2">
          <div className={`h-1.5 rounded-full transition-all duration-500 ${
            sensors.uvIndex < 3 ? 'bg-green-500' : sensors.uvIndex < 6 ? 'bg-yellow-500' : sensors.uvIndex < 8 ? 'bg-orange-500' : 'bg-red-500'
          }`} style={{ width: `${Math.min((sensors.uvIndex / 11) * 100, 100)}%` }} />
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
          <span>Escala: 0–11+</span>
          <span>{sensors.uvIndex >= 8 ? 'Cierre automático' : 'Normal'}</span>
        </div>
      </div>
    </div>
  );
}
