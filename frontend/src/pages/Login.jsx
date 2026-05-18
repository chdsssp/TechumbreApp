import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function Login() {
  const [searchParams] = useSearchParams();
  const isAdmin = searchParams.get('admin') === 'true';
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(matricula, password, isAdmin);
      navigate(user.role === 'ADMIN' ? '/admin' : '/alumnado');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0D1B2A] to-[#1565C0] px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1565C0] to-[#0D1B2A] flex items-center justify-center">
              <span className="text-white font-bold text-lg font-['Plus_Jakarta_Sans']">UAS</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-1">
            {isAdmin ? 'Acceso Administrativo' : 'Acceso a Control de Ambiente'}
          </h1>
          <p className="text-center text-gray-500 mb-6 text-sm">Facultad de Ingeniería Mochis</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Matrícula Universitaria
              </label>
              <input
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ej: 21030456"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-800"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-800 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1565C0] hover:bg-[#1256A5] text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <LogIn size={18} />
                  Ingresar
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            {isAdmin ? (
              <button
                onClick={() => navigate('/login')}
                className="text-[#1565C0] hover:underline text-sm font-medium"
              >
                Acceso Estudiante
              </button>
            ) : (
              <button
                onClick={() => navigate('/login?admin=true')}
                className="text-[#1565C0] hover:underline text-sm font-medium"
              >
                Acceso Administrativo
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          &copy; 2025 Universidad Autónoma de Sinaloa. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
