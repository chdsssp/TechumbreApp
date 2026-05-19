import { LayoutDashboard, BarChart3, Calendar, Settings } from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analíticas', icon: BarChart3 },
  { id: 'schedule', label: 'Programación', icon: Calendar },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0D1B2A] text-white flex flex-col transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <img src="/uas-logo.png" alt="UAS" className="w-10 h-10 object-contain" />
            <div className="text-xs">
              <div className="font-semibold">Universidad Autónoma</div>
              <div className="text-white/60">de Sinaloa</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img src="/logo-fim.png" alt="FIM" className="w-10 h-10 object-contain" />
            <div className="text-xs">
              <div className="font-semibold">Facultad de Ingeniería</div>
              <div className="text-white/60">Mochis</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-[#1565C0] text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">AutoMalla v1.0</p>
        </div>
      </aside>
    </>
  );
}
