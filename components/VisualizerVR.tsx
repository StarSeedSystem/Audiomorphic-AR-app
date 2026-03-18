import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { OrbitControls, Html, DeviceOrientationControls } from '@react-three/drei';
import * as THREE from 'three';
import { StereoEffect } from 'three-stdlib';
import { EffectComposer, Bloom, Noise, HueSaturation, Vignette, Glitch, ChromaticAberration, ColorAverage, DepthOfField } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import { VisualizerParams } from '../types';
import ControlPanel from './ControlPanel';

const store = createXRStore();

interface VisualizerVRProps {
  params: VisualizerParams;
  getAudioMetrics: (sensitivity: number, freqRange: number) => { volume: number, frequency: number };
  setParams: React.Dispatch<React.SetStateAction<VisualizerParams>>;
  audioActive: boolean;
  toggleAudio: () => void;
}

// A component to handle the device orientation (gyroscope) if not in WebXR
// Replaced by DeviceOrientationControls from drei

const StereoCamera = ({ active }: { active: boolean }) => {
  const { gl, camera, scene, size } = useThree();
  const effectRef = useRef<StereoEffect | null>(null);

  useEffect(() => {
    if (active) {
      effectRef.current = new StereoEffect(gl);
      effectRef.current.setSize(size.width, size.height);
    } else {
      effectRef.current = null;
      gl.setScissorTest(false);
      gl.setViewport(0, 0, size.width, size.height);
    }
  }, [active, gl, size]);

  useFrame(({ gl, scene, camera }) => {
    if (active && effectRef.current) {
      effectRef.current.render(scene, camera);
    } else {
      gl.render(scene, camera);
    }
  }, 1); // Render pass

  return null;
};

function addCircle3D(positions: Float32Array, colors: Float32Array, offset: number, cx: number, cy: number, cz: number, radius: number, rx: number, ry: number, rz: number, r: number, g: number, b: number, opacity: number) {
    const segments = 32;
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

    for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        
        // Point 1
        let px1 = Math.cos(a1) * radius, py1 = Math.sin(a1) * radius, pz1 = 0;
        let x1 = px1 * cosZ - py1 * sinZ, y1 = px1 * sinZ + py1 * cosZ, z1 = pz1;
        let y1x = y1 * cosX - z1 * sinX, z1x = y1 * sinX + z1 * cosX;
        let x1y = x1 * cosY + z1x * sinY, z1y = -x1 * sinY + z1x * cosY;
        
        positions[offset * 3] = cx + x1y; positions[offset * 3 + 1] = cy + y1x; positions[offset * 3 + 2] = cz + z1y;
        colors[offset * 3] = r * opacity; colors[offset * 3 + 1] = g * opacity; colors[offset * 3 + 2] = b * opacity;
        offset++;
        
        // Point 2
        let px2 = Math.cos(a2) * radius, py2 = Math.sin(a2) * radius, pz2 = 0;
        let x2 = px2 * cosZ - py2 * sinZ, y2 = px2 * sinZ + py2 * cosZ, z2 = pz2;
        let y2x = y2 * cosX - z2 * sinX, z2x = y2 * sinX + z2 * cosX;
        let x2y = x2 * cosY + z2x * sinY, z2y = -x2 * sinY + z2x * cosY;
        
        positions[offset * 3] = cx + x2y; positions[offset * 3 + 1] = cy + y2x; positions[offset * 3 + 2] = cz + z2y;
        colors[offset * 3] = r * opacity; colors[offset * 3 + 1] = g * opacity; colors[offset * 3 + 2] = b * opacity;
        offset++;
    }
    return offset;
}

function addFlowerOfLife3D(positions: Float32Array, colors: Float32Array, offset: number, cx: number, cy: number, cz: number, radius: number, rx: number, ry: number, rz: number, r: number, g: number, b: number, opacity: number) {
    offset = addCircle3D(positions, colors, offset, cx, cy, cz, radius, rx, ry, rz, r, g, b, opacity);
    
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const cosZ = Math.cos(rz), sinZ = Math.sin(rz);
    
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const lx = Math.cos(angle) * radius;
        const ly = Math.sin(angle) * radius;
        
        let x1 = lx * cosZ - ly * sinZ, y1 = lx * sinZ + ly * cosZ, z1 = 0;
        let y1x = y1 * cosX - z1 * sinX, z1x = y1 * sinX + z1 * cosX;
        let x1y = x1 * cosY + z1x * sinY, z1y = -x1 * sinY + z1x * cosY;
        
        offset = addCircle3D(positions, colors, offset, cx + x1y, cy + y1x, cz + z1y, radius, rx, ry, rz, r, g, b, opacity);
    }
    return offset;
}

