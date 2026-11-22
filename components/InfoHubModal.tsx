import React, { useRef, useState } from 'react';
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
  ChevronLeft,
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
  Sun,
  Maximize2,
  MessageSquare,
  Headphones,
  Disc,
  Plus,
  FolderPlus,
  Play,
  CheckCircle2,
  Terminal,
  Cpu,
  Wifi,
  WifiOff,
  HardDrive,
  Gem
} from 'lucide-react';
import { StarSeedIdentity } from '../hooks/useStarSeedIdentity';
import { UseSubscriptionResult, PlanId } from '../hooks/useSubscription';
import { UseStarSeedSyncResult } from '../hooks/useStarSeedSync';
import { usePresetCommunity, MusicRecommendationType } from '../hooks/usePresetCommunity';
import { usePresets } from '../hooks/usePresets';
import { ThankYouCard3D } from './ThankYouCard3D';
import { ThankYouCardRecord, AudiomorphicPresetRecord } from '../lib/starseedDb';
import { VisualizerParams } from '../types';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { useMenu3DTilt } from '../hooks/useMenu3DTilt';
import { openExternalUrl, buildStarSeedOsHandoffUrl } from '../utils/platform';
import { STARSEED_OS_OFFICIAL_URL } from '../lib/supabaseClient';
import StarSeedSymbol from './StarSeedSymbol';
import { STARSEED_ECOSYSTEM_APPS, EcosystemCategory } from '../lib/starseedEcosystem';
import { PIONEROS_12_CATALOG, getDesignById } from '../lib/starseedCards';

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
  onSelectLibraryPreset?: (preset: AudiomorphicPresetRecord) => void;
}

