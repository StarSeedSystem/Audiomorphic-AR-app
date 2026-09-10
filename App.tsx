import React, { useState, useEffect, useRef, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import VisualizerCanvas from './components/VisualizerCanvas';
import VisualizerVR from './components/VisualizerVR';
import { BackgroundLayer } from './components/BackgroundLayer';
import { AuthModal } from './components/AuthModal';
import { InfoHubModal, InfoHubTab } from './components/InfoHubModal';
import { useStarSeedIdentity } from './hooks/useStarSeedIdentity';
import { useSubscription } from './hooks/useSubscription';
import { useStarSeedSync } from './hooks/useStarSeedSync';
import { VisualizerParams, DEFAULT_PARAMS, GeometryInfo, GeometryRegime, SacredGeometryMode, SubscriptionTier } from './types';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import { useAuth } from './contexts/AuthContext';
import ProfileMenu from './components/ProfileMenu';
import { Zap, Activity, RotateCw, Star, Clock, Info, Heart } from 'lucide-react';
import { EMBED, getPresetParams, getSyntheticMetrics } from './utils/embedMode';

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
  const b = Math.sqrt((c * c) - (a * a));

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
  const k = 1.0 - (1.0 - k_raw) * 0.004; 

  // Psi = Angulo de Giro = arccos(b/c)
  const psi = (c === 0) ? 0 : Math.acos(b / c);

  return { alpha, beta, sigma, gamma, k, psi, regime };
};


