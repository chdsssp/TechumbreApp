import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionIndicator({ connected }) {
  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg z-50 ${
      connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
      {connected ? 'Conectado' : 'Desconectado'}
    </div>
  );
}
