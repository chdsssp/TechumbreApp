import { useState, useEffect, useCallback } from 'react';
import { Users, Sun, Cloud, PieChart } from 'lucide-react';
import { useSocketEvent } from '../../hooks/useSocket';
import api from '../../services/api';

export default function VotingSummary() {
  const [votingData, setVotingData] = useState({
    active: false,
    votesOpen: 0,
    votesClose: 0,
    totalVotes: 0,
    quorumNeeded: 0,
    totalPresent: 0,
  });
  const [presenceCount, setPresenceCount] = useState(0);

  const loadData = async () => {
    try {
      const [votingRes, presenceRes] = await Promise.all([
        api.get('/voting/session/current'),
        api.get('/presence/count'),
      ]);
      setVotingData(votingRes.data);
      setPresenceCount(presenceRes.data.total);
    } catch {}
  };

  useEffect(() => { loadData(); }, []);

  useSocketEvent('vote:update', useCallback((data) => {
    setVotingData(prev => ({ ...prev, ...data, active: true }));
  }, []));

  useSocketEvent('session:started', useCallback((data) => {
    setVotingData({ active: true, votesOpen: 0, votesClose: 0, totalVotes: 0, ...data });
  }, []));

  useSocketEvent('session:result', useCallback(() => {
    loadData();
  }, []));

  useSocketEvent('presence:change', useCallback((data) => {
    setPresenceCount(data.totalPresent);
  }, []));

  const handleStartSession = async () => {
    try {
      await api.post('/voting/session/start');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al iniciar votación');
    }
  };

  const handleCloseSession = async () => {
    try {
      await api.post('/voting/session/close');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cerrar votación');
    }
  };

  const participation = votingData.totalPresent > 0
    ? Math.round((votingData.totalVotes / votingData.totalPresent) * 100)
    : 0;

  const getStatusBadge = () => {
    if (!votingData.active) return { text: 'Sin Sesión', color: 'bg-gray-100 text-gray-600' };
    if (votingData.totalVotes < (votingData.quorumNeeded || 0)) return { text: 'Esperando Quórum', color: 'bg-yellow-100 text-yellow-700' };
    return { text: 'Votación Activa', color: 'bg-green-100 text-green-700' };
  };

  const badge = getStatusBadge();

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resumen de Votación Estudiantil</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>{badge.text}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <Users size={24} className="mx-auto text-blue-500 mb-2" />
          <div className="text-2xl font-bold text-gray-800">{presenceCount}</div>
          <div className="text-xs text-gray-400">Alumnos Presentes</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <Sun size={24} className="mx-auto text-yellow-500 mb-2" />
          <div className="text-2xl font-bold text-gray-800">{votingData.votesOpen}</div>
          <div className="text-xs text-gray-400">Votos para Abrir</div>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 text-center">
          <Cloud size={24} className="mx-auto text-orange-500 mb-2" />
          <div className="text-2xl font-bold text-gray-800">{votingData.votesClose}</div>
          <div className="text-xs text-gray-400">Votos para Cerrar</div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full border-4 border-yellow-400 flex items-center justify-center">
            <span className="text-sm font-bold text-yellow-700">{participation}%</span>
          </div>
          <div className="text-xs text-gray-400">Participación</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Quórum necesario: <strong>{votingData.quorumNeeded || Math.ceil(presenceCount * 0.3)} votos</strong>
        </p>
        <div className="flex gap-2">
          {!votingData.active ? (
            <button
              onClick={handleStartSession}
              className="px-4 py-2 bg-[#1565C0] text-white rounded-lg text-sm font-medium hover:bg-[#1256A5] transition-colors"
            >
              Iniciar Votación
            </button>
          ) : (
            <button
              onClick={handleCloseSession}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Cerrar Votación
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
