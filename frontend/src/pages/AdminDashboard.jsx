import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import Sidebar from '../components/admin/Sidebar';
import SensorCards from '../components/admin/SensorCards';
import RoofStatus from '../components/admin/RoofStatus';
import ControlPanel from '../components/admin/ControlPanel';
import SchedulePanel from '../components/admin/SchedulePanel';
import VotingSummary from '../components/admin/VotingSummary';
import AnalyticsView from '../components/admin/AnalyticsView';
import ConnectionIndicator from '../components/shared/ConnectionIndicator';
import { LogOut, Menu, AlertTriangle } from 'lucide-react';
import api from '../services/api';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sensors, setSensors] = useState({ temperature: 0, humidity: 0, rain: false, uvIndex: 0, rainAnalog: 0, roofState: 'CLOSED' });
  const [weather, setWeather] = useState({ precipitationProbability: null, nextHoursProbability: [], currentPrecipitation: 0 });
  const [status, setStatus] = useState({ roofState: 'CLOSED', activePriority: 4, emergencyLock: false, rainAutoMode: true, esp32Connected: false });
  const [esp32Alert, setEsp32Alert] = useState(false);

  const loadStatus = async () => {
    try {
      const [statusRes, telemetryRes, weatherRes] = await Promise.all([
        api.get('/control/status'),
        api.get('/telemetry/current'),
        api.get('/telemetry/weather'),
      ]);
      setStatus(statusRes.data);
      if (telemetryRes.data) setSensors(telemetryRes.data);
      if (weatherRes.data) setWeather(weatherRes.data);
      setEsp32Alert(!statusRes.data.esp32Connected);
    } catch {}
  };

  useEffect(() => { loadStatus(); }, []);

  useSocketEvent('sensors:live', useCallback((data) => {
    setSensors(prev => ({ ...prev, ...data }));
    setEsp32Alert(false);
  }, []));

  useSocketEvent('system:status', useCallback((data) => {
    setStatus(prev => ({ ...prev, ...data }));
  }, []));

  useSocketEvent('weather:update', useCallback((data) => {
    setWeather(data);
  }, []));

  return (
    <div className="min-h-screen flex bg-[#F5F5F5]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-sm sm:text-lg font-bold text-gray-800 leading-tight">Panel de Control de Infraestructura</h1>
              <p className="text-[10px] sm:text-xs text-gray-400">AutoMalla — Sistema Automatizado Inteligente</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-700">Admin. {user?.name}</div>
              <div className="text-xs text-gray-400">{user?.career}</div>
            </div>
            <button onClick={logout} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {esp32Alert && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <span className="text-sm text-red-700 font-medium">ESP32 desconectado — sin datos recientes de sensores</span>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-6">
                <RoofStatus status={status} />
                <SensorCards sensors={sensors} weather={weather} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ControlPanel status={status} onUpdate={loadStatus} />
                <SchedulePanel />
              </div>

              <VotingSummary />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="animate-fade-in">
              <AnalyticsView />
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="animate-fade-in">
              <SchedulePanel />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-fade-in">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Configuración</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-semibold text-gray-700">Simular datos de sensores</div>
                    <div className="text-xs text-gray-400">Genera datos aleatorios para pruebas</div>
                  </div>
                  <button
                    onClick={async () => {
                      try { await api.post('/telemetry/simulate'); } catch {}
                    }}
                    className="px-4 py-2 bg-[#1565C0] text-white rounded-lg text-sm font-medium hover:bg-[#1256A5]"
                  >
                    Simular
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <ConnectionIndicator connected={connected} />
    </div>
  );
}
