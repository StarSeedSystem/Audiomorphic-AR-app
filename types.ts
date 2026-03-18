export type AutoPilotMode = 'drift' | 'harmonic' | 'genesis';
export type GeometryRegime = 'primary' | 'reciprocal' | 'void';
export type SacredGeometryMode = 'goldenSpiral' | 'flowerOfLife' | 'quantumWave' | 'torus';

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
  
  // Sacred Geometry Params (Genesis Mode)
  sgResonanceModes: SacredGeometryMode[];
  sgSettings: Record<SacredGeometryMode, SacredGeometrySettings>;
  sgShowNodes: boolean;
  sgDrawMode: 'nodes' | 'layers';
  sgAutoResonance: boolean;
  
  // VR/AR Params
  vrMode: boolean;
  arMode: boolean;
  vrDragRotation: boolean;
  vrDepth: number;
  vrDistance: number;
  vrSplitScreen: boolean;
  vrRadius: number;
  vrThickness: number;
  vrSymmetric: boolean;
  
  // AR Filters
  arFilter: 'none' | 'psychedelic' | 'noir' | 'neon' | 'glitch' | 'dream' | 'hypnotic';
  arIntensity: number;
  
  // UI Params
  showIndicators: boolean;
  
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
  audioReactivity: 5.0
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
  harmonicColor: true,// Color Armónico
  harmonicSensitivity: 5.0, // Sensibilidad Color
  harmonicDepth: 360, // Profundidad Color
  
  autoPilot: true,    // Piloto Automático
  autoPilotMode: 'drift', // Deriva
  genesisStage: 0,
  rootNote: 0,
  autoViscosity: 0.963, // Viscosidad
  autoSpeed: 1.0,     // Velocidad Deriva

  sgResonanceModes: ['flowerOfLife'],
  sgSettings: {
    goldenSpiral: { ...defaultSGSettings },
    flowerOfLife: { ...defaultSGSettings },
    quantumWave: { ...defaultSGSettings },
    torus: { ...defaultSGSettings }
  },
  sgShowNodes: true,
  sgDrawMode: 'layers',
  sgAutoResonance: true,

  vrMode: false,
  arMode: false,
  vrDragRotation: false,
  vrDepth: 20,
  vrDistance: 0,
  vrSplitScreen: false,
  vrRadius: 5,
  vrThickness: 2,
  vrSymmetric: true,
  
  arFilter: 'none',
  arIntensity: 0.5,
  
  showIndicators: true
};

export interface AudioMetrics {
  volume: number;     // 0 - 1 normalized
  frequency: number;  // 0 - 1 normalized (centroid or dominant)
}