import { useState } from 'react';
import { Unlock, Lock, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

export default function ControlPanel({ status, onUpdate }) {
  const [confirming, setConfirming] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleOverride = async (action) => {
    if (confirming !== action) {
      setConfirming(action);
      return;
    }

    setLoading(true);
    try {
      await api.post('/control/override', { action });
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al aplicar override');
    } finally {
      setLoading(false);
      setConfirming(null);
    }
  };

  const handleRainAuto = async (enabled) => {
    try {
      await api.post('/control/rain-auto', { enabled });
      onUpdate();
    } catch (err) {
      alert('Error al cambiar modo lluvia');
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Control Manual</h3>

      {status.emergencyLock && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-600" />
          <span className="text-sm text-red-700 font-medium">EMERGENCIA CLIMÁTICA ACTIVA</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => handleOverride('FORCE_OPEN')}
          disabled={loading || status.emergencyLock}
          className={`flex items-center justify-center gap-1.5 py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all disabled:opacity-50 ${
            confirming === 'FORCE_OPEN'
              ? 'bg-green-700 text-white ring-2 ring-green-400'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <Unlock size={16} className="shrink-0" />
          <span className="truncate">{confirming === 'FORCE_OPEN' ? '¿CONFIRMAR?' : 'FORZAR APERTURA'}</span>
        </button>

        <button
          onClick={() => handleOverride('FORCE_CLOSE')}
          disabled={loading || status.emergencyLock}
          className={`flex items-center justify-center gap-1.5 py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all disabled:opacity-50 ${
            confirming === 'FORCE_CLOSE'
              ? 'bg-yellow-700 text-white ring-2 ring-yellow-400'
              : 'bg-yellow-500 hover:bg-yellow-600 text-white'
          }`}
        >
          <Lock size={16} className="shrink-0" />
          <span className="truncate">{confirming === 'FORCE_CLOSE' ? '¿CONFIRMAR?' : 'FORZAR CIERRE'}</span>
        </button>
      </div>

      {status.activePriority <= 2 && !status.emergencyLock && (
        <button
          onClick={() => handleOverride('RELEASE')}
          disabled={loading}
          className="w-full mb-4 py-2 rounded-lg border-2 border-gray-300 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          Liberar Override
        </button>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-700">Modo Lluvia Automático</div>
          <div className="text-xs text-gray-400">Cierra automáticamente si detecta lluvia</div>
        </div>
        <button
          onClick={() => handleRainAuto(!status.rainAutoMode)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            status.rainAutoMode ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            status.rainAutoMode ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
    </div>
  );
}
