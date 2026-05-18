import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

function getPriorityLabel(priority, emergencyLock) {
  if (emergencyLock) return { text: 'EMERGENCIA', color: 'bg-red-100 text-red-700 border-red-200' };
  if (priority === 2) return { text: 'OVERRIDE', color: 'bg-orange-100 text-orange-700 border-orange-200' };
  if (priority === 3) return { text: 'PROGRAMADO', color: 'bg-purple-100 text-purple-700 border-purple-200' };
  return { text: 'AUTOMÁTICO', color: 'bg-blue-100 text-blue-700 border-blue-200' };
}

export default function RoofStatus({ status }) {
  const isOpen = status.roofState === 'OPEN';
  const isMoving = status.roofState === 'MOVING';
  const priority = getPriorityLabel(status.activePriority, status.emergencyLock);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">Estado del Techo</h3>

      <div className="flex flex-col items-center">
        <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-3 transition-colors ${
          isMoving ? 'bg-blue-100 animate-pulse' :
          isOpen ? 'bg-green-100' : 'bg-yellow-100'
        }`}>
          {status.emergencyLock ? (
            <ShieldAlert size={48} className="text-red-500" />
          ) : isOpen ? (
            <ShieldCheck size={48} className="text-green-600" />
          ) : (
            <Shield size={48} className={isMoving ? 'text-blue-500' : 'text-yellow-600'} />
          )}
        </div>

        <div className={`text-2xl font-bold ${
          isMoving ? 'text-blue-600' :
          isOpen ? 'text-green-600' : 'text-yellow-600'
        }`}>
          {isMoving ? 'MOVIENDO...' : isOpen ? 'ABIERTO' : 'CERRADO'}
        </div>

        <span className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold border ${priority.color}`}>
          Modo: {priority.text}
        </span>
      </div>
    </div>
  );
}