const App: React.FC = () => {
  const { user, userData, updateSubscription, login, setAuthModalOpen, logout, loginWithGoogle } = useAuth();
  
  // Load initial params from localStorage if available, otherwise use DEFAULT_PARAMS
  const [params, setParams] = useState<VisualizerParams>(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const saved = localStorage.getItem('audiomorphic_params');
    let initialParams = DEFAULT_PARAMS;

    if (saved) {
      try {
        initialParams = { ...DEFAULT_PARAMS, ...JSON.parse(saved) };
      } catch (e) {
        initialParams = DEFAULT_PARAMS;
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
        initialParams = { ...initialParams, ...presetParams };
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
  const paramsRef = useRef<VisualizerParams>(params);

  // Integración viva StarSeed OS: identidad, donaciones y presets en Supabase (pqzdpmedcsgcedkvndzl)
  const identity = useStarSeedIdentity();
  const sync = useStarSeedSync(identity.user?.id || null);
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

  const handleOpenInfo = useCallback((tab: InfoHubTab = 'donations') => {
    setInfoHubTab(tab);
    setInfoHubOpen(true);
  }, []);

  // Listen to URL query params (?info=donations, ?info=guide, ?info=updates) and hash (#donar, #info, #descargas)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const info = sp.get('info');
    if (info === 'donations' || info === 'guide' || info === 'updates' || info === 'ecosystem' || info === 'account' || info === 'presets') {
      handleOpenInfo(info as InfoHubTab);
    } else if (window.location.hash === '#donar' || window.location.hash === '#donaciones' || window.location.hash === '#aportes') {
      handleOpenInfo('donations');
    } else if (window.location.hash === '#descargas' || window.location.hash === '#descargar' || window.location.hash === '#updates' || window.location.hash === '#versiones') {
      handleOpenInfo('updates');
    } else if (window.location.hash === '#info' || window.location.hash === '#about' || window.location.hash === '#ciencia') {
      handleOpenInfo('guide');
    }
  }, [handleOpenInfo]);

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
  // Sync params to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('audiomorphic_params', JSON.stringify(params));
    paramsRef.current = params;
  }, [params]);

  const handleSubscribe = async (tier: SubscriptionTier, trialDurationMs?: number) => {
    handleOpenInfo('donations');
  };
  const { 
    isActive, 
    error, 
    devices, 
    selectedDeviceId, 
    setSelectedDeviceId, 
    startAudio, 
    stopAudio, 
    getAudioMetrics 
  } = useAudioAnalyzer();

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

  // --- EMBED: auto-start microphone (?mic=1) ---
  // Tries to capture the mic once on mount. If the browser/iframe denies it,
  // the synthetic fallback above keeps the background animated anyway.
  const micRequestedRef = useRef(false);
  useEffect(() => {
    if (!EMBED.mic || micRequestedRef.current) return;
    micRequestedRef.current = true;
    // Fire-and-forget; startAudio handles its own errors internally.
    Promise.resolve(startAudio('microphone')).catch(() => {});
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
          await camVideoRef.current.play().catch(() => {});
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
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, params.menuAutoCloseTime * 1000);
  }, [params.menuAutoCloseTime]);

  useEffect(() => {
    if (controlsVisible) {
      resetHideTimer();
    } else {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    }
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [controlsVisible, resetHideTimer]);

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

  // Handle Load Preset from Profile Menu
  const handleLoadPreset = (preset: any) => {
    setParams(prev => ({ ...prev, ...preset.params }));
    // If the menu is open, it will close itself via its internal state
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
         
         let V=1, E=0, name="Unison";
         switch(interval) {
            case 6: V=2; E=1; name="Tritono"; break;
            case 4: V=3; E=3; name="Aumentada"; break;
            case 3: V=4; E=4; name="Disminuida"; break;
            case 2: V=6; E=6; name="Tonos Enteros"; break;
            case 7: V=7; E=7; name="Escala Mayor"; break;
            default: V=12; E=12; name="Cromática"; break;
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

      // Add pulses to base values for the final output
      const nextK = p.currentParams.k + (isLocked('k') ? 0 : pulseK);
      const nextPsi = p.currentParams.psi + (isLocked('psi') ? 0 : pulsePsi);
      const nextZ0_r = p.currentParams.z0_r + (isLocked('z0_r') ? 0 : pulseZ0_r);
      const nextZ0_i = p.currentParams.z0_i + (isLocked('z0_i') ? 0 : pulseZ0_i);
      const nextBaseHue = (((p.currentParams.baseHue + (isLocked('baseHue') ? 0 : pulseHue)) % 360) + 360) % 360;
      const nextZoom = Math.max(0.0001, p.currentParams.zoom + (isLocked('zoom') ? 0 : pulseZoom));
      const nextDistanceZoom = Math.max(0.01, p.currentParams.distanceZoom + (isLocked('distanceZoom') ? 0 : pulseDistanceZoom));
      const nextSpiralThickness = Math.max(0.01, p.currentParams.spiralThickness + (isLocked('spiralThickness') ? 0 : pulseSpiralThickness));

      // Update lastEmitted so we can detect manual slider drags next frame
      p.lastEmittedK = nextK;
      p.lastEmittedPsi = nextPsi;
      p.lastEmittedZ0_r = nextZ0_r;
      p.lastEmittedZ0_i = nextZ0_i;
      p.lastEmittedBaseHue = nextBaseHue;
      p.lastEmittedZoom = nextZoom;
      p.lastEmittedDistanceZoom = nextDistanceZoom;
      p.lastEmittedSpiralThickness = nextSpiralThickness;

      setParams(prev => {
        const next = {
          ...prev,
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

        if (p.sgModesUpdatedThisFrame) {
          next.sacredGeometryModes = isLocked('sacredGeometryModes') ? prev.sacredGeometryModes : p.currentParams.sacredGeometryModes;
          next.spiralResonanceModes = isLocked('spiralResonanceModes') ? prev.spiralResonanceModes : p.currentParams.spiralResonanceModes;
          next.sgTheme = isLocked('sgTheme') ? prev.sgTheme : p.currentParams.sgTheme;
          p.sgModesUpdatedThisFrame = false;
        }

        return next;
      });

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

  return (
    <div 
      className={`flex h-screen w-screen overflow-hidden bg-black text-white relative ${EMBED.bg ? 'pointer-events-none select-none' : ''}`}
      onPointerDown={EMBED.bg ? undefined : () => setControlsVisible(true)}
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
            getAudioMetrics={getVisualMetrics}
          />
        )}
      </div>

      {!EMBED.bg && !(params.vrMode || params.arPortalMode) && params.showIndicators && (
        <div className="absolute top-6 right-6 flex items-center gap-3 z-20 transition-opacity duration-500" style={{ opacity: controlsVisible ? 1 : 0.7 }}>
           <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono backdrop-blur-sm transition-colors duration-300 pointer-events-none
             ${isActive 
               ? 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse' 
               : 'bg-gray-800/30 border-gray-700 text-gray-500'}
           `}>
             <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500' : 'bg-gray-500'}`}></div>
             {isActive ? 'MIC LIVE' : 'MIC OFF'}
           </div>
           
           {params.autoPilot && (
             <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/40 bg-indigo-500/10 text-indigo-400 text-xs font-mono backdrop-blur-sm shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                <Zap className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <span className="font-bold tracking-wider">Audiomorphic</span>
                <RotateCw size={10} className="animate-spin ml-1 text-cyan-400/50" /> 
                {params.autoRandomMode === 'sacred' ? 'RESONANCIAS SAGRADAS' :
                 params.autoRandomMode === 'rhythmic' ? 'RITMOS MUSICALES' :
                 params.autoPilotMode === 'harmonic' ? 'ARQUITECTURA ARMÓNICA' : 
                 params.autoPilotMode === 'genesis' ? 'GÉNESIS GEOMÉTRICO' : 
                 'AUTO-DERIVA'}
             </div>
           )}

           <button
             onClick={() => handleOpenInfo('guide')}
             className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/40 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 text-xs font-mono backdrop-blur-md transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] pointer-events-auto cursor-pointer"
             title="Centro de Información & Red StarSeed"
           >
             <Info size={13} className="text-cyan-400" />
             <span className="font-semibold tracking-wide">Info</span>
           </button>
           <button
             onClick={() => handleOpenInfo('donations')}
             className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/40 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 text-xs font-mono backdrop-blur-md transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] pointer-events-auto cursor-pointer"
             title="Donaciones Opcionales & Tarjeta Virtual 3D"
           >
             <Heart size={13} className="text-amber-400" fill="currentColor" />
             <span className="font-semibold tracking-wide">Donar</span>
           </button>
      </div>
      )}

      {/* Persistent Profile Menu Removed - Now exclusively inside ControlPanel & InfoHubModal */}

      {!EMBED.bg && error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-900/80 border border-red-500 text-red-100 px-6 py-3 rounded-lg shadow-lg backdrop-blur-md text-sm font-mono flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          {error}
        </div>
      )}

      {!EMBED.bg && !(params.vrMode) && (
        <>
          {/* Overlay to close menu when clicking outside */}
          <div 
            className={`absolute inset-0 z-20 transition-opacity duration-500 ${controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              setControlsVisible(false);
            }}
            onPointerMove={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          />
          <div 
            className={`
              absolute top-1/2 left-1/2 z-30 w-[95vw] md:w-[90vw] max-w-5xl h-[90vh] flex flex-col
              transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
              ${controlsVisible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
            `}
            onPointerDown={(e) => { e.stopPropagation(); resetHideTimer(); }}
            onPointerMove={(e) => { e.stopPropagation(); resetHideTimer(); }}
            onTouchMove={(e) => { e.stopPropagation(); resetHideTimer(); }}
            onWheel={(e) => { e.stopPropagation(); resetHideTimer(); }}
          >
            <ControlPanel 
              params={params} 
              setParams={setParams} 
              audioActive={isActive}
              toggleAudio={toggleAudio}
              onClose={() => setControlsVisible(false)}
              getAudioMetrics={getAudioMetrics}
              subscriptionTier={subscriptionTier}
              trialEndTime={trialEndTime}
              onShowSubscription={() => handleOpenInfo('donations')}
              onOpenInfo={handleOpenInfo}
              audioDevices={devices}
              selectedAudioDeviceId={selectedDeviceId}
              onAudioDeviceChange={setSelectedDeviceId}
            />
          </div>
        </>
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
          onApplyPreset={(preset) => {
            try {
              const raw = preset.params || (preset as any).params_json;
              const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (parsed && typeof parsed === 'object') {
                setParams((prev) => ({ ...prev, ...parsed }));
              }
            } catch (e) {
              console.error('Error al aplicar preset', e);
            }
          }}
        />
      )}

      {!EMBED.bg && <AuthModal />}
    </div>
  );
};

export default App;