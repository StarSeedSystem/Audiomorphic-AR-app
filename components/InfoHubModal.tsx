import React, { useState } from 'react';
import {
  X,
  Globe,
  Radio,
  User,
  Heart,
  Bookmark,
  Sparkles,
  ExternalLink,
  BrainCircuit,
  Glasses,
  RefreshCw,
  LogOut,
  Folder,
  Layers,
  ChevronRight,
  Star,
  Sprout,
  Music,
  Boxes,
  Infinity as InfinityIcon,
  ArrowRight,
  Coffee,
  Rocket,
  AtSign,
  LogIn,
  Check,
  Shield,
  Zap,
  PlayCircle,
  Download,
  Camera,
  Mic,
  Volume2,
  Sliders,
  Laptop,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Maximize2,
} from 'lucide-react';
import { StarSeedIdentity } from '../hooks/useStarSeedIdentity';
import { UseSubscriptionResult, PlanId } from '../hooks/useSubscription';
import { UseStarSeedSyncResult } from '../hooks/useStarSeedSync';
import { ThankYouCard3D } from './ThankYouCard3D';
import { ThankYouCardRecord, AudiomorphicPresetRecord } from '../lib/starseedDb';
import { VisualizerParams } from '../types';
import { useAppUpdate } from '../hooks/useAppUpdate';

export type InfoHubTab = 'donations' | 'guide' | 'updates' | 'ecosystem' | 'account' | 'presets';

interface InfoHubModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: InfoHubTab;
  identity: StarSeedIdentity;
  subscription: UseSubscriptionResult;
  sync: UseStarSeedSyncResult;
  onApplyPreset?: (preset: AudiomorphicPresetRecord) => void;
  currentParams?: VisualizerParams;
}

const OS_URL = 'https://starseed-os.vercel.app';
const FUNDACION_LINKTREE = 'https://linktr.ee/FundacionStarseed';

const ECOSYSTEM_SYSTEMS = [
  {
    icon: <Globe size={22} />,
    name: 'StarSeed OS',
    gradient: 'from-violet-500 to-indigo-600',
    summary: 'Tu sistema operativo soberano: identidad, perfil, agente Astraura, lienzos y conocimiento descentralizado.',
    connection: 'Audiomorphic se integra como área viva dentro del OS. Tu cuenta es la misma en todo el ecosistema.',
    url: OS_URL,
    badge: '100% Gratis en OS',
  },
  {
    icon: <Sparkles size={22} />,
    name: 'StarSeed Nexus',
    gradient: 'from-cyan-500 to-emerald-500',
    summary: 'El portal de entrada tridimensional: explora todas las áreas, funciones y la materia viva del ecosistema en 3D.',
    connection: 'Comparte tu identidad unificada y navega entre dimensiones en un solo clic.',
    url: 'https://starseed-nexus.vercel.app',
    badge: 'Portal 3D',
  },
  {
    icon: <Coffee size={22} />,
    name: 'StarSeed Café',
    gradient: 'from-amber-500 to-orange-600',
    summary: 'Comunidad, menú y economía de Granos & Semillas. La capa física y social del movimiento.',
    connection: 'Misma cuenta, comunidades y eventos sincronizados en tiempo real.',
    url: 'https://starseed-cafe.vercel.app/cafe/',
    badge: 'Comunidad',
  },
  {
    icon: <Radio size={22} />,
    name: 'Omnifrecuencias',
    gradient: 'from-fuchsia-500 to-pink-600',
    summary: 'Frecuencias armónicas, sonido sagrado y expansión de conciencia. La aplicación hermana de Audiomorphic.',
    connection: 'Tus presets y resonancias viajan contigo por toda la red StarSeed.',
    url: OS_URL + '/omnifrecuencias',
    badge: 'App Hermana',
  },
];

const SINESTESIA_PREVIEWS = [
  {
    key: 'geo',
    icon: <Sprout size={16} />,
    label: 'Geometría Sagrada',
    color: 'text-emerald-300',
    desc: 'Desbloquea patrones matemáticos como la Flor de la Vida y el Cubo de Metatrón, calculados y sincronizados en vivo con el espectro musical.',
  },
  {
    key: 'vr',
    icon: <Glasses size={16} />,
    label: 'Realidad Virtual & AR',
    color: 'text-purple-300',
    desc: 'Sumérgete en el sonido con el modo VR 3D. Portales infinitos y campos de torsión inmersivos que responden a cada latido acústico.',
  },
  {
    key: 'drift',
    icon: <Sparkles size={16} />,
    label: 'Piloto Automático: Deriva',
    color: 'text-cyan-300',
    desc: 'Deja que la IA tome el control total. El modo Deriva explora infinitas combinaciones de viscosidad, color y velocidad creando evoluciones asombrosas.',
  },
];

