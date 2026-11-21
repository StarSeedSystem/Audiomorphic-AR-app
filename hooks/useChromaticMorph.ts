import { useEffect, useRef, type MutableRefObject } from 'react';

const PHI = 1.618033988749895;
const GOLDEN_ANGLE = 137.50776405003785; // 360 / phi^2

export interface ChromaticState {
  hue1: number;
  hue2: number;
  hue3: number;
  energy: number;
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

function safeNeonTextLightness(hue: number): number {
  const lumAt70 = hslLuminance(hue, 88, 70);
  if (lumAt70 < 0.35) return 78;
  if (lumAt70 > 0.62) return 66;
  return 72;
}

/**
 * Motor cromático vivo (inspirado en Omni-Frecuencias Holográficas).
 * Actualiza variables CSS globales en :root a ~30fps sin re-renders de React,
 * generando una estética Solarpunk / cristal líquido reactiva al audio y tono visual.
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

    const applyCssVariables = (s: ChromaticState) => {
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

      let energy = 0.2;
      let targetHue1 =
        (currentBaseHue +
          Math.sin(elapsedSec * 0.14) * 24 +
          Math.cos((elapsedSec * 0.14) / PHI) * 16 +
          elapsedSec * 2.2 +
          360) %
        360;

      if (active) {
        const metrics = getMetricsRef.current(sensRef.current, freqRangeRef.current);
        energy = Math.min(1, Math.max(0.16, metrics.volume * 0.85 + metrics.bass * 0.25));
        const audioHueShift = (metrics.frequency * 260 + metrics.treble * 55 + metrics.mid * 35) % 360;
        targetHue1 = (currentBaseHue + audioHueShift + Math.sin(elapsedSec * 0.3) * 14) % 360;
      }

      const spreadShift = Math.sin(elapsedSec * 0.25 + energy * Math.PI) * (14 + energy * 18);
      const targetHue2 = (targetHue1 + GOLDEN_ANGLE + spreadShift + 360) % 360;
      const targetHue3 = (targetHue1 + GOLDEN_ANGLE * PHI - spreadShift * 0.5 + 360) % 360;

      const prev = stateRef.current;
      const smoothing = active ? 0.065 : 0.018;
      const maxStep = active ? 2.2 : 0.45;
      const nextHue1 = lerpHue(prev.hue1, targetHue1, smoothing, maxStep);
      const nextHue2 = lerpHue(prev.hue2, targetHue2, smoothing * 0.92, maxStep * 0.92);
      const nextHue3 = lerpHue(prev.hue3, targetHue3, smoothing * 0.86, maxStep * 0.86);
      const nextEnergy = prev.energy + (energy - prev.energy) * 0.14;

      const next: ChromaticState = {
        hue1: nextHue1,
        hue2: nextHue2,
        hue3: nextHue3,
        energy: nextEnergy,
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
