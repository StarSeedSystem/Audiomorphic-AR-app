import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, UserPlus, AlertCircle, CheckCircle2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setNotice(null); setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthModalOpen(false); setEmail(''); setPassword('');
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Si "Confirmar email" está activo, Supabase NO crea sesión todavía:
        // hay user pero sin session. Mostramos aviso en vez de cerrar en silencio.
        if (data.user && !data.session) {
          setNotice('Te enviamos un correo de confirmación. Verifícalo y vuelve a iniciar sesión con tu misma cuenta StarSeed.');
          setPassword('');
          setIsLogin(true);
        } else {
          setAuthModalOpen(false); setEmail(''); setPassword('');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Hubo un error. Intenta de nuevo.');
    } finally { setLoading(false); }
  };

  const switchTab = (login: boolean) => {
    setIsLogin(login);
    setError(null);
    setNotice(null);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
      {/* Fondo radial oscuro + orbes violeta/púrpura difuminados (look StarSeed unificado) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#1a1030,#070510_70%)]" onClick={() => setAuthModalOpen(false)} />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-violet-600/30 blur-[120px]" />
        <div className="absolute -bottom-24 -right-16 w-[24rem] h-[24rem] rounded-full bg-fuchsia-600/25 blur-[120px]" />
      </div>

      {/* Tarjeta glass centrada (~420px) */}
      <div className="relative w-full max-w-[420px] my-auto bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.7)] overflow-hidden p-7 sm:p-8">
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        {/* Wordmark StarSeed: gradiente violeta -> teal */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center gap-2 mb-3">
            <Sparkles size={18} className="text-violet-300" />
            <span className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] to-[#34d399]">
              StarSeed
            </span>
          </div>
          <h2 className="text-lg font-semibold text-white">
            {isLogin ? 'Entra a tu cuenta' : 'Crea tu cuenta StarSeed'}
          </h2>
          <p className="text-gray-400 text-xs mt-1">
            Audiomorphic · una sola cuenta para todo el ecosistema
          </p>
        </div>

        {/* Tabs: Entrar / Crear cuenta */}
        <div className="relative grid grid-cols-2 mb-6 p-1 rounded-2xl bg-black/30 border border-white/10">
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-xl bg-gradient-to-r from-violet-500/80 to-fuchsia-500/80 shadow-[0_0_18px_rgba(167,139,250,0.4)] transition-transform duration-300 ${isLogin ? 'translate-x-0' : 'translate-x-[calc(100%+0.5rem)]'}`}
          />
          <button
            type="button"
            onClick={() => switchTab(true)}
            className={`relative z-10 py-2 text-sm font-semibold rounded-xl transition-colors ${isLogin ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => switchTab(false)}
            className={`relative z-10 py-2 text-sm font-semibold rounded-xl transition-colors ${!isLogin ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Crear cuenta
          </button>
        </div>

        {notice && (
          <div className="mb-5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2 text-emerald-300 text-sm">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" /><p>{notice}</p>
          </div>
        )}
        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-400 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /><p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Correo electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-gray-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/40 transition-colors"
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-gray-500" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-11 text-white placeholder-gray-600 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/40 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${loading ? 'bg-violet-500/40 text-white/60 cursor-not-allowed' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white shadow-[0_0_20px_rgba(167,139,250,0.45)]'}`}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : isLogin ? (
              <><LogIn size={18} /> Entrar</>
            ) : (
              <><UserPlus size={18} /> Crear cuenta</>
            )}
          </button>
        </form>

        {/* Nota honesta del ecosistema */}
        <p className="mt-6 text-[11px] leading-relaxed text-gray-500 text-center">
          Una sola cuenta para todo el ecosistema StarSeed (OS, Nexus, Café, Audiomorphic).
          Al crear tu cuenta recibes tu dirección interna{' '}
          <span className="text-emerald-300/90 font-mono">@star.seed</span>.
        </p>
      </div>
    </div>
  );
};