export const InfoHubModal: React.FC<InfoHubModalProps> = ({
  open,
  onClose,
  initialTab = 'donations',
  identity,
  subscription,
  sync,
  onApplyPreset,
}) => {
  const [activeTab, setActiveTab] = useState<InfoHubTab>(initialTab);

  // Hook del sistema inteligente de actualizaciones y descargas
  const updateSystem = useAppUpdate();

  // Sincronizar pestaña inicial al abrir
  React.useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  // Account form state
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);

  // Donations state: Tarjeta 3D activa
  const [activeCard, setActiveCard] = useState<ThankYouCardRecord | null>(() => {
    return sync.thankYouCards.length > 0 ? sync.thankYouCards[0] : null;
  });

  // Presets category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!open) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (isRegistering) {
        const res = await identity.signUpWithEmail(emailInput, passwordInput);
        if (!res.ok) setAuthError(res.error || 'Error al registrar la cuenta');
      } else {
        const res = await identity.loginWithEmail(emailInput, passwordInput);
        if (!res.ok) setAuthError(res.error || 'Error al iniciar sesión');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDonationAction = (planId: PlanId) => {
    const donorName = identity.displayName || (identity.user?.email ? identity.user.email.split('@')[0] : 'Mecenas Soberano');
    const userEmail = identity.user?.email;
    const userId = identity.user?.id;
    const card = subscription.makeDonation(planId, donorName, userEmail, userId);
    sync.addThankYouCard(card);
    setActiveCard(card);
  };

  const handleOpenStarSeedOS = async () => {
    setHandoffLoading(true);
    try {
      const session = identity.session;
      if (!session) {
        setActiveTab('account');
        return;
      }
      const params = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: 'bearer',
        expires_in: '3600',
        type: 'signup',
      });
      window.open(`${OS_URL}/funciones#${params.toString()}`, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(OS_URL, '_blank', 'noopener,noreferrer');
    } finally {
      setHandoffLoading(false);
    }
  };

  const userEmail = identity.user?.email;
  const userId = identity.user?.id;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-300 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Centro de Información, Actualizaciones y Donaciones StarSeed"
    >
      {/* Keyframe animations for real-time sinestesia loops */}
      <style>{`
        @keyframes ssSpin { to { transform: rotate(360deg); } }
        @keyframes ssSpinRev { to { transform: rotate(-360deg); } }
        @keyframes ssPulse { 0%,100% { transform: scale(.82); opacity:.5; } 50% { transform: scale(1.05); opacity:1; } }
        @keyframes ssDrift { 0% { transform: translate(0,0) scale(1);} 33% { transform: translate(14%,-10%) scale(1.25);} 66% { transform: translate(-12%,8%) scale(.85);} 100% { transform: translate(0,0) scale(1);} }
        @keyframes ssHue { to { filter: hue-rotate(360deg); } }
        @keyframes ssTunnel { 0% { transform: scale(.2); opacity:0;} 20%{opacity:.9;} 100% { transform: scale(2.4); opacity:0;} }
        
        .info-hub-shell {
          background: rgba(10, 14, 26, 0.92);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.85), inset 0 1px 2px rgba(255, 255, 255, 0.3);
          border-radius: 32px;
        }
        .hub-scroll::-webkit-scrollbar { width: 8px; }
        .hub-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 8px; }
        .hub-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.22); border-radius: 8px; }
        .hub-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.38); }
      `}</style>

      <div
        className="info-hub-shell w-full sm:w-[95vw] md:w-[90vw] max-w-6xl h-[100dvh] sm:h-[94vh] max-h-[920px] rounded-none sm:rounded-[32px] flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* SLIM UNIFIED APP BAR (Never obstructs content on smartphones or landscape) */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-white/10 flex justify-between items-center bg-black/60 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center p-0.5 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <Sparkles size={16} className="text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wide truncate flex items-center gap-1.5">
                <span>Audiomorphic Hub</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hidden sm:inline-block">v{updateSystem.currentVersion}</span>
              </h2>
              <p className="text-[10px] text-gray-400 truncate hidden sm:block">Centro de Información, Ciencia, Descargas y Donaciones</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {identity.isLoggedIn ? (
              <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="max-w-[120px] truncate">{identity.displayName || identity.user?.email}</span>
              </div>
            ) : (
              <button 
                onClick={() => setActiveTab('account')}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-medium transition-colors cursor-pointer"
              >
                <User size={12} />
                <span>Cuenta</span>
              </button>
            )}

            <button 
              onClick={onClose}
              className="text-gray-300 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 sm:p-2.5 rounded-full cursor-pointer pointer-events-auto border border-white/15 shadow-sm"
              title="Cerrar ventana"
              aria-label="Cerrar ventana"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS (Fluid horizontal scrolling, compact tap targets) */}
        <div className="px-3 sm:px-6 py-2 bg-black/50 border-b border-white/10 flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar whitespace-nowrap shrink-0 z-10">
          {[
            { id: 'donations', label: 'Donaciones & Aportes', icon: <Heart size={14} /> },
            { id: 'guide', label: 'Sobre el Proyecto & Ciencia', icon: <BrainCircuit size={14} /> },
            { id: 'updates', label: 'Actualizaciones & Descargas', icon: <Download size={14} /> },
            { id: 'ecosystem', label: 'Ecosistema StarSeed', icon: <Globe size={14} /> },
            { id: 'account', label: 'Mi Cuenta Soberana', icon: <User size={14} /> },
            { id: 'presets', label: 'Biblioteca de Presets', icon: <Bookmark size={14} /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as InfoHubTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/25 via-purple-500/25 to-emerald-500/25 text-white border border-cyan-400/50 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB BODY (Expansive 85-90% vertical space for content) */}
        <div className="p-3 sm:p-6 md:p-8 overflow-y-auto flex-1 hub-scroll">
          {/* TAB 1: DONACIONES VOLUNTARIAS & TARJETA 3D */}
          {activeTab === 'donations' && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
              
              {/* HERO BANNER (Scrolls naturally inside overview, never covers other tabs) */}
              <div className="relative p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-white/15 text-center overflow-hidden bg-gradient-to-r from-cyan-950/40 via-purple-950/40 to-emerald-950/40 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-emerald-500/10 opacity-60 pointer-events-none"></div>
                <h2 className="text-xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-emerald-300 mb-2 relative z-10 tracking-tight">
                  Desbloquea el Universo Sinestésico
                </h2>
                <p className="text-gray-300 max-w-2xl mx-auto text-xs sm:text-sm relative z-10 mb-3 sm:mb-4 leading-relaxed">
                  Experimenta la sinestesia completa con acceso a todas las geometrías sagradas, modos de realidad virtual y aumentada, y control total sobre la experiencia visual. <strong>100% Gratuito y Soberano.</strong>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 relative z-10">
                  <button 
                    onClick={() => setActiveTab('updates')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Download size={13} className="text-cyan-400" />
                    <span>Descargas & Versión {updateSystem.currentVersion}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('guide')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500/20 to-orange-500/20 border border-pink-500/40 hover:border-pink-500/70 text-pink-200 text-xs font-bold transition-all group cursor-pointer"
                  >
                    <Heart className="w-3.5 h-3.5 text-pink-400 group-hover:scale-125 transition-transform" fill="currentColor" />
                    <span>¿Cómo ayuda tu contribución? Fundación Starseed</span>
                  </button>
                </div>
              </div>
              
              {/* Banner Fundación StarSeed & Aclaración 0% Paywalls */}
              <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-black/50 border border-pink-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-pink-400 font-bold flex items-center gap-1.5">
                    <Heart size={14} className="fill-pink-400" />
                    Fundación StarSeed & Arte Soberano Libre
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Audiomorphic es 100% Gratuito y Libre de Suscripciones
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Todas las funciones, geometrías y modos AR/VR están desbloqueados para todo el mundo. No hay muros de pago ni compras obligatorias. Los siguientes enlaces son <strong>donaciones voluntarias y opcionales</strong> que financian directamente a la <strong>Fundación StarSeed</strong> en educación, investigación de frecuencias sagradas y arte libre.
                  </p>
                </div>
                <a
                  href={FUNDACION_LINKTREE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 text-pink-200 text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)] shrink-0"
                >
                  Conoce la Fundación <ExternalLink size={14} />
                </a>
              </div>

              {/* Tiers Grid: Cuadrícula Horizontal Inspirada en SubscriptionScreen */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* 1. Explorador Libre (Gratis / $0 MXN) */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-white/25 transition-all">
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-gray-200 mb-1">Explorador</h4>
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                      Gratis <span className="text-xs text-gray-400 font-normal">($0 MXN)</span>
                    </div>
                    <p className="text-xs text-emerald-400">Acceso universal para todos</p>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1 text-xs text-gray-300">
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>Visualización FFT de audio completa</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>Geometría Sagrada (Flor de la Vida, Metatrón)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>Realidad Virtual (VR 3D) y Aumentada (AR)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>Piloto Automático: Deriva, Armónico y Génesis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>100% Desbloqueado y sin restricciones</span>
                    </li>
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleDonationAction('free')}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors border border-white/15 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles size={14} className="text-emerald-300" />
                    <span>Emitir Tarjeta Libre</span>
                  </button>
                </div>

                {/* 2. Creador ($369 MXN / año) - Popular */}
                <div className="bg-gradient-to-b from-purple-950/50 to-black/50 border border-purple-500/50 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-purple-400 transition-all shadow-[0_5px_25px_rgba(168,85,247,0.15)]">
                  <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider font-mono">
                    Popular
                  </div>

                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-purple-300 mb-1">Creador</h4>
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                      $369 <span className="text-xs text-purple-300 font-normal">MXN/año</span>
                    </div>
                    <p className="text-xs text-purple-400/90">Aporte voluntario anual</p>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1 text-xs text-gray-200">
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-purple-400 shrink-0 mt-0.5" />
                      <span>Todo el visualizador 100% libre</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-purple-400 shrink-0 mt-0.5" />
                      <span>Tarjeta Virtual 3D de Oro interactiva</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-purple-400 shrink-0 mt-0.5" />
                      <span>Reactividad al cursor y giroscopio móvil</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-purple-400 shrink-0 mt-0.5" />
                      <span>Financia el desarrollo de nuevas geometrías</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-purple-400 shrink-0 mt-0.5" />
                      <span>Sincronización soberana en StarSeed OS</span>
                    </li>
                  </ul>

                  <a
                    href={subscription.getStripeUrlForPlan('creator', userEmail, userId) || 'https://buy.stripe.com/8x2dRbdxpa0W1F3giv6Na01'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleDonationAction('creator')}
                    className="w-full py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs cursor-pointer"
                  >
                    <Heart size={14} className="fill-white" />
                    <span>Aportar $369 MXN (Stripe)</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* 3. Maestro ($963 MXN / Pago único de por vida) - Mecenas Pleno */}
                <div className="bg-gradient-to-b from-amber-950/50 to-black/50 border border-amber-500/50 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-amber-400 transition-all shadow-[0_5px_25px_rgba(245,158,11,0.2)]">
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[10px] font-black px-3 py-0.5 rounded-bl-lg uppercase tracking-wider font-mono">
                    Mecenas Pleno
                  </div>

                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-amber-300 mb-1">Maestro</h4>
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                      $963 <span className="text-xs text-amber-300 font-normal">MXN</span>
                    </div>
                    <p className="text-xs text-amber-400/90">Donación única de por vida</p>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1 text-xs text-gray-200">
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>Todo el visualizador 100% libre</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>Tarjeta Holográfica 3D Tornasol de Mecenas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>Financiamiento vitalicio a Fundación StarSeed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>Reconocimiento permanente en el ecosistema</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>Presets ilimitados en la nube soberana</span>
                    </li>
                  </ul>

                  <a
                    href={subscription.getStripeUrlForPlan('master', userEmail, userId) || 'https://donate.stripe.com/9B6eVfdxp0qmbfD5DR6Na00'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleDonationAction('master')}
                    className="w-full py-2.5 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs cursor-pointer"
                  >
                    <Shield size={14} />
                    <span>Aportar $963 MXN (Stripe)</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* 4. StarSeed Ecosistema (Libre en OS) */}
                <div className="bg-gradient-to-b from-cyan-950/40 to-black/40 border border-cyan-500/40 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-cyan-400 transition-all">
                  <div className="absolute top-0 right-0 bg-cyan-500 text-black text-[10px] font-black px-3 py-0.5 rounded-bl-lg uppercase tracking-wider font-mono">
                    100% Gratis
                  </div>

                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-cyan-300 mb-1">Ecosistema</h4>
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                      Libre <span className="text-xs text-cyan-300 font-normal">en OS</span>
                    </div>
                    <p className="text-xs text-cyan-400/90">Integración con StarSeed OS</p>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1 text-xs text-gray-200">
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span>Todo el visualizador 100% libre</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span>Misma cuenta en Café, OS, Nexus y Audiomorphic</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span>Sincronización en tiempo real de presets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span>Tarjeta 3D Iridiscente del Ecosistema</span>
                    </li>
                  </ul>

                  <a
                    href={OS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-xl font-bold transition-all border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Globe size={14} />
                    <span>Abrir StarSeed OS</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

              </div>

              {/* Nota Informativa sobre Stripe & Sincronización */}
              <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 max-w-3xl mx-auto space-y-1">
                <p className="text-xs text-gray-300 font-medium">
                  Las donaciones se procesan de forma cifrada y 100% segura a través de <strong>Stripe Oficial</strong>.
                </p>
                <p className="text-[11px] text-gray-400">
                  Después de realizar el pago voluntario, puede tomar unos momentos en sincronizarse en la red. Si no ves los cambios en tu tarjeta, recarga la página.
                </p>
              </div>

              {/* Tarjeta Virtual 3D Interactiva */}
              <div className="p-6 rounded-3xl bg-black/40 border border-white/10 flex flex-col items-center">
                <div className="text-center mb-6 max-w-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center justify-center gap-1.5 font-mono">
                    <Sparkles className="w-4 h-4" /> Tarjeta Virtual 3D Interactiva
                  </span>
                  <h4 className="text-xl font-bold text-white mt-1">Reconocimiento & Resonancia Soberana</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Mueve el cursor o inclina tu dispositivo móvil para observar los reflejos especulares sobre el grabado geométrico sagrado.
                  </p>
                </div>

                {activeCard ? (
                  <ThankYouCard3D
                    card={activeCard}
                    onUpdateFolder={(newFolder) => sync.updateCardFolder(activeCard.id, newFolder)}
                  />
                ) : (
                  <div className="w-[310px] h-[460px] rounded-[28px] border border-dashed border-white/20 flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-3 bg-black/30">
                    <Heart className="w-12 h-12 text-pink-500/60 animate-pulse" />
                    <p className="text-xs leading-relaxed">
                      Haz clic en cualquiera de los botones de aporte o emite tu tarjeta libre arriba para generar e interactuar con tu Tarjeta Holográfica 3D personalizada.
                    </p>
                  </div>
                )}
              </div>

              {/* Feature Previews (Descubre el Poder en Movimiento) */}
              <div className="pt-6 border-t border-white/10">
                <div className="text-center mb-6">
                  <h4 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    Descubre el Poder en Movimiento
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">Evolución visual autónoma que responde a la física del sonido en tiempo real.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {SINESTESIA_PREVIEWS.map((p) => (
                    <div key={p.key} className="bg-black/40 rounded-2xl overflow-hidden border border-white/10 hover:border-white/25 transition-all flex flex-col group">
                      <div className="aspect-video relative flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#11182f,#05060d)]">
                        {p.key === 'geo' && (
                          <svg viewBox="0 0 120 120" className="w-28 h-28" style={{ animation: 'ssSpin 18s linear infinite' }}>
                            <g fill="none" stroke="#34d399" strokeWidth="1.2" opacity="0.85">
                              {[0, 60, 120, 180, 240, 300].map((a) => (
                                <circle key={a} cx={60 + 18 * Math.cos((a * Math.PI) / 180)} cy={60 + 18 * Math.sin((a * Math.PI) / 180)} r="18" />
                              ))}
                              <circle cx="60" cy="60" r="18" />
                              <circle cx="60" cy="60" r="36" stroke="#22d3ee" opacity="0.6" />
                            </g>
                          </svg>
                        )}
                        {p.key === 'vr' && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'ssHue 8s linear infinite' }}>
                            {[0, 1, 2, 3].map((i) => (
                              <span key={i} className="absolute rounded-full border-2 border-purple-400/70" style={{ width: 24, height: 24, animation: `ssTunnel 3s linear ${i * 0.75}s infinite` }} />
                            ))}
                            <Glasses className="text-purple-200/90 relative z-10" size={26} />
                          </div>
                        )}
                        {p.key === 'drift' && (
                          <div className="absolute inset-0" style={{ animation: 'ssHue 10s linear infinite' }}>
                            <span className="absolute left-1/3 top-1/2 w-16 h-16 rounded-full bg-cyan-400/50 blur-xl" style={{ animation: 'ssDrift 7s ease-in-out infinite' }} />
                            <span className="absolute left-1/2 top-1/3 w-14 h-14 rounded-full bg-fuchsia-400/50 blur-xl" style={{ animation: 'ssDrift 9s ease-in-out infinite reverse' }} />
                            <span className="absolute left-2/3 top-2/3 w-12 h-12 rounded-full bg-emerald-400/40 blur-xl" style={{ animation: 'ssDrift 11s ease-in-out infinite' }} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
                        <span className={`absolute bottom-3 left-3 text-xs font-bold ${p.color} flex items-center gap-1.5`}>
                          {p.icon} {p.label}
                        </span>
                        <span className="absolute top-2.5 right-2.5 text-[9px] uppercase tracking-wider bg-white/10 text-white/90 px-2 py-0.5 rounded-full border border-white/10 font-mono">
                          en vivo
                        </span>
                      </div>
                      <div className="p-4 flex-1 flex items-center">
                        <p className="text-xs text-gray-300 leading-relaxed">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SOBRE EL PROYECTO & CIENCIA (Fusión completa con AboutScreen) */}
          {activeTab === 'guide' && (
            <div className="space-y-12 animate-in fade-in duration-300">
              
              {/* Sección 1: ¿Cómo Funciona? */}
              <section className="p-6 sm:p-8 rounded-3xl bg-black/40 border border-white/10 space-y-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <BrainCircuit className="text-cyan-400" /> ¿Cómo Funciona?
                </h3>
                <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                  Esta aplicación es un motor de visualización de audio en tiempo real que traduce las frecuencias sonoras en complejas estructuras geométricas 3D. Utilizando la <strong>Web Audio API</strong>, analizamos el espectro de audio capturado por tu micrófono o dispositivo, dividiéndolo en bandas de frecuencia continuas (bajos, medios y agudos). Estos datos alimentan un sistema de mallas paramétricas y shaders matemáticos en WebGL (a través de Three.js), creando una experiencia visual inmersiva y reactiva.
                </p>
              </section>

              {/* Sección 2: Principios Matemáticos */}
              <section className="p-6 sm:p-8 rounded-3xl bg-black/40 border border-white/10 space-y-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Sparkles className="text-emerald-400" /> Principios Matemáticos
                </h3>
                <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                  Las formas que observas no son aleatorias. Están fundamentadas en la <strong>Geometría Sagrada</strong> y proporciones matemáticas universales, como la Proporción Áurea (Phi) y la secuencia de Fibonacci:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2.5 text-sm sm:text-base ml-2">
                  <li>
                    <strong>Flor de la Vida:</strong> Patrones de círculos superpuestos que representan la creación y la interconectividad cuántica.
                  </li>
                  <li>
                    <strong>Cubo de Metatrón:</strong> Una figura geométrica compleja derivada de la Flor de la Vida, que contiene y proyecta los cinco sólidos platónicos esenciales (Tetraedro, Cubo, Octaedro, Icosaedro y Dodecaedro).
                  </li>
                  <li>
                    <strong>Tratado de Unificación Armónica:</strong> El motor computa en tiempo real variables topológicas (Vértices <code>V</code> y Aristas <code>E</code>), derivando la variable dual <code>&alpha; = V / 2</code> y la variable potencial <code>&beta; = &radic;E</code>, regulando el régimen primario de estabilidad o recíproco de tensión.
                  </li>
                  <li>
                    <strong>Fractales & Espirales Logarítmicas:</strong> Estructuras auto-similares a diferentes escalas, calculadas mediante factores de respiración (&Sigma; de expansión Yang y &Gamma; de contracción Yin) que responden a la intensidad acústica.
                  </li>
                </ul>
              </section>

              {/* Sección 3: Sonido y Visión (Sinestesia) */}
              <section className="p-6 sm:p-8 rounded-3xl bg-black/40 border border-white/10 space-y-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Music className="text-purple-400" /> Sonido y Visión (Sinestesia)
                </h3>
                <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                  Buscamos simular la <em>sinestesia</em>, un fenómeno neurológico donde la estimulación de un sentido (el oído) provoca una experiencia automática en otro (la vista):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide block mb-1">Bajos (Sub / Bass)</span>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Dilatan la apertura del fractal, activando la respiración expansiva (Yang) de la geometría base.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wide block mb-1">Medios (Voz / Mid)</span>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Alteran la complejidad de los patrones, modulando el giro angular y los armónicos de torsión.
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide block mb-1">Agudos (Treble)</span>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Dictan la velocidad fotónica, el brillo espectral y la saturación cromática de las partículas.
                    </p>
                  </div>
                </div>
              </section>

              {/* Sección 4: Fundación Starseed */}
              <section className="bg-gradient-to-br from-pink-900/30 to-purple-900/30 border border-pink-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                
                <h3 className="text-2xl font-bold text-pink-300 flex items-center gap-3 mb-4 relative z-10">
                  <Heart className="text-pink-400" /> Fundación Starseed
                </h3>
                <p className="text-gray-200 leading-relaxed text-sm sm:text-base mb-6 relative z-10 max-w-3xl">
                  Tus donaciones y aportaciones voluntarias apoyan el desarrollo continuo de esta herramienta y financian directamente a la <strong>Fundación Starseed</strong>. Nuestra misión es promover la educación, la conciencia y la sanación a través del arte, la tecnología armónica y la conexión comunitaria. Creemos en el poder transformador de la frecuencia y la geometría sagrada para elevar el espíritu humano.
                </p>
                
                <a 
                  href={FUNDACION_LINKTREE} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(236,72,153,0.4)] relative z-10 text-xs sm:text-sm"
                >
                  Conoce más sobre la Fundación <ExternalLink size={16} />
                </a>
              </section>

            </div>
          )}

          {/* TAB 3: ACTUALIZACIONES & DESCARGAS INTELIGENTES */}
          {activeTab === 'updates' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              
              {/* Header de Estado de Versión & Verificador */}
              <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-cyan-950/50 via-indigo-950/40 to-black/60 border border-cyan-500/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono uppercase tracking-wider px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-cyan-400" />
                      Versión Actual: v{updateSystem.currentVersion}
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      Compilación {updateSystem.buildDate} · Motor Nativo v{updateSystem.nativeContainerVersion}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Centro Inteligente de Actualizaciones & Versiones
                  </h3>
                  <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                    {updateSystem.updateStatusMessage || 'El sistema comprueba y aplica automáticamente las mejoras internas de algoritmos y audio sin interrumpir tu experiencia.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                  <button
                    onClick={() => updateSystem.checkForUpdates(true)}
                    disabled={updateSystem.isChecking}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw size={14} className={updateSystem.isChecking ? 'animate-spin' : ''} />
                    <span>{updateSystem.isChecking ? 'Comprobando...' : 'Buscar Actualizaciones'}</span>
                  </button>

                  {updateSystem.updateAvailable && (
                    <button
                      onClick={updateSystem.applyOtaUpdate}
                      disabled={updateSystem.isUpdating}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
                    >
                      <Sparkles size={14} />
                      <span>{updateSystem.isUpdating ? 'Actualizando...' : 'Instalar en Vivo (OTA)'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Lógica Inteligente Explicada: OTA vs Instalador Completo */}
              <div className="p-5 sm:p-6 rounded-2xl bg-black/40 border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-gray-300">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <Zap size={18} />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white text-sm">Actualizaciones Internas en Vivo (OTA)</h5>
                    <p className="text-gray-400 leading-relaxed">
                      Mejoras en geometrías, fórmulas de sinestesia, shaders WebGL, bibliotecas de presets y optimizaciones de audio se actualizan al instante en segundo plano. <strong>No necesitas reinstalar la app</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Laptop size={18} />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white text-sm">Actualizaciones Mayores de Sistema</h5>
                    <p className="text-gray-400 leading-relaxed">
                      Solo cuando se actualizan librerías nativas del sistema operativo (permisos de hardware, nuevos drivers de micrófono o cámara AR), la app te avisará para descargar el instalador completo y reiniciar automáticamente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Ajustes Configurables de Actualización */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center gap-2">
                  <Sliders size={18} className="text-cyan-400" />
                  <h4 className="font-bold text-white text-sm">Ajustes de Actualización Automática</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:border-white/20 transition-all">
                    <input
                      type="checkbox"
                      checked={updateSystem.settings.autoCheck}
                      onChange={(e) => updateSystem.updateSettings({ autoCheck: e.target.checked })}
                      className="accent-cyan-400 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-gray-200">Buscar al iniciar la app</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:border-white/20 transition-all">
                    <input
                      type="checkbox"
                      checked={updateSystem.settings.autoApplyOta}
                      onChange={(e) => updateSystem.updateSettings({ autoApplyOta: e.target.checked })}
                      className="accent-cyan-400 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-gray-200">Instalar mejoras OTA en segundo plano</span>
                  </label>

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-black/30 border border-white/10">
                    <span className="text-gray-400">Canal:</span>
                    <select
                      value={updateSystem.settings.channel}
                      onChange={(e) => updateSystem.updateSettings({ channel: e.target.value as any })}
                      className="bg-transparent text-cyan-300 font-bold outline-none cursor-pointer text-xs"
                    >
                      <option value="stable" className="bg-gray-900 text-white">Estable Oficial</option>
                      <option value="beta" className="bg-gray-900 text-white">Beta Soberana</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Diagnóstico de Permisos & Hardware Nativos */}
              <div className="p-5 sm:p-6 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Shield size={18} className="text-emerald-400" />
                    <h4 className="font-bold text-white text-sm">Diagnóstico de Permisos & Hardware del Sistema</h4>
                  </div>
                  <button
                    onClick={updateSystem.refreshPermissions}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={11} /> Re-verificar hardware
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Micrófono */}
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Mic size={16} className={updateSystem.permissions.microphone === 'granted' ? 'text-emerald-400' : 'text-amber-400'} />
                      <div>
                        <span className="font-bold text-white block">Micrófono & Audio</span>
                        <span className="text-[10px] text-gray-400">Captura FFT en vivo</span>
                      </div>
                    </div>
                    {updateSystem.permissions.microphone === 'granted' ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">Concedido</span>
                    ) : (
                      <button
                        onClick={updateSystem.requestMicrophoneAccess}
                        className="px-2.5 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold cursor-pointer"
                      >
                        Autorizar
                      </button>
                    )}
                  </div>

                  {/* Cámara AR */}
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Camera size={16} className={updateSystem.permissions.camera === 'granted' ? 'text-emerald-400' : 'text-purple-400'} />
                      <div>
                        <span className="font-bold text-white block">Cámara Realidad Aumentada</span>
                        <span className="text-[10px] text-gray-400">Tracking espacial AR</span>
                      </div>
                    </div>
                    {updateSystem.permissions.camera === 'granted' ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">Concedido</span>
                    ) : (
                      <button
                        onClick={updateSystem.requestCameraAccess}
                        className="px-2.5 py-1 rounded-md bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-bold cursor-pointer"
                      >
                        Autorizar
                      </button>
                    )}
                  </div>

                  {/* Salida de Audio */}
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Volume2 size={16} className="text-cyan-400" />
                      <div>
                        <span className="font-bold text-white block">Salida de Audio Routing</span>
                        <span className="text-[10px] text-gray-400">Ruteo de altavoces</span>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSystem.requestAudioOutputAccess()}
                      className="px-2 py-0.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono text-[10px] transition-colors cursor-pointer"
                      title="Enrutar y seleccionar dispositivo de salida de audio"
                    >
                      {updateSystem.permissions.audioOutput ? '🔊 Enrutar / Probar' : 'Enrutado OS'}
                    </button>
                  </div>

                  {/* Pantalla Siempre Encendida (Wake Lock) */}
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sun size={16} className="text-amber-400" />
                      <div>
                        <span className="font-bold text-white block">Pantalla Siempre Activa</span>
                        <span className="text-[10px] text-gray-400">Previene suspensión</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                      {updateSystem.permissions.wakeLock ? 'Activo' : 'Gestionado'}
                    </span>
                  </div>

                  {/* Modos VR Nativos & WebXR */}
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Glasses size={16} className="text-purple-400" />
                      <div>
                        <span className="font-bold text-white block">WebXR & Visores VR</span>
                        <span className="text-[10px] text-gray-400">Inmersión espacial 3D</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                      {updateSystem.permissions.webxr ? 'WebXR Disponible' : 'Emulador 3D'}
                    </span>
                  </div>

                  {/* Pantalla Completa */}
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Maximize2 size={16} className="text-emerald-400" />
                      <div>
                        <span className="font-bold text-white block">Pantalla Completa Nativa</span>
                        <span className="text-[10px] text-gray-400">Modo inmersivo total</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                      Habilitado
                    </span>
                  </div>
                </div>
              </div>

              {/* Centro de Descargas por Sistema Operativo */}
              <div>
                <div className="mb-4">
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <Download className="text-cyan-400" />
                    Descargar Audiomorphic para tu Dispositivo
                  </h4>
                  <p className="text-xs text-gray-400">
                    Binarios optimizados y adaptados para cada sistema operativo con soporte de aceleración gráfica por hardware.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* 1. Windows */}
                  <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    updateSystem.detectedOS === 'windows'
                      ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                      : 'bg-black/40 border-white/10 hover:border-white/20'
                  }`}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Monitor className="text-cyan-400" size={24} />
                        {updateSystem.detectedOS === 'windows' && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-black text-[9px] font-black uppercase font-mono">
                            Tu Sistema
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-white text-base">Windows</h5>
                      <p className="text-xs text-gray-400 mb-1">Windows 10 / 11 (x64 y ARM64)</p>
                      <span className="text-[10px] text-cyan-300 font-mono block mb-4">Tamaño: {updateSystem.downloads.windows.size}</span>
                    </div>
                    <div className="space-y-2">
                      <a
                        href={updateSystem.downloads.windows.installerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Instalador (.exe)</span>
                      </a>
                      <a
                        href={updateSystem.downloads.windows.portableUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Portable (.zip)</span>
                      </a>
                    </div>
                  </div>

                  {/* 2. macOS */}
                  <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    updateSystem.detectedOS === 'macos'
                      ? 'bg-purple-950/40 border-purple-400/60 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                      : 'bg-black/40 border-white/10 hover:border-white/20'
                  }`}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Laptop className="text-purple-400" size={24} />
                        {updateSystem.detectedOS === 'macos' && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[9px] font-black uppercase font-mono">
                            Tu Sistema
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-white text-base">macOS</h5>
                      <p className="text-xs text-gray-400 mb-1">Apple Silicon & Intel Mac</p>
                      <span className="text-[10px] text-purple-300 font-mono block mb-4">Tamaño: {updateSystem.downloads.macos.size}</span>
                    </div>
                    <div className="space-y-2">
                      <a
                        href={updateSystem.downloads.macos.arm64DmgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Apple Silicon (.dmg)</span>
                      </a>
                      <a
                        href={updateSystem.downloads.macos.intelDmgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Intel Mac (.dmg)</span>
                      </a>
                    </div>
                  </div>

                  {/* 3. Android */}
                  <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    updateSystem.detectedOS === 'android'
                      ? 'bg-emerald-950/40 border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'bg-black/40 border-white/10 hover:border-white/20'
                  }`}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Smartphone className="text-emerald-400" size={24} />
                        {updateSystem.detectedOS === 'android' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black uppercase font-mono">
                            Tu Sistema
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-white text-base">Android</h5>
                      <p className="text-xs text-gray-400 mb-1">{updateSystem.downloads.android.minSdk}</p>
                      <span className="text-[10px] text-emerald-300 font-mono block mb-4">APK Nativo: {updateSystem.downloads.android.size}</span>
                    </div>
                    <div className="space-y-2">
                      <a
                        href={updateSystem.downloads.android.apkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Descargar APK (.apk)</span>
                      </a>
                      <span className="text-[10px] text-gray-400 block text-center">Permisos de audio y cámara incluidos</span>
                    </div>
                  </div>

                  {/* 4. Linux */}
                  <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    updateSystem.detectedOS === 'linux'
                      ? 'bg-amber-950/40 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : 'bg-black/40 border-white/10 hover:border-white/20'
                  }`}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Terminal className="text-amber-400" size={24} />
                        {updateSystem.detectedOS === 'linux' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-black uppercase font-mono">
                            Tu Sistema
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-amber-300 text-[9px] font-mono">
                            x64 & ARM64
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-white text-base">Linux</h5>
                      <p className="text-xs text-gray-400 mb-1">ALSA, PulseAudio & PipeWire</p>
                      <span className="text-[10px] text-amber-300 font-mono block mb-4">Pantalla completa y accesos de audio</span>
                    </div>
                    <div className="space-y-2">
                      <a
                        href={updateSystem.downloads.linux.x64Url || updateSystem.downloads.linux.tarGzUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Linux x64 (.tar.gz)</span>
                      </a>
                      <a
                        href={updateSystem.downloads.linux.arm64Url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Linux ARM64 (.tar.gz)</span>
                      </a>
                      <a
                        href={updateSystem.downloads.mirrorDrive}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-1.5 rounded-lg text-[10px] text-amber-300/80 hover:text-amber-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Google Drive Mirror ↗</span>
                      </a>
                    </div>
                  </div>

                </div>
              </div>

              {/* Historial de Versiones & Changelog */}
              <div className="p-6 rounded-3xl bg-black/40 border border-white/10 space-y-4">
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <Bookmark size={18} className="text-cyan-400" />
                  Historial de Versiones & Registro de Cambios
                </h4>

                <div className="space-y-4">
                  {updateSystem.changelog.map((entry) => (
                    <div key={entry.version} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-cyan-300">v{entry.version}</span>
                          <span className="font-bold text-white text-sm">· {entry.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-gray-400">{entry.date}</span>
                          <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold font-mono ${
                            entry.type === 'ota' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                          }`}>
                            {entry.type === 'ota' ? 'OTA en Vivo' : 'Instalador Nativo'}
                          </span>
                        </div>
                      </div>

                      <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc list-outside">
                        {entry.notes.map((note, idx) => (
                          <li key={idx} className="leading-relaxed">{note}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: ECOSISTEMA STARSEED */}
          {activeTab === 'ecosystem' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Banner Gratis vía StarSeed OS */}
              <a
                href={OS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-violet-950/40 hover:border-emerald-400/70 transition-all p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
              >
                <div className="flex items-center gap-5">
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black shadow-lg">
                    <InfinityIcon size={30} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base sm:text-lg font-extrabold text-white">
                        Úsalo 100% GRATIS dentro de StarSeed OS
                      </span>
                      <span className="text-[10px] uppercase tracking-wider bg-emerald-500 text-black font-black px-2.5 py-0.5 rounded-full">
                        Soberano
                      </span>
                    </div>
                    <p className="text-xs text-gray-300/90 mt-1.5 leading-relaxed">
                      Audiomorphic es un área nativa del sistema StarSeed. Si inicias sesión desde el OS y lo ejecutas dentro del sistema, tienes la versión completa sin costo alguno y tus presets y memorias viajan contigo en tiempo real.
                    </p>
                  </div>
                  <ArrowRight size={24} className="text-emerald-300 shrink-0 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </a>

              {/* Systems Grid */}
              <div>
                <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Boxes className="text-cyan-400" />
                  Áreas del Ecosistema StarSeed
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ECOSYSTEM_SYSTEMS.map((s) => (
                    <a
                      key={s.name}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-2xl border border-white/10 bg-black/40 hover:border-cyan-500/50 transition-all overflow-hidden flex flex-col justify-between p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-md`}>
                            {s.icon}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-white block">{s.name}</span>
                            <span className="text-[10px] text-cyan-300 font-mono">{s.badge}</span>
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed">{s.summary}</p>

                      <div className="pt-2 border-t border-white/10">
                        <p className="text-[11px] text-cyan-300/90 flex items-start gap-1.5">
                          <Boxes size={13} className="shrink-0 mt-0.5 text-cyan-400" />
                          <span>{s.connection}</span>
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MI CUENTA STARSEED (Limpia sin código pqzdpmedcsgcedkvndzl) */}
          {activeTab === 'account' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-500/30">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2.5">
                  <Star className="text-cyan-400" />
                  Identidad Soberana Unificada (StarSeed DB)
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Tu cuenta está conectada a la base de datos soberana del ecosistema StarSeed OS. La misma sesión te da acceso unificado a Audiomorphic, al Café, al Nexus y a todos tus presets guardados en la nube.
                </p>
              </div>

              {identity.isLoggedIn ? (
                /* Perfil conectado */
                <div className="p-6 sm:p-8 rounded-3xl bg-black/40 border border-white/10 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400/50 flex items-center justify-center text-xl font-bold text-cyan-200 overflow-hidden shrink-0">
                      {identity.avatarUrl ? (
                        <img src={identity.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (identity.displayName || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg font-bold text-white truncate">{identity.displayName || 'Usuario Soberano'}</h4>
                      {identity.handle && (
                        <p className="text-xs text-cyan-300 flex items-center gap-1">
                          <AtSign size={13} /> {identity.handle}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 truncate mt-0.5">{identity.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={handleOpenStarSeedOS}
                      disabled={handoffLoading}
                      className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-60 cursor-pointer"
                    >
                      {handoffLoading ? (
                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <Rocket size={16} />
                      )}
                      Abrir StarSeed OS con mi sesión
                    </button>

                    <button
                      onClick={() => identity.logout()}
                      className="px-4 py-3 rounded-xl bg-white/10 hover:bg-red-500/20 text-gray-300 hover:text-red-300 border border-white/10 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut size={15} /> Cerrar Sesión
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulario de Login / Registro */
                <form onSubmit={handleAuthSubmit} className="max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-black/40 border border-white/15 space-y-4">
                  <div className="text-center mb-4">
                    <h4 className="text-lg font-bold text-white">
                      {isRegistering ? 'Crear Cuenta Soberana' : 'Entrar a tu Cuenta StarSeed'}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">Conexión cifrada a la red de identidad soberana StarSeed</p>
                  </div>

                  {authError && (
                    <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs">
                      {authError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-300 block mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="tu@correo.com"
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-300 block mb-1">Contraseña</label>
                      <input
                        type="password"
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 mt-2 cursor-pointer"
                  >
                    {authLoading ? 'Conectando...' : isRegistering ? 'Registrarme' : 'Iniciar Sesión'}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="text-xs text-cyan-300 hover:underline cursor-pointer"
                    >
                      {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Crear una gratis'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 6: LIBRERÍA & PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-cyan-400" />
                    Biblioteca Soberana de Presets
                  </h3>
                  <p className="text-xs text-gray-400">
                    Ajustes automáticos oficiales y comunitarios, sincronizados con StarSeed OS.
                  </p>
                </div>

                <button
                  onClick={() => sync.syncWithCloud()}
                  disabled={sync.isSyncing}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-bold hover:bg-cyan-500/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${sync.isSyncing ? 'animate-spin' : ''}`} />
                  {sync.isSyncing ? 'Sincronizando...' : 'Sincronizar con StarSeed OS'}
                </button>
              </div>

              {/* Chips de Categorías */}
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
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grid de Presets */}
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
                        {onApplyPreset && (
                          <button
                            type="button"
                            onClick={() => {
                              onApplyPreset(preset);
                              onClose();
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold hover:bg-cyan-500/30 transition-all cursor-pointer"
                          >
                            Aplicar Preset
                          </button>
                        )}
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