function addTorus3D(positions: Float32Array, colors: Float32Array, offset: number, cx: number, cy: number, cz: number, radius: number, rx: number, ry: number, rz: number, r: number, g: number, b: number, opacity: number, time: number) {
    const rings = 16;
    const segments = 32;
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

    for (let i = 0; i < rings; i++) {
        const angle = (i / rings) * Math.PI * 2 + time * 0.5;
        const ox = Math.cos(angle) * radius * 0.6;
        const oy = Math.sin(angle) * radius * 0.6;
        
        for (let j = 0; j < segments; j++) {
            const a1 = (j / segments) * Math.PI * 2;
            const a2 = ((j + 1) / segments) * Math.PI * 2;
            
            let px1 = ox + Math.cos(a1) * radius * 0.4 * Math.cos(angle);
            let py1 = oy + Math.cos(a1) * radius * 0.4 * Math.sin(angle);
            let pz1 = Math.sin(a1) * radius * 0.4;
            
            let px2 = ox + Math.cos(a2) * radius * 0.4 * Math.cos(angle);
            let py2 = oy + Math.cos(a2) * radius * 0.4 * Math.sin(angle);
            let pz2 = Math.sin(a2) * radius * 0.4;
            
            let x1 = px1 * cosZ - py1 * sinZ, y1 = px1 * sinZ + py1 * cosZ, z1 = pz1;
            let y1x = y1 * cosX - z1 * sinX, z1x = y1 * sinX + z1 * cosX;
            let x1y = x1 * cosY + z1x * sinY, z1y = -x1 * sinY + z1x * cosY;
            
            let x2 = px2 * cosZ - py2 * sinZ, y2 = px2 * sinZ + py2 * cosZ, z2 = pz2;
            let y2x = y2 * cosX - z2 * sinX, z2x = y2 * sinX + z2 * cosX;
            let x2y = x2 * cosY + z2x * sinY, z2y = -x2 * sinY + z2x * cosY;
            
            positions[offset * 3] = cx + x1y; positions[offset * 3 + 1] = cy + y1x; positions[offset * 3 + 2] = cz + z1y;
            colors[offset * 3] = r * opacity; colors[offset * 3 + 1] = g * opacity; colors[offset * 3 + 2] = b * opacity;
            offset++;
            
            positions[offset * 3] = cx + x2y; positions[offset * 3 + 1] = cy + y2x; positions[offset * 3 + 2] = cz + z2y;
            colors[offset * 3] = r * opacity; colors[offset * 3 + 1] = g * opacity; colors[offset * 3 + 2] = b * opacity;
            offset++;
        }
    }
    return offset;
}

function addGoldenSpiral3D(positions: Float32Array, colors: Float32Array, offset: number, cx: number, cy: number, cz: number, radius: number, rx: number, ry: number, rz: number, r: number, g: number, b: number, opacity: number) {
    const segments = 100;
    const phi = 1.6180339;
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

    for (let i = 0; i < segments - 1; i++) {
        const t1 = i / segments * Math.PI * 6;
        const t2 = (i + 1) / segments * Math.PI * 6;
        
        const r1 = radius * Math.pow(phi, t1 / Math.PI) * 0.1;
        const r2 = radius * Math.pow(phi, t2 / Math.PI) * 0.1;
        
        let px1 = Math.cos(t1) * r1, py1 = Math.sin(t1) * r1, pz1 = (t1 / (Math.PI * 6)) * radius;
        let px2 = Math.cos(t2) * r2, py2 = Math.sin(t2) * r2, pz2 = (t2 / (Math.PI * 6)) * radius;
        
        let x1 = px1 * cosZ - py1 * sinZ, y1 = px1 * sinZ + py1 * cosZ, z1 = pz1;
        let y1x = y1 * cosX - z1 * sinX, z1x = y1 * sinX + z1 * cosX;
        let x1y = x1 * cosY + z1x * sinY, z1y = -x1 * sinY + z1x * cosY;
        
        let x2 = px2 * cosZ - py2 * sinZ, y2 = px2 * sinZ + py2 * cosZ, z2 = pz2;
        let y2x = y2 * cosX - z2 * sinX, z2x = y2 * sinX + z2 * cosX;
        let x2y = x2 * cosY + z2x * sinY, z2y = -x2 * sinY + z2x * cosY;
        
        positions[offset * 3] = cx + x1y; positions[offset * 3 + 1] = cy + y1x; positions[offset * 3 + 2] = cz + z1y;
        colors[offset * 3] = r * opacity; colors[offset * 3 + 1] = g * opacity; colors[offset * 3 + 2] = b * opacity;
        offset++;
        
        positions[offset * 3] = cx + x2y; positions[offset * 3 + 1] = cy + y2x; positions[offset * 3 + 2] = cz + z2y;
        colors[offset * 3] = r * opacity; colors[offset * 3 + 1] = g * opacity; colors[offset * 3 + 2] = b * opacity;
        offset++;
    }
    return offset;
}

