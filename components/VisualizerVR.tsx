import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { OrbitControls, Html, DeviceOrientationControls } from '@react-three/drei';
import * as THREE from 'three';
import { StereoEffect } from 'three-stdlib';
import { EffectComposer, Bloom, Noise, HueSaturation, Vignette, Glitch, ChromaticAberration, ColorAverage, DepthOfField } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { VisualizerParams, DEFAULT_PARAMS, SacredGeometrySettings, SacredGeometryMode, SubscriptionTier } from '../types';
import ControlPanel from './ControlPanel';

const store = createXRStore();

interface VisualizerVRProps {
  params: VisualizerParams;
  getAudioMetrics: (sensitivity: number, freqRange: number) => { volume: number, frequency: number };
  setParams: React.Dispatch<React.SetStateAction<VisualizerParams>>;
  audioActive: boolean;
  toggleAudio: () => void;
  subscriptionTier: SubscriptionTier;
  onShowSubscription: () => void;
  audioDevices?: MediaDeviceInfo[];
  selectedAudioDeviceId?: string;
  onAudioDeviceChange?: (deviceId: string) => void;
}

const useFaceTracker = (enabled: boolean) => {
  const facePositionRef = useRef({ x: 0, y: 0, z: 5 });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const requestRef = useRef<number>(0);
  const [hasCamera, setHasCamera] = useState(true);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  useEffect(() => {
    if (!enabled) {
      facePositionRef.current = { x: 0, y: 0, z: 5 };
      return;
    }

    let isMounted = true;
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1
        });
        if (!isMounted) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        videoRef.current = video;

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        video.srcObject = stream;
        
        await new Promise((resolve) => {
          video.onloadedmetadata = () => resolve(true);
        });
        video.play();

        let lastVideoTime = -1;
        const detectFace = () => {
          if (!isMounted || !videoRef.current || !landmarkerRef.current) return;
          if (videoRef.current.readyState >= 2) {
            if (videoRef.current.currentTime !== lastVideoTime) {
              lastVideoTime = videoRef.current.currentTime;
              try {
                const results = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());
                if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                  const landmarks = results.faceLandmarks[0];
                  const nose = landmarks[1];
                  const leftCheek = landmarks[234];
                  const rightCheek = landmarks[454];
                  const faceWidth = Math.sqrt(
                    Math.pow(leftCheek.x - rightCheek.x, 2) + 
                    Math.pow(leftCheek.y - rightCheek.y, 2)
                  );
                  const rawX = (0.5 - nose.x) * 2.0; 
                  const rawY = (0.5 - nose.y) * 2.0; 
                  const clampedFaceWidth = Math.max(Math.min(faceWidth, 0.6), 0.05);
                  const rawZ = 0.15 / clampedFaceWidth;
                  const prev = facePositionRef.current;
                  facePositionRef.current = {
                    x: prev.x * 0.4 + rawX * 0.6,
                    y: prev.y * 0.4 + rawY * 0.6,
                    z: prev.z * 0.4 + rawZ * 0.6
                  };
                }
              } catch (e) {}
            }
          }
          requestRef.current = requestAnimationFrame(detectFace);
        };
        detectFace();
      } catch (err) {
        console.error("Face tracking error, falling back to mouse:", err);
        setHasCamera(false);
      }
    };

    init();

    const handleMouseMove = (e: MouseEvent) => {
      if (!hasCamera) {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = -(e.clientY / window.innerHeight) * 2 + 1;
        const prev = facePositionRef.current;
        facePositionRef.current = {
          x: prev.x + (nx - prev.x) * 0.1,
          y: prev.y + (ny - prev.y) * 0.1,
          z: 5
        };
      }
    };

    if (!hasCamera) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      isMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) stream.getTracks().forEach(track => track.stop());
      }
      if (landmarkerRef.current) landmarkerRef.current.close();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [hasCamera, enabled]);

  return facePositionRef;
};

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
  const { size } = useThree();

  useFrame((state, delta) => {
    if (!lineRef.current || !geometryRef.current) return;

    const { volume, frequency } = getAudioMetrics(params.sensitivity, params.freqRange);
    
    smoothedVolRef.current += (volume - smoothedVolRef.current) * 0.05;
    smoothedFreqRef.current += (frequency - smoothedFreqRef.current) * 0.05;
    const sVol = smoothedVolRef.current;
    const sFreq = smoothedFreqRef.current;

    let currentK = params.k;
    let currentPsi = params.psi;
    let currentZ0r = params.z0_r;
    let currentZ0i = params.z0_i;

    const kPulse = (currentK - 1) + (sVol * 0.005); 
    const dynamicK = 1.0 + kPulse;
    const dynamicPsi = currentPsi + (sFreq * 0.05);

    const rotReal = Math.cos(dynamicPsi);
    const rotImag = Math.sin(dynamicPsi);
    
    let zReal = 1.0 + (sVol * 0.2); 
    let zImag = 0.0;

    const timeSpeed = params.autoPilotMode === 'genesis' ? params.hueSpeed * 0.2 : params.hueSpeed;
    timeRef.current += timeSpeed;

    // --- AUTO RESONANCE LOGIC ---
    let currentSgSettings = params.sgSettings;
    if ((params.autoPilotMode === 'genesis' || params.sacredGeometryEnabled) && params.sgAutoResonance) {
        const t = timeRef.current;
        currentSgSettings = { ...params.sgSettings };
        const modes = Object.keys(DEFAULT_PARAMS.sgSettings) as SacredGeometryMode[];
        
        modes.forEach((mode, i) => {
            const phi = 1.6180339;
            const phase = i * phi * Math.PI;
            
            const slowOsc = Math.sin(t * 0.02 + phase);
            const midOsc = Math.cos(t * 0.05 + phase * phi);
            const fastOsc = Math.sin(t * 0.1 + phase / phi);
            
            const complexity = Math.max(2, Math.min(4, Math.floor(3 + slowOsc + sVol * 1.5)));
            const scale = 0.1 + (sVol * 0.03) + (midOsc * 0.02);
            
            // Calculate active count combining both spiral and sacred geometry modes
            const activeSpiralModes = params.autoPilotMode === 'genesis' ? (params.spiralResonanceModes || []) : [];
            const activeSgModes = params.sacredGeometryEnabled ? (params.sacredGeometryModes || []) : [];
            const uniqueActiveModes = new Set([...activeSpiralModes, ...activeSgModes]);
            const activeCount = Math.max(1, uniqueActiveModes.size);
            
            const opacityDamping = Math.sqrt(activeCount);
            
            const lineOpacity = (0.4 + sVol * 0.2 + fastOsc * 0.1) / opacityDamping;
            const bgOpacity = (0.08 + sVol * 0.04 + slowOsc * 0.02) / opacityDamping;
            const thickness = 0.1 + sVol * 0.05 + (sFreq > 0.8 ? 0.05 : 0);
            const flowSpeed = 0.2 + slowOsc * 0.05 + midOsc * 0.05;
            const audioReactivity = 4.0 + sFreq * 2.0;
            
            currentSgSettings[mode] = {
                ...(DEFAULT_PARAMS.sgSettings[mode] || {}),
                ...(params.sgSettings[mode] || {}),
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
    // Apply global multipliers to all modes, whether Auto Resonance is on or off
    if (params.sgGlobalOpacity !== undefined) {
        const modes = Object.keys(DEFAULT_PARAMS.sgSettings) as SacredGeometryMode[];
        
        // If currentSgSettings is the same reference as params.sgSettings, clone it to avoid mutating state directly
        if (currentSgSettings === params.sgSettings) {
            currentSgSettings = { ...params.sgSettings };
        }
        
        modes.forEach(mode => {
            const baseSettings = currentSgSettings[mode] || DEFAULT_PARAMS.sgSettings[mode];
            if (!baseSettings) return;
            currentSgSettings[mode] = {
                ...baseSettings,
                lineOpacity: Math.max(0.0, Math.min(1.0, baseSettings.lineOpacity * (params.sgGlobalOpacity ?? 1.0))),
                bgOpacity: Math.max(0.0, Math.min(1.0, baseSettings.bgOpacity * (params.sgGlobalOpacity ?? 1.0))),
                flowSpeed: baseSettings.flowSpeed * (params.sgGlobalFlowSpeed ?? 1.0),
                audioReactivity: baseSettings.audioReactivity * (params.sgGlobalAudioReactivity ?? 1.0),
                viscosity: (baseSettings.viscosity ?? 0.5) * (params.sgGlobalViscosity ?? 1.0)
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

    const portalScale = Math.max(0.1, params.arPortalScale ?? 1.0);
    const W = 30 * portalScale;
    const aspect = Math.max(size.width / Math.max(size.height, 1), 0.1);
    const H = W / aspect;
    const screenDiag = Math.sqrt(W*W + H*H) / 2;

    let tempZReal = 1.0 + (sVol * 0.2);
    let tempZImag = 0.0;
    for (let i = 0; i < params.iter; i++) {
        const zrK = tempZReal * dynamicK;
        const ziK = tempZImag * dynamicK;
        tempZReal = (zrK * rotReal - ziK * rotImag) + currentZ0r;
        tempZImag = (zrK * rotImag + ziK * rotReal) + currentZ0i;
        if (Math.abs(tempZReal) > 1e150 || Math.abs(tempZImag) > 1e150) {
            tempZReal = Math.sign(tempZReal) * 1e150;
            tempZImag = Math.sign(tempZImag) * 1e150;
            break;
        }
    }
    const max_px = tempZReal * zoom;
    const max_py = tempZImag * zoom;
    const max_dist = Math.sqrt(max_px*max_px + max_py*max_py);
    const log_max_dist = Math.log1p(max_dist);

    for (let n = 0; n < params.iter; n++) {
      const zrK = zReal * dynamicK;
      const ziK = zImag * dynamicK;

      let nextReal = (zrK * rotReal - ziK * rotImag) + currentZ0r;
      let nextImag = (zrK * rotImag + ziK * rotReal) + currentZ0i;
      
      if (Math.abs(nextReal) > 1e150) nextReal = Math.sign(nextReal) * 1e150;
      if (Math.abs(nextImag) > 1e150) nextImag = Math.sign(nextImag) * 1e150;

      zReal = nextReal;
      zImag = nextImag;

      let px_base = zReal * zoom;
      let py_base = zImag * zoom;
      
      let dist = Math.sqrt(px_base*px_base + py_base*py_base);
      let angle = Math.atan2(py_base, px_base);
      
      let pz_offset = 0;

      // Spiral resonance perturbation (applied to polar coordinates for better adaptation)
      const activeModes = params.spiralResonanceModes || [];
      if (activeModes.length > 0) {
          let totalOffsetDist = 0;
          let totalOffsetAngle = 0;
          let totalOffsetZ = 0;
          
          activeModes.forEach(mode => {
              const settings = currentSgSettings[mode] || DEFAULT_PARAMS.sgSettings[mode];
              if (!settings) return;
              const react = settings.audioReactivity;
              const complexity = settings.complexity;
              const scale = settings.scale * 10; // scale up for 3D
              const t = timeRef.current * settings.flowSpeed;
              
              if (mode === 'goldenSpiral') {
                  const offset = Math.sin(angle * 1.6180339 * complexity - t) * scale * sVol * react;
                  totalOffsetDist += offset;
                  totalOffsetZ += Math.cos(angle * 2) * offset;
              } else if (mode === 'quantumWave') {
                  const wave = Math.sin(n * 0.1 * complexity - t) * Math.cos(n * 0.05 + t);
                  totalOffsetDist += wave * scale * 5 * sVol * react;
                  totalOffsetAngle += wave * 0.05 * sVol * react;
                  totalOffsetZ += Math.sin(n * 0.05) * scale * 5 * sVol * react;
              } else if (mode === 'flowerOfLife') {
                  const hex = Math.cos(angle * 6 * complexity + t) * scale * 3 * sVol * react;
                  totalOffsetDist += hex;
                  totalOffsetZ += Math.sin(angle * 3) * hex;
              } else if (mode === 'torus') {
                  const fold = Math.sin(dist * 0.1 * complexity - t * 2) * scale * 4 * sVol * react;
                  totalOffsetDist += fold;
                  totalOffsetZ += Math.cos(dist * 0.05) * fold;
              }
          });
          
          const damping = Math.sqrt(activeModes.length);
          dist += totalOffsetDist / damping;
          angle += totalOffsetAngle / damping;
          pz_offset = totalOffsetZ / damping;
          
          if (dist < 0) {
              dist = -dist;
              angle += Math.PI;
          }
      }
      
      let px = px_base;
      let py = py_base;
      let pz = 0;

      if (params.arPortalMode) {
        const depthRatio = n / params.iter;
        let pz_portal = (depthRatio - 1.0) * effectiveDepth;
        
        const vRad = params.arPortalVanishingRadius ?? 0.5;
        const hollowRadius = screenDiag * vRad;
        const growthSpace = screenDiag - hollowRadius;
        
        const normalized_log_dist = Math.log1p(dist) / (log_max_dist || 1);
        const portal_radius = hollowRadius + normalized_log_dist * growthSpace;
        
        px = Math.cos(angle) * portal_radius;
        py = Math.sin(angle) * portal_radius;
        pz = pz_portal + pz_offset;
      } else {
        // Continuous spiral from -effectiveDepth/2 to +effectiveDepth/2
        pz = (n / params.iter - 0.5) * effectiveDepth + pz_offset;

        // Make it a portal around the user by adding vrRadius
        // In symmetric mode, we use a logarithmic scale to flatten the exponential growth
        // of the complex recurrence. This turns the expanding cone into a uniform 3D cylinder/tunnel.
        let radiusFactor = params.vrSymmetric ? (Math.log1p(dist) * 5 + params.vrRadius) : (dist + params.vrRadius);
        
        px = Math.cos(angle) * radiusFactor;
        py = Math.sin(angle) * radiusFactor;
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
      
      if (params.arPortalMode) {
        const depthRatio = n / params.iter;
        const normalizedDepth = 1.0 - depthRatio;
        const fadeFactor = 1.0 - (normalizedDepth * (params.arPortalFade ?? 1.0));
        const targetEdgeFade = Math.max(0, fadeFactor);
        edgeFade = targetEdgeFade;
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

    if (params.sacredGeometryEnabled) {
        const activeModes = params.sacredGeometryModes || [];
        const regime = params.geometryData?.regime || 'primary';
        const baseLightness = regime === 'reciprocal' ? params.brightness + 30 : params.brightness + 15;

        if (params.sgDrawMode === 'layers' || params.sgDrawMode === 'both' || params.arPortalMode) {
            activeModes.forEach((mode, modeIndex) => {
                const settings = currentSgSettings[mode] || DEFAULT_PARAMS.sgSettings[mode];
                if (!settings) return;
                // In AR portal mode, use many more layers to create a dense, continuous tunnel
                const numLayers = params.arPortalMode ? Math.max(15, Math.floor(settings.complexity * 12)) : Math.max(3, Math.floor(settings.complexity * 5)); 
                const baseRadius = 10 * settings.scale; 
                const flowSpeed = settings.flowSpeed * (params.arPortalMode ? 0.05 : 0.2); // Slower, more hypnotic flow in AR
                const tunnelDepth = params.vrDepth * 20; 
                
                for (let i = 0; i < numLayers; i++) {
                    const layerProgress = i / numLayers;
                    // Flow towards camera
                    const zFraction = (layerProgress + timeRef.current * flowSpeed) % 1.0;
                    
                    // Z position: from slightly behind camera to deep in the distance
                    let cz = (0.1 - zFraction) * tunnelDepth;
                    let radius = baseRadius * (1 + sVol * settings.audioReactivity * 0.5);
                    
                    let rz = zFraction * Math.PI * 2 + timeRef.current * 0.5 * (modeIndex % 2 === 0 ? 1 : -1) + (modeIndex * Math.PI / activeModes.length);
                    let rx = Math.sin(timeRef.current * 0.3 + i) * 0.5 * sVol * settings.audioReactivity;
                    let ry = Math.cos(timeRef.current * 0.4 + i) * 0.5 * sVol * settings.audioReactivity;
                    let distanceFade = Math.sin(zFraction * Math.PI); 

                    if (params.arPortalMode) {
                        cz = (zFraction - 1.0) * effectiveDepth;
                        const vRad = params.arPortalVanishingRadius ?? 0.5;
                        const hollowRadius = screenDiag * vRad;
                        const growthSpace = screenDiag - hollowRadius;
                        
                        // To match the spiral exactly, we use the same logarithmic mapping
                        const portal_radius = hollowRadius + zFraction * growthSpace;
                        radius = portal_radius * (1 + sVol * settings.audioReactivity * 0.5);
                        
                        // Match spiral rotation exactly: angle = n * psi
                        // As zFraction changes (layer flows forward), it rotates along the spiral path
                        const spiralAngle = zFraction * params.iter * dynamicPsi;
                        rz = spiralAngle + (modeIndex * Math.PI / activeModes.length);
                        
                        // Keep layers flat to the camera to form a perfect tunnel
                        rx = 0;
                        ry = 0;
                        
                        // Cumulative fading: highly opaque near the deep end to combine with spiral,
                        // fading out smoothly as it approaches the camera (zFraction -> 1),
                        // and a tiny fade at the absolute deep end (zFraction -> 0) to avoid a hard cutoff wall.
                        distanceFade = Math.pow(1.0 - zFraction, 1.2) * Math.min(1.0, zFraction * 15.0) * (0.8 + 0.2 * sVol);
                    }

                    // Color and Opacity
                    const hueOffset = zFraction * params.hueRange;
                    const layerHue = (displayBaseHue + hueOffset + modeIndex * 30) % 360;
                    
                    const { hue: finalHue, sat: finalSat, light: finalLight, lineOpacity: baseLineOpacity } = getGeometryColor(
                      params, settings, layerHue, sVol, modeIndex, activeModes.length
                    );
                    
                    const opacity = Math.min(1.0, baseLineOpacity * distanceFade * (0.5 + 1.5 * sVol * settings.audioReactivity) * (params.arPortalMode ? 2.5 : 2.0));
                    
                    if (opacity > 0.01 && sgOffset < maxSgPoints - 2000) {
                        const color = new THREE.Color().setHSL(finalHue / 360, finalSat / 100, finalLight / 100);
                        
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
        }
        
        if ((params.sgDrawMode === 'nodes' || params.sgDrawMode === 'both') && params.sgShowNodes && !params.arPortalMode) {
            activeModes.forEach((mode, modeIndex) => {
                const settings = currentSgSettings[mode] || DEFAULT_PARAMS.sgSettings[mode];
                if (!settings) return;
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
                        
                        const { hue: finalHue, sat: finalSat, light: finalLight, lineOpacity: baseLineOpacity } = getGeometryColor(
                          params, settings, nodeHue, sVol, modeIndex, activeModes.length
                        );
                        
                        const opacity = Math.min(1.0, baseLineOpacity * (0.4 + 1.6 * sVol * settings.audioReactivity) * 2.0);
                        
                        // 3D Rotation spinning wildly but harmonically
                        const rx = timeRef.current * 1.1 + i * 0.1;
                        const ry = timeRef.current * 1.3 + i * 0.2;
                        const rz = timeRef.current * 0.7 + i * 0.3 + (modeIndex * Math.PI / activeModes.length);
                        
                        const color = new THREE.Color().setHSL(finalHue / 360, finalSat / 100, finalLight / 100);
                        
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
      {(params.spiralResonanceModes && params.spiralResonanceModes.length > 0) && (params.sgDrawMode === 'nodes' || params.sgDrawMode === 'both') && !params.arPortalMode ? (
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
        <line ref={lineRef as any}>
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
const VRMenu = ({ 
  params, 
  setParams, 
  audioActive, 
  toggleAudio, 
  visible, 
  getAudioMetrics, 
  subscriptionTier, 
  onShowSubscription,
  audioDevices = [],
  selectedAudioDeviceId = '',
  onAudioDeviceChange
}: any) => {
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
            getAudioMetrics={getAudioMetrics}
            subscriptionTier={subscriptionTier}
            trialEndTime={null}
            onShowSubscription={onShowSubscription}
            audioDevices={audioDevices}
            selectedAudioDeviceId={selectedAudioDeviceId}
            onAudioDeviceChange={onAudioDeviceChange}
          />
        </div>
      </Html>
    </group>
  );
};

const CameraUpdater = ({ distance, isSymmetric, arPortalMode }: { distance: number, isSymmetric: boolean, arPortalMode: boolean }) => {
  const { camera } = useThree();
  useFrame(() => {
    // In symmetric mode (infinite tunnel), the user is exactly in the center (Z=0).
    // Otherwise, they are looking at the portal from the specified distance.
    // We only update the camera position if not in VR, as the VR headset controls its own position.
    if (!store.getState().session && !arPortalMode) {
      const targetZ = isSymmetric ? 0 : distance;
      camera.position.z += (targetZ - camera.position.z) * 0.05;
    }
  });
  return null;
};

const DynamicCamera = ({ 
  params, 
  targetGroupRef,
  facePos 
}: { 
  params: VisualizerParams, 
  targetGroupRef: React.RefObject<THREE.Group>,
  facePos: React.MutableRefObject<{x: number, y: number, z: number}> 
}) => {
  const { camera, size } = useThree();
  const isFirstFrame = useRef(true);
  
  useFrame(() => {
    if (!params.arPortalMode || store.getState().session) {
      if (isFirstFrame.current) {
        isFirstFrame.current = false;
      }
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = 75;
        camera.updateProjectionMatrix();
        camera.position.x += (0 - camera.position.x) * 0.1;
        camera.position.y += (0 - camera.position.y) * 0.1;
        camera.rotation.set(0, 0, 0);
      }
      if (targetGroupRef.current) {
        targetGroupRef.current.rotation.set(0, 0, 0);
      }
      return;
    }
    
    const portalScale = Math.max(0.1, params.arPortalScale ?? 1.0);
    const W = 30 * portalScale;
    const aspect = Math.max(size.width / Math.max(size.height, 1), 0.1);
    const H = W / aspect;

    const intensity = params.arPortalPerspectiveIntensity || 2.0; 
    const portalZ = Math.max(facePos.current.z * W * 0.8 * intensity, W * 0.15);
    
    // Scale X and Y based on portal dimensions (W and H) to ensure balanced movement
    // across any screen size and aspect ratio.
    const portalX = facePos.current.x * 0.6 * portalZ * intensity;
    const portalY = facePos.current.y * 0.6 * portalZ * (1 / aspect) * intensity;
    
    const targetPos = new THREE.Vector3(portalX, portalY, portalZ);
    
    if (isFirstFrame.current) {
      camera.position.copy(targetPos);
      isFirstFrame.current = false;
    } else {
      camera.position.lerp(targetPos, 0.25);
    }
    if (camera instanceof THREE.PerspectiveCamera) {
      const n = camera.near;
      const f = camera.far;

      const z_c = Math.max(camera.position.z, 0.01);
      const x_c = camera.position.x;
      const y_c = camera.position.y;

      const portalLeft = (-W / 2 - x_c) * (n / z_c);
      const portalRight = (W / 2 - x_c) * (n / z_c);
      const portalBottom = (-H / 2 - y_c) * (n / z_c);
      const portalTop = (H / 2 - y_c) * (n / z_c);

      camera.projectionMatrix.makePerspective(portalLeft, portalRight, portalTop, portalBottom, n, f);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      
      // Calculate straight rotation based on camera position relative to the portal center
      const targetRotX = Math.atan2(y_c, z_c);
      const targetRotY = Math.atan2(-x_c, z_c);
      
      const bending = params.arPortalBending ?? 0.0;
      
      // Apply bending to X and Y, but keep Z fixed to 0 to prevent depth bending
      const finalRotX = targetRotX * bending;
      const finalRotY = targetRotY * bending;

      camera.rotation.x += (finalRotX - camera.rotation.x) * 0.2;
      camera.rotation.y += (finalRotY - camera.rotation.y) * 0.2;
      camera.rotation.z += (0 - camera.rotation.z) * 0.2; // Fix depth rotation strictly to 0
    }

    if (targetGroupRef.current) {
      // The spiral group should counter-rotate if we want it to stay straight relative to the perspective
      const bending = params.arPortalBending ?? 0.0;
      const z_c = Math.max(camera.position.z, 0.01);
      const x_c = camera.position.x;
      const y_c = camera.position.y;
      
      const targetRotX = Math.atan2(-y_c, z_c) * bending;
      const targetRotY = Math.atan2(x_c, z_c) * bending;
      
      targetGroupRef.current.rotation.x += (targetRotX - targetGroupRef.current.rotation.x) * 0.1;
      targetGroupRef.current.rotation.y += (targetRotY - targetGroupRef.current.rotation.y) * 0.1;
      targetGroupRef.current.rotation.z += (0 - targetGroupRef.current.rotation.z) * 0.1; // Fix depth rotation strictly to 0
    }
  });

  return null;
};

const BackgroundHandler = ({ store }: { store: any }) => {
  const { scene } = useThree();
  useFrame(() => {
    scene.background = null;
  });
  return null;
};
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
    <EffectComposer>
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

const VisualizerVR: React.FC<VisualizerVRProps> = ({ params, getAudioMetrics, setParams, audioActive, toggleAudio, subscriptionTier, onShowSubscription }) => {
  const [hasOrientation, setHasOrientation] = useState(false);
  const [menuVisible, setMenuVisible] = useState(true);
  const spiralGroupRef = useRef<THREE.Group>(null);
  const facePos = useFaceTracker(params.arPortalMode);

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
    <div className="w-full h-full relative bg-transparent" style={{ touchAction: 'none' }}>
      {params.showIndicators && (
        <div className="absolute top-4 left-4 z-50 flex gap-2">
          {!(params.arMode || params.arPortalMode) ? (
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
        gl={{ alpha: true }}
        camera={{ position: [0, 0, params.vrDistance], fov: 75, far: 10000 }}
        onPointerMissed={() => setMenuVisible(v => !v)}
      >
        <BackgroundHandler store={store} />
        <ambientLight intensity={0.5} />
        
        <XR store={store}>
          <group ref={spiralGroupRef} scale={[params.distanceZoom || 1.0, params.distanceZoom || 1.0, params.distanceZoom || 1.0]}>
            <Spiral3D params={params} getAudioMetrics={getAudioMetrics} />
          </group>
          <VRMenu params={params} setParams={setParams} audioActive={audioActive} toggleAudio={toggleAudio} visible={menuVisible && params.vrMode && !params.arMode && !params.arPortalMode} getAudioMetrics={getAudioMetrics} subscriptionTier={subscriptionTier} onShowSubscription={onShowSubscription} />
        </XR>

        {hasOrientation && !params.arPortalMode && <DeviceOrientationControls />}
        
        <DragRotation active={!params.arPortalMode} targetGroupRef={spiralGroupRef} />
        
        <CameraUpdater distance={params.vrDistance} isSymmetric={params.vrSymmetric} arPortalMode={params.arPortalMode} />
        <DynamicCamera params={params} targetGroupRef={spiralGroupRef} facePos={facePos} />
        <StereoCamera active={params.vrSplitScreen} />
        
        {(params.arMode || params.arPortalMode) && <AREffects filter={params.arFilter} intensity={params.arIntensity} getAudioMetrics={getAudioMetrics} />}
      </Canvas>
    </div>
  );
};

export default VisualizerVR;