const OS_URL = 'https://starseed-os.vercel.app';
const FUNDACION_LINKTREE = 'https://linktr.ee/FundacionStarseed';

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
  onSelectLibraryPreset,
}) => {
  const [activeTab, setActiveTab] = useState<InfoHubTab>(initialTab);
  const [ecosystemCategory, setEcosystemCategory] = useState<'all' | EcosystemCategory>('all');
  const cardTilt = useMenu3DTilt({ maxDeg: 2.2, maxTranslatePx: 4, autoGyro: true });

  // Hook del sistema inteligente de actualizaciones y descargas
  const updateSystem = useAppUpdate();
  const presetsManager = usePresets();

  // Cerrar con Escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Sincronizar pestaña inicial al abrir
  React.useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  // Account & Brains form state
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [newBrainName, setNewBrainName] = useState('');
  const [brainBusy, setBrainBusy] = useState(false);
  const [brainNotice, setBrainNotice] = useState<string | null>(null);

  // Donations state: Tarjeta NFT 3D/4D activa y slider dinámico de los 12 diseños Pioneros
  const [selectedDesignId, setSelectedDesignId] = useState<string>(() => {
    return sync.thankYouCards[0]?.designId || 'pioneros-01';
  });
  const [activeCard, setActiveCard] = useState<ThankYouCardRecord | null>(() => {
    return sync.thankYouCards.length > 0 ? sync.thankYouCards[0] : null;
  });
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const cardSlideRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectedIndex = Math.max(
    0,
    PIONEROS_12_CATALOG.findIndex((c) => c.designId === selectedDesignId)
  );

  const selectPionerosCard = (designId: string, scrollCard = true) => {
    const item = getDesignById(designId);
    setSelectedDesignId(item.designId);
    if (activeCard) {
      setActiveCard({
        ...activeCard,
        designId: item.designId,
        cardNumber: item.cardNumber,
        area: item.area,
      });
    }
    if (scrollCard) {
      const slideEl = cardSlideRefs.current[item.designId];
      if (slideEl && typeof slideEl.scrollIntoView === 'function') {
        slideEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const goPrevCard = () => {
    const prevIdx = (selectedIndex - 1 + PIONEROS_12_CATALOG.length) % PIONEROS_12_CATALOG.length;
    selectPionerosCard(PIONEROS_12_CATALOG[prevIdx].designId, true);
  };

  const goNextCard = () => {
    const nextIdx = (selectedIndex + 1) % PIONEROS_12_CATALOG.length;
    selectPionerosCard(PIONEROS_12_CATALOG[nextIdx].designId, true);
  };

  // Presets category filter & Community state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const community = usePresetCommunity();
  const [expandedCardSection, setExpandedCardSection] = useState<Record<string, 'none' | 'music' | 'comments'>>({});
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);
  const [installModalPreset, setInstallModalPreset] = useState<AudiomorphicPresetRecord | null>(null);
  const [installTargetFolder, setInstallTargetFolder] = useState<string>('');
  const [installSuccessMessage, setInstallSuccessMessage] = useState<string | null>(null);

  // Music Recommendation form state
  const [showRecFormFor, setShowRecFormFor] = useState<string | null>(null);
  const [recType, setRecType] = useState<MusicRecommendationType>('song');
  const [recTitle, setRecTitle] = useState('');
  const [recArtist, setRecArtist] = useState('');
  const [recAlbum, setRecAlbum] = useState('');
  const [recUrl, setRecUrl] = useState('');
  const [recDesc, setRecDesc] = useState('');
  const [recRating, setRecRating] = useState<number>(5);

  // Comment form state
  const [commentFormPresetId, setCommentFormPresetId] = useState<string | null>(null);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState<number>(5);

  // Recommendation comment input state
  const [recCommentInput, setRecCommentInput] = useState<Record<string, string>>({});
  const [activeRecComments, setActiveRecComments] = useState<Record<string, boolean>>({});

  if (!open) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    setAuthLoading(true);
    try {
      if (isRegistering) {
        const res = await identity.signUpWithEmail(emailInput, passwordInput);
        if (!res.ok) setAuthError(res.error || 'Error al registrar la cuenta');
        else if (res.error) setAuthNotice(res.error);
      } else {
        const res = await identity.loginWithEmail(emailInput, passwordInput);
        if (!res.ok) setAuthError(res.error || 'Error al iniciar sesión');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'No se pudo conectar con StarSeed OS.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDonationAction = (planId: PlanId) => {
    const donorName = identity.displayName || (identity.user?.email ? identity.user.email.split('@')[0] : 'Mecenas Soberano');
    const userEmail = identity.user?.email;
    const userId = identity.user?.id;
    const design = getDesignById(selectedDesignId);
    const card = subscription.makeDonation(planId, donorName, userEmail, userId, {
      designId: design.designId,
      cardNumber: design.cardNumber,
      area: design.area,
    });
    sync.addThankYouCard(card);
    setActiveCard(card);
  };

  const handleOpenStarSeedOS = async () => {
    setHandoffLoading(true);
    try {
      const session = identity.session;
      const targetUrl = buildStarSeedOsHandoffUrl(session);
      openExternalUrl(targetUrl);
    } catch {
      openExternalUrl(OS_URL);
    } finally {
      setHandoffLoading(false);
    }
  };

  const userEmail = identity.user?.email;
  const userId = identity.user?.id;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-5 bg-black/85 desktop-backdrop-blur menu-3d-stage animate-in fade-in duration-300 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Centro de Información, Actualizaciones y Donaciones StarSeed"
    >
      <div
        ref={cardTilt.surfaceRef}
        onPointerMove={cardTilt.onPointerMove}
        onPointerLeave={cardTilt.onPointerLeave}
        className="info-hub-shell menu-3d-surface menu-audio-rim w-full sm:w-[95vw] md:w-[90vw] max-w-6xl h-[100vh] h-[100dvh] sm:h-[92vh] max-h-[920px] rounded-none sm:rounded-[32px] flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="menu-3d-glare rounded-none sm:rounded-[32px]" aria-hidden="true" />
        {/* SLIM UNIFIED APP BAR */}
        <div className="px-3 sm:px-6 pt-safe py-2.5 sm:py-3.5 border-b border-white/10 flex justify-between items-center bg-black/55 shrink-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 starseed-app-squircle p-0.5 flex items-center justify-center shrink-0">
              <img
                src="./starseed/app-icons/audiomorphic.png"
                alt="Audiomorphic"
                className="w-full h-full object-cover rounded-[20%]"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold starseed-text-gradient tracking-wide truncate flex items-center gap-1.5">
                <span>Audiomorphic Hub</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full morph-pill hidden sm:inline-block">v{updateSystem.currentVersion}</span>
              </h2>
              <p className="text-[10px] text-slate-300 truncate hidden sm:block">Centro de Información, Ciencia, Descargas y Cuenta StarSeed OS</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {identity.isLoggedIn ? (
              <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full morph-pill text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="max-w-[120px] truncate">{identity.displayName || identity.user?.email}</span>
              </div>
            ) : (
              <button 
                onClick={() => setActiveTab('account')}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full morph-btn-glass text-[11px] font-medium cursor-pointer"
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

        {/* NAVIGATION TABS */}
        <div className="px-3 sm:px-6 py-2 bg-black/40 border-b border-white/10 flex justify-start scroll-px-3 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar whitespace-nowrap shrink-0 z-10">
          {[
            { id: 'donations', label: 'Donaciones & Aportes', icon: <Heart size={14} /> },
            { id: 'guide', label: 'Sobre el Proyecto & Ciencia', icon: <BrainCircuit size={14} /> },
            { id: 'updates', label: 'Actualizaciones & Descargas', icon: <Download size={14} /> },
            { id: 'ecosystem', label: 'Ecosistema StarSeed', icon: <Globe size={14} /> },
            { id: 'account', label: 'Cuenta, Cerebros & Neuronas', icon: <User size={14} /> },
            { id: 'presets', label: 'Librería de Presets', icon: <Sparkles size={14} /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as InfoHubTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-opacity shrink-0 cursor-pointer ${
                  isActive
                    ? 'morph-tab-active'
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
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-11 h-11 starseed-app-squircle p-0.5 mb-2.5 flex items-center justify-center">
                    <img
                      src="./starseed/app-icons/audiomorphic.png"
                      alt="Audiomorphic"
                      className="w-full h-full object-cover rounded-[20%]"
                    />
                  </div>
                  <h2 className="text-xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-emerald-300 mb-2 tracking-tight">
                    Desbloquea el Universo Sinestésico
                  </h2>
                </div>
                <p className="text-gray-300 max-w-2xl mx-auto text-xs sm:text-sm relative z-10 mb-3 sm:mb-4 leading-relaxed">
                  Experimenta la sinestesia completa con acceso a todas las geometrías sagradas, modos de realidad virtual y aumentada, y control total sobre la experiencia visual. <strong>100% Gratuito y Soberano.</strong>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 relative z-10">
                  <button 
                    onClick={() => setActiveTab('updates')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition-opacity cursor-pointer"
                  >
                    <Download size={13} className="text-cyan-400" />
                    <span>Descargas & Versión {updateSystem.currentVersion}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('guide')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500/20 to-orange-500/20 border border-pink-500/40 hover:border-pink-500/70 text-pink-200 text-xs font-bold transition-opacity group cursor-pointer"
                  >
                    <Heart className="w-3.5 h-3.5 text-pink-400 group-hover:scale-125 transition-transform" fill="currentColor" />
                    <span>¿Cómo ayuda tu contribución? Fundación Starseed</span>
                  </button>
                </div>
              </div>
              
              {/* Banner Fundación StarSeed & Aclaración 0% Paywalls */}
              <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-black/50 border border-pink-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-start gap-4 max-w-2xl">
                  <div className="w-12 h-12 rounded-2xl quantum-glass flex items-center justify-center p-1.5 shrink-0 hidden sm:flex">
                    <StarSeedSymbol size="md" glow alt="Símbolo Fundación StarSeed" />
                  </div>
                  <div className="space-y-1.5">
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
                </div>
                <a
                  href={FUNDACION_LINKTREE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 text-pink-200 text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-opacity shadow-[0_0_15px_rgba(236,72,153,0.3)] shrink-0"
                >
                  Conoce la Fundación <ExternalLink size={14} />
                </a>
              </div>

              {/* Tiers Grid: Cuadrícula Horizontal Inspirada en SubscriptionScreen */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* 1. Explorador Libre (Gratis / $0 MXN) */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-white/25 transition-opacity">
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
                <div className="bg-gradient-to-b from-purple-950/50 to-black/50 border border-purple-500/50 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-purple-400 transition-opacity shadow-[0_5px_25px_rgba(168,85,247,0.15)]">
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
                    className="w-full py-2.5 rounded-xl font-bold transition-opacity shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs cursor-pointer"
                  >
                    <Heart size={14} className="fill-white" />
                    <span>Aportar $369 MXN (Stripe)</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* 3. Maestro ($963 MXN / Pago único de por vida) - Mecenas Pleno */}
                <div className="bg-gradient-to-b from-amber-950/50 to-black/50 border border-amber-500/50 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-amber-400 transition-opacity shadow-[0_5px_25px_rgba(245,158,11,0.2)]">
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
                    className="w-full py-2.5 rounded-xl font-black transition-opacity shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs cursor-pointer"
                  >
                    <Shield size={14} />
                    <span>Aportar $963 MXN (Stripe)</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* 4. StarSeed Ecosistema (Libre en OS) */}
                <div className="bg-gradient-to-b from-cyan-950/40 to-black/40 border border-cyan-500/40 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-cyan-400 transition-opacity">
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
                    className="w-full py-2.5 rounded-xl font-bold transition-opacity border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs flex items-center justify-center gap-2 cursor-pointer"
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

              {/* Tarjeta Virtual NFT 4D Interactiva & Colección Pioneros (Slider Dinámico 12 Diseños Únicos) */}
              <div className="p-4 sm:p-6 rounded-3xl bg-black/45 border border-white/10 flex flex-col items-center">
                <div className="text-center mb-4 max-w-2xl space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center justify-center gap-1.5 font-mono">
                    <Gem className="w-4 h-4 text-cyan-300" /> Colección NFT Pioneros 4D · 12 Obras Únicas con Valor Irrepetible
                  </span>
                  <h4 className="text-xl sm:text-2xl font-bold text-white">
                    NFTs 4D Soberanos · Edición Fundacional Limitada
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Cada una de las 12 esculturas modeladas en Blender 5.2 es un <strong>NFT 4D único e irrepetible</strong>: posee número de serie exclusivo (<code>#001/012</code> a <code>#012/012</code>), huella criptográfica verificable (<code>SS-PNR-…</code>), geometría 3D portátil <code>.glb</code> y vínculo directo con tu Cerebro en StarSeed OS como reliquia coleccionable con valor propio dentro de la historia fundacional del ecosistema.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/35 text-[10px] font-mono text-amber-200">
                      NFT 4D Único &amp; Verificable
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-[10px] font-mono text-cyan-200">
                      Serie Limitada 12/12 · Valor Irrepetible
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-400/35 text-[10px] font-mono text-purple-200">
                      Portátil en StarSeed OS &amp; .GLB
                    </span>
                  </div>
                </div>

                {(() => {
                  const chosenDesign = getDesignById(selectedDesignId);
                  const displayCard: ThankYouCardRecord = activeCard
                    ? {
                        ...activeCard,
                        designId: chosenDesign.designId,
                        cardNumber: chosenDesign.cardNumber,
                        editionSize: 12,
                        area: activeCard.area || chosenDesign.area,
                      }
                    : {
                        id: `preview-${chosenDesign.designId}`,
                        donorName: identity.displayName || 'Explorador StarSeed',
                        tierId: 'pioneros',
                        tierName: 'Edición NFT Pioneros 4D',
                        amount: 'NFT Único 1/12',
                        issuedAt: new Date().toISOString(),
                        folderPath: 'Biblioteca/Donaciones y Agradecimientos',
                        cardTheme: 'iridescent',
                        editionId: 'pioneros',
                        cardNumber: chosenDesign.cardNumber,
                        editionSize: 12,
                        designId: chosenDesign.designId,
                        phase: chosenDesign.phase,
                        area: chosenDesign.area,
                        message: chosenDesign.environment4D,
                      };

                  return (
                    <div className="w-full max-w-4xl flex flex-col items-center gap-4">
                      {/* Barra superior del Slider Dinámico */}
                      <div className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-2xl bg-black/50 border border-white/10">
                        <button
                          type="button"
                          onClick={goPrevCard}
                          aria-label="Tarjeta NFT anterior"
                          className="w-9 h-9 rounded-full morph-btn-glass flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4 text-cyan-200" />
                        </button>

                        <div className="min-w-0 text-center flex-1">
                          <div className="text-[11px] font-mono font-bold text-amber-300 truncate">
                            NFT #{String(chosenDesign.cardNumber).padStart(2, '0')} / 12 · {chosenDesign.title}
                          </div>
                          <div className="text-[10px] text-cyan-200/80 truncate">
                            {chosenDesign.area} · {chosenDesign.subtitle}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={goNextCard}
                          aria-label="Siguiente tarjeta NFT"
                          className="w-9 h-9 rounded-full morph-btn-glass flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4 text-cyan-200" />
                        </button>
                      </div>

                      {/* Slider horizontal fluido interactivo de las 12 tarjetas NFT */}
                      <div
                        ref={sliderRef}
                        className="w-full flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 sm:px-8 py-3 no-scrollbar"
                        aria-label="Carrusel interactivo de los 12 NFTs Pioneros StarSeed"
                      >
                        {PIONEROS_12_CATALOG.map((item) => {
                          const isSelected = selectedDesignId === item.designId;
                          return (
                            <button
                              key={item.designId}
                              ref={(el) => {
                                cardSlideRefs.current[item.designId] = el;
                              }}
                              type="button"
                              onClick={() => selectPionerosCard(item.designId, true)}
                              className={`w-[132px] sm:w-[156px] shrink-0 snap-center rounded-2xl p-2 text-left border cursor-pointer flex flex-col transition-[transform,opacity,border-color] duration-200 ${
                                isSelected
                                  ? 'scale-[1.04] bg-cyan-500/20 border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.32)] opacity-100'
                                  : 'scale-[0.96] bg-black/55 border-white/10 hover:border-white/30 opacity-80 hover:opacity-100'
                              }`}
                            >
                              <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-slate-950 mb-1.5 relative">
                                {item.previewImage && (
                                  <img
                                    src={item.previewImage}
                                    alt={`#${String(item.cardNumber).padStart(3, '0')} ${item.title}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                )}
                                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-black/80 border border-amber-400/40 text-[9px] font-mono font-bold text-amber-300">
                                  NFT #{String(item.cardNumber).padStart(3, '0')}
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-white truncate px-0.5">{item.title}</span>
                              <span className="text-[9px] font-mono text-cyan-300/85 truncate px-0.5">{item.area}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Puntos de acceso directo #01..#12 */}
                      <div className="flex flex-wrap items-center justify-center gap-1.5 px-2">
                        {PIONEROS_12_CATALOG.map((item) => {
                          const isSelected = selectedDesignId === item.designId;
                          return (
                            <button
                              key={item.designId}
                              type="button"
                              onClick={() => selectPionerosCard(item.designId, true)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold cursor-pointer border transition-colors ${
                                isSelected
                                  ? 'morph-tab-active'
                                  : 'bg-black/45 border-white/15 text-slate-400 hover:text-white'
                              }`}
                              title={`Ir a NFT #${String(item.cardNumber).padStart(3, '0')}: ${item.title}`}
                            >
                              {String(item.cardNumber).padStart(2, '0')}
                            </button>
                          );
                        })}
                      </div>

                      {/* Escenario 3D/4D Sincronizado (Orientación Vertical Correcta) */}
                      <ThankYouCard3D
                        card={displayCard}
                        onUpdateFolder={(newFolder) => {
                          if (activeCard) {
                            sync.updateCardFolder(activeCard.id, newFolder);
                          }
                        }}
                      />

                      <div className="w-full max-w-xl rounded-2xl bg-black/45 border border-white/10 p-3 text-center space-y-1">
                        <p className="text-[11px] font-mono text-cyan-200">
                          Valor Único · Edición Fundacional Pioneros · {chosenDesign.materialsSummary}
                        </p>
                        {!activeCard && (
                          <p className="text-[11px] text-amber-200/90 font-mono">
                            Vista previa NFT #{String(chosenDesign.cardNumber).padStart(3, '0')} · Realiza un aporte voluntario arriba para emitir y vincular tu NFT 4D irrepetible a tu cuenta StarSeed OS.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
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
                    <div key={p.key} className="bg-black/40 rounded-2xl overflow-hidden border border-white/10 hover:border-white/25 transition-opacity flex flex-col group">
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
                  <div className="w-9 h-9 starseed-app-squircle p-0.5 flex items-center justify-center shrink-0">
                    <img
                      src="./starseed/app-icons/audiomorphic.png"
                      alt="Audiomorphic"
                      className="w-full h-full object-cover rounded-[20%]"
                    />
                  </div>
                  ¿Cómo Funciona Audiomorphic?
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
                  <StarSeedSymbol size="md" glow alt="Símbolo Fundación StarSeed" />
                  Fundación StarSeed
                </h3>
                <p className="text-gray-200 leading-relaxed text-sm sm:text-base mb-6 relative z-10 max-w-3xl">
                  Tus donaciones y aportaciones voluntarias apoyan el desarrollo continuo de esta herramienta y financian directamente a la <strong>Fundación Starseed</strong>. Nuestra misión es promover la educación, la conciencia y la sanación a través del arte, la tecnología armónica y la conexión comunitaria. Creemos en el poder transformador de la frecuencia y la geometría sagrada para elevar el espíritu humano.
                </p>
                
                <a 
                  href={FUNDACION_LINKTREE} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold transition-opacity shadow-[0_0_20px_rgba(236,72,153,0.4)] relative z-10 text-xs sm:text-sm"
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
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <div className="w-12 h-12 starseed-app-squircle p-0.5 hidden sm:flex items-center justify-center shrink-0 mt-0.5">
                    <img
                      src="./starseed/app-icons/audiomorphic.png"
                      alt="Audiomorphic"
                      className="w-full h-full object-cover rounded-[20%]"
                    />
                  </div>
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
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                  <button
                    onClick={() => updateSystem.checkForUpdates(true)}
                    disabled={updateSystem.isChecking}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-opacity shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw size={14} className={updateSystem.isChecking ? 'animate-spin' : ''} />
                    <span>{updateSystem.isChecking ? 'Comprobando...' : 'Buscar Actualizaciones'}</span>
                  </button>

                  {updateSystem.updateAvailable && (
                    <button
                      onClick={updateSystem.applyOtaUpdate}
                      disabled={updateSystem.isUpdating}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-opacity shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
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
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:border-white/20 transition-opacity">
                    <input
                      type="checkbox"
                      checked={updateSystem.settings.autoCheck}
                      onChange={(e) => updateSystem.updateSettings({ autoCheck: e.target.checked })}
                      className="accent-cyan-400 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-gray-200">Buscar al iniciar la app</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer hover:border-white/20 transition-opacity">
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
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <Download className="text-cyan-400" />
                      Descargar Audiomorphic para tu Dispositivo
                    </h4>
                    <p className="text-xs text-gray-400">
                      Binarios optimizados y adaptados para cada sistema operativo con soporte de aceleración gráfica por hardware.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`https://github.com/StarSeedSystem/Audiomorphic-AR-app/releases/tag/v${updateSystem.currentVersion}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-cyan-500/20 shadow-sm"
                    >
                      <ExternalLink size={13} />
                      <span>Ver Release en GitHub (v{updateSystem.currentVersion}) ↗</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* 1. Windows */}
                  <div className={`p-5 rounded-2xl border transition-opacity flex flex-col justify-between ${
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
                        className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-opacity shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
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
                  <div className={`p-5 rounded-2xl border transition-opacity flex flex-col justify-between ${
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
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-opacity shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer"
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
                  <div className={`p-5 rounded-2xl border transition-opacity flex flex-col justify-between ${
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
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-opacity shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Descargar APK (.apk)</span>
                      </a>
                      <span className="text-[10px] text-gray-400 block text-center">Permisos de audio y cámara incluidos</span>
                    </div>
                  </div>

                  {/* 4. Linux */}
                  <div className={`p-5 rounded-2xl border transition-opacity flex flex-col justify-between ${
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
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-opacity shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
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
            <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
              {/* Hero Banner StarSeed OS con símbolo oficial */}
              <a
                href={OS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-3xl art-nouveau-frame menu-audio-rim p-5 sm:p-6 ecosystem-card-3d"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                  <div className="shrink-0 w-16 h-16 rounded-2xl quantum-glass flex items-center justify-center p-2 mx-auto sm:mx-0">
                    <StarSeedSymbol size="lg" glow alt="Símbolo StarSeed OS" />
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                      <span className="text-base sm:text-lg font-extrabold starseed-text-gradient">
                        StarSeed OS · Tu Sistema Operativo Soberano
                      </span>
                      <span className="text-[10px] uppercase tracking-wider morph-pill font-black px-2.5 py-0.5 rounded-full">
                        100% Gratis &amp; Unificado
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      Una sola cuenta conecta tus Cerebros, Folders, Neuronas y aplicaciones creativas en todo el ecosistema. Ejecuta Audiomorphic y Omnifrecuencias de forma autónoma o embebidos en vivo dentro de StarSeed OS.
                    </p>
                  </div>
                  <ArrowRight size={22} className="morph-accent-text shrink-0 mx-auto sm:mx-0 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </a>

              {/* Filtros por categoría centrados */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="text-base font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                  <Globe size={17} className="morph-accent-text" />
                  <span>Aplicaciones del Ecosistema StarSeed ({STARSEED_ECOSYSTEM_APPS.length})</span>
                </h4>

                <div className="flex flex-wrap items-center justify-center gap-1.5 bg-black/35 p-1 rounded-2xl border border-white/10">
                  {[
                    { id: 'all', label: 'Todas' },
                    { id: 'nucleo', label: 'Núcleo OS' },
                    { id: 'creacion', label: 'Audio & Creación' },
                    { id: 'red', label: 'Red & Comunidad' },
                    { id: 'utilidades', label: 'Utilidades' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEcosystemCategory(cat.id as 'all' | EcosystemCategory)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-opacity duration-150 cursor-pointer ${
                        ecosystemCategory === cat.id
                          ? 'morph-tab-active'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid de Apps con iconos oficiales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STARSEED_ECOSYSTEM_APPS.filter(
                  (app) => ecosystemCategory === 'all' || app.category === ecosystemCategory
                ).map((app) => (
                  <div
                    key={app.id}
                    className={`rounded-2xl quantum-glass ecosystem-card-3d p-4 sm:p-5 flex flex-col justify-between gap-3.5 relative overflow-hidden ${
                      app.isCurrentApp ? 'ring-1 ring-white/25' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-13 h-13 w-12 h-12 sm:w-14 sm:h-14 starseed-app-squircle flex items-center justify-center p-1 shrink-0">
                          <img
                            src={app.iconSrc}
                            alt={app.name}
                            className="w-full h-full object-cover rounded-[20%]"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm sm:text-base font-extrabold text-white truncate">
                              {app.name}
                            </span>
                            {app.isCurrentApp && (
                              <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full morph-pill">
                                Estás aquí
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium morph-accent-text block truncate">
                            {app.tagline}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block truncate mt-0.5">
                            {app.badge}
                          </span>
                        </div>
                      </div>

                      {!app.isCurrentApp && (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl morph-btn-glass shrink-0"
                          title={`Abrir ${app.name}`}
                          aria-label={`Abrir ${app.name}`}
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed">{app.summary}</p>

                    <div className="flex flex-wrap gap-1.5">
                      {app.highlights.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-[10px] text-slate-300"
                        >
                          <Sparkles size={10} className="morph-accent-text-2 shrink-0" />
                          <span>{item}</span>
                        </span>
                      ))}
                    </div>

                    <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                      <p className="text-[11px] morph-accent-text flex items-start gap-1.5 min-w-0">
                        <Boxes size={13} className="shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{app.connection}</span>
                      </p>
                      {!app.isCurrentApp && (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="morph-btn-primary px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 inline-flex items-center gap-1"
                        >
                          <span>Abrir</span>
                          <ArrowRight size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: MI CUENTA STARSEED, CEREBROS & NEURONAS */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-6 rounded-3xl quantum-glass flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold starseed-text-gradient mb-1.5 flex items-center gap-2.5">
                    <StarSeedSymbol size="md" glow />
                    Cuenta StarSeed OS, Cerebros y Neuronas
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    La aplicación funciona al 100% de manera autónoma sin internet. Cuando conectas tu cuenta StarSeed OS, puedes elegir en qué <strong>Cerebro</strong> guardar tus folders y presets y sincronizar cambios en vivo entre todas tus <strong>Neuronas</strong> (dispositivos).
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                    presetsManager.isOnline
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                      : 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                  }`}>
                    {presetsManager.isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                    <span>{presetsManager.isOnline ? 'En línea' : 'Modo Offline Autónomo'}</span>
                  </span>
                </div>
              </div>

              {identity.isLoggedIn ? (
                <div className="space-y-6">
                  {/* Perfil conectado */}
                  <div className="p-5 sm:p-6 rounded-3xl quantum-glass space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl morph-pill flex items-center justify-center text-xl font-bold overflow-hidden shrink-0">
                          {identity.avatarUrl ? (
                            <img src={identity.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (identity.displayName || 'U').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-lg font-bold text-white truncate">{identity.displayName || 'Usuario StarSeed'}</h4>
                          {identity.handle && (
                            <p className="text-xs morph-accent-text flex items-center gap-1">
                              <AtSign size={13} /> {identity.handle.replace(/^@/, '')}
                            </p>
                          )}
                          <p className="text-xs text-slate-300 truncate mt-0.5">{identity.user?.email}</p>
                          {identity.starseedAddress && (
                            <p className="text-[11px] font-mono text-emerald-300 truncate mt-0.5">{identity.starseedAddress}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={handleOpenStarSeedOS}
                          disabled={handoffLoading}
                          className="px-4 py-2.5 rounded-xl morph-btn-primary text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                          {handoffLoading ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Rocket size={14} />
                          )}
                          <span>Abrir StarSeed OS</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => identity.logout()}
                          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-gray-200 hover:text-red-300 border border-white/10 text-xs font-bold transition-opacity flex items-center gap-2 cursor-pointer"
                        >
                          <LogOut size={15} /> Cerrar Sesión
                        </button>
                      </div>
                    </div>

                    {brainNotice && (
                      <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-xs text-emerald-200 flex items-center justify-between">
                        <span>{brainNotice}</span>
                        <button type="button" onClick={() => setBrainNotice(null)} className="text-xs cursor-pointer">✕</button>
                      </div>
                    )}
                  </div>

                  {/* Gestor de Cerebros StarSeed OS */}
                  <div className="p-5 sm:p-6 rounded-3xl quantum-glass space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <BrainCircuit size={18} className="morph-accent-text-2" />
                          <span>Cerebros Disponibles de tu Cuenta ({presetsManager.brains.length})</span>
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Elige el cerebro donde se sincronizarán tus folders y presets de Audiomorphic.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {presetsManager.hasLocalDevicePresets && (
                          <button
                            type="button"
                            onClick={async () => {
                              const count = await presetsManager.importLocalPresetsIntoBrain();
                              setBrainNotice(
                                count > 0
                                  ? `Se importaron ${count} presets locales al cerebro activo.`
                                  : 'Tus presets locales ya estaban sincronizados en este cerebro.'
                              );
                            }}
                            className="px-3 py-2 rounded-xl morph-btn-glass text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <HardDrive size={13} /> Importar Presets Locales
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => presetsManager.refreshBrainsAndSync()}
                          disabled={presetsManager.isLoadingBrains}
                          className="px-3 py-2 rounded-xl morph-btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw size={13} className={presetsManager.isLoadingBrains ? 'animate-spin' : ''} />
                          <span>Sincronizar Ahora</span>
                        </button>
                      </div>
                    </div>

                    {/* Grid de cerebros */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {presetsManager.brains.map((brain) => {
                        const isSelected = presetsManager.selectedBrainId === brain.id;
                        return (
                          <button
                            key={brain.id}
                            type="button"
                            onClick={() => presetsManager.selectBrain(brain.id)}
                            className={`text-left p-4 rounded-2xl border transition-opacity cursor-pointer space-y-2 ${
                              isSelected
                                ? 'morph-tab-active'
                                : 'bg-black/35 border-white/10 hover:border-white/25'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-sm text-white truncate">🧠 {brain.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 border border-white/15 uppercase font-mono shrink-0">
                                {brain.accessLevel}
                              </span>
                            </div>
                            {brain.description && (
                              <p className="text-[11px] text-slate-300 line-clamp-2">{brain.description}</p>
                            )}
                            <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1">
                              <span>{brain.isOwner ? 'Propio' : `Compartido (${brain.ownerHandle || 'Red'})`}</span>
                              <span className="font-semibold">
                                {isSelected ? '✓ Activo para Audiomorphic' : 'Seleccionar cerebro'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Crear nuevo cerebro */}
                    <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newBrainName}
                        onChange={(e) => setNewBrainName(e.target.value)}
                        placeholder="Crear nuevo cerebro (ej. Estudio Sinestesia)..."
                        className="flex-1 bg-black/45 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        disabled={brainBusy || !newBrainName.trim() || !presetsManager.isOnline}
                        onClick={async () => {
                          setBrainBusy(true);
                          try {
                            const res = await presetsManager.createBrain(newBrainName.trim());
                            if (res.ok) {
                              setBrainNotice(`Cerebro "${newBrainName.trim()}" creado y activado.`);
                              setNewBrainName('');
                            } else if (res.error) {
                              setBrainNotice(res.error);
                            }
                          } finally {
                            setBrainBusy(false);
                          }
                        }}
                        className="px-4 py-2 rounded-xl morph-btn-glass text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                      >
                        <Plus size={14} /> Crear Cerebro
                      </button>
                    </div>
                  </div>

                  {/* Red de Neuronas Conectadas */}
                  <div className="p-5 sm:p-6 rounded-3xl quantum-glass space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <Cpu size={18} className="morph-accent-text" />
                          <span>Neuronas Conectadas en la Cuenta ({presetsManager.neurons.length || 1})</span>
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Los cambios de presets y folders se sincronizan automáticamente entre todas tus neuronas online.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono morph-pill px-3 py-1 rounded-full">
                        {presetsManager.syncMessage || 'Listo'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(presetsManager.neurons.length > 0
                        ? presetsManager.neurons
                        : [
                            {
                              id: presetsManager.currentNeuron.id,
                              name: presetsManager.currentNeuron.name,
                              kind: presetsManager.currentNeuron.kind,
                              platform: presetsManager.currentNeuron.platform,
                              isOnline: presetsManager.isOnline,
                              isCurrentDevice: true,
                              lastSeenAt: new Date().toISOString(),
                            },
                          ]
                      ).map((neuron) => (
                        <div
                          key={neuron.id}
                          className="p-3.5 rounded-2xl bg-black/35 border border-white/10 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white truncate">{neuron.name}</span>
                              {neuron.isCurrentDevice && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full morph-pill font-bold">
                                  Esta neurona
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {neuron.platform || neuron.kind} ·{' '}
                              {neuron.lastSeenAt ? new Date(neuron.lastSeenAt).toLocaleString() : 'Activo ahora'}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              neuron.isOnline
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35'
                                : 'bg-white/10 text-slate-400 border border-white/10'
                            }`}
                          >
                            {neuron.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Formulario de Login / Registro */
                <form onSubmit={handleAuthSubmit} className="max-w-md mx-auto p-6 sm:p-8 rounded-3xl quantum-glass space-y-4">
                  <div className="text-center mb-3">
                    <div className="mx-auto mb-2.5 flex items-center justify-center gap-2.5">
                      <div className="w-12 h-12 starseed-app-squircle p-0.5 flex items-center justify-center">
                        <img
                          src="./starseed/app-icons/audiomorphic.png"
                          alt="Audiomorphic"
                          className="w-full h-full object-cover rounded-[20%]"
                        />
                      </div>
                      <ArrowRight size={14} className="text-cyan-300/80" />
                      <div className="w-14 h-14 rounded-2xl quantum-glass flex items-center justify-center p-1.5">
                        <StarSeedSymbol size="md" glow />
                      </div>
                    </div>
                    <h4 className="text-lg font-bold starseed-text-gradient">
                      {isRegistering ? 'Crear Cuenta StarSeed OS' : 'Entrar a tu Cuenta StarSeed'}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Inicia sesión con tu correo o @usuario para sincronizar cerebros, folders y neuronas.
                    </p>
                  </div>

                  {authNotice && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs">
                      {authNotice}
                    </div>
                  )}

                  {authError && (
                    <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs">
                      {authError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">
                        {isRegistering ? 'Correo Electrónico' : 'Usuario (@handle) o Correo Electrónico'}
                      </label>
                      <input
                        type={isRegistering ? 'email' : 'text'}
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder={isRegistering ? 'tu@correo.com' : '@usuario o tu@correo.com'}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Contraseña</label>
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
                    className="w-full py-3 rounded-xl morph-btn-primary font-extrabold text-xs uppercase tracking-wider disabled:opacity-50 mt-2 cursor-pointer"
                  >
                    {authLoading ? 'Conectando...' : isRegistering ? 'Registrarme' : 'Iniciar Sesión'}
                  </button>

                  <button
                    type="button"
                    onClick={() => openExternalUrl(STARSEED_OS_OFFICIAL_URL)}
                    className="w-full py-2.5 px-3 rounded-xl morph-btn-glass text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Globe size={13} className="morph-accent-text" />
                    <span>Crear o gestionar cuenta en starseed-os.vercel.app</span>
                    <ExternalLink size={12} />
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="text-xs morph-accent-text hover:underline cursor-pointer"
                    >
                      {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Crear una aquí'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 6: LIBRERÍA DE PRESETS (Catálogo Público, Recomendaciones y Comunidad) */}
          {activeTab === 'presets' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Notificación flotante de preset aplicado o instalado */}
              {appliedNotification && (
                <div className="bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 px-4 py-3 rounded-2xl text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-cyan-400 shrink-0" />
                    <span className="font-semibold">{appliedNotification}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onClose()}
                      className="px-3 py-1 bg-cyan-500/30 hover:bg-cyan-500/50 text-white rounded-lg text-[11px] font-bold transition-opacity cursor-pointer"
                    >
                      Ver en Pantalla
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppliedNotification(null)}
                      className="text-cyan-300 hover:text-white p-1 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {installSuccessMessage && (
                <div className="bg-purple-500/20 border border-purple-400/40 text-purple-200 px-4 py-3 rounded-2xl text-xs flex items-center justify-between animate-in fade-in duration-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  <div className="flex items-center gap-2.5">
                    <Check size={18} className="text-purple-400 shrink-0" />
                    <span className="font-semibold">{installSuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInstallSuccessMessage(null)}
                    className="text-purple-300 hover:text-white p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Modal para Guardar en la Biblioteca Personal del Usuario */}
              {installModalPreset && (
                <div className="p-4 rounded-2xl bg-black/80 border border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.2)] animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <FolderPlus className="w-5 h-5 text-purple-400" />
                      <h4 className="text-sm font-bold text-white">
                        Guardar en mi Biblioteca Personal
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInstallModalPreset(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-300 mb-3">
                    Estás guardando <strong className="text-white">"{installModalPreset.title}"</strong> en tu almacén personal para organizarlo en carpetas y listas.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <select
                      value={installTargetFolder}
                      onChange={(e) => setInstallTargetFolder(e.target.value)}
                      className="w-full sm:flex-1 bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-400"
                    >
                      <option value="">📁 Sin Carpeta (Raíz)</option>
                      {presetsManager.folders.map((f) => (
                        <option key={f} value={f}>
                          📁 {f}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={async () => {
                        await presetsManager.addPresetFromLibrary(
                          installModalPreset.title,
                          installModalPreset.params as any,
                          installTargetFolder,
                          installModalPreset.category
                        );
                        setInstallSuccessMessage(
                          `¡Preset "${installModalPreset.title}" guardado en tu Biblioteca Personal${installTargetFolder ? ` en "${installTargetFolder}"` : ''}!`
                        );
                        setInstallModalPreset(null);
                        setTimeout(() => setInstallSuccessMessage(null), 5000);
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-opacity shadow-[0_0_15px_rgba(168,85,247,0.4)] cursor-pointer shrink-0"
                    >
                      Confirmar y Guardar
                    </button>
                  </div>
                </div>
              )}

              {/* Cabecera de la Librería */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                    <div className="w-8 h-8 starseed-app-squircle p-0.5 flex items-center justify-center shrink-0">
                      <img
                        src="./starseed/app-icons/audiomorphic.png"
                        alt="Audiomorphic"
                        className="w-full h-full object-cover rounded-[20%]"
                      />
                    </div>
                    Librería Soberana de Presets
                  </h3>
                  <p className="text-xs text-gray-400">
                    Catálogo público oficial y comunitario. Aplica al instante, descubre listas de reproducción, califica de 1 a 5 estrellas y guarda en tu Biblioteca Personal.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => sync.syncWithCloud()}
                  disabled={sync.isSyncing}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-bold hover:bg-cyan-500/30 transition-opacity flex items-center gap-2 cursor-pointer"
                >
                  {sync.isSyncing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <StarSeedSymbol size="xs" />
                  )}
                  {sync.isSyncing ? 'Sincronizando...' : 'Sincronizar con StarSeed OS'}
                </button>
              </div>

              {/* Chips de Categorías */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar flex-nowrap">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'essentials', label: '✨ Audiomorphic Essentials' },
                  { id: 'genesis', label: 'Génesis Sagrado' },
                  { id: 'sacred', label: 'Resonancias Sagradas' },
                  { id: 'rhythmic', label: 'Ritmos Musicales' },
                  { id: 'harmonic', label: 'Armónicos' },
                  { id: 'drift', label: 'Deriva & Fluidez' },
                  { id: 'quantum', label: 'Cuántica & Dimensión' },
                  { id: 'community', label: 'Comunidad' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-opacity cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grid de Presets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {sync.allPresetsOrdered
                  .filter((p) => {
                    if (selectedCategory === 'all') return true;
                    if (selectedCategory === 'essentials') return p.category === 'essentials' || p.folderPath?.includes('Audiomorphic Essentials') || p.id?.startsWith('essential_');
                    if (selectedCategory === 'sacred') return p.category === 'genesis' || (p.params as any)?.sacredGeometryEnabled;
                    if (selectedCategory === 'rhythmic') return (p.params as any)?.autoRandomMode === 'rhythmic' || (p.params as any)?.autoRandomOnBeat;
                    return p.category === selectedCategory;
                  })
                  .map((preset) => {
                    const ratingData = community.getPresetRating(preset.id);
                    const recs = community.getPresetRecommendations(preset.id);
                    const comments = community.getPresetComments(preset.id);
                    const currentExpanded = expandedCardSection[preset.id] || 'none';

                    return (
                      <div
                        key={preset.id}
                        className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 transition-opacity flex flex-col justify-between space-y-4 min-w-0 overflow-hidden"
                      >
                        {/* Cabecera y descripción del preset */}
                        <div className="min-w-0">
                          <div className="flex justify-between items-start mb-1.5 gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-bold text-white tracking-wide break-words min-w-0 flex-1">
                              {preset.title}
                            </h4>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 border border-white/10 shrink-0">
                              {preset.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed break-words">
                            {preset.description}
                          </p>
                        </div>

                        {/* Calificación de la Comunidad (1-5 estrellas) */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs min-w-0">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="font-bold text-white">{ratingData.average.toFixed(1)}</span>
                            <span className="text-gray-400 text-[11px]">
                              ({ratingData.count} {ratingData.count === 1 ? 'voto' : 'votos'})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[11px] text-gray-400">Tu calificación:</span>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => community.ratePreset(preset.id, star)}
                                className={`p-0.5 hover:scale-125 transition-transform cursor-pointer ${
                                  (ratingData.userRating || 0) >= star
                                    ? 'text-amber-400'
                                    : 'text-gray-600 hover:text-amber-300'
                                }`}
                                title={`Calificar con ${star} estrellas`}
                              >
                                <Star size={14} className={((ratingData.userRating || 0) >= star) ? 'fill-amber-400' : ''} />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Botones de Acción Primarios: SOLO SELECCIONAR Y AGREGAR A CARPETA */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs min-w-0">
                          <span className="text-gray-400 font-mono text-[11px] truncate max-w-[120px]">
                            {preset.author.name}
                          </span>

                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            {onSelectLibraryPreset && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectLibraryPreset(preset);
                                  setAppliedNotification(`¡Preset "${preset.title}" seleccionado para tu espacio de trabajo!`);
                                  setTimeout(() => setAppliedNotification(null), 3500);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-cyan-600/25 border border-cyan-400/40 text-cyan-200 font-semibold hover:bg-cyan-600/40 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                                title="Seleccionar preset para trabajar u organizar"
                              >
                                <Check size={12} />
                                <span>Seleccionar</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setInstallModalPreset(preset);
                                setInstallTargetFolder(presetsManager.folders[0] || '');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-500/25 border border-purple-400/40 text-purple-200 font-semibold hover:bg-purple-500/40 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                              title="Guardar y organizar en tu Biblioteca Personal"
                            >
                              <FolderPlus size={12} />
                              <span>Agregar a carpeta</span>
                            </button>
                          </div>
                        </div>

                        {/* Pestañas secundarias de la tarjeta: Música y Comentarios */}
                        <div className="flex items-center gap-2 border-t border-white/5 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedCardSection((prev) => ({
                                ...prev,
                                [preset.id]: prev[preset.id] === 'music' ? 'none' : 'music',
                              }));
                            }}
                            className={`flex-1 py-1 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-opacity cursor-pointer ${
                              currentExpanded === 'music'
                                ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40'
                                : 'bg-white/5 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            <Headphones size={12} />
                            <span>Música Recomendada ({recs.length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setExpandedCardSection((prev) => ({
                                ...prev,
                                [preset.id]: prev[preset.id] === 'comments' ? 'none' : 'comments',
                              }));
                            }}
                            className={`flex-1 py-1 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-opacity cursor-pointer ${
                              currentExpanded === 'comments'
                                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/40'
                                : 'bg-white/5 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            <MessageSquare size={12} />
                            <span>Comentarios ({comments.length})</span>
                          </button>
                        </div>

                        {/* SUBSECCIÓN 1: MÚSICA RECOMENDADA DE LA COMUNIDAD */}
                        {currentExpanded === 'music' && (
                          <div className="p-3 bg-black/40 rounded-xl border border-indigo-500/20 space-y-3 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                <Music size={13} />
                                Playlists, Álbumes y Canciones
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowRecFormFor(showRecFormFor === preset.id ? null : preset.id)
                                }
                                className="text-[10px] font-bold text-indigo-300 hover:text-indigo-100 flex items-center gap-1 bg-indigo-500/20 px-2 py-0.5 rounded cursor-pointer"
                              >
                                <Plus size={11} />
                                <span>Recomendar Música</span>
                              </button>
                            </div>

                            {/* Formulario para agregar recomendación musical */}
                            {showRecFormFor === preset.id && (
                              <div className="p-3 bg-black/60 rounded-xl border border-indigo-400/30 space-y-2 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] font-bold text-white">
                                    Subir recomendación para este preset
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setShowRecFormFor(null)}
                                    className="text-gray-400 hover:text-white text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    value={recType}
                                    onChange={(e) => setRecType(e.target.value as MusicRecommendationType)}
                                    className="bg-black/80 border border-white/10 rounded px-2 py-1 text-[11px] text-white outline-none"
                                  >
                                    <option value="song">Canción / Track</option>
                                    <option value="album">Álbum</option>
                                    <option value="artist">Artista</option>
                                    <option value="playlist">Lista de Reproducción</option>
                                  </select>
                                  <div className="flex items-center gap-1 text-[11px] text-gray-300 justify-end">
                                    <span>Calificación:</span>
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => setRecRating(s)}
                                        className="text-amber-400"
                                      >
                                        <Star size={12} className={recRating >= s ? 'fill-amber-400' : ''} />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={recTitle}
                                    onChange={(e) => setRecTitle(e.target.value)}
                                    placeholder="Título de canción, álbum o playlist..."
                                    className="bg-black/80 border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={recArtist}
                                    onChange={(e) => setRecArtist(e.target.value)}
                                    placeholder="Artista o creador..."
                                    className="bg-black/80 border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 outline-none"
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={recUrl}
                                  onChange={(e) => setRecUrl(e.target.value)}
                                  placeholder="Enlace multimedia opcional (Spotify, YouTube, SoundCloud...)"
                                  className="w-full bg-black/80 border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 outline-none"
                                />
                                <input
                                  type="text"
                                  value={recDesc}
                                  onChange={(e) => setRecDesc(e.target.value)}
                                  placeholder="¿Por qué resuena con este preset? (notas de vibración, tempo, etc.)"
                                  className="w-full bg-black/80 border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 outline-none"
                                />
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!recTitle.trim() || !recArtist.trim()) {
                                        alert('Por favor introduce el título y el artista de la recomendación.');
                                        return;
                                      }
                                      community.addMusicRecommendation(preset.id, {
                                        type: recType,
                                        title: recTitle,
                                        artist: recArtist,
                                        mediaUrl: recUrl,
                                        description: recDesc,
                                        author: identity.displayName || 'Viajero Sónico',
                                        initialRating: recRating,
                                      });
                                      setRecTitle('');
                                      setRecArtist('');
                                      setRecUrl('');
                                      setRecDesc('');
                                      setShowRecFormFor(null);
                                    }}
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold cursor-pointer transition-opacity"
                                  >
                                    Publicar Recomendación
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Lista de recomendaciones musicales */}
                            {recs.length === 0 ? (
                              <p className="text-[11px] text-gray-500 text-center py-2">
                                Aún no hay música recomendada. ¡Sé el primero en compartir!
                              </p>
                            ) : (
                              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                                {recs.map((rec) => (
                                  <div
                                    key={rec.id}
                                    className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1.5"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                            {rec.type === 'song' ? 'Canción' :
                                             rec.type === 'album' ? 'Álbum' :
                                             rec.type === 'artist' ? 'Artista' : 'Playlist'}
                                          </span>
                                          <span className="text-xs font-bold text-white">{rec.title}</span>
                                          <span className="text-[11px] text-gray-400">— {rec.artist}</span>
                                        </div>
                                        {rec.description && (
                                          <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">
                                            {rec.description}
                                          </p>
                                        )}
                                      </div>

                                      {rec.mediaUrl ? (
                                        <a
                                          href={rec.mediaUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1 rounded bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                                          title="Abrir enlace de reproducción"
                                        >
                                          <ExternalLink size={10} />
                                          <span className="hidden xs:inline">Escuchar</span>
                                        </a>
                                      ) : (
                                        <span className="text-[9px] font-mono text-gray-500 shrink-0">
                                          Datos sonoros
                                        </span>
                                      )}
                                    </div>

                                    {/* Ranking de 5 estrellas para la recomendación */}
                                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                                      <span className="text-gray-400 font-mono text-[9px]">
                                        Por {rec.author}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <Star size={11} className="text-amber-400 fill-amber-400" />
                                        <span className="font-bold text-white">{rec.rating.toFixed(1)}</span>
                                        <span className="text-gray-400 text-[9px]">({rec.votesCount})</span>
                                        <div className="flex items-center gap-0.5 ml-1">
                                          {[1, 2, 3, 4, 5].map((s) => (
                                            <button
                                              key={s}
                                              type="button"
                                              onClick={() => community.rateRecommendation(preset.id, rec.id, s)}
                                              className={`cursor-pointer ${
                                                (rec.userVote || 0) >= s ? 'text-amber-400' : 'text-gray-600 hover:text-amber-300'
                                              }`}
                                              title={`Votar ${s} estrellas`}
                                            >
                                              <Star size={10} className={((rec.userVote || 0) >= s) ? 'fill-amber-400' : ''} />
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Comentarios de la recomendación musical */}
                                    <div className="pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setActiveRecComments(prev => ({ ...prev, [rec.id]: !prev[rec.id] }))}
                                        className="text-[10px] text-indigo-300 hover:text-indigo-100 flex items-center gap-1 cursor-pointer font-medium"
                                      >
                                        <MessageSquare size={10} />
                                        <span>Comentarios de la pista ({rec.comments?.length || 0})</span>
                                      </button>

                                      {activeRecComments[rec.id] && (
                                        <div className="mt-2 pl-2 border-l-2 border-indigo-500/30 space-y-1.5 animate-in fade-in">
                                          {rec.comments && rec.comments.length > 0 ? (
                                            rec.comments.map(c => (
                                              <div key={c.id} className="p-1.5 rounded bg-black/50 text-[10px]">
                                                <div className="flex items-center justify-between text-gray-400 text-[9px] mb-0.5">
                                                  <span className="font-bold text-gray-300">{c.author}</span>
                                                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-gray-300 leading-snug break-words">{c.text}</p>
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-[9px] text-gray-500">Sin notas aún sobre este audio. ¡Deja la primera!</p>
                                          )}
                                          <div className="flex gap-1 pt-1">
                                            <input
                                              type="text"
                                              value={recCommentInput[rec.id] || ''}
                                              onChange={(e) => setRecCommentInput(prev => ({ ...prev, [rec.id]: e.target.value }))}
                                              placeholder="Comentar esta pista..."
                                              className="flex-1 bg-black/70 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-indigo-400"
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' && recCommentInput[rec.id]?.trim()) {
                                                  community.addRecommendationComment(
                                                    preset.id,
                                                    rec.id,
                                                    identity.displayName || 'Viajero Sónico',
                                                    recCommentInput[rec.id]
                                                  );
                                                  setRecCommentInput(prev => ({ ...prev, [rec.id]: '' }));
                                                }
                                              }}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (!recCommentInput[rec.id]?.trim()) return;
                                                community.addRecommendationComment(
                                                  preset.id,
                                                  rec.id,
                                                  identity.displayName || 'Viajero Sónico',
                                                  recCommentInput[rec.id]
                                                );
                                                setRecCommentInput(prev => ({ ...prev, [rec.id]: '' }));
                                              }}
                                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                            >
                                              Enviar
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* SUBSECCIÓN 2: COMENTARIOS DEL PRESET */}
                        {currentExpanded === 'comments' && (
                          <div className="p-3 bg-black/40 rounded-xl border border-cyan-500/20 space-y-3 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                                <MessageSquare size={13} />
                                Comentarios de la Comunidad
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setCommentFormPresetId(commentFormPresetId === preset.id ? null : preset.id)
                                }
                                className="text-[10px] font-bold text-cyan-300 hover:text-cyan-100 flex items-center gap-1 bg-cyan-500/20 px-2 py-0.5 rounded cursor-pointer"
                              >
                                <Plus size={11} />
                                <span>Añadir Comentario</span>
                              </button>
                            </div>

                            {/* Formulario nuevo comentario */}
                            {commentFormPresetId === preset.id && (
                              <div className="p-3 bg-black/60 rounded-xl border border-cyan-400/30 space-y-2 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between">
                                  <input
                                    type="text"
                                    value={commentAuthor}
                                    onChange={(e) => setCommentAuthor(e.target.value)}
                                    placeholder={identity.displayName || 'Tu nombre o alias...'}
                                    className="bg-black/80 border border-white/10 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 outline-none flex-1 mr-2"
                                  />
                                  <div className="flex items-center gap-1 text-[11px] text-gray-300 shrink-0">
                                    <span>Voto:</span>
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => setCommentRating(s)}
                                        className="text-amber-400"
                                      >
                                        <Star size={12} className={commentRating >= s ? 'fill-amber-400' : ''} />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <textarea
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  placeholder="Escribe tu experiencia con este preset..."
                                  rows={2}
                                  className="w-full bg-black/80 border border-white/10 rounded p-2 text-[11px] text-white placeholder-gray-500 outline-none resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setCommentFormPresetId(null)}
                                    className="px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!commentText.trim()) return;
                                      community.addPresetComment(
                                        preset.id,
                                        commentAuthor || identity.displayName || 'Viajero Sónico',
                                        commentText,
                                        commentRating
                                      );
                                      setCommentText('');
                                      setCommentFormPresetId(null);
                                    }}
                                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-bold cursor-pointer"
                                  >
                                    Publicar Comentario
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Lista de comentarios */}
                            {comments.length === 0 ? (
                              <p className="text-[11px] text-gray-500 text-center py-2">
                                No hay comentarios aún. ¡Sé el primero en compartir tu experiencia!
                              </p>
                            ) : (
                              <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                                {comments.map((c) => (
                                  <div
                                    key={c.id}
                                    className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="font-bold text-gray-200">{c.author}</span>
                                      <div className="flex items-center gap-1">
                                        {c.rating && (
                                          <div className="flex text-amber-400">
                                            {Array.from({ length: c.rating }).map((_, i) => (
                                              <Star key={i} size={10} className="fill-amber-400" />
                                            ))}
                                          </div>
                                        )}
                                        <span className="text-gray-500 text-[9px] font-mono">
                                          {new Date(c.createdAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-gray-300 leading-relaxed">
                                      {c.text}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoHubModal;
