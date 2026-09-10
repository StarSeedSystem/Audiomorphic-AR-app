import React, { useRef, useEffect } from 'react';
import { VisualizerParams, DEFAULT_PARAMS, SacredGeometrySettings, SacredGeometryMode } from '../types';
import {
  drawMetatron,
  drawMerkaba,
  drawPlatonicSolids,
  drawSriYantra,
  drawCymatics,
  drawVectorEquilibrium,
  drawTreeOfLife,
  drawYinYang,
  drawMandala1,
  drawMandala2,
  drawMandala3,
  drawHolographicFractal,
  drawChakras,
  drawOm,
  drawLotus,
  drawDharmaChakra
} from './geometryDrawers';

interface VisualizerCanvasProps {
  params: VisualizerParams;
  getAudioMetrics: (sensitivity: number, freqRange: number) => { volume: number, frequency: number };
}

// Shortest path interpolation for angles
const lerpAngle = (start: number, end: number, amt: number) => {
  const d = end - start;
  const delta = (((d + 180) % 360) + 360) % 360 - 180;
  return (start + delta * amt + 360) % 360;
};

const getGeometryColor = (
  p: VisualizerParams,
  settings: any,
  baseHue: number,
  sVol: number,
  modeIndex: number,
  activeModesCount: number
) => {
  let hue = baseHue;
  let sat = p.saturation;
  let light = p.sgTheme === 'dark' ? 20 : 80;
  let lineOpacity = settings.lineOpacity;
  let bgOpacity = settings.bgOpacity;
  
  if (p.sgAutoHarmonic) {
    hue = (baseHue + modeIndex * (360 / activeModesCount) + sVol * 90) % 360;
    sat = 70 + sVol * 30;
    light = p.sgTheme === 'dark' ? 10 + sVol * 30 : 90 - sVol * 30;
    lineOpacity = Math.min(1.0, settings.lineOpacity * (0.5 + sVol * 1.5));
    bgOpacity = Math.min(1.0, settings.bgOpacity * (0.5 + sVol * 1.5));
  } else {
    if (settings.colored) {
      hue = settings.customColor;
    } else {
      sat = 0;
      light = p.sgTheme === 'dark' ? 0 : 100;
    }
  }
  
  return { hue, sat, light, lineOpacity, bgOpacity };
};

// --- SACRED GEOMETRY DRAWERS (Metaphysical & Quantum) ---

const drawSeedOfLife = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rotation: number, lineOpacity: number, bgOpacity: number, hue: number, sat: number, light: number, vol: number, thickness: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${lineOpacity})`;
    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${bgOpacity})`;
    ctx.lineWidth = (1 + vol * 2) * thickness;

    const circle = (x: number, y: number, rad: number) => {
        ctx.beginPath(); 
        ctx.arc(x, y, Math.max(0, rad), 0, Math.PI*2); 
        ctx.stroke(); 
        if (bgOpacity > 0) ctx.fill();
    };

    // Flower of Life expansion
    circle(0, 0, r); // Center
    for(let i=0; i<6; i++) {
        const a = i * Math.PI / 3;
        circle(Math.cos(a)*r, Math.sin(a)*r, r);
        
        // Outer tier
        const aOuter = a + Math.PI / 6;
        const rOuter = r * Math.sqrt(3);
        circle(Math.cos(aOuter)*rOuter, Math.sin(aOuter)*rOuter, r);
    }
    
    // Bounding circle
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0, r * 3), 0, Math.PI*2);
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${lineOpacity * 0.5})`;
    ctx.stroke();

    ctx.restore();
};

const drawTorus = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rotation: number, lineOpacity: number, bgOpacity: number, hue: number, sat: number, light: number, time: number, vol: number, thickness: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${lineOpacity * 0.8})`;
    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${bgOpacity})`;
    ctx.lineWidth = (0.5 + vol) * thickness;
    
    const rings = 24; // More rings for smoother torus
    const tubeRadius = r * 0.6;
    const mainRadius = r;

    for(let i=0; i<rings; i++) {
        const a = (i / rings) * Math.PI * 2 + time * 0.2;
        const xOffset = Math.cos(a) * mainRadius;
        const yOffset = Math.sin(a) * mainRadius;
        
        // Dynamic ellipse to simulate 3D rotation
        const squeeze = Math.abs(Math.cos(time * 0.5 + i * 0.1));
        
        ctx.beginPath();
        ctx.ellipse(xOffset, yOffset, Math.max(0, tubeRadius), Math.max(0, tubeRadius * (0.2 + squeeze * 0.8)), a + time, 0, Math.PI*2);
        if (bgOpacity > 0) ctx.fill();
        ctx.stroke();
    }
    
    // Core energy line
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0, mainRadius), 0, Math.PI*2);
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, 100%, ${lineOpacity})`;
    ctx.lineWidth = (1 + vol * 2) * thickness;
    ctx.stroke();

    ctx.restore();
};

