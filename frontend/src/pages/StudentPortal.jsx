import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import ConnectionIndicator from '../components/shared/ConnectionIndicator';
import { LogOut, MapPin, CheckCircle, XCircle, Sun, CloudRain, Thermometer, Droplets, AlertTriangle, LogIn } from 'lucide-react';
import api from '../services/api';

export default function StudentPortal() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [sensors, setSensors] = useState({ temperature: 0, humidity: 0, rain: false, uvIndex: 0, roofState: 'CLOSED' });
  const [weather, setWeather] = useState({ precipitationProbability: null });
  const [presence, setPresence] = useState(false);
  const [votingSession, setVotingSession] = useState({ active: false, votesOpen: 0, votesClose: 0, totalVotes: 0, quorumNeeded: 0, totalPresent: 0 });
  const [hasVoted, setHasVoted] = useState(false);
  const [emergencyLock, setEmergencyLock] = useState(false);
  const [voting, setVoting] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const loadData = async () => {
    try {
      const [telRes, statusRes, sessionRes, presenceRes, weatherRes] = await Promise.all([
        api.get('/telemetry/current'),
        api.get('/control/status'),
        api.get('/voting/session/current'),
        api.get('/presence/active'),
        api.get('/telemetry/weather'),
      ]);

      if (telRes.data) setSensors(telRes.data);
      if (weatherRes.data) setWeather(weatherRes.data);
      setEmergencyLock(statusRes.data.emergencyLock);
      setSensors(prev => ({ ...prev, roofState: statusRes.data.roofState }));
      setVotingSession(sessionRes.data);

      const isPresent = presenceRes.data.some(p => p.id === user.id);
      setPresence(isPresent);
    } catch {}
  };

  useEffect(() => { loadData(); }, []);

  useSocketEvent('sensors:live', useCallback((data) => {
    setSensors(prev => ({ ...prev, ...data }));
  }, []));

  useSocketEvent('system:status', useCallback((data) => {
    setSensors(prev => ({ ...prev, roofState: data.roofState }));
    setEmergencyLock(data.emergencyLock);
  }, []));

  useSocketEvent('vote:update', useCallback((data) => {
    setVotingSession(prev => ({ ...prev, ...data, active: true }));
  }, []));

  useSocketEvent('session:started', useCallback((data) => {
    setVotingSession({ active: true, votesOpen: 0, votesClose: 0, totalVotes: 0, ...data });
    setHasVoted(false);
  }, []));

  useSocketEvent('session:result', useCallback(() => {
    setVotingSession(prev => ({ ...prev, active: false }));
    setHasVoted(false);
  }, []));

  useSocketEvent('presence:change', useCallback((data) => {
    if (data.student.id === user?.id) {
      setPresence(data.action === 'checkin');
    }
  }, [user?.id]));

  useSocketEvent('weather:update', useCallback((data) => {
    setWeather(data);
  }, []));

  const handlePresence = async () => {
    setCheckingIn(true);
    try {
      if (presence) {
        await api.post('/presence/self-checkout');
        setPresence(false);
      } else {
        await api.post('/presence/self-checkin');
        setPresence(true);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error al registrar presencia');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleVote = async (vote) => {
    setVoting(true);
    try {
      await api.post('/voting/vote', { vote });
      setHasVoted(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al votar');
    } finally {
      setVoting(false);
    }
  };

  const totalVotes = votingSession.votesOpen + votingSession.votesClose;
  const majorityPercent = totalVotes > 0
    ? Math.round((Math.max(votingSession.votesOpen, votingSession.votesClose) / totalVotes) * 100)
    : 0;
  const majorityLabel = votingSession.votesOpen >= votingSession.votesClose ? 'abrir' : 'cerrar';

  const isOpen = sensors.roofState === 'OPEN';

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="bg-[#1565C0] text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-sm font-bold">UAS</span>
          </div>
          <div>
            <div className="font-bold text-sm">Sistema de Techumbre</div>
            <div className="text-xs text-white/70">Facultad de Ingeniería Mochis</div>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm text-white/90 hover:text-white transition-colors">
          <LogOut size={16} />
          Salir
        </button>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">¡Hola, {user?.name}!</h2>
          <p className="text-sm text-gray-500 mt-1">Matrícula: {user?.matricula} | {user?.career}</p>
        </div>

        {/* Presencia con botón de check-in/checkout */}
        <div className={`rounded-xl p-4 shadow-sm border ${
          presence ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin size={20} className={presence ? 'text-green-600' : 'text-red-500'} />
              <div>
                <div className="text-sm font-semibold text-gray-700">Estado de Ubicación</div>
                <div className={`text-sm font-bold ${presence ? 'text-green-700' : 'text-red-600'}`}>
                  {presence ? 'DENTRO DE LA FACULTAD' : 'FUERA DE LA FACULTAD'}
                </div>
              </div>
            </div>
            {presence ? <CheckCircle size={24} className="text-green-500" /> : <XCircle size={24} className="text-red-400" />}
          </div>
          <button
            onClick={handlePresence}
            disabled={checkingIn}
            className={`mt-3 w-full py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
              presence
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <LogIn size={16} className={presence ? 'rotate-180' : ''} />
            {checkingIn ? 'Procesando...' : presence ? 'REGISTRAR SALIDA' : 'REGISTRAR ENTRADA'}
          </button>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Estado Actual del Techo</h3>
          <div className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-lg font-bold ${
            isOpen ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {isOpen ? <Sun size={22} /> : <CloudRain size={22} />}
            {isOpen ? 'ABIERTO' : 'CERRADO'}
          </div>

          {votingSession.active && totalVotes > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Votación estudiantil</span>
                <span className="font-semibold">{majorityPercent}% para {majorityLabel}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${majorityLabel === 'abrir' ? 'bg-blue-500' : 'bg-yellow-500'}`}
                  style={{ width: `${majorityPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">La mayoría prefiere el techo {majorityLabel === 'abrir' ? 'abierto' : 'cerrado'}</p>
            </div>
          )}

          {!votingSession.active && (
            <p className="text-sm text-gray-400 mt-3">No hay votación en curso</p>
          )}
        </div>

        {votingSession.active && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-1">¿Cómo prefieres el ambiente ahora?</h3>
            <p className="text-sm text-gray-500 mb-4">Tu voto ayuda a decidir el estado del techo</p>

            {emergencyLock && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 justify-center">
                <AlertTriangle size={16} className="text-red-500" />
                <span className="text-sm text-red-700 font-medium">Techo bloqueado por emergencia climática</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleVote('OPEN')}
                disabled={hasVoted || !presence || emergencyLock || voting}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#2E7D32] hover:bg-green-800 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Sun size={18} />
                SOLICITAR APERTURA
              </button>
              <button
                onClick={() => handleVote('CLOSE')}
                disabled={hasVoted || !presence || emergencyLock || voting}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#F9A825] hover:bg-yellow-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <CloudRain size={18} />
                SOLICITAR CIERRE
              </button>
            </div>

            {hasVoted && <p className="text-sm text-green-600 font-medium mt-3">Ya emitiste tu voto</p>}
            {!presence && !hasVoted && <p className="text-sm text-red-500 font-medium mt-3">Registra tu entrada para poder votar</p>}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <Thermometer size={20} className="mx-auto text-red-500 mb-1" />
            <div className="text-lg font-bold text-gray-800">{sensors.temperature.toFixed(0)}°C</div>
            <div className="text-xs text-gray-400">Temperatura</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <Droplets size={20} className="mx-auto text-blue-500 mb-1" />
            <div className="text-lg font-bold text-gray-800">{sensors.humidity.toFixed(0)}%</div>
            <div className="text-xs text-gray-400">Humedad</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <CloudRain size={20} className="mx-auto text-gray-500 mb-1" />
            <div className="text-lg font-bold text-gray-800">{weather.precipitationProbability ?? 0}%</div>
            <div className="text-xs text-gray-400">Prob. Lluvia</div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <Sun size={20} className="mx-auto text-yellow-500 mb-1" />
            <div className="text-lg font-bold text-gray-800">{sensors.uvIndex.toFixed(0)}</div>
            <div className="text-xs text-gray-400">Índice UV</div>
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-gray-400">
        <p>Sistema de Techumbre Automatizada Inteligente v1.0</p>
        <p>&copy; 2025 Facultad de Ingeniería Mochis - UAS</p>
      </footer>

      <ConnectionIndicator connected={connected} />
    </div>
  );
}
