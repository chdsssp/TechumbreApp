import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import api from '../../services/api';

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function SchedulePanel() {
  const [schedules, setSchedules] = useState([]);
  const [action, setAction] = useState('CLOSE');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const loadSchedules = async () => {
    try {
      const res = await api.get('/schedules');
      setSchedules(res.data);
    } catch {}
  };

  useEffect(() => { loadSchedules(); }, []);

  const addSchedule = async () => {
    if (!time) return;
    try {
      await api.post('/schedules', {
        action,
        time,
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
      });
      setTime('');
      setEndTime('');
      loadSchedules();
    } catch (err) {
      alert('Error al crear horario');
    }
  };

  const deleteSchedule = async (id) => {
    try {
      await api.delete(`/schedules/${id}`);
      loadSchedules();
    } catch {}
  };

  const formatDays = (days) => {
    if (days.length === 7) return 'Todos los días';
    if (JSON.stringify(days.sort()) === JSON.stringify([1, 2, 3, 4, 5])) return 'Lunes a Viernes';
    return days.map(d => dayNames[d]).join(', ');
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Programación de Horarios</h3>

      <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:items-center">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white w-full sm:w-auto"
        >
          <option value="CLOSE">Cerrar</option>
          <option value="OPEN">Abrir</option>
        </select>

        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-0"
          />
          <span className="text-gray-400 text-sm shrink-0">a</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-0"
          />
          <button
            onClick={addSchedule}
            className="bg-[#1565C0] text-white p-2 rounded-lg hover:bg-[#1256A5] transition-colors shrink-0"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {schedules.map(s => (
          <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-gray-400" />
              <div>
                <div className="text-sm font-semibold text-gray-700">
                  {s.action === 'CLOSE' ? 'CERRAR' : 'ABRIR'} de {s.time}
                </div>
                <div className="text-xs text-gray-400">{formatDays(s.dayOfWeek)}</div>
              </div>
            </div>
            <button
              onClick={() => deleteSchedule(s.id)}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {schedules.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No hay horarios programados</p>
        )}
      </div>
    </div>
  );
}
