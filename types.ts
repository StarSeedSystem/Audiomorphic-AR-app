export type SubscriptionTier = 'free' | 'trial' | 'annual' | 'lifetime';
export type AutoPilotMode = 'drift' | 'harmonic' | 'genesis';
export type GeometryRegime = 'primary' | 'reciprocal' | 'void';
export type SacredGeometryMode = 
  | 'goldenSpiral' 
  | 'flowerOfLife' 
  | 'quantumWave' 
  | 'torus'
  | 'metatron'
  | 'merkaba'
  | 'platonicSolids'
  | 'sriYantra'
  | 'cymatics'
  | 'vectorEquilibrium'
  | 'treeOfLife'
  | 'yinYang'
  | 'mandala1'
  | 'mandala2'
  | 'mandala3'
  | 'holographicFractal'
  | 'chakras'
  | 'om'
  | 'lotus'
  | 'dharmaChakra';

export type BackgroundMode = 'solid' | 'gradient' | 'liquid-rainbow' | 'crystal-bubbles' | 'organic-fade' | 'morphing-colors';

export interface GeometryInfo {
  V: number; // Vertices
  E: number; // Edges
  alpha: number; // Structure Variable
  beta: number; // Potential Variable
  regime: GeometryRegime;
  name: string;
}

export interface SacredGeometrySettings {
  complexity: number;
  connectionSpan: number;
  scale: number;
  lineOpacity: number;
  bgOpacity: number;
  thickness: number;
  flowSpeed: number;
  audioReactivity: number;
  viscosity: number;
  colored: boolean;
  customColor: number;
}

export interface VisualizerParams {
  k: number;          // Base expansion factor
  psi: number;        // Base rotation angle
  z0_r: number;       // Complex constant Real part
  z0_i: number;       // Complex constant Imaginary part
  iter: number;       // Number of iterations per frame
  zoom: number;       // Visual scale (Normalized relative to screen size)
  sensitivity: number;// Audio reactivity sensitivity
  freqRange: number;  // Spectrum sampling range
  hueSpeed: number;   // Color cycling speed
  trail: number;      // Persistence/Trail effect (0-1)
  
  // Color Params
  baseHue: number;    // Starting Hue (0-360)
  hueRange: number;   // Gradient spread (0-360)
  saturation: number; // 0-100%
  brightness: number; // 0-100%
  harmonicColor: boolean; // Sync color with frequency
  harmonicSensitivity: number; // How much frequency impacts color
  harmonicDepth: number; // Range of color swing
  
  // Automation
  autoPilot: boolean; // Automatically morph parameters
  autoPilotMode: AutoPilotMode; // 'drift', 'harmonic', or 'genesis'
  genesisStage: number; // Index for Genesis phases
  rootNote: number; // 0-11 (C, C#, D...) for harmonic calculations
  autoViscosity: number; // 0.0 (Water/Fast) to 1.0 (Honey/Slow) - Smoothness
  autoSpeed: number; // Speed of the base pattern drift
  autoEmotionSensitivity: number; // Sensibilidad emocional
  autoStyleFluidity: number; // Fluidez entre estilos inteligentes
  
  // Auto-Regeneration Advanced Params
  autoOffscreenFade: boolean;
  autoTimeDelayMode: 'instant' | 'custom' | 'smart';
  autoTimeDelay: number; // 0 to 10 seconds
  autoParamRegenMode: 'instant' | 'smooth' | 'custom';
  autoParamRegenDelay: number; // 0 to 10 seconds
  autoParamRegenBuffer: number; // 0 to 100 (auto/reference buffer)
  autoOptionSaturationAuto: boolean;
  autoOptionSaturation: number; // 0 to 100
  autoRelationshipMode: 'empathetic' | 'technical' | 'rhythmic';
  autoParamRatioLeveler: number; // 0 to 100
  autoRandomOnBeat: boolean;
  autoRandomMode: 'none' | 'subtle' | 'chaotic' | 'harmonic' | 'sacred' | 'rhythmic' | 'rainbow' | 'astral' | 'random' | 'smart' | 'dj';
  lockedParams: string[]; // Keys of manually locked parameters
  
  // Target params for smooth interpolation
  targetZoom?: number;
  targetIter?: number;
  targetDistanceZoom?: number;
  targetSpiralThickness?: number;
  targetK?: number;
  targetPsi?: number;
  targetZ0_r?: number;
  targetZ0_i?: number;
  targetBaseHue?: number;

  // Sacred Geometry Params (Genesis Mode)
  spiralResonanceModes: SacredGeometryMode[]; // For the spiral (Genesis only)
  sacredGeometryEnabled: boolean; // Enable SG layer anywhere
  sacredGeometryModes: SacredGeometryMode[]; // For the separate SG layer
  sgSettings: Record<SacredGeometryMode, SacredGeometrySettings>;
  sgShowNodes: boolean;
  sgDrawMode: 'nodes' | 'layers' | 'both';
  sgAutoResonance: boolean;
  sgTheme: 'light' | 'dark';
  sgAutoHarmonic: boolean;
  sgGlobalOpacity: number;
  sgGlobalFlowSpeed: number;
  sgGlobalAudioReactivity: number;
  sgGlobalViscosity: number;
  spiralThickness: number;
  
  // VR/AR Params
  vrMode: boolean;
  arMode: boolean;
  vrDragRotation: boolean;
  vrDepth: number;
  vrDistance: number;
  distanceZoom: number; // Distancia de separación y acercamiento
  vrSplitScreen: boolean;
  vrRadius: number;
  vrThickness: number;
  vrSymmetric: boolean;
  
  // AR Filters
  arFilter: 'none' | 'psychedelic' | 'noir' | 'neon' | 'glitch' | 'dream' | 'hypnotic';
  arIntensity: number;
  
