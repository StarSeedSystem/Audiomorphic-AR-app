import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Lock,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  Globe,
  ExternalLink,
  HardDrive,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { STARSEED_OS_OFFICIAL_URL } from '../lib/supabaseClient';
import { openExternalUrl } from '../utils/platform';
import StarSeedSymbol from './StarSeedSymbol';
import { useMenu3DTilt } from '../hooks/useMenu3DTilt';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen, loginWithIdentifier, signUpWithIdentifier } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cardTilt = useMenu3DTilt({ maxDeg: 5, maxTranslatePx: 5 });

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAuthModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAuthModalOpen, setAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (isLogin) {
        const res = await loginWithIdentifier(identifier, password);
        if (!res.ok) {
          setError(res.error || 'No se pudo iniciar sesión en StarSeed OS.');
        } else {
          setIdentifier('');
          setPassword('');
        }
      } else {
        const res = await signUpWithIdentifier(identifier, password, displayName);
        if (!res.ok) {
          setError(res.error || 'No se pudo crear la cuenta.');
        } else if (res.error) {
          setNotice(res.error);
          setPassword('');
          setIsLogin(true);
        } else {
          setIdentifier('');
          setDisplayName('');
          setPassword('');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (loginTab: boolean) => {
    setIsLogin(loginTab);
    setError(null);
    setNotice(null);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto menu-3d-stage animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(20,18,45,0.92),rgba(3,6,15,0.96)_72%)] backdrop-blur-xl"
        onClick={() => setAuthModalOpen(false)}
      />

      <div
        ref={cardTilt.surfaceRef}
        onPointerMove={cardTilt.onPointerMove}
        onPointerLeave={cardTilt.onPointerLeave}
        className="relative w-full max-w-[445px] my-auto max-h-[92dvh] overflow-y-auto art-nouveau-frame menu-3d-surface menu-audio-rim rounded-3xl p-5 sm:p-8 text-white"
      >
        <div className="menu-3d-glare rounded-3xl" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="relative z-10 text-center mb-6">
          <div className="mx-auto mb-3 w-20 h-20 rounded-2xl quantum-glass flex items-center justify-center p-2 shadow-lg">
            <StarSeedSymbol size="xl" glow alt="Símbolo oficial de StarSeed OS" />
          </div>
          <div className="inline-flex items-center justify-center gap-2 mb-2.5 px-3 py-1 rounded-full morph-pill text-xs font-bold">
            <StarSeedSymbol size="xs" glow />
            <span>Ecosistema StarSeed OS</span>
          </div>
          <h2 id="auth-modal-title" className="text-2xl font-extrabold starseed-text-gradient tracking-tight">
            {isLogin ? 'Conecta tu Cuenta StarSeed' : 'Crea tu Cuenta StarSeed'}
          </h2>
          <p className="text-slate-300 text-xs mt-1.5 leading-relaxed">
            Sincroniza tus presets, folders, cerebros y dispositivos (neuronas) en todo el ecosistema.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 mb-5 p-1 rounded-2xl bg-black/40 border border-white/10">
          <button
            type="button"
            onClick={() => switchTab(true)}
            className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-opacity duration-150 cursor-pointer ${
              isLogin ? 'morph-tab-active' : 'text-slate-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => switchTab(false)}
            className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-opacity duration-150 cursor-pointer ${
              !isLogin ? 'morph-tab-active' : 'text-slate-400 hover:text-white'
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {notice && (
          <div className="relative z-10 mb-4 p-3 bg-emerald-500/15 border border-emerald-500/35 rounded-xl flex items-start gap-2 text-emerald-200 text-xs">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
            <p>{notice}</p>
          </div>
        )}
        {error && (
          <div className="relative z-10 mb-4 p-3 bg-red-500/15 border border-red-500/35 rounded-xl flex items-start gap-2 text-red-200 text-xs">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative z-10 space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Nombre visible
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Viajero Cósmico"
                className="w-full bg-black/45 border border-white/15 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              {isLogin ? 'Usuario (@handle) o Correo StarSeed OS' : 'Correo electrónico'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={15} className="text-slate-400" />
              </div>
              <input
                type={isLogin ? 'text' : 'email'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full bg-black/45 border border-white/15 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                placeholder={isLogin ? '@usuario o tu@correo.com' : 'tu@correo.com'}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={15} className="text-slate-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/45 border border-white/15 rounded-xl py-2.5 pl-9 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl morph-btn-primary font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn size={16} /> Entrar a StarSeed OS
              </>
            ) : (
              <>
                <UserPlus size={16} /> Crear Cuenta
              </>
            )}
          </button>
        </form>

        <div className="relative z-10 mt-5 pt-4 border-t border-white/10 space-y-2.5">
          <button
            type="button"
            onClick={() => setAuthModalOpen(false)}
            className="w-full py-2.5 px-3 rounded-xl morph-btn-glass text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <HardDrive size={14} className="morph-accent-text" />
            <span>Continuar en Modo Local Autónomo (Sin Conexión)</span>
          </button>

          <button
            type="button"
            onClick={() => openExternalUrl(STARSEED_OS_OFFICIAL_URL)}
            className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-[11px] text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <StarSeedSymbol size="xs" />
            <span>Abrir Portal Oficial starseed-os.vercel.app</span>
            <ExternalLink size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};