const drawQuantumCloud = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, time: number, vol: number, lineOpacity: number, bgOpacity: number, hue: number, sat: number, light: number, thickness: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    
    // Probability density (electron cloud)
    const layers = 12;
    for(let i=1; i<=layers; i++) {
        const layerVol = vol * (1 - i/layers);
        const radius = r * (i/layers) * (1 + Math.sin(time * 2 + i) * 0.15 * layerVol);
        ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${bgOpacity * 0.8 * (1 - i/layers)})`;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0, radius), 0, Math.PI*2);
        if (bgOpacity > 0) ctx.fill();
    }
    
    // Wave function interference (Euler's formula representation)
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, 100%, ${lineOpacity * 0.9})`;
    ctx.lineWidth = (0.8 + vol * 1.5) * thickness;
    
    const petals = 5 + Math.floor(vol * 3); // Dynamic petals
    
    ctx.beginPath();
    for(let a=0; a<=Math.PI*2.01; a+=0.05) {
        // Complex interference pattern
        const mod1 = Math.sin(a * petals + time * 3);
        const mod2 = Math.cos(a * (petals - 2) - time * 2);
        const mod = 1 + 0.3 * mod1 * mod2 * (1 + vol);
        
        const x = Math.cos(a) * r * mod;
        const y = Math.sin(a) * r * mod;
        if(a===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.stroke();
    
    // Inner core
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0, r * 0.2 * (1 + vol)), 0, Math.PI*2);
    ctx.fillStyle = `hsla(${hue}, ${sat}%, 100%, ${bgOpacity})`;
    if (bgOpacity > 0) ctx.fill();

    ctx.restore();
};