function addQuantumWave3D(positions: Float32Array, colors: Float32Array, offset: number, cx: number, cy: number, cz: number, radius: number, rx: number, ry: number, rz: number, time: number, r: number, g: number, b: number, opacity: number) {
    const segments = 120;
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

    for (let i = 0; i < segments - 1; i++) {
        const t1 = (i / segments) * Math.PI * 2;
        const t2 = ((i + 1) / segments) * Math.PI * 2;
        
        const r1 = radius * (0.6 + 0.4 * Math.sin(t1 * 7 + time * 2));
        const r2 = radius * (0.6 + 0.4 * Math.sin(t2 * 7 + time * 2));
        
        let px1 = Math.cos(t1) * r1, py1 = Math.sin(t1) * r1, pz1 = Math.cos(t1 * 5 + time) * radius * 0.5;
        let px2 = Math.cos(t2) * r2, py2 = Math.sin(t2) * r2, pz2 = Math.cos(t2 * 5 + time) * radius * 0.5;
        
        let x1 = px1 * cosZ - py1 * sinZ, y1 = px1 * sinZ + py1 * cosZ, z1 = pz1;
        let y1x = y1 * cosX - z1 * sinX, z1x = y1 * sinX + z1 * cosX;
        let x1y = x1 * cosY + z1x * sinY, z1y = -x1 * sinY + z1x * cosY;
        
        let x2 = px2 * cosZ - py2 * sinZ, y2 = px2 * sinZ + py2 * cosZ, z2 = pz2;
        let y2x = y2 * cosX - z2 * sinX, z2x = y2 * sinX + z2 * cosX;
        let x2y = x2 * cosY + z2x * sinY, z2y = -x2 * sinY + z2x * cosY;
        
        positions[offset * 3] = cx + x1y; positions[offset * 3 + 1] = cy + y1x; positions[offset * 3 + 2] = cz + z1y;
        colors[offset * 3] = r * opacity; colors[offset * 3 + 1] = g * opacity; colors[offset * 3 + 2] = b * opacity;
        offset++;
        
        positions[offset * 3] = cx + x2y; positions[offset * 3 + 1] = cy + y2x; positions[offset * 3 + 2] = cz + z2y;
        colors[offset * 3] = r * opacity; colors[offset * 3 + 1] = g * opacity; colors[offset * 3 + 2] = b * opacity;
        offset++;
    }
    return offset;
}

