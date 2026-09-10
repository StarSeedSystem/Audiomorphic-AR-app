import React, { useState } from 'react';
import {
  X,
  Info,
  Globe,
  Radio,
  User,
  Heart,
  Bookmark,
  Sparkles,
  ExternalLink,
  Mic,
  BrainCircuit,
  Glasses,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Folder,
  Layers,
  ChevronRight,
  Gift,
  Ticket,
  Star,
  Crown,
} from 'lucide-react';
import { StarSeedIdentity } from '../hooks/useStarSeedIdentity';
import { UseSubscriptionResult, PlanId, TIERS } from '../hooks/useSubscription';
import { UseStarSeedSyncResult } from '../hooks/useStarSeedSync';
import { ThankYouCard3D } from './ThankYouCard3D';
import { ThankYouCardRecord, AudiomorphicPresetRecord } from '../lib/starseedDb';
import { VisualizerParams } from '../types';

export type InfoHubTab = 'guide' | 'ecosystem' | 'account' | 'donations' | 'presets';

interface InfoHubModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: InfoHubTab;
  identity: StarSeedIdentity;
  subscription: UseSubscriptionResult;
  sync: UseStarSeedSyncResult;
  onApplyPreset: (preset: AudiomorphicPresetRecord) => void;
  currentParams: VisualizerParams;
}

