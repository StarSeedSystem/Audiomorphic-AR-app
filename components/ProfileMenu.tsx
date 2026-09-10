import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Cloud, Download, Upload, Star, Clock, Shield, Zap, ChevronDown, Settings, Crown, Trash2, Lock, Rocket, AtSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { SubscriptionTier } from '../types';
import { usePresets, Preset } from '../hooks/usePresets';

interface ProfileMenuProps {
  subscriptionTier: SubscriptionTier;
  trialEndTime: number | null;
  onShowPresets: () => void;
  onShowSubscription: () => void;
  onLoadPreset: (preset: Preset) => void;
}

const tierLabels: Record<SubscriptionTier, { label: string; color: string; icon: React.ReactNode }> = {
  free: { label: 'Explorador', color: 'text-gray-400', icon: <User size={14} /> },
  trial: { label: 'Viajero (Prueba)', color: 'text-cyan-400', icon: <Clock size={14} /> },
  annual: { label: 'Creador', color: 'text-purple-400', icon: <Star size={14} /> },
  lifetime: { label: 'Maestro', color: 'text-emerald-400', icon: <Crown size={14} /> },
};

const ProfileMenu: React.FC<ProfileMenuProps> = ({ 
  subscriptionTier, 
  trialEndTime, 
  onShowPresets, 
  onShowSubscription,
  onLoadPreset
}) => {
  const { user, profile, logout, setAuthModalOpen } = useAuth();
  const { cloudPresets, deletePreset, exportPresets, importPresets } = usePresets();
  const [isOpen, setIsOpen] = useState(false);
  const [trialRemaining, setTrialRemaining] = useState<string | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Trial countdown
  useEffect(() => {
    if (subscriptionTier !== 'trial' || !trialEndTime) {
      setTrialRemaining(null);
      return;
    }
    const update = () => {
      const remaining = trialEndTime - Date.now();
      if (remaining <= 0) {
        setTrialRemaining('Expirada');
        return;
      }
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTrialRemaining(`${minutes}m ${seconds}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [subscriptionTier, trialEndTime]);

  // El botón de entrar a la cuenta ha sido trasladado dentro de la sección de Información
  if (!user) {
    return null;
  }

  const tierInfo = tierLabels[subscriptionTier] || tierLabels.free;
  // Datos REALES del perfil StarSeed (profiles + starseed_identities). Sin datos ficticios.
  const handle = profile?.handle ?? null;
  const displayName = profile?.displayName || (handle ? `@${handle}` : null) || user.email?.split('@')[0] || 'Usuario';
  const avatarUrl = profile?.avatarUrl ?? null;
  const starseedAddress = profile?.starseedAddress ?? (handle ? `${handle}@star.seed` : null);
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importPresets(file);
      e.target.value = ''; // Reset input
    }
  };

  // SSO: abrir StarSeed OS con la sesión actual (token handoff).
  const handleOpenStarSeedOS = async () => {
    setHandoffLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        setAuthModalOpen(true);
        return;
      }
      const params = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: 'bearer',
        expires_in: '3600',
        type: 'signup',
      });
      window.open(`https://starseed-os.vercel.app/funciones#${params.toString()}`, '_blank', 'noopener');
    } catch (e) {
      // Si falla, abrimos el OS sin sesión (el usuario podrá iniciar sesión allí).
      window.open('https://starseed-os.vercel.app/funciones', '_blank', 'noopener');
    } finally {
      setHandoffLoading(false);
      setIsOpen(false);
    }
  };

  const isLocked = subscriptionTier === 'free';

  return (
    <div className="relative" ref={menuRef}>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />
      
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="liquid-bubble p-2 md:px-3 md:py-2 flex items-center gap-2 text-white hover:text-cyan-200 transition-colors"
        title="Mi Perfil"
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border ${
          subscriptionTier === 'lifetime' ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-300' :
          subscriptionTier === 'annual' ? 'bg-purple-500/30 border-purple-400/50 text-purple-300' :
          subscriptionTier === 'trial' ? 'bg-cyan-500/30 border-cyan-400/50 text-cyan-300' :
          'bg-white/10 border-white/20 text-gray-300'
        }`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            avatarLetter
          )}
        </div>
        <span className="text-xs font-bold hidden md:inline max-w-[80px] truncate">{displayName}</span>
        <ChevronDown size={14} className={`hidden md:block transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="fixed top-20 left-4 right-4 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-80 z-[600] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="rounded-2xl border border-white/15 bg-gray-900/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
            
            {/* User Info Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-br from-white/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold border-2 ${
                  subscriptionTier === 'lifetime' ? 'bg-emerald-500/30 border-emerald-400/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                  subscriptionTier === 'annual' ? 'bg-purple-500/30 border-purple-400/60 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]' :
                  subscriptionTier === 'trial' ? 'bg-cyan-500/30 border-cyan-400/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]' :
                  'bg-white/10 border-white/30 text-gray-300'
                }`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    avatarLetter
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{displayName}</p>
                  {handle && (
                    <p className="text-[11px] text-cyan-300 truncate flex items-center gap-0.5">
                      <AtSign size={10} className="shrink-0" />{handle}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-bold uppercase tracking-tighter ${tierInfo.color}`}>
                    {trialRemaining === 'Expirada' ? 'Viajero (Expirada)' : tierInfo.label}
                  </span>
                  {trialRemaining && trialRemaining !== 'Expirada' && (
                    <span className="text-[9px] text-cyan-400 font-mono bg-cyan-400/10 px-1 rounded animate-pulse mt-1">
                      {trialRemaining}
                    </span>
                  )}
                </div>
              </div>

              {/* Identidad StarSeed (direccion interna @star.seed) */}
              {starseedAddress && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 border border-white/5">
                  <Star size={12} className="text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Identidad StarSeed</p>
                    <p className="text-xs font-mono text-emerald-300 truncate">{starseedAddress}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Presets List */}
            <div className="max-h-48 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
              <p className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-2">
                <Cloud size={10} /> Mis Presets Guardados
              </p>
              {cloudPresets.length === 0 ? (
                <p className="px-3 py-4 text-xs text-center text-gray-500 italic">No hay presets cargados</p>
              ) : (
                cloudPresets.map(preset => (
                  <div key={preset.id} className="group flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
                    <button 
                      onClick={() => { onLoadPreset(preset); setIsOpen(false); }}
                      className="text-xs text-gray-300 hover:text-white truncate flex-1 text-left"
                    >
                      {preset.name}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deletePreset(preset.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Actions Menu Items */}
            <div className="p-2 border-t border-white/10 bg-black/20">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={handleImportClick}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold bg-white/5 text-gray-300 hover:bg-blue-500/20 hover:text-blue-300 border border-white/5 transition-all"
                >
                  <Upload size={12} /> Importar
                </button>
                <button
                  onClick={exportPresets}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold bg-white/5 text-gray-300 hover:bg-purple-500/20 hover:text-purple-300 border border-white/5 transition-all"
                >
                  <Download size={12} /> Exportar
                </button>
              </div>

              {/* SSO: Abrir StarSeed OS con mi sesion (token handoff) */}
              <button
                onClick={handleOpenStarSeedOS}
                disabled={handoffLoading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all group disabled:opacity-60"
              >
                {handoffLoading ? (
                  <span className="w-4 h-4 border-2 border-cyan-300/30 border-t-cyan-300 rounded-full animate-spin" />
                ) : (
                  <Rocket size={16} className="text-cyan-300 group-hover:text-cyan-200" />
                )}
                <span>Abrir StarSeed OS con mi sesión</span>
              </button>

              {isLocked && (
                <button
                  onClick={() => { setIsOpen(false); onShowSubscription(); }}
                  className="w-full mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-yellow-300 bg-yellow-500/5 hover:bg-yellow-500/15 border border-yellow-500/20 transition-all group"
                >
                  <Lock size={16} className="text-yellow-400 group-hover:text-yellow-300" fill="currentColor" />
                  <span>Obtener Acceso Total</span>
                </button>
              )}

              {/* Logout */}
              <button
                onClick={() => { setIsOpen(false); logout(); }}
                className="w-full mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors group"
              >
                <LogOut size={16} className="group-hover:text-red-300" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