  // AR Portal
  arPortalMode: boolean;
  arPortalScale: number;
  arPortalPerspectiveIntensity: number;
  arPortalVanishingRadius: number;
  arPortalFade: number;
  arPortalBending: number;
  
  // Background Params
  bgMode: BackgroundMode;
  bgColors: string[];
  bgSpeed: number;
  bgAnimatable: boolean;
  bgVignette: boolean;
  bgVignetteIntensity: number;
  
  // UI Params
  showIndicators: boolean;
  menuTransparency: number;
  menuAutoCloseTime: number;
  audioSource: 'microphone' | 'system';
  
  // Live Math Data (Read-only for UI)
  geometryData?: GeometryInfo;
}

const defaultSGSettings: SacredGeometrySettings = {
  complexity: 3.0,
  connectionSpan: 100.0,
  scale: 0.1,
  lineOpacity: 0.5,
  bgOpacity: 0.1,
  thickness: 0.1,
  flowSpeed: 0.2,
  audioReactivity: 5.0,
  viscosity: 0.5,
  colored: true,
  customColor: 200
};

export const DEFAULT_PARAMS: VisualizerParams = {
  k: 1.008,           // Factor K (Expansión)
  psi: 2.399,         // Golden Angle default
  z0_r: 0.0,          // Perfectly Centered
  z0_i: 0.0,          // Perfectly Centered
  iter: 2000,         // Detalle (Iteraciones)
  zoom: 0.001,        // Profundidad (Zoom)
  sensitivity: 5.0,   // Reactividad Sensibilidad
  freqRange: 1.0,     // Espectro Freq
  hueSpeed: 0.2,      // Color cycling speed
  trail: 1.0,         // Persistencia
  
  baseHue: 200,       // Starting Hue
  hueRange: 360,      // Rango Gradiente
  saturation: 100,    // Saturación
  brightness: 10,     // Brillo Base
  harmonicColor: false,// Color Armónico
  harmonicSensitivity: 5.0, // Sensibilidad Color
  harmonicDepth: 360, // Profundidad Color
  
  autoPilot: true,    // Piloto Automático
  autoPilotMode: 'harmonic', // Armónico
  genesisStage: 0,
  rootNote: 0,
  autoViscosity: 0.963, // Viscosidad
  autoSpeed: 1.0,     // Velocidad Deriva
  autoEmotionSensitivity: 0.5,
  autoStyleFluidity: 0.5,

  autoOffscreenFade: false,
  autoTimeDelayMode: 'smart',
  autoTimeDelay: 2.0,
  autoParamRegenMode: 'custom',
  autoParamRegenDelay: 1.0,
  autoParamRegenBuffer: 50,
  autoOptionSaturationAuto: false,
  autoOptionSaturation: 50,
  autoRelationshipMode: 'empathetic',
  autoParamRatioLeveler: 50,
  autoRandomOnBeat: false,
  autoRandomMode: 'none',
  lockedParams: [],

  spiralResonanceModes: [],
  sacredGeometryEnabled: false,
  sacredGeometryModes: [],
  sgSettings: {
    goldenSpiral: { ...defaultSGSettings },
    flowerOfLife: { ...defaultSGSettings },
    quantumWave: { ...defaultSGSettings },
    torus: { ...defaultSGSettings },
    metatron: { ...defaultSGSettings },
    merkaba: { ...defaultSGSettings },
    platonicSolids: { ...defaultSGSettings },
    sriYantra: { ...defaultSGSettings },
    cymatics: { ...defaultSGSettings },
    vectorEquilibrium: { ...defaultSGSettings },
    treeOfLife: { ...defaultSGSettings },
    yinYang: { ...defaultSGSettings },
    mandala1: { ...defaultSGSettings },
    mandala2: { ...defaultSGSettings },
    mandala3: { ...defaultSGSettings },
    holographicFractal: { ...defaultSGSettings },
    chakras: { ...defaultSGSettings },
    om: { ...defaultSGSettings },
    lotus: { ...defaultSGSettings },
    dharmaChakra: { ...defaultSGSettings }
  },
  sgShowNodes: true,
  sgDrawMode: 'layers',
  sgAutoResonance: false,
  sgTheme: 'light',
  sgAutoHarmonic: false,
  sgGlobalOpacity: 1.0,
  sgGlobalFlowSpeed: 1.0,
  sgGlobalAudioReactivity: 1.0,
  sgGlobalViscosity: 1.0,
  spiralThickness: 1.0,

  vrMode: false,
  arMode: false,
  vrDragRotation: false,
  vrDepth: 20,
  vrDistance: 0,
  distanceZoom: 1.0,
  vrSplitScreen: false,
  vrRadius: 5,
  vrThickness: 2,
  vrSymmetric: true,
  
  arFilter: 'none',
  arIntensity: 0.5,
  
  arPortalMode: false,
  arPortalScale: 1.0,
  arPortalPerspectiveIntensity: 2.0,
  arPortalVanishingRadius: 1.0,
  arPortalFade: 1.0,
  arPortalBending: 0.0,
  
  // Background Params
  bgMode: 'solid',
  bgColors: ['#000000', '#1a1a2e'],
  bgSpeed: 0.5,
  bgAnimatable: false,
  bgVignette: false,
  bgVignetteIntensity: 0.8,
  
  showIndicators: true,
  menuTransparency: 0.8,
  menuAutoCloseTime: 5,
  audioSource: 'microphone'
};

export interface AudioMetrics {
  volume: number;     // 0 - 1 normalized
  frequency: number;  // 0 - 1 normalized (centroid or dominant)
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-buy-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'buy-button-id'?: string;
        'publishable-key'?: string;
        'client-reference-id'?: string;
        'customer-email'?: string;
      };
    }
  }
}