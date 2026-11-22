import { useEffect, useRef, type MutableRefObject } from 'react';

const PHI = 1.618033988749895;
const GOLDEN_ANGLE = 137.50776405003785; // 360 / phi^2

export interface ChromaticState {
  hue1: number;
  hue2: number;
  hue3: number;
  energy: number;
  bass: number;
  treble: number;
}

function hslLuminance(h: number, s: number, l: number): number {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return color <= 0.03928 ? color / 12.92 : Math.pow((color + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(0) + 0.7152 * f(8) + 0.0722 * f(4);
}

function lerpHue(current: number, target: number, alpha: number, maxStep = 1.8): number {
  const diff = ((target - current + 540) % 360) - 180;
  const rawStep = diff * alpha;
  const step = Math.max(-maxStep, Math.min(maxStep, rawStep));
  return (current + step + 360) % 360;
}

function envelopeSmooth(current: number, target: number, attack: number, release: number): number {
  const coeff = target > current ? attack : release;
  return current + (target - current) * coeff;
}

function safeNeonTextLightness(hue: number): number {
  const lumAt70 = hslLuminance(hue, 88, 70);
  if (lumAt70 < 0.35) return 78;
  if (lumAt70 > 0.62) return 66;
  return 72;
}

/**
 * Motor cromático vivo (inspirado en Omni-Frecuencias Holográficas y perfeccionado para Audiomorphic).
 * Actualiza variables CSS globales en :root sin re-renders de React y con envolventes musicales suaves,
 * saltando escrituras cuando los deltas son imperceptibles para mantener total fluidez en la UI.
 */
export function useChromaticMorph(
  getAudioMetrics: (sensitivity: number, freqRange: number) => {
    volume: number;
    frequency: number;
    bass: number;
    mid: number;
    treble: number;
  },
  isAudioActive: boolean,
  baseHue: number,
  sensitivity: number,
  freqRange: number
): MutableRefObject<ChromaticState> {
  const stateRef = useRef<ChromaticState>({
    hue1: baseHue || 175,
    hue2: ((baseHue || 175) + GOLDEN_ANGLE) % 360,
    hue3: ((baseHue || 175) + GOLDEN_ANGLE * PHI) % 360,
    energy: 0.22,
    bass: 0.14,
    treble: 0.16,
  });

  const getMetricsRef = useRef(getAudioMetrics);
  getMetricsRef.current = getAudioMetrics;
  const isAudioActiveRef = useRef(isAudioActive);
  isAudioActiveRef.current = isAudioActive;
  const baseHueRef = useRef(baseHue);
  baseHueRef.current = baseHue;
  const sensRef = useRef(sensitivity);
  sensRef.current = sensitivity;
  const freqRangeRef = useRef(freqRange);
  freqRangeRef.current = freqRange;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    let rafId = 0;
    let lastCssSync = 0;
    const startTime = performance.now();

    let smoothVol = 0.22;
    let smoothFreq = 0.3;
    let smoothBass = 0.14;
    let smoothMid = 0.14;
    let smoothTreble = 0.16;

    let lastWritten: ChromaticState = {
      hue1: -999,
      hue2: -999,
      hue3: -999,
      energy: -999,
      bass: -999,
      treble: -999,
    };

    const applyCssVariables = (s: ChromaticState) => {
      const hueDiff =
        Math.abs(((s.hue1 - lastWritten.hue1 + 540) % 360) - 180) +
        Math.abs(((s.hue2 - lastWritten.hue2 + 540) % 360) - 180);
      const valDiff =
        Math.abs(s.energy - lastWritten.energy) +
        Math.abs(s.bass - lastWritten.bass) +
        Math.abs(s.treble - lastWritten.treble);

      if (hueDiff < 0.08 && valDiff < 0.004) return;
      lastWritten = { ...s };

      const root = document.documentElement.style;
      const h1 = s.hue1.toFixed(1);
      const h2 = s.hue2.toFixed(1);
      const h3 = s.hue3.toFixed(1);
      const textL1 = safeNeonTextLightness(s.hue1);
      const textL2 = safeNeonTextLightness(s.hue2);

      const accentBgLum = hslLuminance(s.hue1, 86, 46);
      const onAccent = accentBgLum > 0.34 ? '#050811' : '#f8fafc';

      root.setProperty('--morph-hue-1', h1);
      root.setProperty('--morph-hue-2', h2);
      root.setProperty('--morph-hue-3', h3);
      root.setProperty('--morph-energy', s.energy.toFixed(3));
      root.setProperty('--morph-bass', s.bass.toFixed(3));
      root.setProperty('--morph-treble', s.treble.toFixed(3));
      root.setProperty('--morph-text-l1', `${textL1}%`);
      root.setProperty('--morph-text-l2', `${textL2}%`);
      root.setProperty('--morph-on-accent', onAccent);
      root.setProperty('--morph-glow-alpha', (0.24 + s.energy * 0.36).toFixed(3));
      root.setProperty('--morph-accent-bg', `hsl(${h1} 86% 46%)`);
    };

    applyCssVariables(stateRef.current);

    const tick = (now: number) => {
      const elapsedSec = (now - startTime) * 0.001;
      const active = isAudioActiveRef.current;
      const currentBaseHue = Number.isFinite(baseHueRef.current) ? baseHueRef.current : 175;

      let targetEnergy = 0.2 + Math.sin(elapsedSec * 0.45) * 0.04;
      let targetBass = 0.14 + Math.sin(elapsedSec * 0.65) * 0.04;
      let targetMid = 0.15 + Math.cos(elapsedSec * 0.5) * 0.04;
      let targetTreble = 0.16 + Math.sin(elapsedSec * 0.8 + 1.1) * 0.05;
      let targetFreq = 0.28 + Math.sin(elapsedSec * 0.22) * 0.08;

      if (active) {
        const metrics = getMetricsRef.current(sensRef.current, freqRangeRef.current);
        targetEnergy = Math.min(1, Math.max(0.16, metrics.volume * 0.85 + metrics.bass * 0.25));
        targetBass = Math.min(1, Math.max(0.08, metrics.bass));
        targetMid = Math.min(1, Math.max(0.08, metrics.mid));
        targetTreble = Math.min(1, Math.max(0.08, metrics.treble));
        targetFreq = Math.min(1, Math.max(0, metrics.frequency));
      }

      // Envolventes asimétricas: ataque ágil pero musical, decaimiento sedoso sin parpadeos
      smoothVol = envelopeSmooth(smoothVol, targetEnergy, active ? 0.18 : 0.05, 0.045);
      smoothBass = envelopeSmooth(smoothBass, targetBass, active ? 0.2 : 0.05, 0.05);
      smoothMid = envelopeSmooth(smoothMid, targetMid, active ? 0.16 : 0.05, 0.045);
      smoothTreble = envelopeSmooth(smoothTreble, targetTreble, active ? 0.18 : 0.05, 0.045);
      smoothFreq = envelopeSmooth(smoothFreq, targetFreq, 0.1, 0.04);

      const audioHueShift = active
        ? (smoothFreq * 240 + smoothTreble * 55 + smoothMid * 35) % 360
        : (Math.sin(elapsedSec * 0.14) * 24 +
            Math.cos((elapsedSec * 0.14) / PHI) * 16 +
            elapsedSec * 2.2 +
            360) %
          360;

      const targetHue1 =
        (currentBaseHue + audioHueShift + (active ? Math.sin(elapsedSec * 0.3) * 12 : 0) + 360) % 360;

      const spreadShift = Math.sin(elapsedSec * 0.24 + smoothVol * Math.PI) * (12 + smoothVol * 16);
      const targetHue2 = (targetHue1 + GOLDEN_ANGLE + spreadShift + 360) % 360;
      const targetHue3 = (targetHue1 + GOLDEN_ANGLE * PHI - spreadShift * 0.5 + 360) % 360;

      const prev = stateRef.current;
      const smoothing = active ? 0.06 : 0.022;
      const maxStep = active ? 1.85 : 0.45;
      const nextHue1 = lerpHue(prev.hue1, targetHue1, smoothing, maxStep);
      const nextHue2 = lerpHue(prev.hue2, targetHue2, smoothing * 0.92, maxStep * 0.92);
      const nextHue3 = lerpHue(prev.hue3, targetHue3, smoothing * 0.86, maxStep * 0.86);

      const next: ChromaticState = {
        hue1: nextHue1,
        hue2: nextHue2,
        hue3: nextHue3,
        energy: smoothVol,
        bass: smoothBass,
        treble: smoothTreble,
      };
      stateRef.current = next;

      if (now - lastCssSync > 32) {
        lastCssSync = now;
        applyCssVariables(next);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return stateRef;
}
