import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

export default function AnalyticsView() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/telemetry/history?limit=50');
        setData(res.data.map((d, i) => {
          const date = new Date(d.createdAt);
          const label = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return {
            time: label,
            index: i + 1,
            Temperatura: parseFloat(d.temperature.toFixed(1)),
            Humedad: parseFloat(d.humidity.toFixed(1)),
            UV: parseFloat(d.uvIndex.toFixed(1)),
          };
        }));
      } catch {}
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">Historial de Sensores</h3>
        <span className="text-xs text-gray-400">Últimas 50 muestras • actualiza cada 10s</span>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11 }}
              stroke="#9ca3af"
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend />
            <Line type="monotone" dataKey="Temperatura" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="Humedad" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="UV" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {data.length === 0 && (
        <p className="text-center text-gray-400 text-sm mt-4">No hay muestras registradas aún</p>
      )}
    </div>
  );
}
