import React, { useRef, useEffect } from 'react';
import { VisualizerParams } from '../types';

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
        ctx.arc(x, y, rad, 0, Math.PI*2); 
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
    ctx.arc(0, 0, r * 3, 0, Math.PI*2);
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
        ctx.ellipse(xOffset, yOffset, tubeRadius, tubeRadius * (0.2 + squeeze * 0.8), a + time, 0, Math.PI*2);
        if (bgOpacity > 0) ctx.fill();
        ctx.stroke();
    }
    
    // Core energy line
    ctx.beginPath();
    ctx.arc(0, 0, mainRadius, 0, Math.PI*2);
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
        ctx.arc(0, 0, radius, 0, Math.PI*2);
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
    ctx.arc(0, 0, r * 0.2 * (1 + vol), 0, Math.PI*2);
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
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
         animationFrameId = requestAnimationFrame(render);
         return;
      }

      // Read latest state from REFS
      const p = paramsRef.current;
      const getMetrics = getMetricsRef.current;
      
      const { volume, frequency } = getMetrics(p.sensitivity, p.freqRange);
      
      // Smooth audio for organic movement
      smoothedVolRef.current += (volume - smoothedVolRef.current) * 0.05;
      smoothedFreqRef.current += (frequency - smoothedFreqRef.current) * 0.05;
      const sVol = smoothedVolRef.current;
      const sFreq = smoothedFreqRef.current;
      
      const width = (canvas as any).logicalWidth || canvas.width;
      const height = (canvas as any).logicalHeight || canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      
      // --- AUTO RESONANCE LOGIC ---
      let currentSgSettings = p.sgSettings;
      if (p.autoPilotMode === 'genesis' && p.sgAutoResonance) {
          const t = timeRef.current;
          currentSgSettings = { ...p.sgSettings };
          const modes: ('goldenSpiral' | 'flowerOfLife' | 'quantumWave' | 'torus')[] = ['goldenSpiral', 'flowerOfLife', 'quantumWave', 'torus'];
          
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
              const activeCount = p.sgResonanceModes?.length || 1;
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
                  complexity,
                  connectionSpan: Math.floor(100 + slowOsc * 20),
                  scale: Math.max(0.05, scale),
                  lineOpacity: Math.max(0.1, Math.min(1.0, lineOpacity)),
                  bgOpacity: Math.max(0.0, Math.min(1.0, bgOpacity)),
                  thickness: Math.max(0.05, thickness),
                  flowSpeed,
                  audioReactivity
              };
          });
      }

      // Clear with Trail
      ctx.fillStyle = `rgba(0, 0, 0, ${p.trail})`;
      ctx.fillRect(0, 0, width, height);

      // --- DYNAMIC CALCULATIONS ---
      
      // 1. Center Breathing (Expansion)
      // Reducimos el impacto directo del volumen para evitar que la espiral colapse/desaparezca
      const kPulse = (p.k - 1) + (sVol * 0.005); 
      const dynamicK = 1.0 + kPulse;

      // 2. Angular Velocity
      const dynamicPsi = p.psi + (sFreq * 0.05);

      // 3. Zoom/Scale
      const minDim = Math.min(width, height);
      const responsiveZoom = p.zoom * minDim;

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

      // --- NEW LAYERED VISUALIZATION (BACKGROUND) ---
      if (p.autoPilotMode === 'genesis' && p.geometryData && p.sgDrawMode === 'layers') {
          const modes = p.sgResonanceModes || ['flowerOfLife'];
          const activeModes = modes.length > 0 ? modes : ['flowerOfLife'];
          
          activeModes.forEach((mode, modeIndex) => {
              const settings = currentSgSettings[mode];
              const numLayers = Math.max(1, Math.floor(settings.complexity));
              const baseRadius = Math.min(width, height) * 0.1 * settings.scale;
              const flowSpeed = settings.flowSpeed * 0.5;
              const timeOffset = timeRef.current * flowSpeed;
              
              const regime = p.geometryData!.regime;
              const baseLightness = regime === 'reciprocal' ? p.brightness + 30 : p.brightness + 15;
              
              for (let i = 0; i < numLayers; i++) {
                  // Calculate layer properties
                  const layerProgress = (i + (timeOffset % 1)) / numLayers; // 0 to 1, moving outward
                  
                  // Exponential expansion for infinite feel
                  const scale = Math.pow(2, layerProgress * 4) * baseRadius;
                  const radius = scale * (1.0 + sVol * settings.audioReactivity * 0.5);
                  
                  // Color & Opacity
                  const hueOffset = layerProgress * p.hueRange;
                  const layerHue = (displayBaseHue + hueOffset) % 360;
                  const layerLightness = Math.min(100, baseLightness + sVol * 40 * settings.audioReactivity);
                  
                  // Fade in at center, fade out at edges
                  let alphaMultiplier = Math.sin(layerProgress * Math.PI);
                  alphaMultiplier *= (0.3 + 0.7 * sVol * settings.audioReactivity);
                  alphaMultiplier = Math.min(1.0, Math.max(0.0, alphaMultiplier));
                  
                  // Rotation based on depth and time
                  const rotation = timeRef.current * 0.2 * (i % 2 === 0 ? 1 : -1) + layerProgress * Math.PI;

                  if (alphaMultiplier > 0.01) {
                      const modeRotation = rotation + (modeIndex * Math.PI / activeModes.length);
                      const modeRadius = radius * (1 - (modeIndex * 0.05));
                      const modeHue = (layerHue + modeIndex * 30) % 360;
                      
                      const lineOpacity = settings.lineOpacity * alphaMultiplier / Math.sqrt(activeModes.length);
                      const bgOpacity = settings.bgOpacity * alphaMultiplier / Math.sqrt(activeModes.length);
                      
                      if (mode === 'flowerOfLife') {
                          drawSeedOfLife(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, modeHue, p.saturation, layerLightness, sVol * settings.audioReactivity, settings.thickness);
                      } else if (mode === 'torus') {
                          drawTorus(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, modeHue, p.saturation, layerLightness, timeRef.current, sVol * settings.audioReactivity, settings.thickness);
                      } else if (mode === 'quantumWave') {
                          drawQuantumCloud(ctx, cx, cy, modeRadius, timeRef.current, sVol * settings.audioReactivity, lineOpacity, bgOpacity, modeHue, p.saturation, layerLightness, settings.thickness);
                      } else if (mode === 'goldenSpiral') {
                          drawGoldenSpiral(ctx, cx, cy, modeRadius, modeRotation, lineOpacity, bgOpacity, modeHue, p.saturation, layerLightness, sVol * settings.audioReactivity, settings.thickness);
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

        // --- METAPHYSICAL PERTURBATION (Genesis Mode) ---
        // Modulate the spiral's path organically based on the selected sacred geometry
        if (p.autoPilotMode === 'genesis') {
            const t = timeRef.current * 0.2;
            const modes = p.sgResonanceModes || ['flowerOfLife'];
            const activeModes = modes.length > 0 ? modes : ['flowerOfLife'];
            
            let totalOffsetX = 0;
            let totalOffsetY = 0;
            
            activeModes.forEach(mode => {
                const settings = p.sgSettings[mode];
                const react = settings.audioReactivity;
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
                }
            });
            
            // Average the offsets to prevent wild swings when multiple modes are active
            px += totalOffsetX / Math.sqrt(activeModes.length);
            py += totalOffsetY / Math.sqrt(activeModes.length);
        }

        ctx.lineTo(px, py);
        prevX = px;
        prevY = py;
        
        // Store point for sacred geometry
        if (p.autoPilotMode === 'genesis') {
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

      const col1 = `hsl(${displayBaseHue}, ${p.saturation}%, ${Math.min(100, p.brightness + intensity + brightnessBoost)}%)`;
      const col2 = `hsl(${secHue}, ${p.saturation}%, ${Math.max(0, p.brightness - 20 + intensity)}%)`;
      
      gradient.addColorStop(0, col1);
      gradient.addColorStop(1, col2);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1 + (sVol * 2);
      ctx.lineJoin = 'round';
      
      if (p.brightness > 30) {
         ctx.shadowBlur = sVol * 15;
         ctx.shadowColor = col1;
      }
      
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Sacred Geometry Web (Nodes)
      if (p.autoPilotMode === 'genesis' && p.geometryData && spiralPoints.length > 0) {
          
          if (p.sgDrawMode === 'nodes' && p.sgShowNodes) {
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

              const modes = p.sgResonanceModes || ['flowerOfLife'];
              const activeModes = modes.length > 0 ? modes : ['flowerOfLife'];
              
              activeModes.forEach((mode, modeIndex) => {
                  const settings = currentSgSettings[mode];
                  const numNodes = Math.max(1, Math.floor(settings.complexity));
                  const step = spiralPoints.length / numNodes;
                  
                  // Flowing effect: nodes move continuously along the spiral
                  const flowSpeed = settings.flowSpeed * 15; 
                  const timeOffset = timeRef.current * flowSpeed; 
                  
                  for (let i = 0; i < numNodes; i++) {
                      const t1 = timeOffset + i * step;
                      const pt1 = getSpiralPoint(t1);
                      
                      // Dynamic radius
                      let radius = Math.pow(pt1.mag, 0.5) * responsiveZoom * 0.05 * settings.scale;
                      radius *= (1.0 + sVol * settings.audioReactivity);
                      
                      // Color & Opacity
                      const hueOffset = (i / numNodes) * p.hueRange * 0.5;
                      const nodeHue = (displayBaseHue + hueOffset) % 360;
                      
                      const regime = p.geometryData!.regime;
                      const baseLightness = regime === 'reciprocal' ? p.brightness + 30 : p.brightness + 15;
                      const nodeLightness = Math.min(100, baseLightness + sVol * 40 * settings.audioReactivity);
                      
                      let alphaMultiplier = (0.15 + 0.85 * sVol * settings.audioReactivity);
                      alphaMultiplier = Math.min(1.0, Math.max(0.02, alphaMultiplier));
                      
                      const rotation = pt1.angle + timeRef.current * 0.1;

                      const modeRotation = rotation + (modeIndex * Math.PI / activeModes.length);
                      const modeRadius = radius * (1 - (modeIndex * 0.05));
                      const modeHueFinal = (nodeHue + modeIndex * 30) % 360;
                      
                      const lineOpacity = settings.lineOpacity * alphaMultiplier / Math.sqrt(activeModes.length);
                      const bgOpacity = settings.bgOpacity * alphaMultiplier / Math.sqrt(activeModes.length);
                      
                      if (mode === 'flowerOfLife') {
                          drawSeedOfLife(ctx, pt1.x, pt1.y, modeRadius, modeRotation, lineOpacity, bgOpacity, modeHueFinal, p.saturation, nodeLightness, sVol * settings.audioReactivity, settings.thickness);
                      } else if (mode === 'torus') {
                          drawTorus(ctx, pt1.x, pt1.y, modeRadius, modeRotation, lineOpacity, bgOpacity, modeHueFinal, p.saturation, nodeLightness, timeRef.current, sVol * settings.audioReactivity, settings.thickness);
                      } else if (mode === 'quantumWave') {
                          drawQuantumCloud(ctx, pt1.x, pt1.y, modeRadius, timeRef.current, sVol * settings.audioReactivity, lineOpacity, bgOpacity, modeHueFinal, p.saturation, nodeLightness, settings.thickness);
                      } else if (mode === 'goldenSpiral') {
                          drawGoldenSpiral(ctx, pt1.x, pt1.y, modeRadius, modeRotation, lineOpacity, bgOpacity, modeHueFinal, p.saturation, nodeLightness, sVol * settings.audioReactivity, settings.thickness);
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
    <div className="w-full h-full relative bg-black overflow-hidden shadow-inner">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default VisualizerCanvas;