const drawGoldenSpiral = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rotation: number, lineOpacity: number, bgOpacity: number, hue: number, sat: number, light: number, vol: number, thickness: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${lineOpacity})`;
    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${bgOpacity})`;
    ctx.lineWidth = (1.5 + vol * 2) * thickness;
    
    // Draw the spiral
    ctx.beginPath();
    const a = r * 0.02;
    const b = Math.log(1.6180339) / (Math.PI / 2);
    const maxTheta = Math.PI * 8;
    
    for(let theta=0; theta<maxTheta; theta+=0.05) {
        const rad = a * Math.exp(b * theta);
        const x = rad * Math.cos(theta);
        const y = rad * Math.sin(theta);
        if(theta===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    ctx.restore();
};

const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({ params, getAudioMetrics }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // REFS FOR PERSISTENT LOOP STATE
  const paramsRef = useRef(params);
  const getMetricsRef = useRef(getAudioMetrics);
  const timeRef = useRef<number>(0);
  const currentHueRef = useRef<number>(params.baseHue);
  
  // Fading modes tracking for autoOffscreenFade
  const fadingSgModesRef = useRef<{ mode: SacredGeometryMode, opacity: number, scale: number }[]>([]);
  const prevSgModesRef = useRef<SacredGeometryMode[]>([]);
  const fadingResonanceModesRef = useRef<{ mode: SacredGeometryMode, opacity: number, scale: number }[]>([]);
  const prevResonanceModesRef = useRef<SacredGeometryMode[]>([]);
  
  // Smoothing refs for organic movement
  const smoothedVolRef = useRef<number>(0);
  const smoothedFreqRef = useRef<number>(0);

  // Sync refs with props
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    getMetricsRef.current = getAudioMetrics;
  }, [getAudioMetrics]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Resize Observer to handle window changes
    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      const ctx = canvas.getContext('2d');
      if(ctx) ctx.scale(dpr, dpr);
      
      // Keep CSS size matched
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      // We store logical size for the draw function to use
      (canvas as any).logicalWidth = width;
      (canvas as any).logicalHeight = height;
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    let animationFrameId: number;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
         animationFrameId = requestAnimationFrame(render);
         return;
      }

      // Read latest state from REFS
      const p = paramsRef.current;
      const getMetrics = getMetricsRef.current;
      
      const { volume, frequency } = getMetrics(p.sensitivity, p.freqRange);
      
      // Smooth audio for organic movement
      const restingPulse = 0.005; // Keep it alive even in silence
      const targetVol = Math.max(restingPulse, volume);
      smoothedVolRef.current += (targetVol - smoothedVolRef.current) * 0.05;
      smoothedFreqRef.current += (frequency - smoothedFreqRef.current) * 0.05;
      const sVol = smoothedVolRef.current;
      const sFreq = smoothedFreqRef.current;
      
      const width = (canvas as any).logicalWidth || canvas.width;
      const height = (canvas as any).logicalHeight || canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      
      // --- AUTO RESONANCE LOGIC ---
      let currentSgSettings = p.sgSettings;
      const hasSpiralModes = p.spiralResonanceModes && p.spiralResonanceModes.length > 0;
      if ((p.autoPilotMode === 'genesis' || p.sacredGeometryEnabled || hasSpiralModes) && p.sgAutoResonance) {
          const t = timeRef.current;
          currentSgSettings = { ...p.sgSettings };
          const modes = Object.keys(DEFAULT_PARAMS.sgSettings) as SacredGeometryMode[];
          
          modes.forEach((mode, i) => {
              const phi = 1.6180339;
              const phase = i * phi * Math.PI;
              
              // Harmonic oscillators (slower, more subtle)
              const slowOsc = Math.sin(t * 0.02 + phase);
              const midOsc = Math.cos(t * 0.05 + phase * phi);
              const fastOsc = Math.sin(t * 0.1 + phase / phi);
              
              // Complexity: Base 3, subtle variation (2 to 4) to prevent lag
              const complexity = Math.max(2, Math.min(4, Math.floor(3 + slowOsc + sVol * 1.5)));
              
              // Scale: Base 0.1, breathes subtly with volume and mid oscillation
              const scale = 0.1 + (sVol * 0.03) + (midOsc * 0.02);
              
              // Opacity: Base 0.5 for lines, 0.1 for bg. 
              // Adjusted by activeCount to prevent white-out, but kept highly visible.
              const activeSpiralModes = p.spiralResonanceModes || [];
              const activeSgModes = p.sacredGeometryEnabled ? (p.sacredGeometryModes || []) : [];
              const uniqueActiveModes = new Set([...activeSpiralModes, ...activeSgModes]);
              const activeCount = Math.max(1, uniqueActiveModes.size);
              const opacityDamping = Math.sqrt(activeCount);
              
              const lineOpacity = (0.4 + sVol * 0.2 + fastOsc * 0.1) / opacityDamping;
              const bgOpacity = (0.08 + sVol * 0.04 + slowOsc * 0.02) / opacityDamping;
              
              // Thickness: Base 0.1, subtle audio reaction
              const thickness = 0.1 + sVol * 0.05 + (sFreq > 0.8 ? 0.05 : 0);
              
              // Flow speed: Base 0.2, gentle drift
              const flowSpeed = 0.2 + slowOsc * 0.05 + midOsc * 0.05;
              
              // Audio reactivity: Base 5.0
              const audioReactivity = 4.0 + sFreq * 2.0;
              
              currentSgSettings[mode] = {
                  ...(DEFAULT_PARAMS.sgSettings[mode] || {}),
                  ...(p.sgSettings[mode] || {}),
                  complexity,
                  connectionSpan: Math.floor(100 + slowOsc * 20),
                  scale: Math.max(0.05, scale),
                  lineOpacity: Math.max(0.1, Math.min(1.0, lineOpacity)),
                  bgOpacity: Math.max(0.0, Math.min(1.0, bgOpacity)),
                  thickness: Math.max(0.05, thickness),
                  flowSpeed,
                  audioReactivity
              } as SacredGeometrySettings;
          });
      }

      // --- GLOBAL MULTIPLIERS ---
      if (p.sgGlobalOpacity !== undefined) {
          const modes = Object.keys(DEFAULT_PARAMS.sgSettings) as SacredGeometryMode[];
          
          if (currentSgSettings === p.sgSettings) {
              currentSgSettings = { ...p.sgSettings };
          }
          
          modes.forEach(mode => {
              const baseSettings = currentSgSettings[mode] || DEFAULT_PARAMS.sgSettings[mode];
              if (!baseSettings) return;
              currentSgSettings[mode] = {
                  ...baseSettings,
                  lineOpacity: Math.max(0.0, Math.min(1.0, baseSettings.lineOpacity * (p.sgGlobalOpacity ?? 1.0))),
                  bgOpacity: Math.max(0.0, Math.min(1.0, baseSettings.bgOpacity * (p.sgGlobalOpacity ?? 1.0))),
                  flowSpeed: baseSettings.flowSpeed * (p.sgGlobalFlowSpeed ?? 1.0),
                  audioReactivity: baseSettings.audioReactivity * (p.sgGlobalAudioReactivity ?? 1.0),
                  viscosity: (baseSettings.viscosity ?? 0.5) * (p.sgGlobalViscosity ?? 1.0)
              };
          });
      }

      // Clear with Trail
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0, 0, 0, ${p.trail})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      // --- DYNAMIC CALCULATIONS ---
      
      // 1. Center Breathing (Expansion)
      // Ensure dynamicK is strictly away from 1.0 if we want a spiral, but allow 1.0 for circles.
      // Defend against k being exactly 0 or null.
      const safeK = p.k || 1.0;
      const kPulse = (safeK - 1) + (sVol * 0.005); 
      const dynamicK = 1.0 + kPulse;

      // 2. Angular Velocity
      const dynamicPsi = (p.psi || 0) + (sFreq * 0.05);

      // 3. Zoom/Scale
      const minDim = Math.min(width, height);
      // Defend against zoom being 0
      const safeZoom = p.zoom || 0.001;
      const safeDistZoom = p.distanceZoom || 1.0;
      const responsiveZoom = safeZoom * safeDistZoom * minDim;

      // Prepare Math
      const rotReal = Math.cos(dynamicPsi);
      const rotImag = Math.sin(dynamicPsi);
      
      // Start Point (Centered)
      let zReal = 1.0 + (sVol * 0.2); 
      let zImag = 0.0;

      // Update time unconditionally for animations
      // In Genesis mode, time moves slower for calmer, organic flow
      const timeSpeed = p.autoPilotMode === 'genesis' ? p.hueSpeed * 0.2 : p.hueSpeed;
      timeRef.current += timeSpeed;

      // Color Calculation
      let displayBaseHue;
      if (p.harmonicColor || p.autoPilotMode !== 'drift') {
        let targetHue = p.baseHue;
        if (p.harmonicColor) {
           const logFreq = Math.log2(1 + sFreq * 32) / 5; 
           const hueOffset = logFreq * 360 * (p.harmonicSensitivity || 1);
           targetHue = (p.baseHue + hueOffset) % 360;
        }
        // Smooth color transition
        currentHueRef.current = lerpAngle(currentHueRef.current, targetHue, 0.05);
        displayBaseHue = currentHueRef.current;
      } else {
        currentHueRef.current = (p.baseHue + timeRef.current) % 360;
        displayBaseHue = currentHueRef.current;
      }

      const spiralPoints: {x: number, y: number, mag: number, angle: number}[] = [];

      // --- OFFSCREEN FADE LOGIC ---
      const currentSgModes = p.sacredGeometryModes || [];
      const currentResonanceModes = p.spiralResonanceModes || [];
      
      if (p.autoOffscreenFade) {
        // SG Modes
        prevSgModesRef.current.forEach(mode => {
          if (!currentSgModes.includes(mode) && !fadingSgModesRef.current.find(f => f.mode === mode)) {
            fadingSgModesRef.current.push({ mode, opacity: 1.0, scale: 1.0 });
          }
        });
        fadingSgModesRef.current = fadingSgModesRef.current.filter(f => {
          f.opacity -= 0.005; // Fade out speed
          f.scale += 0.02; // Expand speed
          return f.opacity > 0;
        });
        
        // Resonance Modes
        prevResonanceModesRef.current.forEach(mode => {
          if (!currentResonanceModes.includes(mode) && !fadingResonanceModesRef.current.find(f => f.mode === mode)) {
            fadingResonanceModesRef.current.push({ mode, opacity: 1.0, scale: 1.0 });
          }
        });
        fadingResonanceModesRef.current = fadingResonanceModesRef.current.filter(f => {
          f.opacity -= 0.005; // Fade out speed
          f.scale += 0.02; // Expand speed
          return f.opacity > 0;
        });
      } else {
        fadingSgModesRef.current = [];
        fadingResonanceModesRef.current = [];
      }
      
      prevSgModesRef.current = currentSgModes;
      prevResonanceModesRef.current = currentResonanceModes;

      const activeSgModes = currentSgModes;
      const allSgModesToDraw = [...activeSgModes.map(m => ({mode: m, opacity: 1.0, scale: 1.0})), ...fadingSgModesRef.current];

      // --- NEW LAYERED VISUALIZATION (BACKGROUND) ---
      if (p.sacredGeometryEnabled && (p.sgDrawMode === 'layers' || p.sgDrawMode === 'both')) {
          allSgModesToDraw.forEach(({mode, opacity: fadeOpacity, scale: fadeScale}, modeIndex) => {
              const settings = currentSgSettings[mode] || DEFAULT_PARAMS.sgSettings[mode];
              if (!settings) return;
              const numLayers = Math.max(1, Math.floor(settings.complexity));
              const baseRadius = Math.min(width, height) * 0.1 * settings.scale * fadeScale;
              const effectiveFlowSpeed = settings.flowSpeed * 0.5 * (1 - settings.viscosity * 0.8);
              const timeOffset = timeRef.current * effectiveFlowSpeed;
              const effectiveReactivity = settings.audioReactivity * (1 - settings.viscosity * 0.5);
              
              const regime = p.geometryData?.regime || 'primary';
              const baseLightness = regime === 'reciprocal' ? p.brightness + 30 : p.brightness + 15;
              
              for (let i = 0; i < numLayers; i++) {
                  // Calculate layer properties
                  const layerProgress = (i + (timeOffset % 1)) / numLayers; // 0 to 1, moving outward
                  
                  // Exponential expansion for infinite feel
                  const scale = Math.pow(2, layerProgress * 4) * baseRadius;
                  const radius = scale * (1.0 + sVol * effectiveReactivity * 0.5);
                  
                  // Color & Opacity
                  const hueOffset = layerProgress * p.hueRange;
                  const layerHue = (displayBaseHue + hueOffset) % 360;
                  
                  const { hue: finalHue, sat: finalSat, light: finalLight, lineOpacity: baseLineOpacity, bgOpacity: baseBgOpacity } = getGeometryColor(
                    p, settings, layerHue, sVol, modeIndex, allSgModesToDraw.length
                  );
                  
                  const lineOpacity = baseLineOpacity * fadeOpacity;
                  const bgOpacity = baseBgOpacity * fadeOpacity;
                  
                  // Fade in at center, fade out at edges
                  let alphaMultiplier = Math.sin(layerProgress * Math.PI);
                  alphaMultiplier *= (0.3 + 0.7 * sVol * effectiveReactivity);
                  alphaMultiplier = Math.min(1.0, Math.max(0.0, alphaMultiplier));
                  
                  // Rotation based on depth and time
                  const rotation = timeRef.current * 0.2 * (i % 2 === 0 ? 1 : -1) + layerProgress * Math.PI;

                  if (alphaMultiplier > 0.01) {
                      const modeRotation = rotation + (modeIndex * Math.PI / allSgModesToDraw.length);
                      const modeRadius = radius * (1 - (modeIndex * 0.05));
                      
                      const lineOpacity = baseLineOpacity * alphaMultiplier * fadeOpacity / Math.sqrt(allSgModesToDraw.length);
                      const bgOpacity = baseBgOpacity * alphaMultiplier * fadeOpacity / Math.sqrt(allSgModesToDraw.length);
                      
                      if (mode === 'flowerOfLife') {
                          drawSeedOfLife(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'torus') {
                          drawTorus(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, timeRef.current, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'quantumWave') {
                          drawQuantumCloud(ctx, cx, cy, modeRadius, timeRef.current, sVol * effectiveReactivity, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, settings.thickness);
                      } else if (mode === 'goldenSpiral') {
                          drawGoldenSpiral(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'metatron') {
                          drawMetatron(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'merkaba') {
                          drawMerkaba(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, timeRef.current, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'platonicSolids') {
                          drawPlatonicSolids(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, timeRef.current, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'sriYantra') {
                          drawSriYantra(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'cymatics') {
                          drawCymatics(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, timeRef.current, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'vectorEquilibrium') {
                          drawVectorEquilibrium(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, timeRef.current, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'treeOfLife') {
                          drawTreeOfLife(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'yinYang') {
                          drawYinYang(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, timeRef.current, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'mandala1') {
                          drawMandala1(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'mandala2') {
                          drawMandala2(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, timeRef.current, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'mandala3') {
                          drawMandala3(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, timeRef.current, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'holographicFractal') {
                          drawHolographicFractal(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, timeRef.current, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'chakras') {
                          drawChakras(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, timeRef.current, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'om') {
                          drawOm(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'lotus') {
                          drawLotus(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, timeRef.current, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'dharmaChakra') {
                          drawDharmaChakra(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, timeRef.current, sVol * effectiveReactivity, settings.thickness);
                      }
                  }
              }
          });
      }

      // FRACTAL LOOP (The Spiral Equation: Zn+1 = Zn * (k * e^iψ))
      ctx.beginPath();
      
      let prevX = cx + zReal * responsiveZoom;
      let prevY = cy - zImag * responsiveZoom;
      ctx.moveTo(prevX, prevY);

      for (let n = 0; n < p.iter; n++) {
        
        // Scale
        const zrK = zReal * dynamicK;
        const ziK = zImag * dynamicK;

        // Rotate
        let nextReal = (zrK * rotReal - ziK * rotImag);
        let nextImag = (zrK * rotImag + ziK * rotReal);

        // Translate (Z0)
        nextReal += p.z0_r;
        nextImag += p.z0_i;

        zReal = nextReal;
        zImag = nextImag;

        let px = cx + zReal * responsiveZoom;
        let py = cy - zImag * responsiveZoom;

        // --- SAFEGUARD: Prevent huge coordinates or NaN crashing the 2D Canvas renderer ---
        // Break once it is safely outside the screen borders to optimize CPU and prevent math explosions
        if (!Number.isFinite(px) || !Number.isFinite(py) || Math.abs(px - cx) > width * 2 || Math.abs(py - cy) > height * 2) {
            break;
        }

        // --- METAPHYSICAL PERTURBATION ---
        // Modulate the spiral's path organically based on the selected sacred geometry
        const activeSpiralModes = p.spiralResonanceModes || [];
        const allResonanceModesToDraw = [...activeSpiralModes.map(m => ({mode: m, opacity: 1.0, scale: 1.0})), ...fadingResonanceModesRef.current];
        
        if (allResonanceModesToDraw.length > 0) {
            const t = timeRef.current * 0.2;
            
            let totalOffsetX = 0;
            let totalOffsetY = 0;
            
            allResonanceModesToDraw.forEach(({mode, opacity: fadeOpacity, scale: fadeScale}) => {
                const settings = p.sgSettings[mode] || DEFAULT_PARAMS.sgSettings[mode];
                if (!settings) return;
                const react = settings.audioReactivity * fadeOpacity * fadeScale;
                if (mode === 'goldenSpiral') {
                    const angle = Math.atan2(py - cy, px - cx);
                    const offset = Math.sin(angle * 1.6180339 - t) * 10 * sVol * react;
                    totalOffsetX += Math.cos(angle) * offset;
                    totalOffsetY += Math.sin(angle) * offset;
                } else if (mode === 'quantumWave') {
                    const wave = Math.sin(n * 0.1 - t) * Math.cos(n * 0.05 + t);
                    totalOffsetX += wave * 15 * sVol * react;
                    totalOffsetY -= wave * 15 * sVol * react;
                } else if (mode === 'flowerOfLife') {
                    const angle = Math.atan2(py - cy, px - cx);
                    const hex = Math.cos(angle * 6 + t) * 12 * sVol * react;
                    totalOffsetX += Math.cos(angle) * hex;
                    totalOffsetY += Math.sin(angle) * hex;
                } else if (mode === 'torus') {
                    const dist = Math.sqrt((px-cx)**2 + (py-cy)**2);
                    const fold = Math.sin(dist * 0.01 - t * 2) * 10 * sVol * react;
                    const angle = Math.atan2(py - cy, px - cx);
                    totalOffsetX += Math.cos(angle) * fold;
                    totalOffsetY += Math.sin(angle) * fold;
                } else if (mode === 'metatron') {
                    const angle = Math.atan2(py - cy, px - cx);
                    const hex = Math.cos(angle * 6) * 15 * sVol * react;
                    totalOffsetX += Math.cos(angle) * hex;
                    totalOffsetY += Math.sin(angle) * hex;
                } else if (mode === 'merkaba') {
                    const angle = Math.atan2(py - cy, px - cx);
                    const tri1 = Math.sin(angle * 3 + t) * 10 * sVol * react;
                    const tri2 = Math.sin(angle * 3 - t + Math.PI) * 10 * sVol * react;
                    totalOffsetX += Math.cos(angle) * (tri1 + tri2);
                    totalOffsetY += Math.sin(angle) * (tri1 + tri2);
                } else if (mode === 'platonicSolids') {
                    const angle = Math.atan2(py - cy, px - cx);
                    const poly = Math.cos(angle * 5 + t * 2) * 12 * sVol * react;
                    totalOffsetX += Math.cos(angle) * poly;
                    totalOffsetY += Math.sin(angle) * poly;
                } else if (mode === 'sriYantra') {
                    const dist = Math.sqrt((px-cx)**2 + (py-cy)**2);
                    const angle = Math.atan2(py - cy, px - cx);
                    const triangles = Math.sin(angle * 9) * Math.cos(dist * 0.05) * 15 * sVol * react;
                    totalOffsetX += Math.cos(angle) * triangles;
                    totalOffsetY += Math.sin(angle) * triangles;
                } else if (mode === 'cymatics') {
                    const dist = Math.sqrt((px-cx)**2 + (py-cy)**2);
                    const angle = Math.atan2(py - cy, px - cx);
                    const nodes = 6 + Math.floor(sVol * 6) * 2;
                    const wave = Math.sin(nodes * angle + t) * Math.cos(dist * 0.02 - t) * 20 * sVol * react;
                    totalOffsetX += Math.cos(angle) * wave;
                    totalOffsetY += Math.sin(angle) * wave;
                } else if (mode === 'vectorEquilibrium') {
                    const angle = Math.atan2(py - cy, px - cx);
                    const jitter = Math.sin(t * 4) * Math.cos(angle * 12) * 10 * sVol * react;
                    totalOffsetX += Math.cos(angle) * jitter;
                    totalOffsetY += Math.sin(angle) * jitter;
                } else if (mode === 'treeOfLife') {
                    const dist = Math.sqrt((px-cx)**2 + (py-cy)**2);
                    const nodes = Math.sin(dist * 0.1) * Math.cos(dist * 0.05) * 12 * sVol * react;
                    totalOffsetY += nodes; // Vertical bias
                } else if (mode === 'yinYang') {
                    const angle = Math.atan2(py - cy, px - cx);
                    const swirl = Math.sin(angle + t) * 15 * sVol * react;
                    totalOffsetX += Math.cos(angle + Math.PI/2) * swirl;
                    totalOffsetY += Math.sin(angle + Math.PI/2) * swirl;
                } else if (mode === 'mandala1' || mode === 'mandala2' || mode === 'mandala3') {
                    const angle = Math.atan2(py - cy, px - cx);
                    const petals = Math.cos(angle * 8 + t) * 12 * sVol * react;
                    totalOffsetX += Math.cos(angle) * petals;
                    totalOffsetY += Math.sin(angle) * petals;
                } else if (mode === 'holographicFractal') {
                    const angle = Math.atan2(py - cy, px - cx);
                    const dist = Math.sqrt((px-cx)**2 + (py-cy)**2);
                    const frac = Math.sin(angle * 6) * Math.cos(dist * 0.1 + t) * 15 * sVol * react;
                    totalOffsetX += Math.cos(angle) * frac;
                    totalOffsetY += Math.sin(angle) * frac;
                } else if (mode === 'chakras') {
                    const dist = Math.sqrt((px-cx)**2 + (py-cy)**2);
                    const pulse = Math.sin(dist * 0.05 - t * 3) * 10 * sVol * react;
                    totalOffsetY -= pulse; // Upward flow
                } else if (mode === 'om') {
                    const angle = Math.atan2(py - cy, px - cx);
                    const dist = Math.sqrt((px-cx)**2 + (py-cy)**2);
                    const vibration = Math.sin(dist * 0.02 - t * 5) * Math.cos(angle * 3) * 15 * sVol * react;
                    totalOffsetX += Math.cos(angle) * vibration;
                    totalOffsetY += Math.sin(angle) * vibration;
                } else if (mode === 'lotus') {
                    const angle = Math.atan2(py - cy, px - cx);
                    const open = Math.sin(angle * 8) * Math.max(0, Math.sin(t)) * 15 * sVol * react;
                    totalOffsetX += Math.cos(angle) * open;
                    totalOffsetY += Math.sin(angle) * open;
                } else if (mode === 'dharmaChakra') {
                    const angle = Math.atan2(py - cy, px - cx);
                    const wheel = Math.cos(angle * 8 + t * 2) * 12 * sVol * react;
                    totalOffsetX += Math.cos(angle) * wheel;
                    totalOffsetY += Math.sin(angle) * wheel;
                }
            });
            
            // Average the offsets to prevent wild swings when multiple modes are active
            px += totalOffsetX / Math.sqrt(allResonanceModesToDraw.length);
            py += totalOffsetY / Math.sqrt(allResonanceModesToDraw.length);
        }

        ctx.lineTo(px, py);
        prevX = px;
        prevY = py;
        
        // Store point for sacred geometry
        if (p.sacredGeometryEnabled || activeSpiralModes.length > 0) {
            const mag = Math.sqrt(zReal*zReal + zImag*zImag);
            const angle = Math.atan2(zImag, zReal);
            spiralPoints.push({x: px, y: py, mag, angle});
        }
      }

      // Stroke Application
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      const intensity = Math.min(sVol * 60, 40);
      const secHue = (displayBaseHue + p.hueRange) % 360;
      
      // If Reciprocal Regime (High Tension), add white/bright center
      const brightnessBoost = p.geometryData?.regime === 'reciprocal' ? 30 : 0;

      let baseLightness = p.brightness;
      if (p.sgAutoHarmonic) {
         baseLightness = p.sgTheme === 'dark' ? 20 : 80;
      }

      const col1Lightness = p.sgTheme === 'dark' 
        ? Math.max(0, baseLightness - intensity - brightnessBoost)
        : Math.min(100, baseLightness + intensity + brightnessBoost);
        
      const col2Lightness = p.sgTheme === 'dark'
        ? Math.min(100, baseLightness + 20 - intensity)
        : Math.max(0, baseLightness - 20 + intensity);

      const col1 = `hsl(${displayBaseHue}, ${p.saturation}%, ${col1Lightness}%)`;
      const col2 = `hsl(${secHue}, ${p.saturation}%, ${col2Lightness}%)`;
      
      gradient.addColorStop(0, col1);
      gradient.addColorStop(1, col2);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = (p.spiralThickness || 1.0) + (sVol * 2);
      ctx.lineJoin = 'round';
      
      if (p.brightness > 30) {
         ctx.shadowBlur = sVol * 15;
         ctx.shadowColor = col1;
      }
      
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Sacred Geometry Web (Nodes)
      if (p.sacredGeometryEnabled && spiralPoints.length > 0) {
          
          if ((p.sgDrawMode === 'nodes' || p.sgDrawMode === 'both') && p.sgShowNodes) {
              // --- ORIGINAL EMANATING NODES ---
              const getSpiralPoint = (t: number) => {
                  const len = spiralPoints.length;
                  let safeT = ((t % len) + len) % len;
                  const i = Math.floor(safeT);
                  const j = (i + 1) % len;
                  const frac = safeT - i;
                  
                  const p1 = spiralPoints[i];
                  const p2 = spiralPoints[j];
                  
                  const angleDiff = (p2.angle - p1.angle + Math.PI*3) % (Math.PI*2) - Math.PI;
                  
                  return {
                      x: p1.x + (p2.x - p1.x) * frac,
                      y: p1.y + (p2.y - p1.y) * frac,
                      mag: p1.mag + (p2.mag - p1.mag) * frac,
                      angle: p1.angle + angleDiff * frac
                  };
              };

              allSgModesToDraw.forEach(({mode, opacity: fadeOpacity, scale: fadeScale}, modeIndex) => {
                  const settings = currentSgSettings[mode] || DEFAULT_PARAMS.sgSettings[mode];
                  if (!settings) return;
                  const numNodes = Math.max(1, Math.floor(settings.complexity));
                  const step = spiralPoints.length / numNodes;
                  
                  // Flowing effect: nodes move continuously along the spiral
                  const effectiveFlowSpeed = settings.flowSpeed * 15 * (1 - settings.viscosity * 0.8);
                  const timeOffset = timeRef.current * effectiveFlowSpeed; 
                  const effectiveReactivity = settings.audioReactivity * (1 - settings.viscosity * 0.5);
                  
                  for (let i = 0; i < numNodes; i++) {
                      const t1 = timeOffset + i * step;
                      const pt1 = getSpiralPoint(t1);
                      
                      // Dynamic radius
                      let radius = Math.pow(pt1.mag, 0.5) * responsiveZoom * 0.05 * settings.scale * fadeScale;
                      radius *= (1.0 + sVol * effectiveReactivity);
                      
                      // Color & Opacity
                      const hueOffset = (i / numNodes) * p.hueRange * 0.5;
                      const nodeHue = (displayBaseHue + hueOffset) % 360;
                      
                      const { hue: finalHue, sat: finalSat, light: finalLight, lineOpacity: baseLineOpacity, bgOpacity: baseBgOpacity } = getGeometryColor(
                        p, settings, nodeHue, sVol, modeIndex, allSgModesToDraw.length
                      );
                      
                      let alphaMultiplier = (0.15 + 0.85 * sVol * effectiveReactivity);
                      alphaMultiplier = Math.min(1.0, Math.max(0.02, alphaMultiplier));
                      
                      const rotation = pt1.angle + timeRef.current * 0.1;

                      const modeRotation = rotation + (modeIndex * Math.PI / allSgModesToDraw.length);
                      const modeRadius = radius * (1 - (modeIndex * 0.05));
                      
                      const lineOpacity = baseLineOpacity * alphaMultiplier * fadeOpacity / Math.sqrt(allSgModesToDraw.length);
                      const bgOpacity = baseBgOpacity * alphaMultiplier * fadeOpacity / Math.sqrt(allSgModesToDraw.length);
                      
                      if (mode === 'flowerOfLife') {
                          drawSeedOfLife(ctx, pt1.x, pt1.y, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'torus') {
                          drawTorus(ctx, pt1.x, pt1.y, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, timeRef.current, sVol * effectiveReactivity, settings.thickness);
                      } else if (mode === 'quantumWave') {
                          drawQuantumCloud(ctx, pt1.x, pt1.y, modeRadius, timeRef.current, sVol * effectiveReactivity, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, settings.thickness);
                      } else if (mode === 'goldenSpiral') {
                          drawGoldenSpiral(ctx, pt1.x, pt1.y, modeRadius, modeRotation, lineOpacity, bgOpacity, finalHue, finalSat, finalLight, sVol * effectiveReactivity, settings.thickness);
                      }
                  }
              });
          }
      }
      
      // Draw Regime HUD (optional, subtle)
      if (p.geometryData && p.autoPilotMode !== 'drift' && p.showIndicators) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.font = '10px monospace';
          ctx.fillText(`${p.geometryData.name} [α:${p.geometryData.alpha.toFixed(1)} β:${p.geometryData.beta.toFixed(2)}]`, 20, height - 20);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // Start loop
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []); 

  return (
    <div className="w-full h-full relative bg-transparent overflow-hidden shadow-inner">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default VisualizerCanvas;