export const InfoHubModal: React.FC<InfoHubModalProps> = ({
  open,
  onClose,
  initialTab = 'guide',
  identity,
  subscription,
  sync,
  onApplyPreset,
  currentParams,
}) => {
  const [activeTab, setActiveTab] = useState<InfoHubTab>(initialTab);

  // Account state
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Donations state
  const [activeCard, setActiveCard] = useState<ThankYouCardRecord | null>(() => {
    return sync.thankYouCards.length > 0 ? sync.thankYouCards[0] : null;
  });
  const [codeInput, setCodeInput] = useState('');
  const [codeFeedback, setCodeFeedback] = useState<string | null>(null);

  // Library preset filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!open) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (isRegistering) {
        const res = await identity.signUpWithEmail(emailInput, passwordInput);
        if (!res.ok) setAuthError(res.error || 'Error al registrar');
      } else {
        const res = await identity.loginWithEmail(emailInput, passwordInput);
        if (!res.ok) setAuthError(res.error || 'Error al iniciar sesión');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDonationAction = (planId: PlanId) => {
    const donorName = identity.displayName || 'Mecenas Anónimo';
    const card = subscription.makeDonation(planId, donorName);
    sync.addThankYouCard(card);
    setActiveCard(card);
  };

  const handleRedeemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeFeedback(null);
    const donorName = identity.displayName || 'Donador de Código';
    const res = subscription.redeemCode(codeInput, donorName);
    setCodeFeedback(res.message);
    if (res.ok && res.card) {
      sync.addThankYouCard(res.card);
      setActiveCard(res.card);
      setCodeInput('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Información y Ecosistema StarSeed"
    >
      <style>{`
        .info-modal-shell {
          background: rgba(13, 14, 25, 0.72);
          backdrop-filter: blur(45px) saturate(210%);
          -webkit-backdrop-filter: blur(45px) saturate(210%);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 35px 90px rgba(0, 0, 0, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.35);
          border-radius: 36px;
        }
        .info-scroll::-webkit-scrollbar { width: 8px; }
        .info-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.25); border-radius: 8px; }
        .info-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.22); border-radius: 8px; }
        .info-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
      `}</style>

      <div
        className="info-modal-shell w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER */}
        <div className="px-6 sm:px-8 py-5 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.3)]">
              <Sparkles className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Centro de Información & Red
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-mono">
                  Soberano v2
                </span>
              </h2>
              <p className="text-xs text-gray-300">
                Audiomorphic AR · StarSeed OS · Omnifrecuencias · Presets & Donaciones
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/30 text-gray-300 hover:text-white flex items-center justify-center transition-all shadow-inner"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB NAVIGATION BAR */}
        <div className="px-6 sm:px-8 pt-3 pb-2 border-b border-white/10 bg-black/20 flex gap-2 overflow-x-auto select-none relative z-10 no-scrollbar">
          {[
            { id: 'guide', label: 'Cómo Funciona', icon: <Info className="w-4 h-4" /> },
            { id: 'ecosystem', label: 'Ecosistema StarSeed', icon: <Globe className="w-4 h-4" /> },
            { id: 'account', label: 'Entrar a la Cuenta', icon: <User className="w-4 h-4" /> },
            { id: 'donations', label: 'Donaciones & Tarjeta 3D', icon: <Heart className="w-4 h-4" /> },
            { id: 'presets', label: 'Librería & Presets', icon: <Bookmark className="w-4 h-4" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as InfoHubTab)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-[0_0_20px_rgba(0,242,254,0.2)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB BODY CONTAINER */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 info-scroll relative z-10">
          {/* TAB 1: CÓMO FUNCIONA */}
          {activeTab === 'guide' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/40 to-indigo-950/30 border border-cyan-500/30">
                <h3 className="text-xl font-bold text-cyan-200 flex items-center gap-2 mb-2">
                  <Info className="w-5 h-5 text-cyan-400" />
                  Arquitectura Fractal y Geometría Sonora
                </h3>
                <p className="text-sm text-gray-200 leading-relaxed">
                  Audiomorphic traduce las ondas de audio en coordenadas topológicas complejas en tiempo real. Utiliza la ecuación armónica de respiración de la espiral dorada <span className="font-mono text-cyan-300">k = γ / σ</span> para expandir o contraer la geometría según la tensión y el volumen sonoro.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                    <Mic className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">1. Reactividad Sonora</h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    El micrófono analiza el volumen RMS y el centroide de frecuencia. El sonido no se graba ni viaja a la nube: se sintetiza 100% de forma local en tu GPU.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">2. Piloto Automático</h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Deriva suave, armonía musical modal o las 7 etapas del Génesis Geométrico (Vacío, Vesica Piscis, Flor de la Vida hasta el Cubo de Metatrón).
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Glasses className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">3. Inmersión VR & AR</h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Soporte para Realidad Virtual estereoscópica 3D, drag de rotación espacial y modo AR con cámara y filtros psicodélicos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ECOSISTEMA STARSEED */}
          {activeTab === 'ecosystem' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 to-cyan-950/30 border border-purple-500/30">
                <h3 className="text-xl font-bold text-purple-200 flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-purple-400" />
                  Conexión con el Ecosistema StarSeed
                </h3>
                <p className="text-sm text-gray-200 leading-relaxed">
                  Audiomorphic no vive aislado: es el fondo y motor de visualización armónica oficial de <strong>StarSeed OS</strong> y se sincroniza en tiempo real con la aplicación de <strong>Omnifrecuencias</strong> y las bibliotecas soberanas de la red.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* StarSeed OS Card */}
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-all space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-lg">
                        SOSD
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white">StarSeed OS</h4>
                        <span className="text-xs text-purple-300 font-mono">starseed-os.vercel.app</span>
                      </div>
                    </div>
                    <a
                      href="https://starseed-os.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Sistema Operativo Soberano Descentralizado. Audiomorphic actúa como fondo de escritorio dinámico embebible mediante los parámetros <code className="text-cyan-300 font-mono">?bg&autostart&mic</code>.
                  </p>
                  <a
                    href="https://starseed-os.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-bold text-purple-300 hover:text-purple-200 uppercase tracking-wider"
                  >
                    Abrir StarSeed OS <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Omnifrecuencias Card */}
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-all space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-lg">
                        <Radio className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white">Omnifrecuencias</h4>
                        <span className="text-xs text-cyan-300 font-mono">Generador Armónico Solfeggio</span>
                      </div>
                    </div>
                    <a
                      href="https://starseed-os.vercel.app/omnifrecuencias"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Aplicación hermana para la emisión y generación de frecuencias de resonancia celular, ondas cerebrales (Alpha, Theta, Delta) y tonos armónicos puros.
                  </p>
                  <a
                    href="https://starseed-os.vercel.app/omnifrecuencias"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-bold text-cyan-300 hover:text-cyan-200 uppercase tracking-wider"
                  >
                    Sintonizar Omnifrecuencias <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ENTRAR A LA CUENTA (TRASLADADO AQUÍ) */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl mx-auto">
              {identity.isLoggedIn ? (
                /* Active Session View */
                <div className="p-7 rounded-3xl bg-white/5 border border-white/15 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-[0_0_25px_rgba(0,242,254,0.4)]">
                        {identity.displayName ? identity.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          {identity.displayName}
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </h3>
                        <span className="text-xs text-cyan-300 font-mono">{identity.handle || '@soberano'}</span>
                        {identity.session?.email && (
                          <span className="text-xs text-gray-400 block mt-0.5">{identity.session.email}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => identity.logout()}
                      className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold hover:bg-red-500/20 transition-all flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Salir
                    </button>
                  </div>

                  {/* Sync Status Badge */}
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-gray-400 uppercase font-mono block">Base de Datos Soberana</span>
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Supabase Activo (pqzdpmedcsgcedkvndzl)
                      </span>
                    </div>

                    <button
                      onClick={() => sync.syncWithCloud()}
                      disabled={sync.isSyncing}
                      className="px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-bold hover:bg-cyan-500/30 transition-all flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${sync.isSyncing ? 'animate-spin' : ''}`} />
                      {sync.isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                    </button>
                  </div>

                  {/* Account Summary Stats */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-xs text-gray-400 block mb-1">Presets en Biblioteca</span>
                      <span className="text-lg font-mono font-bold text-white">{sync.presets.length}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-xs text-gray-400 block mb-1">Tarjetas de Agradecimiento</span>
                      <span className="text-lg font-mono font-bold text-amber-300">{sync.thankYouCards.length}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Login / Sign Up View */
                <div className="p-7 rounded-3xl bg-white/5 border border-white/15 space-y-6">
                  <div className="text-center max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mx-auto mb-3 shadow-[0_0_20px_rgba(0,242,254,0.3)]">
                      <User className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-white">Entrar a la Cuenta</h3>
                    <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">
                      Conéctate a tu identidad soberana de StarSeed OS para sincronizar automáticamente tus presets, biblioteca privada y tarjetas de agradecimiento.
                    </p>
                  </div>

                  {authError && (
                    <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs text-center">
                      {authError}
                    </div>
                  )}

                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs uppercase font-bold text-gray-300 block mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        required
                        placeholder="tu-correo@starseed.net"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-400 transition-all shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="text-xs uppercase font-bold text-gray-300 block mb-1">Contraseña</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-400 transition-all shadow-inner"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(0,242,254,0.3)] disabled:opacity-50"
                    >
                      {authLoading ? 'Conectando...' : isRegistering ? 'Crear Cuenta Soberana' : 'Entrar a la Cuenta'}
                    </button>
                  </form>

                  <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="hover:text-cyan-300 transition-colors"
                    >
                      {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                    </button>

                    <button
                      type="button"
                      onClick={() => identity.linkStarSeed({ id: 'invitado', name: 'Explorador Libre' })}
                      className="text-cyan-300 hover:underline"
                    >
                      Continuar como invitado libre
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DONACIONES EXCLUSIVAS OPCIONALES & TARJETA 3D */}
          {activeTab === 'donations' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Highlight Banner: 100% Free, Donations Are Optional */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/40 to-purple-950/30 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-amber-300 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-amber-400 fill-amber-400" />
                    Donaciones Exclusivas Opcionales (Acceso Total Libre)
                  </h3>
                  <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                    Todas las funciones de Audiomorphic AR son 100% libres y gratuitas. Las donaciones son voluntarias en agradecimiento a los creadores. Al aportar cualquier nivel recibes una <strong>Tarjeta Virtual 3D interactiva</strong> animada con el movimiento de tu dispositivo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Col: Donation Options with the same numbers/tiers */}
                <div className="lg:col-span-7 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Niveles de Reconocimiento</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {TIERS.map((t) => {
                      const isCurrent = subscription.state.plan === t.id;
                      return (
                        <div
                          key={t.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                            isCurrent
                              ? 'bg-white/10 border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start mb-1.5">
                              <span className="text-xs font-extrabold text-white">{t.name}</span>
                              <span className="text-sm font-mono font-bold text-amber-300">{t.price}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 line-clamp-2 mb-3">{t.tagline}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDonationAction(t.id)}
                            className={`w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                              t.id === 'premium'
                                ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40 hover:bg-amber-500/35'
                                : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
                            }`}
                          >
                            {t.id === 'free' ? 'Tarjeta Libre' : `Aportar ${t.price}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Redeem Code Form */}
                  <form onSubmit={handleRedeemSubmit} className="p-4 rounded-2xl bg-black/30 border border-white/10 mt-4 space-y-2">
                    <span className="text-xs font-bold text-gray-300 block">¿Tienes un Código de la Comunidad?</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej: AUDIO-PREMIUM, COSMOS-2025"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none uppercase font-mono focus:border-cyan-400"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-bold text-xs hover:bg-cyan-500/40 uppercase tracking-wider"
                      >
                        Canjear
                      </button>
                    </div>
                    {codeFeedback && <p className="text-[11px] text-cyan-300">{codeFeedback}</p>}
                  </form>
                </div>

                {/* Right Col: 3D Holographic Card Viewport */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Tarjeta Virtual 3D Animada
                  </span>
                  {activeCard ? (
                    <ThankYouCard3D
                      card={activeCard}
                      onUpdateFolder={(newFolder) => sync.updateCardFolder(activeCard.id, newFolder)}
                    />
                  ) : (
                    <div className="w-[300px] h-[450px] rounded-[28px] border border-dashed border-white/20 flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-3">
                      <Heart className="w-10 h-10 text-gray-600" />
                      <p className="text-xs">
                        Selecciona un nivel de donación o canjea un código para generar tu tarjeta 3D personalizada.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LIBRERÍA & PRESETS STARSEED */}
          {activeTab === 'presets' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-cyan-400" />
                    Biblioteca Soberana de Presets
                  </h3>
                  <p className="text-xs text-gray-400">
                    Ajustes automáticos oficiales y de la comunidad, sincronizados con StarSeed OS.
                  </p>
                </div>

                <button
                  onClick={() => sync.syncWithCloud()}
                  disabled={sync.isSyncing}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-bold hover:bg-cyan-500/30 transition-all flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${sync.isSyncing ? 'animate-spin' : ''}`} />
                  {sync.isSyncing ? 'Sincronizando...' : 'Sincronizar con StarSeed OS'}
                </button>
              </div>

              {/* Category Filter Chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'genesis', label: 'Génesis Sagrado' },
                  { id: 'harmonic', label: 'Armónicos' },
                  { id: 'drift', label: 'Deriva Meditativa' },
                  { id: 'quantum', label: 'Cuántica' },
                  { id: 'community', label: 'Comunidad' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sync.allPresetsOrdered
                  .filter((p) => (selectedCategory === 'all' ? true : p.category === selectedCategory))
                  .map((preset) => (
                    <div
                      key={preset.id}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-sm font-bold text-white">{preset.title}</h4>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 border border-white/10">
                            {preset.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">{preset.description}</p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/10 text-[11px]">
                        <span className="text-gray-400 font-mono">{preset.author.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            onApplyPreset(preset);
                            onClose();
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold hover:bg-cyan-500/30 transition-all"
                        >
                          Aplicar Preset
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoHubModal;
