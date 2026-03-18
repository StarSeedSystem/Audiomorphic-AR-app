import React, { useState, useEffect, useRef, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import VisualizerCanvas from './components/VisualizerCanvas';
import VisualizerVR from './components/VisualizerVR';
import { VisualizerParams, DEFAULT_PARAMS, GeometryInfo, GeometryRegime } from './types';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';

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

// Angle interpolation
const lerpAngle = (start: number, end: number, amt: number) => {
  const d = end - start;
  const delta = (((d + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
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
  const [params, setParams] = useState<VisualizerParams>(DEFAULT_PARAMS);
  const { isActive, startAudio, stopAudio, getAudioMetrics } = useAudioAnalyzer();
  const [controlsVisible, setControlsVisible] = useState(true);
  
  // Logic Refs
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number>(0);
  
  // --- PILOT STATE ---
  const pilotRef = useRef({
    targetK: DEFAULT_PARAMS.k,
    targetPsi: DEFAULT_PARAMS.psi,
    targetZ0_r: DEFAULT_PARAMS.z0_r,
    targetZ0_i: DEFAULT_PARAMS.z0_i,
    targetHue: params.baseHue,
    lastBeatTime: 0,
    currentParams: { ...DEFAULT_PARAMS },
    genesisTargetStage: 0
  });

  const toggleAudio = () => {
    if (isActive) {
      stopAudio();
    } else {
      startAudio();
    }
  };

  const handleUserActivity = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 4000);
  }, []);

  // --- AUTO PILOT ENGINE ---
  useEffect(() => {
    if (!params.autoPilot) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const updateLoop = () => {
      const { volume, frequency } = getAudioMetrics(params.sensitivity, params.freqRange);
      const now = Date.now();
      const p = pilotRef.current;
      let geometryData: GeometryInfo | undefined;

      // --- GENESIS MODE (Treatise Implementation) ---
      if (params.autoPilotMode === 'genesis') {
        
        // 1. Determine Stage based on Energy
        // Combine Volume (Matter/Density) and Frequency (Vibration/Spirit)
        const energy = volume + (frequency * 0.4);
        
        // Map energy to Genesis progression
        let stageIdx = 0;
        if (energy < 0.05) stageIdx = 0;      // Void
        else if (energy < 0.15) stageIdx = 1; // Vesica
        else if (energy < 0.30) stageIdx = 2; // Seed
        else if (energy < 0.45) stageIdx = 3; // Egg (Cube)
        else if (energy < 0.60) stageIdx = 4; // Flower
        else if (energy < 0.75) stageIdx = 5; // Fruit
        else stageIdx = 6;                    // Metatron (Max complexity)

        // Hysteresis for stability
        if (Math.abs(stageIdx - p.genesisTargetStage) > 0.1) {
             p.genesisTargetStage = stageIdx;
        }

        const currentStage = GENESIS_STAGES[p.genesisTargetStage];

        // 2. CALCULATE MATH
        const math = calculateHarmonicGeometry(currentStage.V, currentStage.E);

        // 3. APPLY TO TARGETS
        // Audio reactivity modulates the strict math slightly (Breathing)
        // Since base K is now very close to 1.0 (e.g. 0.998), adding volume pushes it > 1.0 (Expansion)
        // This creates a "breathing" effect where the spiral grows with sound and relaxes with silence.
        const breathing = 1.0 + (volume * 0.015); 

        p.targetPsi = math.psi;
        p.targetK = math.k * breathing;
        p.targetZ0_r = 0;
        p.targetZ0_i = 0;

        // Color based on Regime
        // Primary = Stable = Blues/Greens/Golds
        // Reciprocal = Tense = Reds/Purples/Oranges
        if (math.regime === 'primary') {
             p.targetHue = 200 - (p.genesisTargetStage * 10); // Cool colors
        } else if (math.regime === 'reciprocal') {
             p.targetHue = 0 + (p.genesisTargetStage * 5); // Warm/Hot colors
        } else {
             p.targetHue = 240; // Void = Dark Blue
        }

        // Expose Math to UI
        geometryData = {
          V: currentStage.V,
          E: currentStage.E,
          alpha: math.alpha,
          beta: math.beta,
          regime: math.regime,
          name: currentStage.name
        };

      } 
      // --- HARMONIC MODE (Musical Geometry) ---
      else if (params.autoPilotMode === 'harmonic') {
         // Map freq to notes, then to polygons per the Treatise
         // For now, simpler mapping:
         const rawNote = Math.floor(frequency * 36); 
         const noteIndex = rawNote % 12;
         const interval = Math.abs(noteIndex - params.rootNote) % 12;
         
         // Use the interval to determine shape V/E from Chapter III
         let V=1, E=0, name="Unison";
         switch(interval) {
            case 6: V=2; E=1; name="Tritono"; break; // Line
            case 4: V=3; E=3; name="Aumentada"; break; // Triangle
            case 3: V=4; E=4; name="Disminuida"; break; // Square
            case 2: V=6; E=6; name="Tonos Enteros"; break; // Hexagon
            case 7: V=7; E=7; name="Escala Mayor"; break; // Heptagon
            default: V=12; E=12; name="Cromática"; break; // Dodecagon
         }

         const math = calculateHarmonicGeometry(V, E);
         
         // Harmonic breathing
         const breathing = 1.0 + (volume * 0.012); 

         p.targetPsi = math.psi;
         p.targetK = math.k * breathing;
         p.targetHue = (noteIndex * 30) % 360; // Circle of fifths approx

         geometryData = {
            V, E, alpha: math.alpha, beta: math.beta, regime: math.regime, name
         };
      } 
      // --- DRIFT MODE ---
      else {
        // ... existing drift logic ...
        const isBeat = volume > 0.40;
        if (isBeat && (now - p.lastBeatTime > 2500)) {
          p.lastBeatTime = now;
          p.targetPsi = (Math.random() * Math.PI);
        }
        // Mantener la continuidad de la espiral sin que se adapte al volumen base
        p.targetK = DEFAULT_PARAMS.k; 
        p.targetPsi += (frequency * 0.0002);
        p.targetHue = (p.currentParams.baseHue + 0.1) % 360;
      }

      // --- PHYSICS ---
      const viscosity = params.autoViscosity ?? 0.96;
      let alpha = (1 - viscosity) * 0.05;
      if (volume > 0.3) alpha *= 1.2;

      p.currentParams.k = lerp(p.currentParams.k, p.targetK, alpha);
      p.currentParams.psi = lerpAngle(p.currentParams.psi, p.targetPsi, alpha);
      p.currentParams.z0_r = lerp(p.currentParams.z0_r, p.targetZ0_r, alpha);
      p.currentParams.z0_i = lerp(p.currentParams.z0_i, p.targetZ0_i, alpha);
      p.currentParams.baseHue = lerpAngle(p.currentParams.baseHue, p.targetHue, alpha * 0.5);

      setParams(prev => ({
        ...prev,
        k: p.currentParams.k,
        psi: p.currentParams.psi,
        z0_r: p.currentParams.z0_r,
        z0_i: p.currentParams.z0_i,
        baseHue: p.currentParams.baseHue,
        genesisStage: p.genesisTargetStage,
        geometryData: geometryData // Pass data to UI
      }));

      animationFrameRef.current = requestAnimationFrame(updateLoop);
    };

    pilotRef.current.currentParams = { ...params };
    updateLoop();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [params.autoPilot, params.autoPilotMode, params.autoSpeed, params.autoViscosity, params.rootNote, isActive]); 

  // Event Listeners
  useEffect(() => {
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    handleUserActivity();
    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [handleUserActivity]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-white relative">
      <div className="absolute inset-0 z-0">
        {params.vrMode ? (
          <VisualizerVR 
            params={params} 
            getAudioMetrics={getAudioMetrics}
            setParams={setParams}
            audioActive={isActive}
            toggleAudio={toggleAudio}
          />
        ) : (
          <VisualizerCanvas 
            params={params} 
            getAudioMetrics={getAudioMetrics}
          />
        )}
      </div>

      {!params.vrMode && params.showIndicators && (
        <div className="absolute top-6 right-6 flex gap-4 pointer-events-none z-20 transition-opacity duration-500" style={{ opacity: controlsVisible ? 1 : 0.5 }}>
           <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono backdrop-blur-sm transition-colors duration-300
             ${isActive 
               ? 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse' 
               : 'bg-gray-800/30 border-gray-700 text-gray-500'}
           `}>
             <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500' : 'bg-gray-500'}`}></div>
             {isActive ? 'MIC LIVE' : 'MIC OFF'}
           </div>
           
           {params.autoPilot && (
             <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/40 bg-indigo-500/10 text-indigo-400 text-xs font-mono backdrop-blur-sm shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                <span className="animate-spin mr-1">❖</span> 
                {params.autoPilotMode === 'harmonic' ? 'ARQUITECTURA ARMÓNICA' : 
                 params.autoPilotMode === 'genesis' ? 'GÉNESIS GEOMÉTRICO' : 'AUTO-DERIVA'}
             </div>
           )}
      </div>
      )}

      {!params.vrMode && (
        <div 
          className={`
            absolute top-1/2 left-1/2 z-30 w-[90vw] max-w-5xl h-[85vh]
            transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
            ${controlsVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
          `}
          onMouseEnter={() => {
             if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
             setControlsVisible(true);
          }}
          onMouseLeave={handleUserActivity}
        >
          <ControlPanel 
            params={params} 
            setParams={setParams} 
            audioActive={isActive}
            toggleAudio={toggleAudio}
          />
        </div>
      )}
    </div>
  );
};

export default App;