const Spiral3D = ({ params, getAudioMetrics }: { params: VisualizerParams, getAudioMetrics: any }) => {
  const lineRef = useRef<THREE.Line>(null);
  const positionsRef = useRef<Float32Array>(new Float32Array(0));
  const colorsRef = useRef<Float32Array>(new Float32Array(0));
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  
  const maxSgPoints = 100000;
  const sgPositionsRef = useRef<Float32Array>(new Float32Array(maxSgPoints * 3));
  const sgColorsRef = useRef<Float32Array>(new Float32Array(maxSgPoints * 3));
  const sgGeometryRef = useRef<THREE.BufferGeometry>(null);
  const sgMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  
  const smoothedVolRef = useRef<number>(0);
  const smoothedFreqRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const currentHueRef = useRef<number>(params.baseHue);

  useMemo(() => {
    positionsRef.current = new Float32Array(params.iter * 3);
    colorsRef.current = new Float32Array(params.iter * 3);
  }, [params.iter]);

  const geometryRef = useRef<THREE.BufferGeometry>(null);

  useFrame((state, delta) => {
    if (!lineRef.current || !geometryRef.current) return;

    const { volume, frequency } = getAudioMetrics(params.sensitivity, params.freqRange);
    
    smoothedVolRef.current += (volume - smoothedVolRef.current) * 0.05;
    smoothedFreqRef.current += (frequency - smoothedFreqRef.current) * 0.05;
    const sVol = smoothedVolRef.current;
    const sFreq = smoothedFreqRef.current;

    const kPulse = (params.k - 1) + (sVol * 0.005); 
    const dynamicK = 1.0 + kPulse;
    const dynamicPsi = params.psi + (sFreq * 0.05);

    const rotReal = Math.cos(dynamicPsi);
    const rotImag = Math.sin(dynamicPsi);
    
    let zReal = 1.0 + (sVol * 0.2); 
    let zImag = 0.0;

    const timeSpeed = params.autoPilotMode === 'genesis' ? params.hueSpeed * 0.2 : params.hueSpeed;
    timeRef.current += timeSpeed;

    // --- AUTO RESONANCE LOGIC ---
    let currentSgSettings = params.sgSettings;
    if (params.autoPilotMode === 'genesis' && params.sgAutoResonance) {
        const t = timeRef.current;
        currentSgSettings = { ...params.sgSettings };
        const modes: ('goldenSpiral' | 'flowerOfLife' | 'quantumWave' | 'torus')[] = ['goldenSpiral', 'flowerOfLife', 'quantumWave', 'torus'];
        
        modes.forEach((mode, i) => {
            const phi = 1.6180339;
            const phase = i * phi * Math.PI;
            
            const slowOsc = Math.sin(t * 0.02 + phase);
            const midOsc = Math.cos(t * 0.05 + phase * phi);
            const fastOsc = Math.sin(t * 0.1 + phase / phi);
            
            const complexity = Math.max(2, Math.min(4, Math.floor(3 + slowOsc + sVol * 1.5)));
            const scale = 0.1 + (sVol * 0.03) + (midOsc * 0.02);
            const activeCount = params.sgResonanceModes?.length || 1;
            const opacityDamping = Math.sqrt(activeCount);
            
            const lineOpacity = (0.4 + sVol * 0.2 + fastOsc * 0.1) / opacityDamping;
            const bgOpacity = (0.08 + sVol * 0.04 + slowOsc * 0.02) / opacityDamping;
            const thickness = 0.1 + sVol * 0.05 + (sFreq > 0.8 ? 0.05 : 0);
            const flowSpeed = 0.2 + slowOsc * 0.05 + midOsc * 0.05;
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

    let displayBaseHue = params.baseHue;
    if (params.harmonicColor || params.autoPilotMode !== 'drift') {
      let targetHue = params.baseHue;
      if (params.harmonicColor) {
         const logFreq = Math.log2(1 + sFreq * 32) / 5; 
         const hueOffset = logFreq * 360 * (params.harmonicSensitivity || 1);
         targetHue = (params.baseHue + hueOffset) % 360;
      }
      const d = targetHue - currentHueRef.current;
      const deltaHue = (d + 540) % 360 - 180; 
      currentHueRef.current = (currentHueRef.current + deltaHue * 0.05 + 360) % 360;
      displayBaseHue = currentHueRef.current;
    } else {
      currentHueRef.current = (params.baseHue + timeRef.current) % 360;
      displayBaseHue = currentHueRef.current;
    }

    const positions = positionsRef.current;
    const colors = colorsRef.current;

    const zoom = params.zoom * 10; // Scale up for 3D
    
    // If symmetric, we stretch the depth massively to make it feel truly infinite
    const effectiveDepth = params.vrSymmetric ? params.vrDepth * 10 : params.vrDepth;

    for (let n = 0; n < params.iter; n++) {
      const zrK = zReal * dynamicK;
      const ziK = zImag * dynamicK;

      let nextReal = (zrK * rotReal - ziK * rotImag) + params.z0_r;
      let nextImag = (zrK * rotImag + ziK * rotReal) + params.z0_i;

      zReal = nextReal;
      zImag = nextImag;

      let px = zReal * zoom;
      let py = zImag * zoom;
      
      // Continuous spiral from -effectiveDepth/2 to +effectiveDepth/2
      let pz = (n / params.iter - 0.5) * effectiveDepth;

      // Make it a portal around the user by adding vrRadius
      const dist = Math.sqrt(px*px + py*py);
      const angle = Math.atan2(py, px);
      
      // In symmetric mode, we use a logarithmic scale to flatten the exponential growth
      // of the complex recurrence. This turns the expanding cone into a uniform 3D cylinder/tunnel.
      const radiusFactor = params.vrSymmetric ? (Math.log1p(dist) * 5 + params.vrRadius) : (dist + params.vrRadius);
      
      px = Math.cos(angle) * radiusFactor;
      py = Math.sin(angle) * radiusFactor;

      // Genesis perturbation
      if (params.autoPilotMode === 'genesis') {
          const modes = params.sgResonanceModes || ['flowerOfLife'];
          const activeModes = modes.length > 0 ? modes : ['flowerOfLife'];
          
          let totalOffsetX = 0;
          let totalOffsetY = 0;
          let totalOffsetZ = 0;
          
          activeModes.forEach(mode => {
              const settings = currentSgSettings[mode];
              const react = settings.audioReactivity;
              const complexity = settings.complexity;
              const scale = settings.scale * 10; // scale up for 3D
              const t = timeRef.current * settings.flowSpeed;
              
              if (mode === 'goldenSpiral') {
                  const offset = Math.sin(angle * 1.6180339 * complexity - t) * scale * sVol * react;
                  totalOffsetX += Math.cos(angle) * offset;
                  totalOffsetY += Math.sin(angle) * offset;
                  totalOffsetZ += Math.cos(angle * 2) * offset;
              } else if (mode === 'quantumWave') {
                  const wave = Math.sin(n * 0.1 * complexity - t) * Math.cos(n * 0.05 + t);
                  totalOffsetX += wave * scale * 5 * sVol * react;
                  totalOffsetY -= wave * scale * 5 * sVol * react;
                  totalOffsetZ += Math.sin(n * 0.05) * scale * 5 * sVol * react;
              } else if (mode === 'flowerOfLife') {
                  const hex = Math.cos(angle * 6 * complexity + t) * scale * 3 * sVol * react;
                  totalOffsetX += Math.cos(angle) * hex;
                  totalOffsetY += Math.sin(angle) * hex;
                  totalOffsetZ += Math.sin(angle * 3) * hex;
              } else if (mode === 'torus') {
                  const fold = Math.sin(dist * 0.1 * complexity - t * 2) * scale * 4 * sVol * react;
                  totalOffsetX += Math.cos(angle) * fold;
                  totalOffsetY += Math.sin(angle) * fold;
                  totalOffsetZ += Math.cos(dist * 0.05) * fold;
              }
          });
          
          px += totalOffsetX / Math.sqrt(activeModes.length);
          py += totalOffsetY / Math.sqrt(activeModes.length);
          pz += totalOffsetZ / Math.sqrt(activeModes.length);
      }

      positions[n * 3] = px;
      positions[n * 3 + 1] = py;
      positions[n * 3 + 2] = pz;

      // Fade to black at the ends to create the illusion of infinite depth
      let edgeFade = 1.0;
      if (params.vrSymmetric) {
          const progress = n / params.iter;
          // Fade out the first 25% and last 25%
          if (progress < 0.25) {
              edgeFade = progress / 0.25;
          } else if (progress > 0.75) {
              edgeFade = (1.0 - progress) / 0.25;
          }
          edgeFade = Math.pow(edgeFade, 1.5); // Smooth easing
      }

      // Color gradient along the spiral
      const hue = (displayBaseHue + (n / params.iter) * params.hueRange) % 360;
      const lightness = (params.brightness / 100 + sVol * 0.5) * edgeFade;
      const color = new THREE.Color().setHSL(hue / 360, params.saturation / 100, lightness);
      
      colors[n * 3] = color.r;
      colors[n * 3 + 1] = color.g;
      colors[n * 3 + 2] = color.b;
    }

    if (geometryRef.current) {
      geometryRef.current.setDrawRange(0, params.iter);
      geometryRef.current.attributes.position.needsUpdate = true;
      geometryRef.current.attributes.color.needsUpdate = true;
    }
    
    if (materialRef.current) {
      if ('linewidth' in materialRef.current) {
        (materialRef.current as any).linewidth = params.vrThickness + sVol * 5;
      }
    }

    // --- SACRED GEOMETRY 3D (Layers & Nodes) ---
    let sgOffset = 0;
    const sgPositions = sgPositionsRef.current;
    const sgColors = sgColorsRef.current;

    if (params.autoPilotMode === 'genesis' && params.geometryData) {
        const modes = params.sgResonanceModes || ['flowerOfLife'];
        const activeModes = modes.length > 0 ? modes : ['flowerOfLife'];
        const regime = params.geometryData.regime;
        const baseLightness = regime === 'reciprocal' ? params.brightness + 30 : params.brightness + 15;

        if (params.sgDrawMode === 'layers') {
            activeModes.forEach((mode, modeIndex) => {
                const settings = currentSgSettings[mode];
                const numLayers = Math.max(3, Math.floor(settings.complexity * 5)); // More layers for VR tunnel
                const baseRadius = 10 * settings.scale; // Larger base radius
                const flowSpeed = settings.flowSpeed * 0.2;
                const tunnelDepth = params.vrDepth * 20; // Deep tunnel
                
                for (let i = 0; i < numLayers; i++) {
                    const layerProgress = i / numLayers;
                    // Flow towards camera
                    const zFraction = (layerProgress + timeRef.current * flowSpeed) % 1.0;
                    
                    // Z position: from slightly behind camera to deep in the distance
                    const cz = (0.1 - zFraction) * tunnelDepth;
                    
                    // Radius pulses with audio
                    const radius = baseRadius * (1 + sVol * settings.audioReactivity * 0.5);
                    
                    // Rotations
                    const rz = zFraction * Math.PI * 2 + timeRef.current * 0.5 * (modeIndex % 2 === 0 ? 1 : -1) + (modeIndex * Math.PI / activeModes.length);
                    const rx = Math.sin(timeRef.current * 0.3 + i) * 0.5 * sVol * settings.audioReactivity;
                    const ry = Math.cos(timeRef.current * 0.4 + i) * 0.5 * sVol * settings.audioReactivity;
                    
                    // Color and Opacity
                    const hueOffset = zFraction * params.hueRange;
                    const layerHue = (displayBaseHue + hueOffset + modeIndex * 30) % 360;
                    const layerLightness = Math.min(100, baseLightness + sVol * 50 * settings.audioReactivity);
                    
                    // Fade out in distance and very close to camera
                    const distanceFade = Math.sin(zFraction * Math.PI); 
                    const opacity = Math.min(1.0, settings.lineOpacity * distanceFade * (0.5 + 1.5 * sVol * settings.audioReactivity) * 2.0);
                    
                    if (opacity > 0.01 && sgOffset < maxSgPoints - 2000) {
                        const color = new THREE.Color().setHSL(layerHue / 360, params.saturation / 100, layerLightness / 100);
                        
                        if (mode === 'flowerOfLife') {
                            sgOffset = addFlowerOfLife3D(sgPositions, sgColors, sgOffset, 0, 0, cz, radius, rx, ry, rz, color.r, color.g, color.b, opacity);
                        } else if (mode === 'torus') {
                            sgOffset = addTorus3D(sgPositions, sgColors, sgOffset, 0, 0, cz, radius, rx, ry, rz, color.r, color.g, color.b, opacity, timeRef.current);
                        } else if (mode === 'quantumWave') {
                            sgOffset = addQuantumWave3D(sgPositions, sgColors, sgOffset, 0, 0, cz, radius, rx, ry, rz, timeRef.current, color.r, color.g, color.b, opacity);
                        } else if (mode === 'goldenSpiral') {
                            sgOffset = addGoldenSpiral3D(sgPositions, sgColors, sgOffset, 0, 0, cz, radius, rx, ry, rz, color.r, color.g, color.b, opacity);
                        }
                    }
                }
            });
        } else if (params.sgDrawMode === 'nodes' && params.sgShowNodes) {
            activeModes.forEach((mode, modeIndex) => {
                const settings = currentSgSettings[mode];
                const numNodes = Math.max(2, Math.floor(settings.complexity * 2));
                const step = params.iter / numNodes;
                const flowSpeed = settings.flowSpeed * 20; 
                const timeOffset = timeRef.current * flowSpeed; 
                
                for (let i = 0; i < numNodes; i++) {
                    const t1 = timeOffset + i * step;
                    const len = params.iter;
                    let safeT = ((t1 % len) + len) % len;
                    const idx = Math.floor(safeT);
                    
                    if (idx * 3 + 2 < positions.length && sgOffset < maxSgPoints - 2000) {
                        const ptX = positions[idx * 3];
                        const ptY = positions[idx * 3 + 1];
                        const ptZ = positions[idx * 3 + 2];
                        const mag = Math.sqrt(ptX*ptX + ptY*ptY + ptZ*ptZ);
                        
                        let radius = (mag * 0.1 + 2) * settings.scale;
                        radius *= (1.0 + sVol * settings.audioReactivity * 1.5);
                        
                        const hueOffset = (i / numNodes) * params.hueRange;
                        const nodeHue = (displayBaseHue + hueOffset + modeIndex * 45) % 360;
                        const nodeLightness = Math.min(100, baseLightness + sVol * 50 * settings.audioReactivity);
                        
                        const opacity = Math.min(1.0, settings.lineOpacity * (0.4 + 1.6 * sVol * settings.audioReactivity) * 2.0);
                        
                        // 3D Rotation spinning wildly but harmonically
                        const rx = timeRef.current * 1.1 + i * 0.1;
                        const ry = timeRef.current * 1.3 + i * 0.2;
                        const rz = timeRef.current * 0.7 + i * 0.3 + (modeIndex * Math.PI / activeModes.length);
                        
                        const color = new THREE.Color().setHSL(nodeHue / 360, params.saturation / 100, nodeLightness / 100);
                        
                        if (mode === 'flowerOfLife') {
                            sgOffset = addFlowerOfLife3D(sgPositions, sgColors, sgOffset, ptX, ptY, ptZ, radius, rx, ry, rz, color.r, color.g, color.b, opacity);
                        } else if (mode === 'torus') {
                            sgOffset = addTorus3D(sgPositions, sgColors, sgOffset, ptX, ptY, ptZ, radius, rx, ry, rz, color.r, color.g, color.b, opacity, timeRef.current);
                        } else if (mode === 'quantumWave') {
                            sgOffset = addQuantumWave3D(sgPositions, sgColors, sgOffset, ptX, ptY, ptZ, radius, rx, ry, rz, timeRef.current, color.r, color.g, color.b, opacity);
                        } else if (mode === 'goldenSpiral') {
                            sgOffset = addGoldenSpiral3D(sgPositions, sgColors, sgOffset, ptX, ptY, ptZ, radius, rx, ry, rz, color.r, color.g, color.b, opacity);
                        }
                    }
                }
            });
        }
    }

    if (sgGeometryRef.current) {
        sgGeometryRef.current.setDrawRange(0, sgOffset);
        sgGeometryRef.current.attributes.position.needsUpdate = true;
        sgGeometryRef.current.attributes.color.needsUpdate = true;
    }
  });

  return (
    <group>
      {params.autoPilotMode === 'genesis' && params.sgDrawMode === 'nodes' ? (
        <points>
          <bufferGeometry ref={geometryRef}>
            <bufferAttribute
              attach="attributes-position"
              count={params.iter}
              array={positionsRef.current}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={params.iter}
              array={colorsRef.current}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial size={params.vrThickness * 0.1} vertexColors transparent opacity={params.trail} sizeAttenuation={true} />
        </points>
      ) : (
        <line ref={lineRef}>
          <bufferGeometry ref={geometryRef}>
            <bufferAttribute
              attach="attributes-position"
              count={params.iter}
              array={positionsRef.current}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={params.iter}
              array={colorsRef.current}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial ref={materialRef} vertexColors transparent opacity={params.trail} />
        </line>
      )}
      
      {/* Sacred Geometry Overlay */}
      <lineSegments>
        <bufferGeometry ref={sgGeometryRef}>
          <bufferAttribute
            attach="attributes-position"
            count={maxSgPoints}
            array={sgPositionsRef.current}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={maxSgPoints}
            array={sgColorsRef.current}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial ref={sgMaterialRef} vertexColors transparent opacity={1.0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </group>
  );
};

// VR HUD Menu that follows the camera
const VRMenu = ({ params, setParams, audioActive, toggleAudio, visible }: any) => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (groupRef.current && visible) {
      // Make the menu follow the camera smoothly
      camera.getWorldDirection(dir);
      targetPos.copy(camera.position).add(dir.multiplyScalar(2));
      groupRef.current.position.lerp(targetPos, 0.05);
      groupRef.current.quaternion.slerp(camera.quaternion, 0.05);
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <Html transform distanceFactor={1.5} position={[0, 0, 0]}>
        <div 
          className="w-[1024px] h-[768px] pointer-events-auto" 
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <ControlPanel 
            params={params} 
            setParams={setParams} 
            audioActive={audioActive} 
            toggleAudio={toggleAudio} 
          />
        </div>
      </Html>
    </group>
  );
};

const CameraUpdater = ({ distance, isSymmetric }: { distance: number, isSymmetric: boolean }) => {
  const { camera } = useThree();
  useFrame(() => {
    // In symmetric mode (infinite tunnel), the user is exactly in the center (Z=0).
    // Otherwise, they are looking at the portal from the specified distance.
    // We only update the camera position if not in VR, as the VR headset controls its own position.
    if (!store.getState().session) {
      const targetZ = isSymmetric ? 0 : distance;
      camera.position.z += (targetZ - camera.position.z) * 0.05;
    }
  });
  return null;
};

const CameraBackground = ({ active, store }: { active: boolean, store: any }) => {
  const { scene, gl } = useThree();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);

  useEffect(() => {
    if (!active) {
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        videoRef.current = null;
      }
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      scene.background = null;
      return;
    }

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    videoRef.current = video;

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        const texture = new THREE.VideoTexture(videoRef.current);
        texture.colorSpace = THREE.SRGBColorSpace;
        textureRef.current = texture;
        scene.background = texture;
      })
      .catch(err => {
        console.error("Error accessing camera:", err?.message || err);
      });

    return () => {
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
      if (textureRef.current) {
        textureRef.current.dispose();
      }
      scene.background = null;
    };
  }, [active, scene, gl]);

  useFrame(() => {
    if (active && textureRef.current) {
      const session = store.getState().session;
      if (session && session.mode === 'immersive-ar') {
        scene.background = null;
      } else {
        scene.background = textureRef.current;
      }
    }
  });

  return null;
};

