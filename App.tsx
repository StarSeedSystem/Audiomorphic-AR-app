import React, { useState, useEffect, useRef, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import VisualizerCanvas from './components/VisualizerCanvas';
import VisualizerVR from './components/VisualizerVR';
import { BackgroundLayer } from './components/BackgroundLayer';
import { AuthModal } from './components/AuthModal';
import { InfoHubModal, InfoHubTab } from './components/InfoHubModal';
import { LiveTransmissionHub, LiveHubTab } from './components/LiveTransmissionHub';
import LiveRoomOverlay from './components/LiveRoomOverlay';
import { HolographicCard4D } from './components/HolographicCard4D';
import { useStarSeedIdentity } from './hooks/useStarSeedIdentity';
import { useSubscription } from './hooks/useSubscription';
import { useStarSeedSync } from './hooks/useStarSeedSync';
import { useLiveTransmission } from './hooks/useLiveTransmission';
import { handleSpotifyOAuthCallback } from './lib/spotifyBridge';
import { getDesignById } from './lib/starseedCards';
import { VisualizerParams, DEFAULT_PARAMS, GeometryInfo, GeometryRegime, SacredGeometryMode, SubscriptionTier } from './types';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import { useAuth } from './contexts/AuthContext';
import ProfileMenu from './components/ProfileMenu';
import StarSeedSymbol from './components/StarSeedSymbol';
import { Zap, Activity, RotateCw, Star, Clock, Info, Heart, BrainCircuit, Radio } from 'lucide-react';
import { EMBED, getPresetParams, getSyntheticMetrics } from './utils/embedMode';
import { useChromaticMorph } from './hooks/useChromaticMorph';
import { useMenu3DTilt } from './hooks/useMenu3DTilt';
import { usePresets } from './hooks/usePresets';
import { sanitizeVisualizerParams, safeNumber } from './utils/sanitizeParams';

// --- TREATISE DATA: GENESIS & MUSIC ---
const GENESIS_STAGES = [
  { name: 'I. El Vacío (Singularidad)', V: 1, E: 0 },
  { name: 'II. Vesica Piscis (Luz)', V: 2, E: 1 },
  { name: 'III. Semilla de la Vida', V: 7, E: 12 },
  { name: 'IV. Huevo de la Vida (Cubo)', V: 8, E: 12 }, // Cubo
  { name: 'V. Flor de la Vida', V: 19, E: 36 },
  { name: 'VI. Fruto de la Vida', V: 13, E: 24 }, // Vector Equilibrium
  { name: 'VII. Cubo de Metatrón', V: 13, E: 78 }
];

// Additional Platonic definitions for advanced mappings (future use or high energy)
const PLATONIC_FORMS = [
  { name: 'Tetraedro (Fuego)', V: 4, E: 6 },
  { name: 'Octaedro (Aire)', V: 6, E: 12 },
  { name: 'Icosaedro (Agua)', V: 12, E: 30 },
  { name: 'Dodecaedro (Éter)', V: 20, E: 30 }
];

// Linear interpolation
const lerp = (start: number, end: number, amt: number) => (1 - amt) * start + amt * end;

// Angle interpolation (radians)
const lerpAngle = (start: number, end: number, amt: number) => {
  const d = end - start;
  const delta = (((d + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return start + delta * amt;
};

// Angle interpolation (degrees)
const lerpAngleDegrees = (start: number, end: number, amt: number) => {
  const d = end - start;
  const delta = (((d + 180) % 360) + 360) % 360 - 180;
  return start + delta * amt;
};

// --- MATH ENGINE: TREATISE ON HARMONIC UNIFICATION ---
const calculateHarmonicGeometry = (V: number, E: number): {
  alpha: number,
  beta: number,
  sigma: number,
  gamma: number,
  k: number,
  psi: number,
  regime: GeometryRegime
} => {
  // 1. INPUTS TOPOLOGICOS
  const alpha = V / 2;       // Variable Dual (Estructura)
  const beta = Math.sqrt(E); // Variable Potencial (Tensión)

  // 2. REGIMEN
  // Primario: Alpha >= Beta (Estabilidad)
  // Reciproco: Alpha < Beta (Tensión)
  // Void check
  if (V === 1 && E === 0) {
    return { alpha: 0.5, beta: 0, sigma: 1, gamma: 0, k: 1, psi: 0.05, regime: 'void' };
  }

  const regime: GeometryRegime = alpha >= beta ? 'primary' : 'reciprocal';

  // 3. TRIANGULO ARMONICO
  const c = Math.max(alpha, beta); // Hipotenusa
  const a = Math.min(alpha, beta); // Cateto Estructural
  // Cateto Base/Oculto: b = sqrt(c^2 - a^2)
  const b = Math.sqrt(Math.max(0, (c * c) - (a * a)));

  // 4. FACTORES DE RESPIRACION
  const sigma = c + b; // Expansión (Yang)
  const gamma = c - b; // Contracción (Yin)

  // 5. ECUACION DE LA ESPIRAL
  // k = Factor de Cierre. 
  // Treatise: k = Gamma / Sigma. 
  let k_raw = (sigma === 0) ? 1 : (gamma / sigma);

  // Special case for perfect equilibrium (Vesica, Square) where Gamma = Sigma (b=0) -> k=1
  if (b < 0.001) k_raw = 1.0;

  // VISUAL CORRECTION: 
  // Raw math values (e.g. 0.7) cause the spiral to collapse to zero in the fractal loop.
  // We map the "geometric tension" (deviation from 1) to a very subtle visual deviation
  // typically between 0.995 and 1.000, so the spiral remains full-screen.
  // The '0.004' factor ensures the geometry influences the shape without destroying visibility.
  const k = safeNumber(1.0 - (1.0 - k_raw) * 0.004, 1.0); 

  // Psi = Angulo de Giro = arccos(b/c)
  const ratio = c === 0 ? 1 : Math.max(-1, Math.min(1, b / c));
  const psi = (c === 0) ? 0 : safeNumber(Math.acos(ratio), 0);

  return { alpha: safeNumber(alpha, 0), beta: safeNumber(beta, 0), sigma: safeNumber(sigma, 1), gamma: safeNumber(gamma, 0), k, psi, regime };
};


const App: React.FC = () => {
  const { user, userData, updateSubscription, login, setAuthModalOpen, logout, loginWithGoogle } = useAuth();

  // Load initial params from localStorage if available, otherwise use DEFAULT_PARAMS
  const [params, setParams] = useState<VisualizerParams>(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('audiomorphic_params');
    } catch {
      saved = null;
    }
    let initialParams = sanitizeVisualizerParams(null, DEFAULT_PARAMS);

    if (saved) {
      try {
        initialParams = sanitizeVisualizerParams(JSON.parse(saved), DEFAULT_PARAMS);
        try {
          localStorage.setItem('audiomorphic_params', JSON.stringify(initialParams));
        } catch {
          /* ignore storage quota errors */
        }
      } catch (e) {
        initialParams = sanitizeVisualizerParams(null, DEFAULT_PARAMS);
      }
    }

    // Si es móvil, forzar micrófono por defecto (sobre-escribe localStorage)
    if (isMobile) {
      initialParams.audioSource = 'microphone';
    }

    // --- StarSeed OS embed overrides (additive, opt-in via URL params) ---
    if (EMBED.active) {
      const presetParams = getPresetParams(EMBED.preset);
      if (presetParams) {
        initialParams = sanitizeVisualizerParams(presetParams, initialParams);
      }
      // autostart / bg both imply the visualizer must run on its own.
      if (EMBED.autostart || EMBED.bg) {
        initialParams.autoPilot = true;
      }
      if (EMBED.bg) {
        // Background mode: never show the floating status pills.
        initialParams.showIndicators = false;
      }
    }

    return initialParams;
  });

  const [showSubscription, setShowSubscription] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [portableCardParam, setPortableCardParam] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('card');
    }
    return null;
  });
  const paramsRef = useRef<VisualizerParams>(params);

  // Integración viva StarSeed OS: identidad, cerebros, neuronas, donaciones y presets
  const identity = useStarSeedIdentity();
  const presetsStore = usePresets();
  const sync = useStarSeedSync(identity.user?.id || user?.id || null);
  const subscription = useSubscription(identity.isLoggedIn, sync.addThankYouCard);

  const [infoHubOpen, setInfoHubOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      return sp.has('info') || window.location.hash.includes('donar') || window.location.hash.includes('info') || window.location.hash.includes('descarg') || window.location.hash.includes('update');
    }
    return false;
  });
  const [infoHubTab, setInfoHubTab] = useState<InfoHubTab>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const val = sp.get('info');
      if (val === 'donations' || val === 'guide' || val === 'updates' || val === 'ecosystem' || val === 'account' || val === 'presets') {
        return val as InfoHubTab;
      }
      if (window.location.hash.includes('info')) return 'guide';
      if (window.location.hash.includes('descarg') || window.location.hash.includes('update')) return 'updates';
    }
    return 'donations';
  });

  const [selectedLibraryPresetForFolder, setSelectedLibraryPresetForFolder] = useState<any | null>(null);
  const [liveHubOpen, setLiveHubOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      return sp.get('info') === 'live' || window.location.hash === '#envivo' || window.location.hash === '#transmisiones';
    }
    return false;
  });
  const [liveHubTab, setLiveHubTab] = useState<LiveHubTab>('discover');

  const handleOpenLive = useCallback((tab: LiveHubTab = 'discover') => {
    setLiveHubTab(tab);
    setLiveHubOpen(true);
  }, []);

  const handleOpenInfo = useCallback((tab: InfoHubTab = 'donations') => {
    setInfoHubTab(tab);
    setInfoHubOpen(true);
  }, []);

  useEffect(() => {
    void handleSpotifyOAuthCallback();
  }, []);

  // Listen to URL query params (?info=donations, ?info=guide, ?info=updates) and hash (#donar, #info, #descargas)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const info = sp.get('info');
    if (info === 'live') {
      handleOpenLive('discover');
    } else if (info === 'donations' || info === 'guide' || info === 'updates' || info === 'ecosystem' || info === 'account' || info === 'presets') {
      handleOpenInfo(info as InfoHubTab);
    } else if (window.location.hash === '#envivo' || window.location.hash === '#transmisiones') {
      handleOpenLive('discover');
    } else if (window.location.hash === '#donar' || window.location.hash === '#donaciones' || window.location.hash === '#aportes') {
      handleOpenInfo('donations');
    } else if (window.location.hash === '#descargas' || window.location.hash === '#descargar' || window.location.hash === '#updates' || window.location.hash === '#versiones') {
      handleOpenInfo('updates');
    } else if (window.location.hash === '#info' || window.location.hash === '#about' || window.location.hash === '#ciencia') {
      handleOpenInfo('guide');
    }
  }, [handleOpenInfo, handleOpenLive]);

  // ── AUDIOMORPHIC ES LIBRE Y COMPLETO ───────────────────────────────────────
  // Decision del autor (Alex Bordon Garrigos, 2026-07-13): la app deja de tener
  // planes. TODAS las funciones (Deriva, modos de aleatorizacion, Genesis,
  // geometria sagrada, VR/AR, presets...) quedan abiertas para todo el mundo,
  // con o sin cuenta. No hay muro de acceso, ni prueba, ni corona.
  //
  // Antes esto dependia de `userData.subscriptionTier` (Stripe/Supabase) y solo
  // se desbloqueaba dentro del StarSeed OS (?starseed_os, iframe, referrer).
  // Ahora el desbloqueo es universal: la web oficial ES la version completa.
  //
  // La cuenta sigue existiendo, pero es OPCIONAL: solo sirve para guardar los
  // presets en la nube (sin ella, se guardan en el propio dispositivo).
  const subscriptionTier: SubscriptionTier = 'lifetime';
  const trialEndTime: number | null = null;

  // (Se han eliminado la cuenta atras de la prueba y su expiracion: ya no hay
  // planes. La app entera esta abierta desde el primer segundo.)
  // Sync params to paramsRef and debounce localStorage persistence (avoids 60Hz JSON writes)
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('audiomorphic_params', JSON.stringify(sanitizeVisualizerParams(paramsRef.current)));
      } catch {
        /* ignore storage quota errors */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [params]);

  useEffect(() => {
    const flushParams = () => {
      try {
        localStorage.setItem('audiomorphic_params', JSON.stringify(sanitizeVisualizerParams(paramsRef.current)));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('pagehide', flushParams);
    return () => window.removeEventListener('pagehide', flushParams);
  }, []);

  const handleSubscribe = async (tier: SubscriptionTier, trialDurationMs?: number) => {
    handleOpenInfo('donations');
  };
  const audioAnalyzer = useAudioAnalyzer();
  const {
    isActive,
    error,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    outputDevices,
    selectedOutputDeviceId,
    setAudioOutputDevice,
    startAudio,
    stopAudio,
    getAudioMetrics
  } = audioAnalyzer;

  const live = useLiveTransmission({
    params,
    setParams,
    paramsRef,
    identity,
    sync,
    audioAnalyzer,
  });

  // --- EMBED: autonomous fallback metrics ---
  // In StarSeed OS background mode the visualizer must ALWAYS move, even when
  // there is no microphone signal. When embedded and audio is not active, we
  // feed the canvas synthetic, time-based metrics so geometry keeps breathing.
  // Outside embed mode this is a no-op passthrough (identical to before).
  const getVisualMetrics = useCallback(
    (sensitivity: number, freqRange: number) => {
      if (EMBED.active && !isActive) {
        return getSyntheticMetrics(1);
      }
      return getAudioMetrics(sensitivity, freqRange);
    },
    [getAudioMetrics, isActive]
  );

  // Motor cromático vivo (reactivo al sonido y tono visual -> CSS vars globales)
  useChromaticMorph(getVisualMetrics, isActive, params.baseHue, params.sensitivity, params.freqRange);

  // --- EMBED: auto-start microphone (?mic=1) ---
  // Tries to capture the mic once on mount. If the browser/iframe denies it,
  // the synthetic fallback above keeps the background animated anyway.
  const micRequestedRef = useRef(false);
  useEffect(() => {
    if (!EMBED.mic || micRequestedRef.current) return;
    micRequestedRef.current = true;
    // Fire-and-forget; startAudio handles its own errors internally.
    Promise.resolve(startAudio('microphone')).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- EMBED: auto-start camera background (?cam=1) ---
  // Renders the camera feed as a full-screen, non-interactive texture behind
  // the visualizer (AR-style). Silently ignored if the camera is unavailable.
  const camVideoRef = useRef<HTMLVideoElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const [camActive, setCamActive] = useState(false);
  useEffect(() => {
    if (!EMBED.cam) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        camStreamRef.current = stream;
        if (camVideoRef.current) {
          camVideoRef.current.srcObject = stream;
          await camVideoRef.current.play().catch(() => { });
        }
        setCamActive(true);
      } catch (e) {
        // Camera denied / unavailable -> ignore, visualizer still renders.
      }
    })();
    return () => {
      cancelled = true;
      if (camStreamRef.current) {
        camStreamRef.current.getTracks().forEach((t) => t.stop());
        camStreamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [showTouchHint, setShowTouchHint] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsVisibleRef = useRef(false);
  controlsVisibleRef.current = controlsVisible;
  const menuInteractingRef = useRef(false);
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuHoveredRef = useRef(false);
  const lastUiSyncTimeRef = useRef(0);

  const menuTilt = useMenu3DTilt({ maxDeg: 2.6, maxTranslatePx: 5, autoGyro: true });
  const { setInteractionPaused } = menuTilt;

  const setMenuInteracting = useCallback(
    (active: boolean) => {
      menuInteractingRef.current = active;
      setInteractionPaused(active);
      if (interactionTimerRef.current) {
        clearTimeout(interactionTimerRef.current);
        interactionTimerRef.current = null;
      }
      if (active) {
        interactionTimerRef.current = setTimeout(() => {
          menuInteractingRef.current = false;
          setInteractionPaused(false);
        }, 3000);
      }
    },
    [setInteractionPaused]
  );

  useEffect(() => {
    const release = () => {
      if (menuInteractingRef.current) setMenuInteracting(false);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
    };
  }, [setMenuInteracting]);

  const handleCloseControls = useCallback(() => setControlsVisible(false), []);
  const handleOpenDonations = useCallback(() => handleOpenInfo('donations'), [handleOpenInfo]);

  const resetHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    const closeSec =
      Number.isFinite(paramsRef.current.menuAutoCloseTime) && paramsRef.current.menuAutoCloseTime > 0
        ? paramsRef.current.menuAutoCloseTime
        : 25;
    hideTimeoutRef.current = setTimeout(() => {
      if (menuHoveredRef.current || menuInteractingRef.current) {
        resetHideTimer();
        return;
      }
      setControlsVisible(false);
    }, closeSec * 1000);
  }, []);

  useEffect(() => {
    if (controlsVisible) {
      setShowTouchHint((prev) => (prev ? false : prev));
      if (paramsRef.current.autoPilot) {
        setParams({ ...paramsRef.current });
      }
      resetHideTimer();
    } else {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      menuHoveredRef.current = false;
      setMenuInteracting(false);
    }
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [controlsVisible, resetHideTimer, setMenuInteracting]);

  // Logic Refs
  const animationFrameRef = useRef<number>(0);

  // --- PILOT STATE ---
  const pilotRef = useRef({
    targetK: DEFAULT_PARAMS.k,
    targetPsi: DEFAULT_PARAMS.psi,
    targetZ0_r: DEFAULT_PARAMS.z0_r,
    targetZ0_i: DEFAULT_PARAMS.z0_i,
    targetHue: params.baseHue,
    targetZoom: DEFAULT_PARAMS.zoom,
    targetDistanceZoom: DEFAULT_PARAMS.distanceZoom,
    targetSpiralThickness: DEFAULT_PARAMS.spiralThickness,
    lastSetK: DEFAULT_PARAMS.k,
    lastSetPsi: DEFAULT_PARAMS.psi,
    lastSetZ0_r: DEFAULT_PARAMS.z0_r,
    lastSetZ0_i: DEFAULT_PARAMS.z0_i,
    lastSetBaseHue: params.baseHue,
    lastSetZoom: DEFAULT_PARAMS.zoom,
    lastSetDistanceZoom: DEFAULT_PARAMS.distanceZoom,
    lastSetSpiralThickness: DEFAULT_PARAMS.spiralThickness,
    lastEmittedK: DEFAULT_PARAMS.k,
    lastEmittedPsi: DEFAULT_PARAMS.psi,
    lastEmittedZ0_r: DEFAULT_PARAMS.z0_r,
    lastEmittedZ0_i: DEFAULT_PARAMS.z0_i,
    lastEmittedBaseHue: params.baseHue,
    lastEmittedZoom: DEFAULT_PARAMS.zoom,
    lastEmittedDistanceZoom: DEFAULT_PARAMS.distanceZoom,
    lastEmittedSpiralThickness: DEFAULT_PARAMS.spiralThickness,
    lastBeatTime: 0,
    lastModeUpdateTime: 0,
    currentParams: { ...DEFAULT_PARAMS },
    genesisTargetStage: 0,
    sgModesUpdatedThisFrame: false
  });

  const toggleAudio = () => {
    if (isActive) {
      stopAudio();
    } else {
      startAudio(params.audioSource);
    }
  };

  // Handle Apply Preset (Robust Normalization & Instant Pilot Sync)
  const handleApplyPreset = (preset: any) => {
    try {
      const raw = preset?.params || preset?.params_json || preset;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : { ...raw };
      if (parsed && typeof parsed === 'object') {
        // Normalizar compatibilidad con modos de geometría sagrada
        if ((parsed as any).sgResonanceModes && !parsed.sacredGeometryModes) {
          parsed.sacredGeometryModes = (parsed as any).sgResonanceModes;
        }
        if (parsed.sacredGeometryModes && parsed.sacredGeometryModes.length > 0) {
          parsed.sacredGeometryEnabled = true;
        }
        if (parsed.autoPilotMode === 'genesis') {
          parsed.sacredGeometryEnabled = true;
        }

        // Sincronizar inmediatamente los objetivos del piloto automático para evitar desfase o retención
        if (pilotRef.current) {
          const p = pilotRef.current;
          if (typeof parsed.k === 'number' && Number.isFinite(parsed.k)) { p.targetK = parsed.k; p.currentParams.k = parsed.k; p.lastEmittedK = parsed.k; p.lastSetK = parsed.k; }
          if (typeof parsed.psi === 'number' && Number.isFinite(parsed.psi)) { p.targetPsi = parsed.psi; p.currentParams.psi = parsed.psi; p.lastEmittedPsi = parsed.psi; p.lastSetPsi = parsed.psi; }
          if (typeof parsed.zoom === 'number' && Number.isFinite(parsed.zoom)) { p.targetZoom = parsed.zoom; p.currentParams.zoom = parsed.zoom; p.lastEmittedZoom = parsed.zoom; p.lastSetZoom = parsed.zoom; }
          if (typeof parsed.distanceZoom === 'number' && Number.isFinite(parsed.distanceZoom)) { p.targetDistanceZoom = parsed.distanceZoom; p.currentParams.distanceZoom = parsed.distanceZoom; p.lastEmittedDistanceZoom = parsed.distanceZoom; p.lastSetDistanceZoom = parsed.distanceZoom; }
          if (typeof parsed.baseHue === 'number' && Number.isFinite(parsed.baseHue)) { p.targetHue = parsed.baseHue; p.currentParams.baseHue = parsed.baseHue; p.lastEmittedBaseHue = parsed.baseHue; p.lastSetBaseHue = parsed.baseHue; }
          if (typeof parsed.z0_r === 'number' && Number.isFinite(parsed.z0_r)) { p.targetZ0_r = parsed.z0_r; p.currentParams.z0_r = parsed.z0_r; p.lastEmittedZ0_r = parsed.z0_r; p.lastSetZ0_r = parsed.z0_r; }
          if (typeof parsed.z0_i === 'number' && Number.isFinite(parsed.z0_i)) { p.targetZ0_i = parsed.z0_i; p.currentParams.z0_i = parsed.z0_i; p.lastEmittedZ0_i = parsed.z0_i; p.lastSetZ0_i = parsed.z0_i; }
          if (typeof parsed.spiralThickness === 'number' && Number.isFinite(parsed.spiralThickness)) { p.targetSpiralThickness = parsed.spiralThickness; p.currentParams.spiralThickness = parsed.spiralThickness; p.lastEmittedSpiralThickness = parsed.spiralThickness; p.lastSetSpiralThickness = parsed.spiralThickness; }
        }

        setParams(prev => sanitizeVisualizerParams(parsed, prev));
      }
    } catch (e) {
      console.error('Error al aplicar preset:', e);
    }
  };

  // Restart audio if source changes while active

  // --- AUTO PILOT ENGINE ---
  useEffect(() => {
    if (!params.autoPilot) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const updateLoop = () => {
      const currentParams = paramsRef.current;
      if (!currentParams.autoPilot) return;

      // Factor de escala dinámico para móviles (Normalización de proporciones)
      const minDim = Math.min(window.innerWidth, window.innerHeight);
      const isMobile = minDim < 640;
      const scaleFactor = isMobile ? (minDim / 800) : 1.0; // Normalizado contra 800px

      const { volume, frequency, bass, mid, treble } = getAudioMetrics(currentParams.sensitivity, currentParams.freqRange);
      const now = Date.now();
      const p = pilotRef.current;

      let geometryData: GeometryInfo | undefined;
      const isLocked = (key: keyof VisualizerParams) => currentParams.lockedParams?.includes(key);

      // --- STATE SYNCHRONIZATION ---
      // 1. Detect user manual slider drag (if currentParams differs from what we emitted last frame)
      if (Math.abs(currentParams.k - p.lastEmittedK) > 0.001) {
        p.targetK = currentParams.k;
        p.currentParams.k = currentParams.k;
      }
      if (Math.abs(currentParams.psi - p.lastEmittedPsi) > 0.001) {
        p.targetPsi = currentParams.psi;
        p.currentParams.psi = currentParams.psi;
      }
      if (Math.abs(currentParams.z0_r - p.lastEmittedZ0_r) > 0.001) {
        p.targetZ0_r = currentParams.z0_r;
        p.currentParams.z0_r = currentParams.z0_r;
      }
      if (Math.abs(currentParams.z0_i - p.lastEmittedZ0_i) > 0.001) {
        p.targetZ0_i = currentParams.z0_i;
        p.currentParams.z0_i = currentParams.z0_i;
      }
      if (Math.abs(currentParams.baseHue - p.lastEmittedBaseHue) > 0.001) {
        p.targetHue = currentParams.baseHue;
        p.currentParams.baseHue = currentParams.baseHue;
      }
      if (Math.abs(currentParams.zoom - p.lastEmittedZoom) > 0.001) {
        p.targetZoom = currentParams.zoom;
        p.currentParams.zoom = currentParams.zoom;
      }
      if (Math.abs(currentParams.distanceZoom - p.lastEmittedDistanceZoom) > 0.001) {
        p.targetDistanceZoom = currentParams.distanceZoom;
        p.currentParams.distanceZoom = currentParams.distanceZoom;
      }
      if (Math.abs(currentParams.spiralThickness - p.lastEmittedSpiralThickness) > 0.001) {
        p.targetSpiralThickness = currentParams.spiralThickness;
        p.currentParams.spiralThickness = currentParams.spiralThickness;
      }

      // 2. Detect ControlPanel target updates
      if (currentParams.targetK !== undefined && currentParams.targetK !== p.lastSetK) {
        p.targetK = currentParams.targetK;
        p.lastSetK = currentParams.targetK;
      }
      if (currentParams.targetPsi !== undefined && currentParams.targetPsi !== p.lastSetPsi) {
        p.targetPsi = currentParams.targetPsi;
        p.lastSetPsi = currentParams.targetPsi;
      }
      if (currentParams.targetZ0_r !== undefined && currentParams.targetZ0_r !== p.lastSetZ0_r) {
        p.targetZ0_r = currentParams.targetZ0_r;
        p.lastSetZ0_r = currentParams.targetZ0_r;
      }
      if (currentParams.targetZ0_i !== undefined && currentParams.targetZ0_i !== p.lastSetZ0_i) {
        p.targetZ0_i = currentParams.targetZ0_i;
        p.lastSetZ0_i = currentParams.targetZ0_i;
      }
      if (currentParams.targetBaseHue !== undefined && currentParams.targetBaseHue !== p.lastSetBaseHue) {
        p.targetHue = currentParams.targetBaseHue;
        p.lastSetBaseHue = currentParams.targetBaseHue;
      }
      if (currentParams.targetZoom !== undefined && currentParams.targetZoom !== p.lastSetZoom) {
        p.targetZoom = currentParams.targetZoom;
        p.lastSetZoom = currentParams.targetZoom;
      }
      if (currentParams.targetDistanceZoom !== undefined && currentParams.targetDistanceZoom !== p.lastSetDistanceZoom) {
        p.targetDistanceZoom = currentParams.targetDistanceZoom;
        p.lastSetDistanceZoom = currentParams.targetDistanceZoom;
      }
      if (currentParams.targetSpiralThickness !== undefined && currentParams.targetSpiralThickness !== p.lastSetSpiralThickness) {
        p.targetSpiralThickness = currentParams.targetSpiralThickness;
        p.lastSetSpiralThickness = currentParams.targetSpiralThickness;
      }

      // --- AUDIO REACTIVE DRIFT & PULSES ---
      let pulseK = 0;
      let pulsePsi = 0;
      let pulseZ0_r = 0;
      let pulseZ0_i = 0;
      let pulseHue = 0;
      let pulseZoom = 0;
      let pulseDistanceZoom = 0;
      let pulseSpiralThickness = 0;

      const applyModeLocks = (autoSelected: string[], current: string[], prefix: string) => {
        const result = new Set<string>();
        for (const mode of autoSelected) {
          if (!isLocked(`${prefix}_${mode}` as any)) result.add(mode);
        }
        for (const mode of current) {
          if (isLocked(`${prefix}_${mode}` as any)) result.add(mode);
        }
        return Array.from(result);
      };

      // --- GENESIS MODE (Treatise Implementation) ---
      if (currentParams.autoPilotMode === 'genesis') {

        // 1. Determine Stage based on Energy
        const emotionSens = currentParams.autoEmotionSensitivity ?? 0.5;
        const energy = (volume + (bass * 0.3) + (mid * 0.2) + (treble * 0.1)) * (0.5 + emotionSens);

        let stageIdx = 0;
        if (energy < 0.05) stageIdx = 0;      // Void
        else if (energy < 0.15) stageIdx = 1; // Vesica
        else if (energy < 0.30) stageIdx = 2; // Seed
        else if (energy < 0.45) stageIdx = 3; // Egg (Cube)
        else if (energy < 0.60) stageIdx = 4; // Flower
        else if (energy < 0.75) stageIdx = 5; // Fruit
        else stageIdx = 6;                    // Metatron (Max complexity)

        if (Math.abs(stageIdx - p.genesisTargetStage) > 0.1) {
          p.genesisTargetStage = stageIdx;
        }

        const currentStage = GENESIS_STAGES[p.genesisTargetStage];
        const math = calculateHarmonicGeometry(currentStage.V, currentStage.E);

        // Audio reactivity modulates the strict math slightly (Breathing)
        const breathing = 1.0 + (volume * 0.015 * (emotionSens * 2));

        p.targetPsi = math.psi;
        p.targetK = math.k * breathing;
        p.targetZ0_r = 0;
        p.targetZ0_i = 0;

        if (math.regime === 'primary') {
          p.targetHue = 200 - (p.genesisTargetStage * 10); // Cool colors
        } else if (math.regime === 'reciprocal') {
          p.targetHue = 0 + (p.genesisTargetStage * 5); // Warm/Hot colors
        } else {
          p.targetHue = 240; // Void = Dark Blue
        }

        geometryData = {
          V: currentStage.V,
          E: currentStage.E,
          alpha: math.alpha,
          beta: math.beta,
          regime: math.regime,
          name: currentStage.name
        };

        pulseZoom += (volume * 0.0002);
        pulseDistanceZoom += (volume * 0.05 * scaleFactor);
        pulseSpiralThickness += (bass * 0.04 * scaleFactor); // Reducido para evitar el "grosor excesivo"
        pulseK += (bass * 0.005);
        pulseZ0_r += (Math.random() > 0.5 ? 1 : -1) * (mid * 0.01);
        pulseZ0_i += (Math.random() > 0.5 ? 1 : -1) * (treble * 0.01);
        pulsePsi += (mid * 0.0005) * (currentParams.autoSpeed ?? 1.0);
        pulseHue += (volume * 0.5) * (currentParams.autoSpeed ?? 1.0);
      }
      // --- HARMONIC MODE (Musical Geometry) ---
      else if (currentParams.autoPilotMode === 'harmonic') {
        const emotionSens = currentParams.autoEmotionSensitivity ?? 0.5;
        const rawNote = Math.floor(frequency * 36);
        const noteIndex = rawNote % 12;
        const interval = Math.abs(noteIndex - currentParams.rootNote) % 12;

        let V = 1, E = 0, name = "Unison";
        switch (interval) {
          case 6: V = 2; E = 1; name = "Tritono"; break;
          case 4: V = 3; E = 3; name = "Aumentada"; break;
          case 3: V = 4; E = 4; name = "Disminuida"; break;
          case 2: V = 6; E = 6; name = "Tonos Enteros"; break;
          case 7: V = 7; E = 7; name = "Escala Mayor"; break;
          default: V = 12; E = 12; name = "Cromática"; break;
        }

        const math = calculateHarmonicGeometry(V, E);
        const breathing = 1.0 + (volume * 0.012 * (emotionSens * 2));

        p.targetPsi = math.psi;
        p.targetK = math.k * breathing;
        p.targetHue = (noteIndex * 30) % 360;
        p.targetZ0_r = 0;
        p.targetZ0_i = 0;

        geometryData = {
          V, E, alpha: math.alpha, beta: math.beta, regime: math.regime, name
        };

        pulseZoom += (volume * 0.0002);
        pulseDistanceZoom += (volume * 0.05 * scaleFactor);
        pulseSpiralThickness += (bass * 0.04 * scaleFactor);
        pulseK += (bass * 0.005);
        pulseZ0_r += (Math.random() > 0.5 ? 1 : -1) * (mid * 0.01);
        pulseZ0_i += (Math.random() > 0.5 ? 1 : -1) * (treble * 0.01);
        pulsePsi += (mid * 0.0005) * (currentParams.autoSpeed ?? 1.0);
        pulseHue += (volume * 0.5) * (currentParams.autoSpeed ?? 1.0);
      }
      // --- DRIFT & ADVANCED RANDOM MODES ---
      else {
        const emotionSens = currentParams.autoRelationshipMode === 'empathetic' ? (currentParams.autoEmotionSensitivity ?? 0.5) : 0.5;
        const fluidity = currentParams.autoRelationshipMode === 'empathetic' ? (currentParams.autoStyleFluidity ?? 0.5) : 0.5;
        const speed = currentParams.autoSpeed ?? 1.0;

        // Time Delay
        let beatCooldown = 0;
        if (currentParams.autoTimeDelayMode === 'custom') {
          beatCooldown = currentParams.autoTimeDelay * 1000;
        } else if (currentParams.autoTimeDelayMode === 'smart') {
          beatCooldown = (3000 - (fluidity * 2000)) / Math.max(0.1, speed);
        }

        // Mode-specific continuous audio reactivity
        if (currentParams.autoRandomMode === 'sacred') {
          const isHarmonic = mid > 0.4 && treble < 0.8 && volume > 0.2;
          const isDeepResonance = bass > 0.6 && volume > 0.4;

          if ((isHarmonic || isDeepResonance) && (now - p.lastBeatTime > beatCooldown)) {
            p.lastBeatTime = now;
            p.targetPsi += (Math.PI / 4) * (isDeepResonance ? 0.5 : 1.0);
            p.targetK += (Math.random() - 0.5) * 0.01 * emotionSens;
            p.targetZoom += (Math.random() - 0.5) * 0.001 * emotionSens;
            p.targetDistanceZoom += (Math.random() - 0.5) * 0.5 * emotionSens;
            p.targetSpiralThickness += (Math.random() - 0.5) * 0.2 * emotionSens;
          }
          pulsePsi += (mid * 0.0002 * (0.5 + emotionSens)) * speed;
          pulseHue += (0.1 + fluidity * 0.2) * speed;
          pulseZoom += (volume * 0.0002);
          pulseDistanceZoom += (volume * 0.05);
          pulseSpiralThickness += (bass * 0.05);
          pulseK += (bass * 0.003);
          pulseZ0_r += (Math.random() > 0.5 ? 1 : -1) * (mid * 0.005);
          pulseZ0_i += (Math.random() > 0.5 ? 1 : -1) * (treble * 0.005);
        }
        else if (currentParams.autoRandomMode === 'rhythmic') {
          const isBeat = bass > 0.6;
          const isSnare = treble > 0.6 && mid > 0.5;

          if ((isBeat || isSnare) && (now - p.lastBeatTime > beatCooldown)) {
            p.lastBeatTime = now;
            p.targetPsi += (Math.PI / 2) * (isBeat ? 1 : -1);
            p.targetK += (Math.random() > 0.5 ? 1 : -1) * (volume * 0.04);
            p.targetZoom += (Math.random() > 0.5 ? 1 : -1) * (volume * 0.0015);
            p.targetDistanceZoom += (Math.random() > 0.5 ? 1 : -1) * (volume * 0.8);
            p.targetSpiralThickness += (Math.random() > 0.5 ? 1 : -1) * (volume * 0.5);
            if (isSnare) {
              p.targetZ0_r += (Math.random() - 0.5) * 0.5 * emotionSens;
              p.targetZ0_i += (Math.random() - 0.5) * 0.5 * emotionSens;
            }
          }
          pulsePsi += (mid * 0.002) * speed;
          pulseHue += (volume * 3.0) * speed;
          pulseZoom += (volume * 0.0005);
          pulseDistanceZoom += (volume * 0.1);
          pulseSpiralThickness += (bass * 0.1);
          pulseK += (bass * 0.01);
          pulseZ0_r += (Math.random() > 0.5 ? 1 : -1) * (mid * 0.02);
          pulseZ0_i += (Math.random() > 0.5 ? 1 : -1) * (treble * 0.02);
        }
        else {
          // Default/Smart/DJ/Rainbow/Astral/Drift
          const isBeat = currentParams.autoRelationshipMode === 'empathetic'
            ? bass > (0.6 - (emotionSens * 0.4)) || volume > (0.7 - (emotionSens * 0.3))
            : bass > 0.6 || volume > 0.7;

          if (isBeat && (now - p.lastBeatTime > beatCooldown)) {
            p.lastBeatTime = now;
            p.targetPsi += (Math.random() * Math.PI * 0.5);
            p.targetZoom += (Math.random() * 0.002 - 0.001) * emotionSens;
            p.targetDistanceZoom += (Math.random() * 1.0 - 0.5) * emotionSens;
            p.targetSpiralThickness += (Math.random() * 0.5 - 0.25) * emotionSens;

            if (currentParams.autoRelationshipMode === 'technical') {
              p.targetK += (Math.random() > 0.5 ? 1 : -1) * (volume * 0.02);
              p.targetZ0_r += (Math.random() > 0.5 ? 1 : -1) * (frequency * 0.2);
              p.targetZ0_i += (Math.random() > 0.5 ? 1 : -1) * (volume * 0.2);
            } else {
              if (Math.random() < fluidity) {
                p.targetK += (Math.random() * 0.02 - 0.01) * emotionSens;
              }
              if (Math.random() < fluidity * 0.5) {
                p.targetZ0_r += (Math.random() * 0.2 - 0.1) * emotionSens;
                p.targetZ0_i += (Math.random() * 0.2 - 0.1) * emotionSens;
              }
            }
          }

          if (currentParams.autoRelationshipMode === 'technical') {
            pulsePsi += (mid * 0.001) * speed;
            pulseHue += (volume * 2.0) * speed;
            pulseZoom += (volume * 0.0005);
            pulseDistanceZoom += (volume * 0.1);
            pulseSpiralThickness += (bass * 0.05);
            pulseK += (bass * 0.005);
            pulseZ0_r += (Math.random() > 0.5 ? 1 : -1) * (mid * 0.01);
            pulseZ0_i += (Math.random() > 0.5 ? 1 : -1) * (treble * 0.01);
          } else {
            pulsePsi += (mid * 0.0005 * (0.5 + emotionSens)) * speed;
            pulseHue += (0.2 + fluidity * 0.5) * (0.5 + emotionSens) * speed;
            pulseZoom += (volume * 0.0002);
            pulseDistanceZoom += (volume * 0.05);
            pulseSpiralThickness += (bass * 0.02);
            pulseK += (bass * 0.002);
            pulseZ0_r += (Math.random() > 0.5 ? 1 : -1) * (mid * 0.005);
            pulseZ0_i += (Math.random() > 0.5 ? 1 : -1) * (treble * 0.005);
          }
        }
      }

      // --- PHYSICS & REGENERATION ---
      let alpha = 1.0;

      if (currentParams.autoParamRegenMode === 'custom') {
        const delayFrames = Math.max(1, currentParams.autoParamRegenDelay * 60);
        const bufferFactor = 1.0 + (volume * (currentParams.autoParamRegenBuffer / 100));
        alpha = Math.min(1.0, (1.0 / delayFrames) * bufferFactor);
      } else if (currentParams.autoParamRegenMode === 'instant') {
        alpha = 1.0;
      } else {
        const viscosity = currentParams.autoViscosity ?? 0.96;
        const fluidity = currentParams.autoStyleFluidity ?? 0.5;
        const emotionSens = currentParams.autoEmotionSensitivity ?? 0.5;
        alpha = (1 - viscosity) * 0.05 * (0.5 + fluidity * 1.5);
        if (volume > 0.3) alpha *= (1.0 + emotionSens);
      }

      const ratioLeveler = (currentParams.autoParamRatioLeveler ?? 50) / 100;
      const adjustedAlpha = alpha * (1.0 - ratioLeveler);

      // Gentle centering force to prevent getting stuck at extremes
      if (currentParams.autoPilotMode === 'drift') {
        p.targetK += (DEFAULT_PARAMS.k - p.targetK) * 0.005;
        p.targetZ0_r += (0 - p.targetZ0_r) * 0.005;
        p.targetZ0_i += (0 - p.targetZ0_i) * 0.005;
        p.targetZoom += (DEFAULT_PARAMS.zoom - p.targetZoom) * 0.005;
        p.targetDistanceZoom += (DEFAULT_PARAMS.distanceZoom - p.targetDistanceZoom) * 0.005;
        p.targetSpiralThickness += (DEFAULT_PARAMS.spiralThickness - p.targetSpiralThickness) * 0.005;
      } else {
        // In genesis and harmonic modes, gently center the parameters that are not explicitly controlled
        p.targetZoom += (DEFAULT_PARAMS.zoom - p.targetZoom) * 0.002;
        p.targetDistanceZoom += (DEFAULT_PARAMS.distanceZoom - p.targetDistanceZoom) * 0.002;
        p.targetSpiralThickness += (DEFAULT_PARAMS.spiralThickness - p.targetSpiralThickness) * 0.002;
      }

      // Prevent target parameters from drifting to extremes
      p.targetK = Math.max(0.985, Math.min(1.015, p.targetK));
      p.targetZ0_r = Math.max(-1.5, Math.min(1.5, p.targetZ0_r));
      p.targetZ0_i = Math.max(-1.5, Math.min(1.5, p.targetZ0_i));
      p.targetZoom = Math.max(0.0005, Math.min(0.005, p.targetZoom));
      p.targetDistanceZoom = Math.max(0.1, Math.min(3.0, p.targetDistanceZoom));
      p.targetSpiralThickness = Math.max(0.1, Math.min(5.0, p.targetSpiralThickness));

      // Lerp base values towards targets
      if (!isLocked('k')) p.currentParams.k = lerp(p.currentParams.k, p.targetK, adjustedAlpha);
      if (!isLocked('psi')) p.currentParams.psi = lerpAngle(p.currentParams.psi, p.targetPsi, adjustedAlpha);
      if (!isLocked('z0_r')) p.currentParams.z0_r = lerp(p.currentParams.z0_r, p.targetZ0_r, adjustedAlpha);
      if (!isLocked('z0_i')) p.currentParams.z0_i = lerp(p.currentParams.z0_i, p.targetZ0_i, adjustedAlpha);
      if (!isLocked('baseHue')) p.currentParams.baseHue = lerpAngleDegrees(p.currentParams.baseHue, p.targetHue, adjustedAlpha * 0.5);
      if (!isLocked('zoom')) p.currentParams.zoom = lerp(p.currentParams.zoom, p.targetZoom, adjustedAlpha * 0.5);
      if (!isLocked('distanceZoom')) p.currentParams.distanceZoom = lerp(p.currentParams.distanceZoom, p.targetDistanceZoom, adjustedAlpha * 0.5);
      if (!isLocked('spiralThickness')) p.currentParams.spiralThickness = lerp(p.currentParams.spiralThickness, p.targetSpiralThickness, adjustedAlpha);

      // Add pulses to base values for the final output (always finite)
      const nextK = safeNumber(p.currentParams.k + (isLocked('k') ? 0 : pulseK), DEFAULT_PARAMS.k);
      const nextPsi = safeNumber(p.currentParams.psi + (isLocked('psi') ? 0 : pulsePsi), DEFAULT_PARAMS.psi);
      const nextZ0_r = safeNumber(p.currentParams.z0_r + (isLocked('z0_r') ? 0 : pulseZ0_r), DEFAULT_PARAMS.z0_r);
      const nextZ0_i = safeNumber(p.currentParams.z0_i + (isLocked('z0_i') ? 0 : pulseZ0_i), DEFAULT_PARAMS.z0_i);
      const nextBaseHue = safeNumber((((p.currentParams.baseHue + (isLocked('baseHue') ? 0 : pulseHue)) % 360) + 360) % 360, DEFAULT_PARAMS.baseHue);
      const nextZoom = safeNumber(Math.max(0.0001, p.currentParams.zoom + (isLocked('zoom') ? 0 : pulseZoom)), DEFAULT_PARAMS.zoom);
      const nextDistanceZoom = safeNumber(Math.max(0.01, p.currentParams.distanceZoom + (isLocked('distanceZoom') ? 0 : pulseDistanceZoom)), DEFAULT_PARAMS.distanceZoom);
      const nextSpiralThickness = safeNumber(Math.max(0.01, p.currentParams.spiralThickness + (isLocked('spiralThickness') ? 0 : pulseSpiralThickness)), DEFAULT_PARAMS.spiralThickness);

      // Update lastEmitted so we can detect manual slider drags next frame
      p.lastEmittedK = nextK;
      p.lastEmittedPsi = nextPsi;
      p.lastEmittedZ0_r = nextZ0_r;
      p.lastEmittedZ0_i = nextZ0_i;
      p.lastEmittedBaseHue = nextBaseHue;
      p.lastEmittedZoom = nextZoom;
      p.lastEmittedDistanceZoom = nextDistanceZoom;
      p.lastEmittedSpiralThickness = nextSpiralThickness;

      const base = paramsRef.current;
      const next: VisualizerParams = {
        ...base,
        genesisStage: p.genesisTargetStage,
      };

      if (geometryData) {
        next.geometryData = geometryData;
      }

      if (!isLocked('k')) next.k = nextK;
      if (!isLocked('psi')) next.psi = nextPsi;
      if (!isLocked('z0_r')) next.z0_r = nextZ0_r;
      if (!isLocked('z0_i')) next.z0_i = nextZ0_i;
      if (!isLocked('baseHue')) next.baseHue = nextBaseHue;
      if (!isLocked('zoom')) next.zoom = nextZoom;
      if (!isLocked('distanceZoom')) next.distanceZoom = nextDistanceZoom;
      if (!isLocked('spiralThickness')) next.spiralThickness = nextSpiralThickness;

      const modesChanged = p.sgModesUpdatedThisFrame;
      if (modesChanged) {
        next.sacredGeometryModes = isLocked('sacredGeometryModes') ? base.sacredGeometryModes : p.currentParams.sacredGeometryModes;
        next.spiralResonanceModes = isLocked('spiralResonanceModes') ? base.spiralResonanceModes : p.currentParams.spiralResonanceModes;
        next.sgTheme = isLocked('sgTheme') ? base.sgTheme : p.currentParams.sgTheme;
        p.sgModesUpdatedThisFrame = false;
      }

      // Escribir a 60fps en ref para el canvas sin forzar re-render de React en cada fotograma
      paramsRef.current = next;

      const needsVrSync = Boolean(base.vrMode || base.arPortalMode);
      const shouldSyncUi = modesChanged || needsVrSync;

      if (shouldSyncUi) {
        lastUiSyncTimeRef.current = now;
        setParams(next);
      }

      animationFrameRef.current = requestAnimationFrame(updateLoop);
    };

    pilotRef.current.currentParams = { ...paramsRef.current };
    animationFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    params.autoPilot,
    isActive,
    getAudioMetrics
  ]);

  // --- STANDALONE PORTABLE 4D CARD STAGE (?card=pioneros-01) ---
  if (portableCardParam) {
    const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const donorFromUrl = sp?.get('donor') || identity.displayName || 'Pionero StarSeed';
    const resolvedDesign = getDesignById(portableCardParam);
    const existingSaved = sync.thankYouCards.find((c) => c.designId === resolvedDesign.designId);
    const portableCardRecord = existingSaved || {
      id: `portable-${resolvedDesign.designId}`,
      donorName: donorFromUrl,
      tierId: 'pioneros',
      tierName: 'Pionero Fundacional',
      amount: 'Aporte Libre',
      issuedAt: new Date().toISOString(),
      folderPath: 'Biblioteca/Donaciones y Agradecimientos',
      cardTheme: 'iridescent' as const,
      editionId: resolvedDesign.editionId,
      cardNumber: resolvedDesign.cardNumber,
      editionSize: resolvedDesign.editionSize,
      designId: resolvedDesign.designId,
      phase: resolvedDesign.phase,
      area: resolvedDesign.area,
      message: 'Reliquia 4D interactiva StarSeed OS · Portátil y vinculable a tu Cerebro.',
    };
    const liveMetrics = getVisualMetrics(params.sensitivity, params.freqRange);

    const handleExitPortable = () => {
      if (typeof window !== 'undefined') {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('card');
        cleanUrl.searchParams.delete('donor');
        cleanUrl.searchParams.delete('serial');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
      setPortableCardParam(null);
    };

    const handleSavePortableToBrain = () => {
      if (!identity.isLoggedIn) {
        setAuthModalOpen(true);
        return;
      }
      sync.addThankYouCard({
        donorName: portableCardRecord.donorName,
        tierId: portableCardRecord.tierId,
        tierName: portableCardRecord.tierName,
        amount: portableCardRecord.amount,
        folderPath: portableCardRecord.folderPath,
        cardTheme: portableCardRecord.cardTheme,
        editionId: portableCardRecord.editionId,
        cardNumber: portableCardRecord.cardNumber,
        editionSize: portableCardRecord.editionSize,
        designId: portableCardRecord.designId,
        phase: portableCardRecord.phase,
        area: portableCardRecord.area,
        message: portableCardRecord.message,
      });
      handleOpenInfo('donations');
    };

    return (
      <div className="min-h-screen w-screen overflow-y-auto bg-[#030612] text-white relative flex flex-col items-center justify-between p-4 sm:p-6">
        <div className="fixed inset-0 z-0 opacity-60 pointer-events-none">
          <BackgroundLayer params={params} getAudioMetrics={getVisualMetrics} />
        </div>

        <header className="relative z-10 w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 art-nouveau-frame rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <StarSeedSymbol size="sm" glow />
            <div>
              <h1 className="text-sm sm:text-base font-extrabold starseed-text-gradient">
                Tarjeta Holográfica 4D · StarSeed OS
              </h1>
              <p className="text-[10px] sm:text-xs font-mono text-slate-300">
                Archivo 3D Portátil (.glb Offline) · Giroscopio & Luz Ambiental Viva
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAudio}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer border ${isActive
                ? 'bg-red-500/20 border-red-400/50 text-red-200 animate-pulse'
                : 'morph-btn-glass text-cyan-200'
                }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isActive ? 'Sonido Activo' : 'Activar Sonido'}</span>
            </button>
            <button
              type="button"
              onClick={handleSavePortableToBrain}
              className="px-3 py-1.5 rounded-full morph-btn-glass text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-amber-200"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-amber-300" />
              <span>{identity.isLoggedIn ? 'Guardar en Cerebro' : 'Vincular StarSeed OS'}</span>
            </button>
            <button
              type="button"
              onClick={handleExitPortable}
              className="px-3 py-1.5 rounded-full morph-btn-primary text-xs font-bold cursor-pointer"
            >
              Abrir Audiomorphic
            </button>
          </div>
        </header>

        <main className="relative z-10 w-full max-w-2xl my-auto py-4">
          <HolographicCard4D
            card={portableCardRecord}
            audioLevel={liveMetrics.volume}
            audioBass={liveMetrics.bass}
          />
        </main>

        <footer className="relative z-10 text-[11px] font-mono text-slate-400 text-center">
          Mueve el dispositivo (giroscopio) · Activa Luz Cámara 4D · Escultura creada en Blender 5.2
        </footer>

        <AuthModal />
      </div>
    );
  }

  return (
    <div
      className={`flex h-viewport-full w-screen overflow-hidden bg-black text-white relative ${EMBED.bg ? 'pointer-events-none select-none' : ''}`}
      onPointerDown={EMBED.bg ? undefined : () => {
        if (showTouchHint) setShowTouchHint(false);
        setControlsVisible(true);
      }}
      onPointerMove={EMBED.bg ? undefined : () => { if (controlsVisible) resetHideTimer(); }}
    >
      {EMBED.cam && (
        <video
          ref={camVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
          style={{ opacity: camActive ? 1 : 0, transition: 'opacity 600ms ease' }}
        />
      )}
      <div className="absolute inset-0 z-0">
        <BackgroundLayer params={params} getAudioMetrics={getVisualMetrics} />
        {(params.vrMode || params.arPortalMode) ? (
          <VisualizerVR
            params={params}
            getAudioMetrics={getVisualMetrics}
            setParams={setParams}
            audioActive={isActive}
            toggleAudio={toggleAudio}
            subscriptionTier={subscriptionTier}
            onShowSubscription={() => setShowSubscription(true)}
            audioDevices={devices}
            selectedAudioDeviceId={selectedDeviceId}
            onAudioDeviceChange={setSelectedDeviceId}
          />
        ) : (
          <VisualizerCanvas
            params={params}
            liveParamsRef={paramsRef}
            getAudioMetrics={getVisualMetrics}
          />
        )}
      </div>

      {!EMBED.bg && !(params.vrMode || params.arPortalMode) && params.showIndicators && (
        <div
          className="absolute top-3 right-3 sm:top-6 sm:right-6 flex items-center gap-1.5 sm:gap-2.5 z-20 transition-opacity duration-500 max-w-[calc(100vw-1.5rem)] overflow-hidden"
          style={{
            top: 'max(0.75rem, env(safe-area-inset-top))',
            right: 'max(0.75rem, env(safe-area-inset-right))',
            opacity: controlsVisible ? 1 : 0.78
          }}
        >
          <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] sm:text-xs font-mono pointer-events-none shrink-0
             ${isActive
              ? 'bg-red-500/15 border-red-400/50 text-red-300 animate-pulse'
              : 'quantum-glass text-slate-300'}
           `}>
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isActive ? 'bg-red-400' : 'bg-slate-400'}`}></div>
            <span>{isActive ? 'MIC' : 'OFF'}</span>
          </div>

          {params.autoPilot && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full morph-pill text-[11px] sm:text-xs font-mono shrink min-w-0">
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 morph-accent-text shrink-0" />
              <span className="font-bold tracking-wider hidden md:inline starseed-text-gradient">Audiomorphic</span>
              <RotateCw size={10} className="animate-spin opacity-60 shrink-0 hidden xs:inline" />
              <span className="truncate max-w-[85px] xs:max-w-[120px] sm:max-w-none">
                {params.autoRandomMode === 'sacred' ? 'RESONANCIAS' :
                  params.autoRandomMode === 'rhythmic' ? 'RITMOS' :
                    params.autoPilotMode === 'harmonic' ? 'ARMÓNICA' :
                      params.autoPilotMode === 'genesis' ? 'GÉNESIS' :
                        'DERIVA'}
              </span>
            </div>
          )}

          {presetsStore.selectedBrain && (
            <button
              type="button"
              onClick={() => handleOpenInfo('account')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full quantum-glass hover:brightness-110 text-[11px] font-mono text-slate-100 pointer-events-auto cursor-pointer shrink-0 max-w-[170px]"
              title={`Cerebro activo: ${presetsStore.selectedBrain.name}`}
            >
              <StarSeedSymbol size="xs" glow />
              <span className="truncate">{presetsStore.selectedBrain.name}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenLive(live.session ? 'room' : 'discover')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-mono pointer-events-auto cursor-pointer shrink-0 border ${live.session
              ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
              : 'morph-btn-glass text-cyan-200'
              }`}
            title="Transmisiones En Vivo: Estaciones & Canales P2P StarSeed"
          >
            <Radio size={12} className={live.session ? 'animate-pulse text-rose-300' : 'text-cyan-300'} />
            <span className="hidden xs:inline font-semibold">{live.session ? 'EN VIVO' : 'Transmitir'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenInfo('guide')}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full morph-btn-glass text-[11px] sm:text-xs font-mono pointer-events-auto cursor-pointer shrink-0"
            title="Centro de Información, Cerebros & Red StarSeed"
          >
            <Info size={12} className="morph-accent-text" />
            <span className="font-semibold tracking-wide">Info</span>
          </button>
        </div>
      )}

      {!EMBED.bg && error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-900/80 border border-red-500 text-red-100 px-6 py-3 rounded-lg shadow-lg backdrop-blur-md text-sm font-mono flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          {error}
        </div>
      )}

      {/* Indicador parpadeante translúcido centrado al iniciar la app */}
      {showTouchHint && !controlsVisible && !EMBED.bg && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none select-none px-4 animate-in fade-in duration-700"
          aria-hidden="true"
        >
          <div className="px-6 py-3.5 sm:px-8 sm:py-4 rounded-full art-nouveau-frame animate-pulse flex items-center gap-3">
            <StarSeedSymbol size="sm" glow />
            <p className="starseed-text-gradient text-sm sm:text-base md:text-lg font-bold tracking-wider text-center">
              Toca la pantalla para abrir el menú
            </p>
          </div>
        </div>
      )}

      {!EMBED.bg && !(params.vrMode) && (
        <>
          {/* Overlay to close menu when clicking outside */}
          <div
            className={`absolute inset-0 z-20 transition-opacity duration-200 ${controlsVisible ? 'opacity-100 bg-black/40 desktop-backdrop-blur pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              setControlsVisible(false);
            }}
            onPointerMove={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          />
          <div
            aria-hidden={!controlsVisible}
            className={`
              fixed inset-0 z-30 flex items-center justify-center p-2 sm:p-4 md:p-5 overflow-hidden menu-3d-stage pointer-events-none
              transition-opacity duration-200 ease-out
              ${controlsVisible ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <div
              ref={menuTilt.surfaceRef}
              className={`
                w-full max-w-6xl h-full sm:h-[92vh] max-h-[920px] flex flex-col relative menu-3d-surface overflow-hidden rounded-[20px] sm:rounded-[28px] md:rounded-[36px]
                ${controlsVisible ? 'pointer-events-auto' : 'pointer-events-none'}
              `}
              onPointerDownCapture={() => {
                setMenuInteracting(true);
                resetHideTimer();
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                setMenuInteracting(true);
                resetHideTimer();
              }}
              onPointerEnter={() => {
                menuHoveredRef.current = true;
              }}
              onPointerUp={() => setMenuInteracting(false)}
              onPointerCancel={() => setMenuInteracting(false)}
              onPointerMove={(e) => {
                e.stopPropagation();
                resetHideTimer();
                menuTilt.onPointerMove(e);
              }}
              onPointerLeave={() => {
                menuHoveredRef.current = false;
                menuTilt.onPointerLeave();
              }}
              onTouchMove={(e) => { e.stopPropagation(); resetHideTimer(); }}
              onWheel={(e) => { e.stopPropagation(); resetHideTimer(); }}
            >
              <div className="menu-3d-glare rounded-[inherit]" aria-hidden="true" />
              <ControlPanel
                params={params}
                setParams={setParams}
                audioActive={isActive}
                toggleAudio={toggleAudio}
                onClose={handleCloseControls}
                getAudioMetrics={getAudioMetrics}
                subscriptionTier={subscriptionTier}
                trialEndTime={trialEndTime}
                onShowSubscription={handleOpenDonations}
                onOpenInfo={handleOpenInfo}
                audioDevices={devices}
                selectedAudioDeviceId={selectedDeviceId}
                onAudioDeviceChange={setSelectedDeviceId}
                outputAudioDevices={outputDevices}
                selectedOutputAudioDeviceId={selectedOutputDeviceId}
                onOutputAudioDeviceChange={setAudioOutputDevice}
                onApplyPreset={handleApplyPreset}
                selectedLibraryPreset={selectedLibraryPresetForFolder}
                onSelectLibraryPreset={setSelectedLibraryPresetForFolder}
                sync={sync}
                onOpenLive={handleOpenLive}
                liveSession={live.session}
                liveTelemetry={live.telemetry}
                gyroSupported={menuTilt.gyroSupported}
                gyroActive={menuTilt.gyroActive}
                needsGyroPermission={menuTilt.needsGyroPermission}
                tiltEnabled={menuTilt.tiltEnabled}
                onRequestGyro={menuTilt.requestGyroPermission}
                onToggleTilt={menuTilt.toggleTilt}
              />
            </div>
          </div>
        </>
      )}

      {!EMBED.bg && (
        <LiveRoomOverlay
          live={live}
          getSpectrumSnapshot={audioAnalyzer.getSpectrumSnapshot}
          onOpenHub={handleOpenLive}
          vrActive={params.vrMode}
          onToggleVr={() => setParams((p) => ({ ...p, vrMode: !p.vrMode }))}
        />
      )}

      {!EMBED.bg && (
        <InfoHubModal
          open={infoHubOpen}
          onClose={() => setInfoHubOpen(false)}
          initialTab={infoHubTab}
          identity={identity}
          subscription={subscription}
          sync={sync}
          currentParams={params}
          onApplyPreset={handleApplyPreset}
          onSelectLibraryPreset={(preset) => {
            setSelectedLibraryPresetForFolder(preset);
            setInfoHubOpen(false);
          }}
          onOpenLive={(tab) => {
            setInfoHubOpen(false);
            handleOpenLive(tab || 'discover');
          }}
        />
      )}

      {!EMBED.bg && (
        <LiveTransmissionHub
          open={liveHubOpen}
          onClose={() => setLiveHubOpen(false)}
          initialTab={liveHubTab}
          live={live}
          identity={identity}
          sync={sync}
          neurons={presetsStore.neurons}
          currentNeuron={presetsStore.currentNeuron}
          params={params}
          setParams={setParams}
          getSpectrumSnapshot={audioAnalyzer.getSpectrumSnapshot}
        />
      )}

      {!EMBED.bg && <AuthModal />}
    </div>
  );
};

export default App;