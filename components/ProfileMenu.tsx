import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogOut,
  Cloud,
  Download,
  Upload,
  Star,
  Clock,
  ChevronDown,
  Crown,
  Trash2,
  Lock,
  Rocket,
  AtSign,
  BrainCircuit,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { SubscriptionTier } from '../types';
import { usePresets, Preset } from '../hooks/usePresets';
import { openExternalUrl, buildStarSeedOsHandoffUrl } from '../utils/platform';

interface ProfileMenuProps {
  subscriptionTier: SubscriptionTier;
  trialEndTime: number | null;
  onShowPresets: () => void;
  onShowSubscription: () => void;
  onLoadPreset: (preset: Preset) => void;
}

const tierLabels: Record<SubscriptionTier, { label: string; color: string; icon: React.ReactNode }> = {
  free: { label: 'Explorador', color: 'text-gray-300', icon: <User size={14} /> },
  trial: { label: 'Viajero', color: 'text-cyan-300', icon: <Clock size={14} /> },
  annual: { label: 'Creador', color: 'text-purple-300', icon: <Star size={14} /> },
  lifetime: { label: 'Soberano', color: 'text-emerald-300', icon: <Crown size={14} /> },
};

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  subscriptionTier,
  trialEndTime,
  onShowSubscription,
  onLoadPreset,
}) => {
  const { user, profile, logout, setAuthModalOpen } = useAuth();
  const {
    cloudPresets,
    deletePreset,
    exportPresets,
    importPresets,
    brains,
    selectedBrain,
    selectedBrainId,
    selectBrain,
    neurons,
    syncState,
    refreshBrainsAndSync,
  } = usePresets();
  const [isOpen, setIsOpen] = useState(false);
  const [trialRemaining, setTrialRemaining] = useState<string | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  if (!user) {
    return null;
  }

  const tierInfo = tierLabels[subscriptionTier] || tierLabels.lifetime;
  const handle = profile?.handle ?? null;
  const displayName = profile?.displayName || (handle ? `${handle}` : null) || user.email?.split('@')[0] || 'Usuario';
  const avatarUrl = profile?.avatarUrl ?? null;
  const starseedAddress = profile?.starseedAddress ?? (handle ? `${handle.replace(/^@/, '')}@star.seed` : null);
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const onlineNeurons = neurons.filter((n) => n.isOnline).length;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importPresets(file);
      e.target.value = '';
    }
  };

  const handleOpenStarSeedOS = async () => {
    setHandoffLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session || user;
      if (!session && !user) {
        setAuthModalOpen(true);
        return;
      }
      const targetUrl = buildStarSeedOsHandoffUrl(session || user);
      openExternalUrl(targetUrl);
    } catch {
      openExternalUrl('https://starseed-os.vercel.app/funciones');
    } finally {
      setHandoffLoading(false);
      setIsOpen(false);
    }
  };

  const isLocked = subscriptionTier === 'free';

  return (
    <div className="relative" ref={menuRef}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="liquid-bubble p-2 md:px-3 md:py-1.5 flex items-center gap-2 text-white transition-colors cursor-pointer"
        title="Mi Perfil & Cerebro StarSeed OS"
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border morph-pill">
          {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : avatarLetter}
        </div>
        <span className="text-xs font-bold hidden md:inline max-w-[90px] truncate">{displayName}</span>
        <ChevronDown size={14} className={`hidden md:block transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="fixed top-20 left-4 right-4 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-88 max-w-sm z-[600] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="rounded-2xl art-nouveau-frame overflow-hidden">
            {/* User Info Header */}
            <div className="p-4 border-b border-white/10 bg-black/35">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold border-2 morph-pill shrink-0">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : avatarLetter}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{displayName}</p>
                  {handle && (
                    <p className="text-[11px] morph-accent-text truncate flex items-center gap-0.5">
                      <AtSign size={10} className="shrink-0" />
                      {handle.replace(/^@/, '')}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={`text-[10px] font-bold uppercase tracking-tight ${tierInfo.color}`}>
                    {trialRemaining === 'Expirada' ? 'Viajero' : tierInfo.label}
                  </span>
                </div>
              </div>

              {starseedAddress && (
                <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                  <Star size={12} className="text-emerald-400 shrink-0" />
                  <p className="text-[11px] font-mono text-emerald-300 truncate">{starseedAddress}</p>
                </div>
              )}

              {/* Active Brain + Neurons Quick Selector */}
              {brains.length > 0 && (
                <div className="mt-3 p-2.5 rounded-xl quantum-glass space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase tracking-wider morph-accent-text-2 flex items-center gap-1">
                      <BrainCircuit size={12} /> Cerebro Activo
                    </span>
                    <button
                      type="button"
                      onClick={() => refreshBrainsAndSync()}
                      className="flex items-center gap-1 morph-accent-text hover:underline cursor-pointer"
                      title="Sincronizar cerebro y neuronas ahora"
                    >
                      <RefreshCw size={10} className={syncState === 'syncing' ? 'animate-spin' : ''} />
                      <span>{syncState === 'synced' ? 'Sincronizado' : syncState === 'syncing' ? 'Sincronizando' : 'Offline'}</span>
                    </button>
                  </div>
                  <select
                    value={selectedBrainId || ''}
                    onChange={(e) => selectBrain(e.target.value)}
                    className="liquid-select-native !py-1.5 !text-xs"
                  >
                    {brains.map((b) => (
                      <option key={b.id} value={b.id}>
                        🧠 {b.name} ({b.accessLevel})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between text-[10px] text-slate-300">
                    <span className="flex items-center gap-1">
                      <Cpu size={11} className="morph-accent-text" />
                      {onlineNeurons || 1} neurona(s) online ({neurons.length || 1} total)
                    </span>
                    <span className="truncate max-w-[120px] text-slate-400">{selectedBrain?.accessLevel}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Presets List */}
            <div className="max-h-44 overflow-y-auto p-2">
              <p className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
                <Cloud size={10} /> Presets en Cerebro ({cloudPresets.length})
              </p>
              {cloudPresets.length === 0 ? (
                <p className="px-3 py-4 text-xs text-center text-slate-500 italic">No hay presets cargados</p>
              ) : (
                cloudPresets.map((preset) => (
                  <div key={preset.id} className="group flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors">
                    <button
                      type="button"
                      onClick={() => {
                        onLoadPreset(preset);
                        setIsOpen(false);
                      }}
                      className="text-xs text-slate-200 hover:text-white truncate flex-1 text-left cursor-pointer"
                    >
                      {preset.name}
                    </button>
                    {!preset.id.startsWith('essential_') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePreset(preset.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="p-2.5 border-t border-white/10 bg-black/35 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleImportClick}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold morph-btn-glass cursor-pointer"
                >
                  <Upload size={12} /> Importar
                </button>
                <button
                  type="button"
                  onClick={() => exportPresets('all')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold morph-btn-glass cursor-pointer"
                >
                  <Download size={12} /> Exportar
                </button>
              </div>

              <button
                type="button"
                onClick={handleOpenStarSeedOS}
                disabled={handoffLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold morph-btn-primary cursor-pointer disabled:opacity-60"
              >
                {handoffLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Rocket size={15} />
                )}
                <span>Abrir StarSeed OS con mi sesión</span>
              </button>

              {isLocked && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onShowSubscription();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-yellow-300 bg-yellow-500/10 border border-yellow-500/25 cursor-pointer"
                >
                  <Lock size={14} />
                  <span>Obtener Acceso Total</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-300 hover:bg-red-500/15 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
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