// Component to handle dragging the environment
const DragRotation = ({ active, targetGroupRef }: { active: boolean, targetGroupRef: React.RefObject<THREE.Group> }) => {
  const { gl } = useThree();
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!active) return;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      const deltaMove = {
        x: e.clientX - previousMousePosition.current.x,
        y: e.clientY - previousMousePosition.current.y
      };

      targetRotation.current.x += deltaMove.y * 0.005;
      // Clamp X rotation to prevent flipping upside down and gimbal lock
      targetRotation.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotation.current.x));
      targetRotation.current.y += deltaMove.x * 0.005;

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => {
      isDragging.current = false;
    };

    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      gl.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [active, gl.domElement]);

  useFrame(() => {
    if (!active || !targetGroupRef.current) return;
    
    // Smoothly interpolate current rotation towards target rotation
    currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.1;
    currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.1;
    
    // Apply rotation to the target group
    targetGroupRef.current.rotation.x = currentRotation.current.x;
    targetGroupRef.current.rotation.y = currentRotation.current.y;
  });

  return null;
};

const AREffects = ({ filter, intensity, getAudioMetrics }: { filter: string, intensity: number, getAudioMetrics: any }) => {
  const glitchRef = useRef<any>(null);
  const bloomRef = useRef<any>(null);
  const chromaticRef = useRef<any>(null);
  const hueRef = useRef<any>(null);
  const noiseRef = useRef<any>(null);

  useFrame((state) => {
    const metrics = getAudioMetrics(5.0, 1.0);
    const vol = metrics.volume;
    const time = state.clock.elapsedTime;

    if (filter === 'psychedelic' && hueRef.current && bloomRef.current && chromaticRef.current) {
      hueRef.current.hue = (time * 0.5) % (Math.PI * 2);
      bloomRef.current.intensity = intensity * 2 + vol * 3;
      chromaticRef.current.offset.set(0.02 * intensity + vol * 0.05, 0.02 * intensity + vol * 0.05);
    }
    
    if (filter === 'noir' && noiseRef.current) {
      noiseRef.current.blendMode.opacity.value = intensity * 0.5 + vol * 0.5;
    }

    if (filter === 'neon' && bloomRef.current && chromaticRef.current) {
      bloomRef.current.intensity = intensity * 3 + vol * 4;
      chromaticRef.current.offset.set(0.01 * intensity + vol * 0.03, 0);
    }

    if (filter === 'glitch' && glitchRef.current) {
      // Glitch is mostly handled by its own active state, but we could toggle it on loud beats
      if (vol > 0.8) {
        glitchRef.current.mode = GlitchMode.CONSTANT_WILD;
      } else {
        glitchRef.current.mode = GlitchMode.SPORADIC;
      }
    }

    if (filter === 'dream' && bloomRef.current) {
      bloomRef.current.intensity = intensity * 1.5 + vol * 2;
    }

    if (filter === 'hypnotic' && hueRef.current && chromaticRef.current && bloomRef.current) {
      hueRef.current.hue = Math.sin(time * 0.2) * Math.PI;
      chromaticRef.current.offset.set(Math.sin(time) * 0.05 * intensity * (1+vol), Math.cos(time) * 0.05 * intensity * (1+vol));
      bloomRef.current.intensity = intensity * 2 + vol * 2;
    }
  });

  if (filter === 'none') return null;

  return (
    <EffectComposer disableNormalPass={false}>
      {filter === 'psychedelic' && (
        <>
          <HueSaturation ref={hueRef} hue={Math.PI * intensity} saturation={intensity * 2} />
          <ChromaticAberration ref={chromaticRef} offset={new THREE.Vector2(0.02 * intensity, 0.02 * intensity)} />
          <Bloom ref={bloomRef} luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={intensity * 2} />
        </>
      )}
      {filter === 'noir' && (
        <>
          <ColorAverage blendFunction={BlendFunction.NORMAL} />
          <Noise ref={noiseRef} opacity={intensity * 0.5} />
          <Vignette eskil={false} offset={0.1} darkness={intensity * 1.5} />
        </>
      )}
      {filter === 'neon' && (
        <>
          <HueSaturation saturation={intensity * 1.5} />
          <Bloom ref={bloomRef} luminanceThreshold={0.1} luminanceSmoothing={0.9} height={300} intensity={intensity * 3} />
          <ChromaticAberration ref={chromaticRef} offset={new THREE.Vector2(0.01 * intensity, 0.0)} />
        </>
      )}
      {filter === 'glitch' && (
        <>
          <Glitch 
            ref={glitchRef}
            delay={new THREE.Vector2(1.5, 3.5)} 
            duration={new THREE.Vector2(0.1, 0.3)} 
            strength={new THREE.Vector2(0.1 * intensity, 0.5 * intensity)} 
            active 
          />
          <Noise opacity={intensity * 0.2} />
        </>
      )}
      {filter === 'dream' && (
        <>
          <Bloom ref={bloomRef} luminanceThreshold={0.4} luminanceSmoothing={0.9} height={300} intensity={intensity * 1.5} />
          <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2 * intensity} height={480} />
          <Vignette eskil={false} offset={0.1} darkness={intensity} />
        </>
      )}
      {filter === 'hypnotic' && (
        <>
          <HueSaturation ref={hueRef} hue={Math.PI * 0.5 * intensity} saturation={intensity} />
          <ChromaticAberration ref={chromaticRef} offset={new THREE.Vector2(0.05 * intensity, 0.05 * intensity)} />
          <Noise opacity={intensity * 0.3} />
          <Bloom ref={bloomRef} luminanceThreshold={0.1} luminanceSmoothing={0.9} height={300} intensity={intensity * 2} />
        </>
      )}
    </EffectComposer>
  );
};

const VisualizerVR: React.FC<VisualizerVRProps> = ({ params, getAudioMetrics, setParams, audioActive, toggleAudio }) => {
  const [hasOrientation, setHasOrientation] = useState(false);
  const [menuVisible, setMenuVisible] = useState(true);
  const spiralGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Check if device has orientation sensor
    const checkOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        setHasOrientation(true);
      }
      window.removeEventListener('deviceorientation', checkOrientation);
    };
    window.addEventListener('deviceorientation', checkOrientation);

    // Request device orientation permission on iOS
    const requestOrientation = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === 'granted') {
            setHasOrientation(true);
          }
        } catch (e: any) {
          console.error(e?.message || e);
        }
      }
    };
    window.addEventListener('click', requestOrientation, { once: true });
    
    return () => window.removeEventListener('deviceorientation', checkOrientation);
  }, []);

  return (
    <div className={`w-full h-full relative ${params.arMode ? 'bg-transparent' : 'bg-black'}`} style={{ touchAction: 'none' }}>
      {params.showIndicators && (
        <div className="absolute top-4 left-4 z-50 flex gap-2">
          {!params.arMode ? (
            <button 
              onClick={() => {
                store.enterVR().catch((err) => {
                  console.error("Error entering VR:", err?.message || err);
                  alert("Realidad Virtual no está soportada en este dispositivo o no se encontró un visor VR conectado.");
                });
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg"
            >
              Entrar a VR (WebXR)
            </button>
          ) : (
            <button 
              onClick={() => {
                store.enterAR().catch((err) => {
                  console.error("Error entering AR:", err?.message || err);
                  alert("Realidad Aumentada no está soportada en este dispositivo.");
                });
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg"
            >
              Entrar a AR (Cámara)
            </button>
          )}
        </div>
      )}

      <Canvas 
        camera={{ position: [0, 0, params.vrDistance], fov: 75 }}
        onPointerMissed={() => setMenuVisible(v => !v)}
      >
        {!params.arMode && <color attach="background" args={['#050505']} />}
        <ambientLight intensity={0.5} />
        
        <XR store={store}>
          <group ref={spiralGroupRef}>
            <Spiral3D params={params} getAudioMetrics={getAudioMetrics} />
          </group>
          <VRMenu params={params} setParams={setParams} audioActive={audioActive} toggleAudio={toggleAudio} visible={menuVisible} />
        </XR>

        {hasOrientation && <DeviceOrientationControls />}
        
        <DragRotation active={true} targetGroupRef={spiralGroupRef} />
        
        <CameraUpdater distance={params.vrDistance} isSymmetric={params.vrSymmetric} />
        <StereoCamera active={params.vrSplitScreen} />
        <CameraBackground active={params.arMode} store={store} />
        
        {params.arMode && <AREffects filter={params.arFilter} intensity={params.arIntensity} getAudioMetrics={getAudioMetrics} />}
      </Canvas>
    </div>
  );
};

export default VisualizerVR;
